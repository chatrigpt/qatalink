'use client';

import {useEffect,useMemo,useState} from 'react';
import {Copy,ExternalLink,KeyRound,MessageCircle,Printer,RefreshCw,Send,ShieldCheck,ShoppingBag,Trash2} from 'lucide-react';
import {createPortal} from 'react-dom';
import {createSupabaseBrowserClient} from '@/lib/supabase';
import {orderMoney,printOrderReceipt,type PrintableOrder} from '@/lib/order-receipt';

type CatalogSettings={id:string;business_id:string;title:string;public_slug:string;order_whatsapp_number:string|null;order_capture_enabled:boolean;order_whatsapp_enabled:boolean;receipt_title:string|null;receipt_footer:string|null};
type Order=PrintableOrder&{id:string;business_id:string;catalog_id:string;flow_fields?:Record<string,string>;customer_name?:string|null;customer_phone?:string|null};
type Access={id:string;access_key:string;label:string;enabled:boolean;can_view_revenue:boolean;can_update_status:boolean;can_print:boolean};
const STATUS_LABELS:Record<string,string>={new:'Nouvelle',preparing:'En préparation',ready:'Prête',completed:'Terminée',cancelled:'Annulée'};

function currentSlug(){const active=document.querySelector('.catalog-v2-card.active');return String(active?.querySelector('small')?.textContent||'').replace(/^\/(?:q|c)\//,'').trim()}

export function OrderOperationsCenter(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [catalogHost,setCatalogHost]=useState<Element|null>(null);
  const [statsHost,setStatsHost]=useState<Element|null>(null);
  const [catalog,setCatalog]=useState<CatalogSettings|null>(null);
  const [businessPhone,setBusinessPhone]=useState('');
  const [orders,setOrders]=useState<Order[]>([]);
  const [accesses,setAccesses]=useState<Access[]>([]);
  const [itemsByOrder,setItemsByOrder]=useState<Record<string,any[]>>({});
  const [busy,setBusy]=useState('');
  const [label,setLabel]=useState('Caisse');
  const [pin,setPin]=useState('');
  const [lastCreated,setLastCreated]=useState<{url:string;pin:string}|null>(null);

  useEffect(()=>{
    let cancelled=false;
    const resolve=async()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      const catalogCard=document.querySelector('.catalog-v2-grid + .dash-card');
      setCatalogHost(title==='Vos catalogues'?catalogCard:null);
      setStatsHost(title==='Statistiques'?document.querySelector('.dash-v3-main .dash-section'):null);
      let id=new URLSearchParams(window.location.search).get('catalog')||'';
      const slug=currentSlug();
      let q=supabase.from('catalogs').select('id,business_id,title,public_slug,order_whatsapp_number,order_capture_enabled,order_whatsapp_enabled,receipt_title,receipt_footer').limit(1);
      if(slug)q=q.eq('public_slug',slug);else if(id)q=q.eq('id',id);else return;
      const {data}=await q.maybeSingle();if(cancelled||!data)return;
      setCatalog(data as CatalogSettings);
    };
    resolve();
    const mo=new MutationObserver(()=>setTimeout(resolve,25));mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',resolve,true);
    return()=>{cancelled=true;mo.disconnect();document.removeEventListener('click',resolve,true)};
  },[supabase]);

  useEffect(()=>{if(!catalog)return;loadAll();const id=setInterval(loadOrders,5000);return()=>clearInterval(id)},[catalog?.id]);

  async function loadAll(){await Promise.all([loadOrders(),loadAccesses(),loadBusiness()])}
  async function loadBusiness(){if(!catalog)return;const {data}=await supabase.from('businesses').select('whatsapp_number').eq('id',catalog.business_id).maybeSingle();setBusinessPhone(String(data?.whatsapp_number||''))}
  async function loadAccesses(){if(!catalog)return;const {data}=await supabase.from('catalog_team_access').select('id,access_key,label,enabled,can_view_revenue,can_update_status,can_print').eq('catalog_id',catalog.id).order('created_at',{ascending:false});setAccesses((data||[]) as Access[])}
  async function loadOrders(){if(!catalog)return;const {data}=await supabase.from('orders').select('*').eq('catalog_id',catalog.id).order('created_at',{ascending:false}).limit(100);const rows=(data||[]) as Order[];setOrders(rows);const ids=rows.map(o=>o.id);if(!ids.length){setItemsByOrder({});return}const {data:itemRows}=await supabase.from('order_items').select('order_id,item_name_snapshot,quantity,unit_price_minor,line_total_minor,currency_code,created_at').in('order_id',ids).order('created_at');const map:Record<string,any[]>={};for(const x of itemRows||[])(map[x.order_id] ||= []).push({name:x.item_name_snapshot,quantity:x.quantity,unit_price_minor:x.unit_price_minor,line_total_minor:x.line_total_minor,currency_code:x.currency_code});setItemsByOrder(map)}

  async function saveSettings(){if(!catalog)return;setBusy('settings');const {error}=await supabase.from('catalogs').update({order_whatsapp_number:catalog.order_whatsapp_number||null,order_capture_enabled:catalog.order_capture_enabled,order_whatsapp_enabled:catalog.order_whatsapp_enabled,receipt_title:catalog.receipt_title||null,receipt_footer:catalog.receipt_footer||null}).eq('id',catalog.id);setBusy('');if(error)alert(error.message);else alert('Réglages des commandes enregistrés.')}
  async function createAccess(){if(!catalog||pin.length<4)return;setBusy('access');const {data,error}=await supabase.rpc('create_catalog_team_access',{p_catalog_id:catalog.id,p_label:label,p_pin:pin,p_can_view_revenue:true,p_can_update_status:true,p_can_print:true});setBusy('');if(error){alert(error.message);return}const url=`https://qatalink.com/ops/${data.access_key}`;setLastCreated({url,pin});setPin('');await loadAccesses()}
  async function revokeAccess(id:string){if(!confirm('Désactiver cet accès équipe ?'))return;await supabase.from('catalog_team_access').update({enabled:false}).eq('id',id);await loadAccesses()}
  async function updateStatus(id:string,status:string){await supabase.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);await loadOrders()}
  function copy(value:string){navigator.clipboard?.writeText(value)}
  function sendWhatsApp(order:Order){const phone=String(catalog?.order_whatsapp_number||businessPhone||'').replace(/\D/g,'');if(!phone)return;const itemLines=(itemsByOrder[order.id]||[]).map(i=>`${i.quantity} × ${i.name}`).join('\n');const msg=`Commande ${order.order_number}\n${itemLines}\nTotal : ${orderMoney(order.total_minor,order.currency_code||'XOF')}${order.table_number?`\nTable : ${order.table_number}`:''}${order.customer_note?`\nNote : ${order.customer_note}`:''}`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer')}
  function printable(order:Order){return {...order,items:itemsByOrder[order.id]||[]}}

  if(!catalog)return null;

  const settingsUi=<div className="order-settings-block"><div className="order-section-head"><div><span className="eyebrow">COMMANDES & WHATSAPP</span><h3>Réception des commandes</h3><p>Chaque catalogue peut utiliser son propre numéro et enregistrer toutes les commandes avant WhatsApp.</p></div><ShoppingBag/></div><div className="order-settings-grid"><label>WhatsApp de ce catalogue<input value={catalog.order_whatsapp_number||''} onChange={e=>setCatalog({...catalog,order_whatsapp_number:e.target.value})} placeholder={businessPhone||'+225…'}/><small>Laissez vide pour utiliser le numéro général de l’entreprise.</small></label><label>Titre du ticket<input value={catalog.receipt_title||''} onChange={e=>setCatalog({...catalog,receipt_title:e.target.value})} placeholder="Nom du restaurant"/></label><label className="wide">Pied du ticket<input value={catalog.receipt_footer||''} onChange={e=>setCatalog({...catalog,receipt_footer:e.target.value})} placeholder="Merci et à bientôt !"/></label></div><div className="order-checks"><label><input type="checkbox" checked={catalog.order_capture_enabled} onChange={e=>setCatalog({...catalog,order_capture_enabled:e.target.checked})}/> Enregistrer les commandes dans Qatalink</label><label><input type="checkbox" checked={catalog.order_whatsapp_enabled} onChange={e=>setCatalog({...catalog,order_whatsapp_enabled:e.target.checked})}/> Proposer l’envoi sur WhatsApp après confirmation</label></div><button className="btn btn-primary" onClick={saveSettings} disabled={busy==='settings'}>{busy==='settings'?'Enregistrement…':'Enregistrer les commandes'}</button><div className="order-access-box"><div><KeyRound/><h4>Accès équipe partageable</h4><p>Créez un lien pour la caisse, la cuisine ou le gérant sans partager le compte Qatalink principal.</p></div><div className="order-access-form"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Ex : Caisse"/><input value={pin} onChange={e=>setPin(e.target.value)} placeholder="Code secret (4 caractères minimum)" type="password"/><button onClick={createAccess} disabled={busy==='access'||pin.length<4}>{busy==='access'?'Création…':'Créer un accès'}</button></div>{lastCreated&&<div className="order-access-created"><ShieldCheck/><div><b>Accès prêt</b><span>{lastCreated.url}</span><small>Code : {lastCreated.pin}</small></div><button onClick={()=>copy(`${lastCreated.url}\nCode : ${lastCreated.pin}`)}><Copy size={14}/>Copier</button></div>}<div className="order-access-list">{accesses.map(a=><div key={a.id}><div><b>{a.label}</b><span>{a.enabled?'Actif':'Désactivé'}</span></div><code>qatalink.com/ops/{a.access_key.slice(0,10)}…</code><div><button onClick={()=>copy(`https://qatalink.com/ops/${a.access_key}`)}><Copy size={13}/>Lien</button><a href={`https://qatalink.com/ops/${a.access_key}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Ouvrir</a>{a.enabled&&<button className="danger" onClick={()=>revokeAccess(a.id)}><Trash2 size={13}/>Désactiver</button>}</div></div>)}</div></div></div>;

  const today=new Date().toDateString();const todayOrders=orders.filter(o=>new Date(o.created_at).toDateString()===today);const revenue=todayOrders.reduce((s,o)=>s+Number(o.total_minor||0),0);const avg=todayOrders.length?Math.round(revenue/todayOrders.length):0;
  const statsUi=<section className="order-center"><div className="order-section-head"><div><span className="eyebrow">COMMANDES ENREGISTRÉES</span><h2>{catalog.title}</h2><p>Les commandes du catalogue arrivent ici avant leur éventuel envoi sur WhatsApp.</p></div><button className="btn btn-ghost" onClick={loadOrders}><RefreshCw size={14}/>Actualiser</button></div><div className="order-metrics"><div><b>{todayOrders.length}</b><span>Aujourd’hui</span></div><div><b>{orderMoney(revenue,'XOF')}</b><span>Total enregistré</span></div><div><b>{orderMoney(avg,'XOF')}</b><span>Panier moyen</span></div><div><b>{orders.filter(o=>o.status==='new').length}</b><span>À traiter</span></div></div><div className="order-dashboard-list">{orders.length===0?<div className="order-empty">Aucune commande enregistrée pour ce catalogue.</div>:orders.map(order=><article key={order.id}><header><div><b>{order.order_number}</b><span>{new Date(order.created_at).toLocaleString('fr-FR')}</span></div><strong>{STATUS_LABELS[order.status||'new']||order.status}</strong></header><div className="order-line-items">{(itemsByOrder[order.id]||[]).map((item,i)=><div key={i}><span><b>{item.quantity} ×</b> {item.name}</span><strong>{orderMoney(item.line_total_minor,order.currency_code||'XOF')}</strong></div>)}</div>{order.table_number&&<small>Table : {order.table_number}</small>}{order.delivery_address&&<small>Livraison : {order.delivery_address}</small>}{order.customer_note&&<p>Note : {order.customer_note}</p>}<div className="order-card-footer"><b>{orderMoney(order.total_minor,order.currency_code||'XOF')}</b><select value={order.status||'new'} onChange={e=>updateStatus(order.id,e.target.value)}><option value="new">Nouvelle</option><option value="preparing">En préparation</option><option value="ready">Prête</option><option value="completed">Terminée</option><option value="cancelled">Annulée</option></select><button onClick={()=>printOrderReceipt(printable(order),{businessName:catalog.receipt_title||catalog.title,catalogTitle:catalog.title,receiptTitle:catalog.receipt_title,receiptFooter:catalog.receipt_footer,width:'58mm'})}><Printer size={14}/>Ticket</button>{(catalog.order_whatsapp_number||businessPhone)&&<button onClick={()=>sendWhatsApp(order)}><Send size={14}/>WhatsApp</button>}</div></article>)}</div></section>;

  return <>{catalogHost&&createPortal(settingsUi,catalogHost)}{statsHost&&createPortal(statsUi,statsHost)}</>;
}
