'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {BarChart3,Link2,MonitorSmartphone,QrCode,Store} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type SourceRow={source:string;label:string;orders:number;revenue_minor:number};
type Stats={days:number;total_orders:number;total_revenue_minor:number;sources:SourceRow[]};
const ICONS:Record<string,any>={pos:Store,qr:QrCode,shared_link:Link2,hub:MonitorSmartphone,catalog:BarChart3};
function money(v:number){return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(v||0)).replace(/\u202f/g,' ')} F CFA`}

export function OrderSourceAnalytics(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);const [stats,setStats]=useState<Stats|null>(null);const [days,setDays]=useState(30);const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(location.pathname!='/dashboard')return;let timer:any;
    const resolve=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(title!=='Statistiques'){setHost(null);return}
      const cards=document.querySelectorAll('.dash-section .dash-card');setHost(cards[0]||document.querySelector('.dash-section'));
    };
    resolve();const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(resolve,60)});observer.observe(document.body,{childList:true,subtree:true});return()=>{clearTimeout(timer);observer.disconnect()};
  },[]);

  useEffect(()=>{if(host)void load()},[host,days]);
  async function load(){setBusy(true);try{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:bs}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);const businessId=String(bs?.[0]?.id||'');if(!businessId)return;const catalogId=new URLSearchParams(location.search).get('catalog');const {data,error}=await supabase.rpc('qatalink_order_source_stats',{p_business_id:businessId,p_catalog_id:catalogId||null,p_days:days});if(error)throw error;setStats(data as Stats)}catch{setStats(null)}finally{setBusy(false)}}
  if(!host)return null;
  return createPortal(<section className="q-source-stats"><div className="q-source-stats-head"><div><span>ATTRIBUTION DES COMMANDES</span><h3>D’où viennent vos commandes ?</h3><p>La source est enregistrée automatiquement : caisse, QR, lien partagé, page centrale ou accès direct. Le caissier ne peut pas la modifier.</p></div><div className="q-source-range">{[7,30,90].map(n=><button key={n} className={days===n?'active':''} onClick={()=>setDays(n)}>{n} j</button>)}</div></div>{busy?<div className="q-source-loading">Calcul des sources…</div>:stats?<><div className="q-source-summary"><article><span>Commandes</span><b>{stats.total_orders||0}</b></article><article><span>CA attribué</span><b>{money(stats.total_revenue_minor||0)}</b></article></div><div className="q-source-grid">{(stats.sources||[]).map(row=>{const Icon=ICONS[row.source]||BarChart3;const pct=stats.total_orders?Math.round((Number(row.orders||0)/stats.total_orders)*100):0;return <article key={row.source} data-source={row.source}><div className="q-source-icon"><Icon/></div><div><b>{row.label}</b><small>{row.orders} commande(s) · {pct}%</small><span>{money(row.revenue_minor)}</span></div></article>})}</div>{!stats.sources?.length&&<div className="q-source-loading">Aucune commande sur cette période.</div>}</>:<div className="q-source-loading">Statistiques de source indisponibles.</div>}</section>,host);
}
