'use client';

import {useEffect,useMemo,useState} from 'react';
import {CheckCircle2,Clock3,LockKeyhole,Printer,RefreshCw,Send,UtensilsCrossed} from 'lucide-react';
import {orderMoney,printOrderReceipt,type PrintableOrder} from '@/lib/order-receipt';

type Order=PrintableOrder&{id:string;flow_fields?:Record<string,string>;customer_name?:string|null;customer_phone?:string|null};

type Payload={catalog?:any;access?:any;orders?:Order[]};
const STATUS_LABELS:Record<string,string>={new:'Nouvelle',preparing:'En préparation',ready:'Prête',completed:'Terminée',cancelled:'Annulée'};

export function TeamOrderConsole({accessKey}:{accessKey:string}){
  const storageKey=useMemo(()=>`qatalink_ops_pin_${accessKey}`,[accessKey]);
  const [pin,setPin]=useState('');
  const [payload,setPayload]=useState<Payload|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(Date.now());

  useEffect(()=>{try{setPin(sessionStorage.getItem(storageKey)||'')}catch{}},[storageKey]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{if(!pin||pin.length<4)return;load(false);const id=setInterval(()=>load(true),5000);return()=>clearInterval(id)},[pin]);

  async function load(silent=false){
    if(!pin)return;if(!silent)setBusy(true);
    const r=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action:'list',limit:120}),cache:'no-store'});
    const d=await r.json().catch(()=>({}));if(!silent)setBusy(false);
    if(!r.ok){setPayload(null);setError('Code incorrect ou accès désactivé.');return}
    try{sessionStorage.setItem(storageKey,pin)}catch{}
    setError('');setPayload(d);
  }

  async function setStatus(orderId:string,status:string){
    const r=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action:'status',order_id:orderId,status})});
    if(r.ok)await load(true);
  }

  function whatsapp(order:Order){
    const phone=String(payload?.catalog?.whatsapp_number||'').replace(/\D/g,'');if(!phone)return;
    const lines=(order.items||[]).map(i=>`${i.quantity} × ${i.name}`).join('\n');
    const msg=`Commande ${order.order_number}\n${lines}${order.total_minor!==null&&order.total_minor!==undefined?`\nTotal : ${orderMoney(order.total_minor,order.currency_code||'XOF')}`:''}${order.table_number?`\nTable : ${order.table_number}`:''}${order.customer_note?`\nNote : ${order.customer_note}`:''}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
  }

  if(!payload)return <main className="ops-shell"><section className="ops-login"><div className="ops-logo"><LockKeyhole/></div><div className="eyebrow">ACCÈS ÉQUIPE QATALINK</div><h1>Commandes & activité</h1><p>Entrez le code transmis par le responsable du catalogue.</p><input value={pin} onChange={e=>setPin(e.target.value)} placeholder="Code d’accès" type="password" autoFocus/><button onClick={()=>load(false)} disabled={busy||pin.length<4}>{busy?'Vérification…':'Ouvrir l’espace'}</button>{error&&<small>{error}</small>}</section></main>;

  const orders=payload.orders||[];
  const today=new Date().toDateString();
  const todayOrders=orders.filter(o=>new Date(o.created_at).toDateString()===today);
  const revenue=todayOrders.reduce((s,o)=>s+Number(o.total_minor||0),0);
  const latest=orders[0];

  return <main className="ops-shell"><header className="ops-header"><div><div className="eyebrow">{payload.access?.label||'ÉQUIPE'}</div><h1>{payload.catalog?.business_name||'Qatalink'}</h1><p>{payload.catalog?.title}</p></div><button className="ops-refresh" onClick={()=>load(false)}><RefreshCw size={16}/>Actualiser</button></header><section className="ops-metrics"><div><b>{todayOrders.length}</b><span>Commandes aujourd’hui</span></div>{payload.access?.can_view_revenue&&<div><b>{orderMoney(revenue,payload.catalog?.currency_code||'XOF')}</b><span>Total enregistré</span></div>}<div><b>{orders.filter(o=>o.status==='new').length}</b><span>À traiter</span></div><div><b>{new Date(now).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</b><span>Mise à jour automatique</span></div></section>{latest&&latest.status==='new'&&<div className="ops-new"><UtensilsCrossed size={18}/><div><b>Nouvelle commande {latest.order_number}</b><span>Elle est prête à être traitée.</span></div></div>}<section className="ops-orders">{orders.length===0?<div className="ops-empty"><CheckCircle2/><h2>Aucune commande pour le moment</h2><p>Les nouvelles commandes apparaîtront ici automatiquement.</p></div>:orders.map(order=><article className={`ops-order status-${order.status}`} key={order.id}><header><div><b>{order.order_number}</b><span>{new Date(order.created_at).toLocaleString('fr-FR')}</span></div><strong>{STATUS_LABELS[order.status||'new']||order.status}</strong></header><div className="ops-order-meta">{order.table_number&&<span>Table {order.table_number}</span>}{order.delivery_address&&<span>{order.delivery_address}</span>}{order.flow_mode&&<span>{order.flow_mode}</span>}</div><div className="ops-lines">{(order.items||[]).map((item,index)=><div key={`${order.id}-${index}`}><span><b>{item.quantity} ×</b> {item.name}</span>{payload.access?.can_view_revenue&&item.line_total_minor!==null&&item.line_total_minor!==undefined&&<strong>{orderMoney(item.line_total_minor,order.currency_code||'XOF')}</strong>}</div>)}</div>{order.customer_note&&<p className="ops-note">Note : {order.customer_note}</p>}{payload.access?.can_view_revenue&&order.total_minor!==null&&order.total_minor!==undefined&&<div className="ops-total"><span>Total</span><b>{orderMoney(order.total_minor,order.currency_code||'XOF')}</b></div>}<footer>{payload.access?.can_update_status&&<select value={order.status||'new'} onChange={e=>setStatus(order.id,e.target.value)}><option value="new">Nouvelle</option><option value="preparing">En préparation</option><option value="ready">Prête</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select>}{payload.access?.can_print&&<button onClick={()=>printOrderReceipt(order,{businessName:payload.catalog?.business_name||'Qatalink',catalogTitle:payload.catalog?.title,receiptTitle:payload.catalog?.receipt_title,receiptFooter:payload.catalog?.receipt_footer,width:'58mm'})}><Printer size={15}/>Imprimer</button>}{payload.catalog?.whatsapp_number&&<button onClick={()=>whatsapp(order)}><Send size={15}/>WhatsApp</button>}</footer></article>)}</section></main>;
}
