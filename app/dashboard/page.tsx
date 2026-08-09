'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpen, Boxes, CheckCircle2, Clock3, CreditCard, ExternalLink, Eye, ImagePlus, LayoutDashboard, Palette, Plus, QrCode, Save, Settings, Sparkles, Trash2, Upload } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { PricingGate } from '@/components/pricing-gate';
import { createSupabaseBrowserClient } from '@/lib/supabase';

type Sub={plan_code:string;status:string;current_period_end:string|null}|null;
type SectionKey='overview'|'catalogs'|'items'|'appearance'|'qr'|'stats'|'subscription'|'settings';
type Catalog={id:string;title:string;public_slug:string;catalog_type:string;is_active:boolean};
type Category={id:string;name:string;description:string|null;sort_order:number};
type Item={id:string;catalog_id:string;category_id:string|null;name:string;description:string|null;short_description:string|null;price_minor:number|null;currency_code:string;is_available:boolean;sort_order:number;metadata:any;image_url?:string|null};
type Business={id:string;name:string;whatsapp_number:string|null;published:boolean;business_type:string;currency_code:string};

const sectionTitles:Record<SectionKey,{eyebrow:string;title:string}>={
  overview:{eyebrow:'BONJOUR 👋',title:'Votre espace Qatalink'},catalogs:{eyebrow:'CONTENU',title:'Catalogues'},items:{eyebrow:'ÉDITEUR',title:'Articles & catégories'},appearance:{eyebrow:'DESIGN',title:'Apparence'},qr:{eyebrow:'DIFFUSION',title:'QR & partage'},stats:{eyebrow:'PERFORMANCE',title:'Statistiques'},subscription:{eyebrow:'FACTURATION',title:'Abonnement'},settings:{eyebrow:'COMPTE',title:'Paramètres'}
};

function formatRemaining(ms:number){if(ms<=0)return'00 h 00 min 00 s';const t=Math.floor(ms/1000);return`${String(Math.floor(t/3600)).padStart(2,'0')} h ${String(Math.floor((t%3600)/60)).padStart(2,'0')} min ${String(t%60).padStart(2,'0')} s`;}
function money(v:number|null|undefined){return new Intl.NumberFormat('fr-FR').format(Number(v||0)).replace(/\u202f/g,' ')+' F';}

