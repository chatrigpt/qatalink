'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,Eye,MessageCircle,QrCode,ShoppingBag,TrendingUp} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type EventRow={event_type:string;item_id:string|null;created_at:string;metadata:any};
type Item={id:string;name:string};
type Catalog={id:string;title:string};
const ACTIVE_CATALOG='qatalink_active_catalog_id';
function pct(a:number,b:number){return b?`${Math.round((a/b)*100)} %`:'0 %'}
function dayKey(d:Date){return d.toISOString().slice(0,10)}

export function DashboardAnalytics(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null),[catalogId,setCatalogId]=useState(''),[catalogs,setCatalogs]=useState<Catalog[]>([]),[events,setEvents]=useState<EventRow[]>([]),[scans,setScans]=useState<any[]>([]),[items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(false);

  useEffect(()=>{
    const resolve=()=>{const h=[...document.querySelectorAll('.dash-card h3')].find(x=>x.textContent?.trim()==='Mesure réelle'),section=h?.closest('.dash-section');if(section){[...section.children].forEach((el:any)=>{if(!el.classList?.contains('analytics-real'))el.style.display='none'});setHost(section)}else setHost(null)};
    resolve();const mo=new MutationObserver(resolve);mo.observe(document.body,{subtree:true,childList:true});return()=>mo.disconnect();
  },[]);

  useEffect(()=>{if(!host)return;let alive=true;(async()=>{const {data}=await supabase.from('catalogs').select('id,title').order('created_at',{ascending:false});if(!alive)return;const list=(data||[]) as Catalog[];setCatalogs(list);const query=new URLSearchParams(location.search).get('catalog')||'';let remembered='';try{remembered=localStorage.getItem(ACTIVE_CATALOG)||''}catch{}const chosen=(query&&list.some(c=>c.id===query)?query:'')||(remembered&&list.some(c=>c.id===remembered)?remembered:'')||list[0]?.id||'';setCatalogId(chosen);if(chosen)try{localStorage.setItem(ACTIVE_CATALOG,chosen)}catch{}})();return()=>{alive=false}},[host,supabase]);

  useEffect(()=>{if(!host||!catalogId)return;let alive=true;(async()=>{setLoading(true);const since=new Date(Date.now()-30*86400000).toISOString();const [{data:e},{data:s},{data:i}]=await Promise.all([supabase.from('catalog_behavior_events').select('event_type,item_id,created_at,metadata').eq('catalog_id',catalogId).gte('created_at',since).order('created_at',{ascending:true}),supabase.from('catalog_scan_events').select('created_at,referrer').eq('catalog_id',catalogId).gte('created_at',since).order('created_at',{ascending:true}),supabase.from('items').select('id,name').eq('catalog_id',catalogId)]);if(alive){setEvents((e||[]) as EventRow[]);setScans(s||[]);setItems((i||[]) as Item[]);setLoading(false)}})();return()=>{alive=false}},[host,catalogId,supabase]);

  function choose(id:string){setCatalogId(id);try{localStorage.setItem(ACTIVE_CATALOG,id)}catch{}const p=new URLSearchParams(location.search);p.set('catalog',id);if(!p.get('tab'))p.set('tab','stats');history.replaceState({},'',`${location.pathname}?${p.toString()}`)}
  if(!host)return null;
  const count=(type:string)=>events.filter(e=>e.event_type===type).length,views=count('catalog_view'),itemViews=count('item_view'),adds=count('add_to_cart'),checkout=count('checkout_start'),wa=count('whatsapp_click'),names=Object.fromEntries(items.map(i=>[i.id,i.name])),topMap=new Map<string,{name:string;views:number;adds:number}>();
  for(const e of events){if(!e.item_id)continue;const cur=topMap.get(e.item_id)||{name:names[e.item_id]||'Article',views:0,adds:0};if(e.event_type==='item_view')cur.views++;if(e.event_type==='add_to_cart')cur.adds++;topMap.set(e.item_id,cur)}
  const top=[...topMap.values()].sort((a,b)=>(b.adds*3+b.views)-(a.adds*3+a.views)).slice(0,5),days=[...Array(7)].map((_,idx)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-idx));const key=dayKey(d);return{key,label:d.toLocaleDateString('fr-FR',{weekday:'short'}),views:events.filter(e=>e.event_type==='catalog_view'&&e.created_at.startsWith(key)).length,wa:events.filter(e=>e.event_type==='whatsapp_click'&&e.created_at.startsWith(key)).length,scans:scans.filter((s:any)=>String(s.created_at).startsWith(key)).length}}),max=Math.max(1,...days.map(d=>d.views+d.scans)),selected=catalogs.find(c=>c.id===catalogId);

  return createPortal(<div className="analytics-real">
    <div className="analytics-head"><div><span className="eyebrow">30 DERNIERS JOURS</span><h2>Performance du catalogue</h2><p>Les mêmes données Supabase sont utilisées sur ordinateur et dans l’application.</p></div>{catalogs.length>1&&<label style={{display:'grid',gap:5,minWidth:190,fontSize:11,fontWeight:800}}>CATALOGUE<select className="input" value={catalogId} onChange={e=>choose(e.target.value)}>{catalogs.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}</div>
    {selected&&<div style={{margin:'0 0 12px',fontSize:12,opacity:.65}}>Catalogue mesuré : <b>{selected.title}</b></div>}
    {loading?<div className="dash-card">Chargement des résultats…</div>:<><div className="analytics-kpis"><div className="analytics-kpi"><Eye/><b>{views}</b><span>Visites catalogue</span></div><div className="analytics-kpi"><QrCode/><b>{scans.length}</b><span>Scans QR</span></div><div className="analytics-kpi"><ShoppingBag/><b>{adds}</b><span>Ajouts au panier</span></div><div className="analytics-kpi"><MessageCircle/><b>{wa}</b><span>Ouvertures WhatsApp</span></div></div><div className="analytics-grid"><section className="dash-card analytics-funnel"><h3>Parcours de conversion</h3><div className="funnel-row"><span>Visites</span><b>{views}</b><em>100 %</em></div><ArrowRight/><div className="funnel-row"><span>Articles consultés</span><b>{itemViews}</b><em>{pct(itemViews,views)}</em></div><ArrowRight/><div className="funnel-row"><span>Ajouts panier</span><b>{adds}</b><em>{pct(adds,views)}</em></div><ArrowRight/><div className="funnel-row"><span>Intentions de commande</span><b>{checkout}</b><em>{pct(checkout,views)}</em></div><ArrowRight/><div className="funnel-row strong"><span>WhatsApp</span><b>{wa}</b><em>{pct(wa,views)}</em></div></section><section className="dash-card"><h3>7 derniers jours</h3><div className="analytics-bars">{days.map(d=><div className="analytics-day" key={d.key}><div className="bar-wrap"><span className="bar-main" style={{height:`${Math.max(4,((d.views+d.scans)/max)*100)}%`}}/><span className="bar-wa" style={{height:`${Math.max(0,(d.wa/max)*100)}%`}}/></div><small>{d.label}</small><b>{d.views+d.scans}</b></div>)}</div><div className="analytics-legend"><span>Visites + scans</span><span>WhatsApp</span></div></section></div><div className="analytics-grid"><section className="dash-card"><h3>Articles qui attirent le plus</h3>{top.length?<div className="analytics-top">{top.map((x,i)=><div key={`${x.name}-${i}`}><span>{i+1}</span><b>{x.name}</b><small>{x.views} vue{x.views>1?'s':''} · {x.adds} ajout{x.adds>1?'s':''}</small></div>)}</div>:<p>Les premiers résultats apparaîtront dès que des visiteurs consulteront vos articles.</p>}</section><section className="dash-card analytics-conversion"><TrendingUp/><div><span>Taux visite → WhatsApp</span><b>{pct(wa,views)}</b><small>{wa} ouverture{wa>1?'s':''} WhatsApp pour {views} visite{views>1?'s':''}.</small></div></section></div></>}
  </div>,host);
}
