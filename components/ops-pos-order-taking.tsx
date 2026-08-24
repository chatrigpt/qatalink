'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Minus,Plus,Search,ShoppingCart,X} from 'lucide-react';

const SOURCE_OPTIONS=[
  ['pos','Caisse'],
  ['qr','QR code'],
  ['shared_link','Lien partagé'],
  ['whatsapp','WhatsApp'],
  ['phone','Téléphone'],
  ['manual','Saisie manuelle'],
  ['other','Autre'],
] as const;
const MODE_OPTIONS=['Sur place','À emporter','Livraison','Retrait','Autre'];

type PosItem={id:string;category_id:string;name:string;description?:string;price_minor:number;currency_code:string;image_url?:string|null};
type PosCategory={id:string;name:string};
type PosPayload={catalog?:{id:string;title:string;currency_code:string};categories?:PosCategory[];items?:PosItem[]};

function money(value:number,currency='XOF'){
  if(currency==='XOF')return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(value).replace(/\u202f/g,' ')} F CFA`;
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency}).format(value);
}

export function OpsPosOrderTaking(){
  const [tabHost,setTabHost]=useState<Element|null>(null);
  const [panelHost,setPanelHost]=useState<Element|null>(null);
  const [active,setActive]=useState(false);
  const [payload,setPayload]=useState<PosPayload|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const [cart,setCart]=useState<Record<string,number>>({});
  const [source,setSource]=useState('pos');
  const [flowMode,setFlowMode]=useState('Sur place');
  const [table,setTable]=useState('');
  const [customerName,setCustomerName]=useState('');
  const [customerPhone,setCustomerPhone]=useState('');
  const [note,setNote]=useState('');

  const accessKey=typeof window!=='undefined'&&window.location.pathname.startsWith('/ops/')?decodeURIComponent(window.location.pathname.split('/')[2]||''):'';
  const storageKey=accessKey?`qatalink_ops_pin_${accessKey}`:'';

  useEffect(()=>{
    if(!accessKey)return;
    let timer:any;
    const resolve=()=>{
      const tabs=document.querySelector('.ops-shell .ops-tabs');
      if(!tabs)return;
      setTabHost(tabs);
      let host=document.querySelector('.ops-pos-panel-host');
      if(!host){host=document.createElement('div');host.className='ops-pos-panel-host';tabs.insertAdjacentElement('afterend',host)}
      setPanelHost(host);
    };
    resolve();timer=setInterval(resolve,500);
    return()=>clearInterval(timer);
  },[accessKey]);

  useEffect(()=>{
    document.body.classList.toggle('ops-pos-active',active);
    return()=>document.body.classList.remove('ops-pos-active');
  },[active]);

  async function api(action:string,extra:Record<string,unknown>={}){
    const pin=storageKey?sessionStorage.getItem(storageKey)||'':'';
    if(!pin)throw new Error('CODE_REQUIRED');
    const response=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action,...extra}),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||'ACTION_FAILED');
    return data;
  }

  async function openPos(){
    setActive(true);setError('');
    if(payload)return;
    setLoading(true);
    try{setPayload(await api('pos_catalog'))}catch(err:any){setError(err?.message==='CODE_REQUIRED'?'Ouvrez d’abord l’espace avec votre code d’accès.':'Impossible de charger le catalogue de caisse.')}finally{setLoading(false)}
  }

  function qty(id:string,delta:number){setCart(current=>{const next=Math.max(0,(current[id]||0)+delta);const copy={...current};if(next)copy[id]=next;else delete copy[id];return copy})}
  const items=payload?.items||[];
  const filtered=useMemo(()=>items.filter(item=>(category==='all'||item.category_id===category)&&(!query.trim()||`${item.name} ${item.description||''}`.toLowerCase().includes(query.trim().toLowerCase()))),[items,category,query]);
  const selectedItems=items.filter(item=>cart[item.id]);
  const total=selectedItems.reduce((sum,item)=>sum+item.price_minor*(cart[item.id]||0),0);

  async function createOrder(){
    if(!selectedItems.length)return;
    setBusy(true);setError('');
    try{
      const data=await api('pos_create',{
        items:selectedItems.map(item=>({item_id:item.id,quantity:cart[item.id]})),source,flow_mode:flowMode,table,customer_name:customerName,customer_phone:customerPhone,note,
      });
      setCart({});setTable('');setCustomerName('');setCustomerPhone('');setNote('');setSource('pos');setFlowMode('Sur place');
      setActive(false);
      setTimeout(()=>document.querySelector<HTMLButtonElement>('.ops-header .ops-refresh')?.click(),120);
      alert(`Commande ${data?.order?.order_number||''} enregistrée.`);
    }catch(err:any){setError(err?.message||'Impossible d’enregistrer la commande.')}finally{setBusy(false)}
  }

  if(!accessKey||!tabHost||!panelHost)return null;

  const tabButton=createPortal(<button className={active?'active ops-pos-tab':'ops-pos-tab'} onClick={openPos}><ShoppingCart size={15}/>Prise de commande</button>,tabHost);
  const panel=createPortal(active?<section className="ops-pos-panel">
    <header className="ops-pos-head"><div><span>CAISSE</span><h2>Prise de commande</h2><p>Composez la commande du client directement depuis le catalogue.</p></div><button onClick={()=>setActive(false)} aria-label="Fermer"><X/></button></header>
    {loading?<div className="ops-pos-loading">Chargement du catalogue…</div>:error&&!payload?<div className="ops-pos-error">{error}</div>:<div className="ops-pos-layout">
      <div className="ops-pos-products">
        <div className="ops-pos-tools"><label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un article"/></label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Toutes les catégories</option>{(payload?.categories||[]).map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
        <div className="ops-pos-grid">{filtered.map(item=><article key={item.id} className={cart[item.id]?'selected':''}>{item.image_url?<img src={item.image_url} alt=""/>:<div className="ops-pos-placeholder"/>}<div className="ops-pos-product-copy"><b>{item.name}</b>{item.description&&<small>{item.description}</small>}<strong>{money(item.price_minor,item.currency_code||payload?.catalog?.currency_code||'XOF')}</strong></div><div className="ops-pos-qty"><button onClick={()=>qty(item.id,-1)} disabled={!cart[item.id]}><Minus/></button><span>{cart[item.id]||0}</span><button onClick={()=>qty(item.id,1)}><Plus/></button></div></article>)}</div>
      </div>
      <aside className="ops-pos-cart">
        <div className="ops-pos-cart-title"><ShoppingCart/><div><b>Commande en cours</b><span>{selectedItems.reduce((n,item)=>n+(cart[item.id]||0),0)} article(s)</span></div></div>
        <div className="ops-pos-cart-lines">{selectedItems.length?selectedItems.map(item=><div key={item.id}><span>{cart[item.id]} × {item.name}</span><b>{money(item.price_minor*(cart[item.id]||0),item.currency_code||'XOF')}</b></div>):<p>Ajoutez des produits depuis le catalogue.</p>}</div>
        <div className="ops-pos-total"><span>Total</span><b>{money(total,payload?.catalog?.currency_code||'XOF')}</b></div>
        <div className="ops-pos-fields"><label>Source de la commande<select value={source} onChange={e=>setSource(e.target.value)}>{SOURCE_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Mode<select value={flowMode} onChange={e=>setFlowMode(e.target.value)}>{MODE_OPTIONS.map(value=><option key={value}>{value}</option>)}</select></label><label>Table / référence<input value={table} onChange={e=>setTable(e.target.value)} placeholder="Ex : Table 12"/></label><label>Nom du client<input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Optionnel"/></label><label>Téléphone<input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} inputMode="tel" placeholder="Optionnel"/></label><label>Note<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Cuisson, préférence, précision…"/></label></div>
        {error&&<div className="ops-pos-error">{error}</div>}
        <button className="ops-pos-submit" disabled={!selectedItems.length||busy} onClick={createOrder}>{busy?'Enregistrement…':`Enregistrer la commande · ${money(total,payload?.catalog?.currency_code||'XOF')}`}</button>
      </aside>
    </div>}
  </section>:null,panelHost);

  return <>{tabButton}{panel}</>;
}
