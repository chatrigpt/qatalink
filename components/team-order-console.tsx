'use client';

import {useEffect,useMemo,useState} from 'react';
import {
  Bluetooth,
  CheckCircle2,
  ImagePlus,
  LockKeyhole,
  Merge,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Upload,
  UtensilsCrossed,
} from 'lucide-react';
import {orderMoney,printOrderReceipt,type PrintableOrder} from '@/lib/order-receipt';
import {connectEscPosPrinter,escPosDirectSupported,printEscPosReceipt} from '@/lib/escpos-printer';

type Order=PrintableOrder&{
  id:string;
  bill_id?:string|null;
  flow_fields?:Record<string,string>;
  customer_name?:string|null;
  customer_phone?:string|null;
};

type Bill={
  id:string;
  bill_number:string;
  total_minor:number|null;
  currency_code:string;
  table_number?:string|null;
  status:string;
  created_at:string;
};

type EditorCategory={
  id:string;
  name:string;
  description?:string|null;
  is_visible:boolean;
  sort_order?:number;
};

type EditorItem={
  id:string;
  category_id:string;
  name:string;
  description?:string|null;
  price_minor?:number|null;
  promo_price_minor?:number|null;
  currency_code?:string;
  is_available:boolean;
  image_url?:string|null;
};

type Payload={
  catalog?:any;
  access?:any;
  orders?:Order[];
  bills?:Bill[];
  editor?:{categories:EditorCategory[];items:EditorItem[]}|null;
};

const STATUS_LABELS:Record<string,string>={
  new:'Nouvelle',
  preparing:'En préparation',
  ready:'Prête',
  completed:'Terminée',
  cancelled:'Annulée',
};

function mergedReceipt(bill:Bill,orders:Order[]):PrintableOrder&{sourceOrderNumbers:string[]}{
  const related=orders.filter(order=>order.bill_id===bill.id);
  const grouped=new Map<string,{name:string;quantity:number;unit_price_minor?:number|null;line_total_minor:number}>();

  for(const order of related){
    for(const item of order.items||[]){
      const key=`${item.name}|${item.unit_price_minor??''}`;
      const current=grouped.get(key)||{
        name:item.name,
        quantity:0,
        unit_price_minor:item.unit_price_minor,
        line_total_minor:0,
      };
      current.quantity+=Number(item.quantity||0);
      current.line_total_minor+=Number(item.line_total_minor||0);
      grouped.set(key,current);
    }
  }

  return {
    order_number:bill.bill_number,
    created_at:bill.created_at,
    table_number:bill.table_number,
    total_minor:bill.total_minor,
    currency_code:bill.currency_code,
    items:[...grouped.values()],
    customer_note:related.map(order=>order.customer_note).filter(Boolean).join(' / ')||null,
    sourceOrderNumbers:related.map(order=>order.order_number),
  };
}