export default function Dashboard(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [session,setSession]=useState<any>(null);
  const [sub,setSub]=useState<Sub>(null);
  const [ready,setReady]=useState(false);
  const [gate,setGate]=useState(false);
  const [section,setSection]=useState<SectionKey>('overview');
  const [now,setNow]=useState(Date.now());
  const [business,setBusiness]=useState<Business|null>(null);
  const [catalogs,setCatalogs]=useState<Catalog[]>([]);
  const [selectedCatalogId,setSelectedCatalogId]=useState<string>('');
  const [categories,setCategories]=useState<Category[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [newCategory,setNewCategory]=useState('');
  const [newItem,setNewItem]=useState({name:'',description:'',price:'',category_id:''});
  const [paymentState,setPaymentState]=useState<'idle'|'pending'|'success'|'error'>('idle');
  const [paymentMessage,setPaymentMessage]=useState('');
  const pollTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const trialActive=!!sub&&sub.plan_code==='trial'&&sub.status==='trialing'&&!!sub.current_period_end&&new Date(sub.current_period_end).getTime()>now;
  const trialExpiresAt=trialActive?sub?.current_period_end||null:null;
  const hasAccess=!!sub&&(sub.status==='active'||trialActive);
  const paidPlan=!!sub&&sub.plan_code!=='trial'&&sub.status==='active';
  const remainingMs=trialExpiresAt?Math.max(0,new Date(trialExpiresAt).getTime()-now):0;
  const planLabel=trialActive?'Essai gratuit 24 h':sub?.plan_code==='static'?'Basic':sub?.plan_code==='interactive'?'Interactif':sub?.plan_code==='linkhub'?'Vitrine':'Gratuit';
  const selectedCatalog=catalogs.find(c=>c.id===selectedCatalogId)||null;

  async function refreshSubscription(){
    const {data}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
    const candidate=data?.[0]||null;
    const valid=candidate&&(!candidate.current_period_end||new Date(candidate.current_period_end).getTime()>Date.now())?candidate:null;
    setSub(valid as Sub);return valid as Sub;
  }

  async function loadContent(catalogId:string){
    if(!catalogId){setCategories([]);setItems([]);return;}
    const [{data:cats},{data:itemRows}]=await Promise.all([
      supabase.from('categories').select('id,name,description,sort_order').eq('catalog_id',catalogId).order('sort_order'),
      supabase.from('items').select('id,catalog_id,category_id,name,description,short_description,price_minor,currency_code,is_available,sort_order,metadata').eq('catalog_id',catalogId).order('sort_order')
    ]);
    const baseItems=(itemRows||[]) as Item[];
    let imageMap:Record<string,string>={};
    if(baseItems.length){
      const {data:imgs}=await supabase.from('item_images').select('item_id,image_url,is_primary,created_at').in('item_id',baseItems.map(i=>i.id)).order('created_at',{ascending:false});
      for(const img of imgs||[])if(!imageMap[img.item_id]&&(img.is_primary||!imageMap[img.item_id]))imageMap[img.item_id]=img.image_url;
    }
    setCategories((cats||[]) as Category[]);
    setItems(baseItems.map(i=>({...i,image_url:imageMap[i.id]||null})));
  }

  async function loadWorkspace(preferredCatalog?:string){
    const {data:owned}=await supabase.from('businesses').select('id,name,whatsapp_number,published,business_type,currency_code').order('created_at',{ascending:true}).limit(1);
    const b=owned?.[0] as Business|undefined;
    setBusiness(b||null);
    if(!b){setCatalogs([]);setCategories([]);setItems([]);return;}
    const {data:catalogRows}=await supabase.from('catalogs').select('id,title,public_slug,catalog_type,is_active').eq('business_id',b.id).order('created_at',{ascending:false});
    const list=(catalogRows||[]) as Catalog[];setCatalogs(list);
    const chosen=(preferredCatalog&&list.some(c=>c.id===preferredCatalog)?preferredCatalog:selectedCatalogId&&list.some(c=>c.id===selectedCatalogId)?selectedCatalogId:list[0]?.id)||'';
    setSelectedCatalogId(chosen);await loadContent(chosen);
  }

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      const {data:{session:s}}=await supabase.auth.getSession();
      if(!s){window.location.href='/login';return;} if(!mounted)return; setSession(s);
      await refreshSubscription();
      const params=new URLSearchParams(window.location.search);
      const requested=params.get('tab') as SectionKey|null;if(requested&&requested in sectionTitles)setSection(requested);
      await loadWorkspace(params.get('catalog')||undefined);
      setReady(true);
      const reminder=localStorage.getItem('qatalink_trial_reminder_on_arrival');if(reminder){localStorage.removeItem('qatalink_trial_reminder_on_arrival');setGate(true);}
      const pending=JSON.parse(localStorage.getItem('qatalink_pending_image_jobs')||'[]');if(Array.isArray(pending)&&pending.length)pollJobs(pending,s.access_token);
      const cartId=localStorage.getItem('qatalink_maketou_cart_id');if(params.get('payment')==='pending'&&cartId)pollPayment(cartId,s.access_token);
    })();
    return()=>{mounted=false;if(pollTimer.current)clearTimeout(pollTimer.current)};
  },[]);

  useEffect(()=>{if(!trialActive)return;const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[trialActive]);
  useEffect(()=>{if(sub?.plan_code==='trial'&&sub.current_period_end&&new Date(sub.current_period_end).getTime()<=now){setSub(null);setGate(true)}},[now,sub]);

  async function pollPayment(cartId:string,accessToken:string){
    setPaymentState('pending');setPaymentMessage('Validation de votre paiement Maketou…');let tries=0;
    const run=async()=>{tries++;try{const r=await fetch('/api/payment/maketou/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({cart_id:cartId})});const data=await r.json();if(data.status==='completed'){localStorage.removeItem('qatalink_maketou_cart_id');await refreshSubscription();setPaymentState('success');setPaymentMessage('Paiement confirmé. Votre formule Qatalink est active.');window.history.replaceState({},'', '/dashboard');return;}if(tries<36)pollTimer.current=setTimeout(run,5000);else{setPaymentState('error');setPaymentMessage('Le paiement prend plus de temps que prévu. Rechargez dans quelques instants.')}}catch{if(tries<36)pollTimer.current=setTimeout(run,5000);else setPaymentState('error')}};run();
  }

  async function pollJobs(jobIds:string[],token?:string){
    const accessToken=token||session?.access_token;if(!accessToken||!jobIds.length)return;
    const r=await fetch('/api/images/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({job_ids:jobIds})});
    const data=await r.json().catch(()=>null);if(!r.ok)return;
    const results=data?.results||[];const remaining=results.filter((x:any)=>x.status==='processing').map((x:any)=>x.job_id);
    const completed=results.filter((x:any)=>x.status==='completed').length;if(completed){setNotice(`${completed} illustration(s) prête(s) et sauvegardée(s) dans Supabase.`);await loadContent(selectedCatalogId)}
    if(remaining.length){localStorage.setItem('qatalink_pending_image_jobs',JSON.stringify(remaining));pollTimer.current=setTimeout(()=>pollJobs(remaining,accessToken),3000)}else localStorage.removeItem('qatalink_pending_image_jobs');
  }

  function requireAccess(){if(!hasAccess){setGate(true);return false}return true}
  function afterAction(){if(trialActive)setTimeout(()=>setGate(true),250)}
  function goSection(key:SectionKey){setSection(key);window.history.replaceState({},'',`/dashboard?tab=${key}${selectedCatalogId?`&catalog=${selectedCatalogId}`:''}`)}
  function goCreate(){if(!requireAccess())return;if(trialActive)localStorage.setItem('qatalink_trial_reminder_on_arrival','1');window.location.href='/create'}

  async function addCategory(){if(!requireAccess()||!selectedCatalogId||!newCategory.trim())return;setBusy('category');const {error}=await supabase.from('categories').insert({catalog_id:selectedCatalogId,name:newCategory.trim(),sort_order:categories.length+1,is_visible:true});setBusy('');if(error){setNotice(error.message);return}setNewCategory('');await loadContent(selectedCatalogId);afterAction()}
  async function addItem(){if(!requireAccess()||!selectedCatalogId||!newItem.name.trim())return;setBusy('item');const {data,error}=await supabase.from('items').insert({catalog_id:selectedCatalogId,category_id:newItem.category_id||categories[0]?.id||null,name:newItem.name.trim(),item_type:'product',description:newItem.description.trim()||null,short_description:newItem.description.trim()||null,price_minor:Math.max(0,Math.round(Number(newItem.price||0))),currency_code:business?.currency_code||'XOF',is_available:true,sort_order:items.length+1,metadata:{image_prompt:''}}).select('id').single();setBusy('');if(error){setNotice(error.message);return}setNewItem({name:'',description:'',price:'',category_id:''});await loadContent(selectedCatalogId);setNotice('Article ajouté.');afterAction();return data?.id}
  async function saveItem(item:Item){if(!requireAccess())return;setBusy(`save-${item.id}`);const {error}=await supabase.from('items').update({name:item.name,description:item.description||null,short_description:item.description||null,price_minor:Number(item.price_minor||0),category_id:item.category_id,is_available:item.is_available,updated_at:new Date().toISOString()}).eq('id',item.id);setBusy('');setNotice(error?error.message:'Article enregistré.');if(!error)afterAction()}
  async function deleteItem(id:string){if(!requireAccess()||!confirm('Supprimer cet article ?'))return;const {error}=await supabase.from('items').delete().eq('id',id);if(error){setNotice(error.message);return}await loadContent(selectedCatalogId);afterAction()}
  async function uploadItemImage(itemId:string,file:File){if(!requireAccess()||!session)return;setBusy(`upload-${itemId}`);const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${session.user.id}/${itemId}/${Date.now()}-${safe}`;const up=await supabase.storage.from('catalog-assets').upload(path,file,{contentType:file.type||'image/jpeg'});if(up.error){setBusy('');setNotice(up.error.message);return}const {data:url}=supabase.storage.from('catalog-assets').getPublicUrl(path);await supabase.from('item_images').update({is_primary:false}).eq('item_id',itemId).eq('is_primary',true);const {error}=await supabase.from('item_images').insert({item_id:itemId,image_url:url.publicUrl,storage_path:path,alt_text:items.find(i=>i.id===itemId)?.name||'Article',is_primary:true,source:'uploaded',generation_status:'completed'});setBusy('');if(error){setNotice(error.message);return}await loadContent(selectedCatalogId);afterAction()}
  async function generateImages(itemIds:string[]){if(!requireAccess()||!session||!itemIds.length)return;setBusy('generate');const r=await fetch('/api/images/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({item_ids:itemIds})});const data=await r.json();setBusy('');if(!r.ok){setNotice(data.error||'Impossible de lancer les illustrations.');return}const jobs=(data.jobs||[]).map((j:any)=>j.job_id).filter(Boolean);if(jobs.length){localStorage.setItem('qatalink_pending_image_jobs',JSON.stringify(jobs));setNotice(`${jobs.length} illustration(s) en cours…`);pollJobs(jobs)}afterAction()}
  async function publish(){if(!requireAccess()||!business||!selectedCatalog)return;setBusy('publish');const [{error:bErr},{error:cErr}]=await Promise.all([supabase.from('businesses').update({published:true}).eq('id',business.id),supabase.from('catalogs').update({is_active:true}).eq('id',selectedCatalog.id)]);setBusy('');if(bErr||cErr){setNotice(bErr?.message||cErr?.message||'Erreur');return}setBusiness({...business,published:true});setNotice('Catalogue publié.');afterAction()}
  async function saveBusiness(){if(!requireAccess()||!business)return;setBusy('business');const {error}=await supabase.from('businesses').update({name:business.name,whatsapp_number:business.whatsapp_number||null}).eq('id',business.id);setBusy('');setNotice(error?error.message:'Informations enregistrées.');if(!error)afterAction()}

  const navItems=[{key:'overview' as SectionKey,label:'Vue d’ensemble',icon:<LayoutDashboard size={17}/>},{key:'catalogs' as SectionKey,label:'Catalogues',icon:<BookOpen size={17}/>},{key:'items' as SectionKey,label:'Articles & catégories',icon:<Boxes size={17}/>},{key:'appearance' as SectionKey,label:'Apparence',icon:<Palette size={17}/>},{key:'qr' as SectionKey,label:'QR & partage',icon:<QrCode size={17}/>},{key:'stats' as SectionKey,label:'Statistiques',icon:<BarChart3 size={17}/>},{key:'subscription' as SectionKey,label:'Abonnement',icon:<CreditCard size={17}/>},{key:'settings' as SectionKey,label:'Paramètres',icon:<Settings size={17}/>}];

  if(!ready)return <div className="auth-wrap"><div className="auth-card"><b>Chargement du dashboard…</b></div></div>;

  return <div className="dashboard-shell">
    <aside className="sidebar"><Link className="brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link><nav className="side-nav">{navItems.map(n=><button key={n.key} className={'side-item '+(section===n.key?'active':'')} onClick={()=>goSection(n.key)}>{n.icon}{n.label}</button>)}</nav></aside>
    <main className="dash-main">
      <div className="dash-top"><div><div className="eyebrow">{sectionTitles[section].eyebrow}</div><h1>{sectionTitles[section].title}</h1><div className={'account-badge '+(paidPlan?'active':'free')}>{planLabel}</div></div><div className="actions"><ThemeToggle/><button className="btn btn-primary" onClick={goCreate}><Plus size={17}/>Nouveau catalogue</button></div></div>
      <div className="mobile-dashboard-nav">{navItems.map(n=><button key={n.key} className={'mobile-dashboard-tab '+(section===n.key?'active':'')} onClick={()=>goSection(n.key)}>{n.icon}<span>{n.label}</span></button>)}</div>
      {trialActive&&<div className="trial-strip"><Clock3 size={20}/><div><b>Essai complet en cours</b><span>Sans abonnement, votre catalogue public sera indisponible à la fin du compteur.</span></div><strong>{formatRemaining(remainingMs)}</strong><button className="btn btn-primary" onClick={()=>setGate(true)}>S’abonner</button></div>}
      {paymentState!=='idle'&&<div className={`payment-banner ${paymentState}`}><b>{paymentState==='pending'?'Paiement en cours':paymentState==='success'?'Paiement confirmé':'Vérification'}</b><span>{paymentMessage}</span></div>}
      {notice&&<div className="dashboard-notice"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}>×</button></div>}
      {!hasAccess&&section!=='subscription'&&<div className="free-banner"><div><b>Votre essai est terminé.</b><span>Vos données restent enregistrées, mais la modification et la publication sont suspendues.</span></div><button className="btn btn-primary" onClick={()=>setGate(true)}>Voir les offres</button></div>}

      {section==='overview'&&<Overview business={business} catalogs={catalogs} items={items} selected={selectedCatalog} goItems={()=>goSection('items')} goCreate={goCreate} publish={publish} busy={busy}/>} 
      {section==='catalogs'&&<CatalogsPanel catalogs={catalogs} selectedId={selectedCatalogId} select={async id=>{setSelectedCatalogId(id);await loadContent(id);goSection('items')}} goCreate={goCreate}/>} 
      {section==='items'&&<ItemsEditor catalog={selectedCatalog} catalogs={catalogs} selectCatalog={async id=>{setSelectedCatalogId(id);await loadContent(id)}} categories={categories} items={items} setItems={setItems} newCategory={newCategory} setNewCategory={setNewCategory} addCategory={addCategory} newItem={newItem} setNewItem={setNewItem} addItem={addItem} saveItem={saveItem} deleteItem={deleteItem} uploadItemImage={uploadItemImage} generateImages={generateImages} busy={busy}/>} 
      {section==='appearance'&&<AppearancePanel/>}
      {section==='qr'&&<SharePanel catalog={selectedCatalog} business={business} publish={publish} busy={busy}/>} 
      {section==='stats'&&<StatsPanel/>}
      {section==='subscription'&&<SubscriptionPanel planLabel={planLabel} trialActive={trialActive} remaining={formatRemaining(remainingMs)} openPlans={()=>setGate(true)}/>} 
      {section==='settings'&&<SettingsPanel business={business} setBusiness={setBusiness} save={saveBusiness} busy={busy}/>} 
    </main>
    <PricingGate open={gate} onClose={()=>setGate(false)} title={trialActive?'Ne laissez pas votre catalogue expirer':'Choisissez une formule pour continuer'} trialActive={trialActive} trialExpiresAt={trialExpiresAt}/>
  </div>
}

function Overview({business,catalogs,items,selected,goItems,goCreate,publish,busy}:{business:Business|null;catalogs:Catalog[];items:Item[];selected:Catalog|null;goItems:()=>void;goCreate:()=>void;publish:()=>void;busy:string}){
  return <div className="section-stack"><div className="metric-grid"><Metric value={String(catalogs.length)} label="Catalogues"/><Metric value={String(items.length)} label="Articles"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ouvertures WhatsApp"/></div><div className="panel-grid"><section className="card"><div className="section-toolbar"><div><div className="eyebrow">CATALOGUE ACTUEL</div><h3>{selected?.title||'Aucun catalogue'}</h3></div>{selected&&<span className="tag">{business?.published?'Publié':'Brouillon'}</span>}</div>{items.length?items.slice(0,5).map(i=><div className="list-row" key={i.id}>{i.image_url?<img className="thumb-img" src={i.image_url} alt=""/>:<div className="thumb"/>}<div><b>{i.name}</b><div className="muted-small">{i.description||'Sans description'}</div></div><b>{money(i.price_minor)}</b></div>):<div className="empty-state"><BookOpen size={30}/><b>Commencez votre catalogue</b><span>Importez une image, collez du texte ou créez tout manuellement.</span><button className="btn btn-primary" onClick={goCreate}>Créer</button></div>} {selected&&<div className="row-actions"><button className="btn btn-ghost" onClick={goItems}>Modifier</button><button className="btn btn-primary" disabled={busy==='publish'} onClick={publish}><Eye size={16}/>Publier</button></div>}</section><section className="card"><div className="eyebrow">APERÇU MOBILE</div><div className="mobile-preview"><div className="preview-cover"/><b>{business?.name||'Votre entreprise'}</b><div className="preview-cat"><span className="tag">Catalogue</span></div>{items.slice(0,4).map(i=><div className="preview-item" key={i.id}>{i.image_url?<img className="preview-img-real" src={i.image_url} alt=""/>:<div className="preview-img"/>}<div><b>{i.name}</b><small>{i.description||'Description'}</small><strong>{money(i.price_minor)}</strong></div></div>)}</div></section></div></div>
}

function CatalogsPanel({catalogs,selectedId,select,goCreate}:{catalogs:Catalog[];selectedId:string;select:(id:string)=>void;goCreate:()=>void}){return <div className="section-stack"><div className="section-toolbar"><div><h3>Vos menus et catalogues</h3><p>Choisissez un catalogue pour l’éditer.</p></div><button className="btn btn-primary" onClick={goCreate}><Plus size={17}/>Créer</button></div><div className="catalog-grid">{catalogs.map(c=><button key={c.id} className={'catalog-card '+(selectedId===c.id?'selected-catalog':'')} onClick={()=>select(c.id)}><div className="catalog-cover"/><span className="tag">{c.catalog_type}</span><h3>{c.title}</h3><p>/{c.public_slug}</p></button>)}{!catalogs.length&&<div className="card empty-wide"><BookOpen size={36}/><h3>Aucun catalogue</h3><button className="btn btn-primary" onClick={goCreate}>Créer le premier</button></div>}</div></div>}

function ItemsEditor(props:{catalog:Catalog|null;catalogs:Catalog[];selectCatalog:(id:string)=>void;categories:Category[];items:Item[];setItems:React.Dispatch<React.SetStateAction<Item[]>>;newCategory:string;setNewCategory:(v:string)=>void;addCategory:()=>void;newItem:any;setNewItem:(v:any)=>void;addItem:()=>void;saveItem:(i:Item)=>void;deleteItem:(id:string)=>void;uploadItemImage:(id:string,file:File)=>void;generateImages:(ids:string[])=>void;busy:string}){
  const {catalog,catalogs,selectCatalog,categories,items,setItems,newCategory,setNewCategory,addCategory,newItem,setNewItem,addItem,saveItem,deleteItem,uploadItemImage,generateImages,busy}=props;
  const missing=items.filter(i=>!i.image_url).map(i=>i.id);
  return <div className="section-stack"><div className="editor-head"><select className="input" value={catalog?.id||''} onChange={e=>selectCatalog(e.target.value)}>{catalogs.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>{missing.length>0&&<button className="btn btn-ghost" disabled={busy==='generate'} onClick={()=>generateImages(missing)}><Sparkles size={17}/>{busy==='generate'?'Lancement…':`Illustrer les ${missing.length} sans image`}</button>}</div>
    {!catalog?<div className="card empty-wide">Créez d’abord un catalogue.</div>:<>
      <section className="card compact-form"><div><div className="eyebrow">CATÉGORIES</div><h3>Ajouter une catégorie</h3></div><div className="inline-form"><input className="input" value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Ex : Boissons"/><button className="btn btn-primary" onClick={addCategory}>Ajouter</button></div><div className="category-pills">{categories.map(c=><span className="tag" key={c.id}>{c.name}</span>)}</div></section>
      <section className="card compact-form"><div><div className="eyebrow">NOUVEL ARTICLE</div><h3>Ajouter manuellement</h3></div><div className="item-create-grid"><input className="input" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} placeholder="Nom de l’article"/><input className="input" type="number" min="0" value={newItem.price} onChange={e=>setNewItem({...newItem,price:e.target.value})} placeholder="Prix FCFA"/><select className="input" value={newItem.category_id} onChange={e=>setNewItem({...newItem,category_id:e.target.value})}><option value="">Catégorie</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})} placeholder="Description"/><button className="btn btn-primary" disabled={busy==='item'} onClick={addItem}><Plus size={17}/>Ajouter</button></div></section>
      <div className="editor-items">{items.map((item,idx)=><article className="item-editor-card" key={item.id}><div className="item-media">{item.image_url?<img src={item.image_url} alt={item.name}/>:<div className="item-media-empty"><ImagePlus size={30}/><span>Sans image</span></div>}<label className="mini-upload"><Upload size={15}/>Importer<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)uploadItemImage(item.id,f)}}/></label><button className="mini-generate" disabled={busy==='generate'} onClick={()=>generateImages([item.id])}><Sparkles size={15}/>Générer</button></div><div className="item-fields"><input className="input" value={item.name} onChange={e=>setItems(prev=>prev.map((x,j)=>j===idx?{...x,name:e.target.value}:x))}/><textarea className="input" rows={3} value={item.description||''} onChange={e=>setItems(prev=>prev.map((x,j)=>j===idx?{...x,description:e.target.value}:x))}/><div className="item-row"><input className="input" type="number" value={item.price_minor||0} onChange={e=>setItems(prev=>prev.map((x,j)=>j===idx?{...x,price_minor:Number(e.target.value)}:x))}/><select className="input" value={item.category_id||''} onChange={e=>setItems(prev=>prev.map((x,j)=>j===idx?{...x,category_id:e.target.value||null}:x))}><option value="">Sans catégorie</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><label className="availability"><input type="checkbox" checked={item.is_available} onChange={e=>setItems(prev=>prev.map((x,j)=>j===idx?{...x,is_available:e.target.checked}:x))}/>Disponible</label><div className="row-actions"><button className="btn btn-ghost" disabled={busy===`save-${item.id}`} onClick={()=>saveItem(item)}><Save size={16}/>Enregistrer</button><button className="btn danger-btn" onClick={()=>deleteItem(item.id)}><Trash2 size={16}/>Supprimer</button></div></div></article>)}{!items.length&&<div className="card empty-wide"><Boxes size={34}/><h3>Aucun article</h3><p>Ajoutez-les manuellement ou importez un menu complet.</p></div>}</div>
    </>}</div>
}

function AppearancePanel(){return <div className="theme-grid"><div className="theme-card"><div className="theme-phone"><div/><span/><span/><span/></div><b>Épuré</b><small>Rouge & blanc</small></div><div className="theme-card warm"><div className="theme-phone"><div/><span/><span/><span/></div><b>Gourmet</b><small>Chaleureux</small></div><div className="theme-card dark"><div className="theme-phone"><div/><span/><span/><span/></div><b>Premium</b><small>Sombre</small></div></div>}
function SharePanel({catalog,business,publish,busy}:{catalog:Catalog|null;business:Business|null;publish:()=>void;busy:string}){const url=catalog&&typeof window!=='undefined'?`${window.location.origin}/c/${catalog.public_slug}`:'';return <div className="panel-grid"><section className="card qr-card"><QrCode size={130}/><h3>QR permanent</h3><p>Le QR pointera vers le lien public stable de ce catalogue.</p><button className="btn btn-primary" disabled={!catalog||busy==='publish'} onClick={publish}>Publier le catalogue</button></section><section className="card"><div className="eyebrow">LIEN PUBLIC</div><h3>{catalog?.title||'Aucun catalogue'}</h3><div className="share-link">{url||'Créez un catalogue pour obtenir un lien.'}</div>{url&&<a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Ouvrir</a>}<p className="muted-small">Statut entreprise : {business?.published?'publiée':'brouillon'}</p></section></div>}
function StatsPanel(){return <div className="section-stack"><div className="metric-grid"><Metric value="0" label="Visites"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ajouts au panier"/><Metric value="0" label="WhatsApp"/></div><section className="card"><h3>Activité</h3><div className="chart-placeholder">{Array.from({length:8}).map((_,i)=><span key={i}/>)}</div><p className="muted-small">Les statistiques seront alimentées par les catalogues publics.</p></section></div>}
function SubscriptionPanel({planLabel,trialActive,remaining,openPlans}:{planLabel:string;trialActive:boolean;remaining:string;openPlans:()=>void}){return <div className="section-stack"><section className="subscription-hero card"><div><div className="eyebrow">FORMULE ACTUELLE</div><h2>{planLabel}</h2><p>{trialActive?`Essai complet. Temps restant : ${remaining}`:'Gérez ici votre formule Qatalink.'}</p></div><button className="btn btn-primary" onClick={openPlans}>Voir les formules</button></section><div className="metric-grid"><Metric value="3 500 F" label="Basic / mois"/><Metric value="5 000 F" label="Interactif / mois"/><Metric value="7 500 F" label="Vitrine / mois"/><Metric value="1 mois" label="Offert en annuel"/></div></div>}
function SettingsPanel({business,setBusiness,save,busy}:{business:Business|null;setBusiness:(b:Business|null)=>void;save:()=>void;busy:string}){if(!business)return <div className="card">Votre espace entreprise est en préparation.</div>;return <section className="card"><div className="section-toolbar"><div><h3>Informations de l’entreprise</h3><p>Nom et WhatsApp affichés sur votre catalogue public.</p></div><button className="btn btn-primary" disabled={busy==='business'} onClick={save}><Save size={16}/>Enregistrer</button></div><div className="settings-grid"><div className="field"><label>Nom</label><input className="input" value={business.name} onChange={e=>setBusiness({...business,name:e.target.value})}/></div><div className="field"><label>WhatsApp</label><input className="input" value={business.whatsapp_number||''} onChange={e=>setBusiness({...business,whatsapp_number:e.target.value})} placeholder="+225..."/></div><div className="field"><label>Type</label><input className="input" value={business.business_type} disabled/></div><div className="field"><label>Devise</label><input className="input" value={business.currency_code} disabled/></div></div></section>}
function Metric({value,label}:{value:string;label:string}){return <div className="metric"><b>{value}</b><span>{label}</span></div>}
