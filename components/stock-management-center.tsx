'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle,Boxes,History,Link2,PackagePlus,RefreshCw,Trash2} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Stock={id:string;business_id:string;name:string;unit:string;quantity:number;low_stock_threshold:number;active:boolean};
type MenuItem={id:string;name:string};
type Recipe={id:string;item_id:string;stock_item_id:string;quantity_per_item:number};
type Movement={id:string;stock_item_id:string;movement_type:string;quantity_delta:number;balance_after:number;note:string|null;created_at:string};

const units=['unité','portion','bouteille','canette','pack','kg','g','L','cl','ml'];

export function StockManagementCenter(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const lastResolved=useRef('');
  const [host,setHost]=useState<Element|null>(null);
  const [desktopNav,setDesktopNav]=useState<Element|null>(null);
  const [mobileNav,setMobileNav]=useState<Element|null>(null);
  const [catalogId,setCatalogId]=useState('');
  const [businessId,setBusinessId]=useState('');
  const [plan,setPlan]=useState('');
  const [stocks,setStocks]=useState<Stock[]>([]);
  const [items,setItems]=useState<MenuItem[]>([]);
  const [recipes,setRecipes]=useState<Recipe[]>([]);
  const [movements,setMovements]=useState<Movement[]>([]);
  const [busy,setBusy]=useState('');
  const [newStock,setNewStock]=useState({name:'',unit:'unité',quantity:'0',threshold:'0'});
  const [recipe,setRecipe]=useState({item_id:'',stock_item_id:'',quantity:'1'});

  const businessEnabled=plan==='linkhub'||plan==='trial';

  useEffect(()=>{
    let cancelled=false;
    let scheduled:ReturnType<typeof setTimeout>|null=null;
    const resolve=async()=>{
      setDesktopNav(document.querySelector('.dash-v3-nav'));
      setMobileNav(document.querySelector('.dash-v3-mobile-tabs'));
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      const nextHost=title==='Articles & catégories'?document.querySelector('.dash-v3-main .dash-section'):null;
      setHost(nextHost);
      if(!nextHost){lastResolved.current='';return}
      const {data:{session}}=await supabase.auth.getSession();if(!session||cancelled)return;
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const b=businesses?.[0]?.id;if(!b)return;
      let cid=new URLSearchParams(location.search).get('catalog')||'';
      if(!cid){
        const heading=document.querySelector('.dash-toolbar h3')?.textContent?.trim()||'';
        if(heading){const {data:cs}=await supabase.from('catalogs').select('id').eq('business_id',b).eq('title',heading).order('created_at',{ascending:false}).limit(1);cid=String(cs?.[0]?.id||'')}
      }
      if(!cid)return;
      const key=`${String(b)}:${cid}`;
      if(lastResolved.current===key)return;
      lastResolved.current=key;setBusinessId(String(b));setCatalogId(cid);await loadAll(String(b),cid);
    };
    const schedule=()=>{if(scheduled)clearTimeout(scheduled);scheduled=setTimeout(()=>void resolve(),60)};
    schedule();
    const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    document.addEventListener('click',schedule,true);
    return()=>{cancelled=true;if(scheduled)clearTimeout(scheduled);observer.disconnect();document.removeEventListener('click',schedule,true)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[supabase]);

  async function loadAll(bid=businessId,cid=catalogId){
    if(!bid||!cid)return;
    const [{data:subs},{data:stockRows},{data:itemRows},{data:recipeRows},{data:moveRows}]=await Promise.all([
      supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',bid).order('created_at',{ascending:false}).limit(1),
      supabase.from('inventory_stock_items').select('id,business_id,name,unit,quantity,low_stock_threshold,active').eq('business_id',bid).eq('active',true).order('name'),
      supabase.from('items').select('id,name').eq('catalog_id',cid).order('sort_order'),
      supabase.from('inventory_recipe_components').select('id,item_id,stock_item_id,quantity_per_item').eq('business_id',bid),
      supabase.from('inventory_movements').select('id,stock_item_id,movement_type,quantity_delta,balance_after,note,created_at').eq('business_id',bid).order('created_at',{ascending:false}).limit(40),
    ]);
    const s=subs?.[0];const valid=!!s&&['active','trialing'].includes(String(s.status))&&(!s.current_period_end||new Date(s.current_period_end).getTime()>Date.now());
    setPlan(valid?String(s?.plan_code||''):'');setStocks((stockRows||[]) as Stock[]);setItems((itemRows||[]) as MenuItem[]);setRecipes((recipeRows||[]) as Recipe[]);setMovements((moveRows||[]) as Movement[]);
    if(!recipe.item_id&&itemRows?.[0]?.id)setRecipe(v=>({...v,item_id:itemRows[0].id}));
    if(!recipe.stock_item_id&&stockRows?.[0]?.id)setRecipe(v=>({...v,stock_item_id:stockRows[0].id}));
  }

  function openStock(){
    const articleButton=Array.from(document.querySelectorAll<HTMLButtonElement>('.dash-v3-nav button,.dash-v3-mobile-tabs button')).find(button=>(button.textContent||'').includes('Articles'));
    articleButton?.click();
    setTimeout(()=>document.querySelector('.q-stock-section')?.scrollIntoView({behavior:'smooth',block:'start'}),160);
  }

  async function addStock(){
    if(!businessEnabled||!businessId||!newStock.name.trim())return;
    setBusy('new');
    const {error}=await supabase.from('inventory_stock_items').insert({business_id:businessId,name:newStock.name.trim(),unit:newStock.unit,quantity:Number(newStock.quantity||0),low_stock_threshold:Math.max(0,Number(newStock.threshold||0)),active:true});
    setBusy('');if(error){alert(error.message);return}setNewStock({name:'',unit:'unité',quantity:'0',threshold:'0'});await loadAll();
  }

  async function adjustStock(stock:Stock,newQuantity:number){
    if(!businessEnabled)return;setBusy(`stock:${stock.id}`);
    const {error}=await supabase.rpc('set_inventory_stock_quantity',{p_stock_id:stock.id,p_quantity:newQuantity,p_note:'Ajustement depuis le dashboard Qatalink'});
    setBusy('');if(error)alert(error.message);else await loadAll();
  }

  async function saveThreshold(stock:Stock,value:number){
    const {error}=await supabase.from('inventory_stock_items').update({low_stock_threshold:Math.max(0,value),updated_at:new Date().toISOString()}).eq('id',stock.id);
    if(error)alert(error.message);else setStocks(v=>v.map(s=>s.id===stock.id?{...s,low_stock_threshold:Math.max(0,value)}:s));
  }

  async function deleteStock(stock:Stock){
    if(!confirm(`Supprimer le stock « ${stock.name} » et ses liaisons ?`))return;
    const {error}=await supabase.from('inventory_stock_items').delete().eq('id',stock.id);if(error)alert(error.message);else await loadAll();
  }

  async function addRecipe(){
    if(!businessEnabled||!businessId||!recipe.item_id||!recipe.stock_item_id||Number(recipe.quantity)<=0)return;
    setBusy('recipe');
    const {error}=await supabase.from('inventory_recipe_components').upsert({business_id:businessId,item_id:recipe.item_id,stock_item_id:recipe.stock_item_id,quantity_per_item:Number(recipe.quantity),updated_at:new Date().toISOString()},{onConflict:'item_id,stock_item_id'});
    setBusy('');if(error)alert(error.message);else await loadAll();
  }

  async function deleteRecipe(id:string){await supabase.from('inventory_recipe_components').delete().eq('id',id);await loadAll()}

  const navButton=<button type="button" className="q-stock-nav" onClick={openStock}><Boxes size={16}/><span>Stock</span></button>;

  const content=<section className="dash-card q-stock-section">
    <div className="q-stock-head"><div><div className="eyebrow">GESTION DE STOCK</div><h3>Stock & consommation automatique</h3><p>Reliez vos ingrédients, bouteilles ou produits aux plats. En Business, Qatalink déduit le stock quand une commande passe à <b>Terminée</b>.</p></div><button className="btn btn-ghost" onClick={()=>loadAll()}><RefreshCw size={14}/>Actualiser</button></div>
    {!businessEnabled?<div className="q-stock-locked"><Boxes/><div><b>Fonction Business</b><p>La gestion de stock, les recettes et les déductions automatiques sont réservées à Business. Starter et Pro gardent leurs commandes sans modifier le stock.</p></div></div>:<>
      <div className="q-stock-grid">
        <div className="q-stock-panel"><h4><PackagePlus size={17}/> Ajouter un stock</h4><div className="q-stock-form"><input className="input" value={newStock.name} onChange={e=>setNewStock({...newStock,name:e.target.value})} placeholder="Ex : Poulet entier, Coca 33 cl"/><select className="input" value={newStock.unit} onChange={e=>setNewStock({...newStock,unit:e.target.value})}>{units.map(unit=><option key={unit}>{unit}</option>)}</select><input className="input" type="number" step="0.001" value={newStock.quantity} onChange={e=>setNewStock({...newStock,quantity:e.target.value})} placeholder="Quantité actuelle"/><input className="input" type="number" step="0.001" min="0" value={newStock.threshold} onChange={e=>setNewStock({...newStock,threshold:e.target.value})} placeholder="Alerte stock bas"/><button className="btn btn-primary" onClick={addStock} disabled={busy==='new'||!newStock.name.trim()}>Ajouter</button></div></div>
        <div className="q-stock-panel"><h4><Link2 size={17}/> Relier un plat au stock</h4><p className="q-stock-help">Exemple : “Poulet braisé” consomme 1 poulet ; “Coca 33 cl” consomme 1 bouteille.</p><div className="q-stock-form"><select className="input" value={recipe.item_id} onChange={e=>setRecipe({...recipe,item_id:e.target.value})}><option value="">Plat / boisson</option>{items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="input" value={recipe.stock_item_id} onChange={e=>setRecipe({...recipe,stock_item_id:e.target.value})}><option value="">Stock consommé</option>{stocks.map(stock=><option key={stock.id} value={stock.id}>{stock.name} ({stock.unit})</option>)}</select><input className="input" type="number" min="0.001" step="0.001" value={recipe.quantity} onChange={e=>setRecipe({...recipe,quantity:e.target.value})} placeholder="Qté par vente"/><button className="btn btn-primary" onClick={addRecipe} disabled={busy==='recipe'}>Enregistrer la liaison</button></div></div>
      </div>

      <div className="q-stock-list"><h4>Stock actuel</h4>{stocks.length===0?<p className="q-stock-empty">Ajoutez votre premier ingrédient, boisson ou produit à suivre.</p>:stocks.map(stock=>{const low=Number(stock.quantity)<=Number(stock.low_stock_threshold);return <div className={`q-stock-row ${low?'low':''}`} key={stock.id}><div className="q-stock-name">{low&&<AlertTriangle size={15}/>}<div><b>{stock.name}</b><small>{stock.unit}</small></div></div><div className="q-stock-quantity"><input className="input" type="number" step="0.001" defaultValue={stock.quantity} onBlur={e=>{const value=Number(e.target.value);if(Number.isFinite(value)&&value!==Number(stock.quantity))void adjustStock(stock,value)}}/><span>{stock.unit}</span></div><label>Seuil<input className="input" type="number" step="0.001" min="0" defaultValue={stock.low_stock_threshold} onBlur={e=>void saveThreshold(stock,Number(e.target.value||0))}/></label><button className="mini-action" onClick={()=>deleteStock(stock)}><Trash2 size={13}/></button></div>})}</div>

      <div className="q-recipe-list"><h4>Liaisons plats → stock</h4>{recipes.filter(r=>items.some(i=>i.id===r.item_id)).length===0?<p className="q-stock-empty">Aucune liaison pour ce menu. Sans liaison, une vente ne déduit rien.</p>:recipes.filter(r=>items.some(i=>i.id===r.item_id)).map(link=>{const item=items.find(i=>i.id===link.item_id);const stock=stocks.find(s=>s.id===link.stock_item_id);return <div className="q-recipe-row" key={link.id}><span><b>{item?.name||'Article'}</b> → {link.quantity_per_item} {stock?.unit||''} de <b>{stock?.name||'Stock supprimé'}</b></span><button className="mini-action" onClick={()=>deleteRecipe(link.id)}><Trash2 size={13}/></button></div>})}</div>

      <div className="q-stock-history"><h4><History size={17}/> Derniers mouvements</h4>{movements.length===0?<p className="q-stock-empty">Les déductions automatiques et ajustements apparaîtront ici.</p>:movements.slice(0,12).map(move=>{const stock=stocks.find(s=>s.id===move.stock_item_id);return <div key={move.id}><span>{stock?.name||'Stock'}<small>{new Date(move.created_at).toLocaleString('fr-FR')}</small></span><b className={move.quantity_delta<0?'negative':'positive'}>{move.quantity_delta>0?'+':''}{move.quantity_delta} → {move.balance_after}</b></div>})}</div>
    </>}
  </section>;

  return <>{desktopNav&&createPortal(navButton,desktopNav)}{mobileNav&&createPortal(navButton,mobileNav)}{host&&createPortal(content,host)}</>;
}