export function TeamOrderConsole({accessKey}:{accessKey:string}){
  const storageKey=useMemo(()=>`qatalink_ops_pin_${accessKey}`,[accessKey]);
  const [pin,setPin]=useState('');
  const [payload,setPayload]=useState<Payload|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');
  const [now,setNow]=useState(Date.now());
  const [selected,setSelected]=useState<string[]>([]);
  const [tab,setTab]=useState<'orders'|'catalog'>('orders');
  const [printerReady,setPrinterReady]=useState(false);
  const [categories,setCategories]=useState<EditorCategory[]>([]);
  const [items,setItems]=useState<EditorItem[]>([]);
  const [newCategory,setNewCategory]=useState('');
  const [newItem,setNewItem]=useState({name:'',category_id:'',price_minor:'0'});

  useEffect(()=>{
    try{setPin(sessionStorage.getItem(storageKey)||'')}catch{}
  },[storageKey]);

  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!pin||pin.length<4)return;
    void load(false);
    const timer=setInterval(()=>{if(tab==='orders')void load(true)},5000);
    return()=>clearInterval(timer);
    // PIN/accessKey intentionally drive the session refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pin,tab,accessKey]);

  useEffect(()=>{
    const editor=payload?.editor;
    setCategories((editor?.categories||[]).map(category=>({...category})));
    setItems((editor?.items||[]).map(item=>({...item})));
    if(!newItem.category_id&&editor?.categories?.[0]?.id){
      setNewItem(value=>({...value,category_id:editor.categories[0].id}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[payload?.editor]);

  async function api(action:string,extra:Record<string,unknown>={}){
    const response=await fetch('/api/ops/orders',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({access_key:accessKey,pin,action,...extra}),
      cache:'no-store',
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||'ACTION_FAILED');
    return data;
  }

  async function load(silent=false){
    if(!pin)return;
    if(!silent)setBusy('load');
    try{
      const data=await api('list',{limit:150});
      try{sessionStorage.setItem(storageKey,pin)}catch{}
      setError('');
      setPayload(data);
      setSelected(current=>current.filter(id=>(data.orders||[]).some((order:any)=>order.id===id&&!order.bill_id)));
    }catch{
      setPayload(null);
      setError('Code incorrect ou accès désactivé.');
    }finally{
      if(!silent)setBusy('');
    }
  }

  async function setStatus(orderId:string,status:string){
    try{
      await api('status',{order_id:orderId,status});
      await load(true);
    }catch(err:any){alert(err?.message||'Impossible de modifier le statut.')}
  }

  async function mergeSelected(){
    if(selected.length<2)return;
    setBusy('merge');
    try{
      await api('merge',{order_ids:selected});
      setSelected([]);
      await load(true);
    }catch(err:any){
      alert(err?.message||'Impossible de fusionner ces commandes.');
    }finally{
      setBusy('');
    }
  }

  async function edit(editAction:string,data:Record<string,unknown>){
    setBusy(`edit:${editAction}`);
    try{
      await api('edit',{edit_action:editAction,payload:data});
      await load(true);
    }catch(err:any){
      alert(err?.message||'Modification impossible.');
    }finally{
      setBusy('');
    }
  }

  async function connectPrinter(){
    try{
      await connectEscPosPrinter();
      setPrinterReady(true);
    }catch(err:any){
      if(err?.name!=='NotFoundError')alert('Connexion directe impossible sur cet appareil. Utilisez “Imprimer” si nécessaire.');
    }
  }

  async function directPrint(order:PrintableOrder,sourceOrderNumbers?:string[]){
    try{
      await printEscPosReceipt(order,{
        businessName:payload?.catalog?.business_name||'Qatalink',
        catalogTitle:payload?.catalog?.title,
        receiptTitle:payload?.catalog?.receipt_title,
        receiptFooter:payload?.catalog?.receipt_footer,
        sourceOrderNumbers,
      });
      setPrinterReady(true);
    }catch{
      alert('Imprimante directe non connectée. Cliquez sur “Connecter imprimante”, ou utilisez l’impression système.');
    }
  }

  function whatsapp(order:Order){
    if(!payload?.access?.can_use_whatsapp)return;
    const phone=String(payload?.catalog?.whatsapp_number||'').replace(/\D/g,'');
    if(!phone)return;
    const lines=(order.items||[]).map(item=>`${item.quantity} × ${item.name}`).join('\n');
    const message=`Commande ${order.order_number}\n${lines}${order.total_minor!==null&&order.total_minor!==undefined?`\nTotal : ${orderMoney(order.total_minor,order.currency_code||'XOF')}`:''}${order.table_number?`\nTable : ${order.table_number}`:''}${order.customer_note?`\nNote : ${order.customer_note}`:''}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  }

  async function uploadPhoto(itemId:string,file:File){
    setBusy(`photo:${itemId}`);
    try{
      const form=new FormData();
      form.set('access_key',accessKey);
      form.set('pin',pin);
      form.set('item_id',itemId);
      form.set('file',file);
      const response=await fetch('/api/ops/catalog/photo',{method:'POST',body:form});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error||'UPLOAD_FAILED');
      await load(true);
    }catch(err:any){
      alert(err?.message||'Impossible de changer la photo.');
    }finally{
      setBusy('');
    }
  }

  async function generateImage(itemId:string){
    setBusy(`generate:${itemId}`);
    try{
      const response=await fetch('/api/ops/images/generate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({access_key:accessKey,pin,item_id:itemId}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error||'GENERATION_FAILED');

      for(let attempt=0;attempt<50;attempt++){
        await new Promise(resolve=>setTimeout(resolve,3000));
        const statusResponse=await fetch('/api/ops/images/status',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({access_key:accessKey,pin,job_id:data.job_id}),
        });
        const status=await statusResponse.json().catch(()=>({}));
        if(status.status==='completed'){
          await load(true);
          return;
        }
        if(status.status==='failed'){
          throw new Error('La génération a échoué et les crédits ont été remboursés.');
        }
      }
      throw new Error('La génération continue en arrière-plan. Actualisez dans quelques instants.');
    }catch(err:any){
      alert(err?.message||'Génération impossible.');
    }finally{
      setBusy('');
    }
  }

  if(!payload){
    return <main className="ops-shell">
      <section className="ops-login">
        <div className="ops-logo"><LockKeyhole/></div>
        <div className="eyebrow">ACCÈS ÉQUIPE QATALINK</div>
        <h1>Commandes & activité</h1>
        <p>Entrez le code transmis par le responsable du catalogue.</p>
        <input value={pin} onChange={e=>setPin(e.target.value)} placeholder="Code d’accès" type="password" autoFocus/>
        <button onClick={()=>load(false)} disabled={busy==='load'||pin.length<4}>{busy==='load'?'Vérification…':'Ouvrir l’espace'}</button>
        {error&&<small>{error}</small>}
      </section>
    </main>;
  }

  const orders=payload.orders||[];
  const bills=payload.bills||[];
  const canEdit=!!payload.editor;
  const today=new Date().toDateString();
  const todayOrders=orders.filter(order=>new Date(order.created_at).toDateString()===today);
  const revenue=todayOrders.reduce((sum,order)=>sum+Number(order.total_minor||0),0);
  const latest=orders[0];

  return <main className="ops-shell">
    <header className="ops-header">
      <div>
        <div className="eyebrow">{payload.access?.label||'ÉQUIPE'}</div>
        <h1>{payload.catalog?.business_name||'Qatalink'}</h1>
        <p>{payload.catalog?.title}</p>
      </div>
      <div className="ops-header-actions">
        {payload.access?.can_print&&escPosDirectSupported()&&<button className={printerReady?'ops-printer-ready':'ops-refresh'} onClick={connectPrinter}>
          <Bluetooth size={16}/>{printerReady?'Imprimante connectée':'Connecter imprimante'}
        </button>}
        <button className="ops-refresh" onClick={()=>load(false)}><RefreshCw size={16}/>Actualiser</button>
      </div>
    </header>

    <div className="ops-tabs">
      <button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>Commandes</button>
      {canEdit&&<button className={tab==='catalog'?'active':''} onClick={()=>setTab('catalog')}><Settings2 size={15}/>Catalogue</button>}
    </div>

    {tab==='orders'?<>
      <section className="ops-metrics">
        <div><b>{todayOrders.length}</b><span>Commandes aujourd’hui</span></div>
        {payload.access?.can_view_revenue&&<div><b>{orderMoney(revenue,payload.catalog?.currency_code||'XOF')}</b><span>Total enregistré</span></div>}
        <div><b>{orders.filter(order=>order.status==='new').length}</b><span>À traiter</span></div>
        <div><b>{new Date(now).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</b><span>Mise à jour automatique</span></div>
      </section>

      {latest&&latest.status==='new'&&<div className="ops-new"><UtensilsCrossed size={18}/><div><b>Nouvelle commande {latest.order_number}</b><span>Elle est prête à être traitée.</span></div></div>}

      {payload.access?.can_merge_orders&&<div className="ops-mergebar">
        <div><Merge size={17}/><span>Sélectionnez plusieurs commandes non facturées pour créer une seule addition.</span></div>
        <button disabled={selected.length<2||busy==='merge'} onClick={mergeSelected}>Fusionner {selected.length>=2?`(${selected.length})`:''}</button>
      </div>}

      {bills.length>0&&<section className="ops-bills">
        <div className="ops-subhead"><h2>Additions fusionnées</h2><span>{bills.length}</span></div>
        {bills.map(bill=>{
          const receipt=mergedReceipt(bill,orders);
          return <article key={bill.id}>
            <div><b>{bill.bill_number}</b><span>{receipt.sourceOrderNumbers.join(' + ')}</span></div>
            {payload.access?.can_view_revenue&&<strong>{orderMoney(bill.total_minor,bill.currency_code)}</strong>}
            <div className="bill-actions">
              {payload.access?.can_print&&<>
                <button onClick={()=>printOrderReceipt(receipt,{businessName:payload.catalog?.business_name||'Qatalink',catalogTitle:payload.catalog?.title,receiptTitle:payload.catalog?.receipt_title,receiptFooter:payload.catalog?.receipt_footer,width:'58mm'})}><Printer size={14}/>Imprimer</button>
                {escPosDirectSupported()&&<button onClick={()=>directPrint(receipt,receipt.sourceOrderNumbers)}><Bluetooth size={14}/>Direct</button>}
              </>}
            </div>
          </article>;
        })}
      </section>}

      <section className="ops-orders">
        {orders.length===0?<div className="ops-empty"><CheckCircle2/><h2>Aucune commande pour le moment</h2><p>Les nouvelles commandes apparaîtront ici automatiquement.</p></div>:orders.map(order=>{
          const bill=bills.find(entry=>entry.id===order.bill_id);
          return <article className={`ops-order status-${order.status} ${bill?'is-billed':''}`} key={order.id}>
            {payload.access?.can_merge_orders&&!bill&&order.status!=='cancelled'&&<label className="ops-select"><input type="checkbox" checked={selected.includes(order.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,order.id]:current.filter(id=>id!==order.id))}/>Fusionner</label>}
            <header><div><b>{order.order_number}</b><span>{new Date(order.created_at).toLocaleString('fr-FR')}</span></div><strong>{bill?bill.bill_number:STATUS_LABELS[order.status||'new']||order.status}</strong></header>
            <div className="ops-order-meta">{order.table_number&&<span>Table {order.table_number}</span>}{order.delivery_address&&<span>{order.delivery_address}</span>}{order.flow_mode&&<span>{order.flow_mode}</span>}</div>
            <div className="ops-lines">{(order.items||[]).map((item,index)=><div key={`${order.id}-${index}`}><span><b>{item.quantity} ×</b> {item.name}</span>{payload.access?.can_view_revenue&&item.line_total_minor!==null&&item.line_total_minor!==undefined&&<strong>{orderMoney(item.line_total_minor,order.currency_code||'XOF')}</strong>}</div>)}</div>
            {order.customer_note&&<p className="ops-note">Note : {order.customer_note}</p>}
            {payload.access?.can_view_revenue&&order.total_minor!==null&&order.total_minor!==undefined&&<div className="ops-total"><span>Total</span><b>{orderMoney(order.total_minor,order.currency_code||'XOF')}</b></div>}
            <footer>
              {payload.access?.can_update_status&&<select value={order.status||'new'} onChange={e=>setStatus(order.id,e.target.value)}><option value="new">Nouvelle</option><option value="preparing">En préparation</option><option value="ready">Prête</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select>}
              {payload.access?.can_print&&<><button onClick={()=>printOrderReceipt(order,{businessName:payload.catalog?.business_name||'Qatalink',catalogTitle:payload.catalog?.title,receiptTitle:payload.catalog?.receipt_title,receiptFooter:payload.catalog?.receipt_footer,width:'58mm'})}><Printer size={15}/>Imprimer</button>{escPosDirectSupported()&&<button onClick={()=>directPrint(order)}><Bluetooth size={15}/>Direct</button>}</>}
              {payload.access?.can_use_whatsapp&&payload.catalog?.whatsapp_number&&<button onClick={()=>whatsapp(order)}><Send size={15}/>WhatsApp</button>}
            </footer>
          </article>;
        })}
      </section>
    </>:<section className="ops-editor">
      <div className="ops-subhead"><div><h2>Gestion du catalogue</h2><p>Vous voyez uniquement les actions autorisées par le propriétaire.</p></div></div>

      {payload.access?.can_edit_categories&&<div className="editor-panel">
        <h3>Catégories</h3>
        <div className="editor-add"><input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Nouvelle catégorie"/><button disabled={!newCategory.trim()} onClick={async()=>{await edit('category_create',{name:newCategory});setNewCategory('')}}><Plus size={14}/>Ajouter</button></div>
        {categories.map((category,index)=><div className="editor-row" key={category.id}>
          <input value={category.name} onChange={e=>setCategories(current=>current.map((entry,i)=>i===index?{...entry,name:e.target.value}:entry))}/>
          <input value={category.description||''} onChange={e=>setCategories(current=>current.map((entry,i)=>i===index?{...entry,description:e.target.value}:entry))} placeholder="Description"/>
          <label><input type="checkbox" checked={category.is_visible} onChange={e=>setCategories(current=>current.map((entry,i)=>i===index?{...entry,is_visible:e.target.checked}:entry))}/>Visible</label>
          <button onClick={()=>edit('category_update',category as unknown as Record<string,unknown>)}><Save size={14}/>Sauver</button>
        </div>)}
      </div>}

      {(payload.access?.can_edit_items||payload.access?.can_edit_prices||payload.access?.can_edit_photos||payload.access?.can_generate_images)&&<div className="editor-panel">
        <h3>Plats / articles</h3>
        {payload.access?.can_edit_items&&categories.length>0&&<div className="editor-add item-add">
          <input value={newItem.name} onChange={e=>setNewItem(value=>({...value,name:e.target.value}))} placeholder="Nouveau plat"/>
          <select value={newItem.category_id} onChange={e=>setNewItem(value=>({...value,category_id:e.target.value}))}>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select>
          {payload.access?.can_edit_prices&&<input type="number" min="0" value={newItem.price_minor} onChange={e=>setNewItem(value=>({...value,price_minor:e.target.value}))} placeholder="Prix"/>}
          <button disabled={!newItem.name.trim()||!newItem.category_id} onClick={async()=>{await edit('item_create',{name:newItem.name,category_id:newItem.category_id,price_minor:Number(newItem.price_minor||0)});setNewItem(value=>({...value,name:'',price_minor:'0'}))}}><Plus size={14}/>Ajouter</button>
        </div>}

        {items.map((item,index)=><article className="editor-item" key={item.id}>
          {item.image_url&&<img src={item.image_url} alt=""/>}
          <div className="editor-item-fields">
            {payload.access?.can_edit_items?<>
              <input value={item.name} onChange={e=>setItems(current=>current.map((entry,i)=>i===index?{...entry,name:e.target.value}:entry))}/>
              <textarea value={item.description||''} onChange={e=>setItems(current=>current.map((entry,i)=>i===index?{...entry,description:e.target.value}:entry))} placeholder="Description"/>
              <select value={item.category_id} onChange={e=>setItems(current=>current.map((entry,i)=>i===index?{...entry,category_id:e.target.value}:entry))}>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <label><input type="checkbox" checked={item.is_available} onChange={e=>setItems(current=>current.map((entry,i)=>i===index?{...entry,is_available:e.target.checked}:entry))}/>Disponible</label>
            </>:<b>{item.name}</b>}
            {payload.access?.can_edit_prices&&<label>Prix<input type="number" min="0" value={item.price_minor??0} onChange={e=>setItems(current=>current.map((entry,i)=>i===index?{...entry,price_minor:Number(e.target.value)}:entry))}/></label>}
            <div className="editor-actions">
              {(payload.access?.can_edit_items||payload.access?.can_edit_prices)&&<button onClick={()=>edit('item_update',item as unknown as Record<string,unknown>)}><Save size={14}/>Enregistrer</button>}
              {payload.access?.can_edit_photos&&<label className="upload-btn"><Upload size={14}/>{busy===`photo:${item.id}`?'Envoi…':'Changer photo'}<input type="file" accept="image/*" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPhoto(item.id,file);e.currentTarget.value=''}}/></label>}
              {payload.access?.can_generate_images&&<button disabled={busy===`generate:${item.id}`} onClick={()=>generateImage(item.id)}><ImagePlus size={14}/>{busy===`generate:${item.id}`?'Génération…':'Générer image'}</button>}
            </div>
          </div>
        </article>)}
      </div>}
    </section>}
  </main>;
}
