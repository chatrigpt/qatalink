'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,BarChart3,BookOpen,Boxes,Building2,CircleDollarSign,CreditCard,ExternalLink,Eye,Headphones,MessageCircle,MousePointerClick,QrCode,RefreshCw,ShieldCheck,ShoppingCart,Users} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type CatalogLink={id:string;title:string;public_slug:string;is_active:boolean};
type BusinessStats={scans:number;catalog_views:number;item_views:number;add_to_cart:number;checkout_starts:number;whatsapp_clicks:number;unique_sessions:number};
type RecentBusiness={id:string;name:string;slug:string;business_type:string;published:boolean;created_at:string;owner_email:string|null;catalog_count:number;plan_code:string|null;subscription_status:string|null;catalog_links:CatalogLink[];stats:BusinessStats};
type Overview={users:number;businesses:number;catalogs:number;items:number;active_subscriptions:number;active_trials:number;credits_in_wallets:number;excluded_test_accounts:number;recent_businesses:RecentBusiness[]};
type MonthlyRevenue={month:string;amount_minor:number;payments:number};
type Metrics={start_at:string;end_at:string;revenue_minor:number;payment_count:number;scans:number;catalog_views:number;item_views:number;add_to_cart:number;cart_opens:number;checkout_starts:number;whatsapp_clicks:number;unique_sessions:number;revenue_by_month:MonthlyRevenue[]};
type Period='30d'|'90d'|'year'|'all'|'month';
const ADMIN_EMAIL='kouameismael@gmail.com';

function monthValue(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function range(period:Period,month:string){const now=new Date();let start=new Date(now);let end=new Date(now.getTime()+1000);if(period==='30d')start=new Date(now.getTime()-30*86400000);if(period==='90d')start=new Date(now.getTime()-90*86400000);if(period==='year')start=new Date(now.getFullYear(),0,1);if(period==='all')start=new Date('2020-01-01T00:00:00Z');if(period==='month'){const [y,m]=month.split('-').map(Number);start=new Date(y,m-1,1);end=new Date(y,m,1)}return{start:start.toISOString(),end:end.toISOString()}}

export default function AdminPage(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ready,setReady]=useState(false);const [allowed,setAllowed]=useState(false);const [data,setData]=useState<Overview|null>(null);const [metrics,setMetrics]=useState<Metrics|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [period,setPeriod]=useState<Period>('30d');const [month,setMonth]=useState(monthValue());

  async function loadOverview(){const {data:d,error:e}=await supabase.rpc('admin_qatalink_overview');if(e)throw e;setData(d as Overview)}
  async function loadMetrics(nextPeriod=period,nextMonth=month){const r=range(nextPeriod,nextMonth);const {data:d,error:e}=await supabase.rpc('admin_qatalink_metrics',{p_start:r.start,p_end:r.end});if(e)throw e;setMetrics(d as Metrics)}
  async function load(){setLoading(true);setError('');try{await Promise.all([loadOverview(),loadMetrics()])}catch{setError('Impossible de charger les données d’administration.')}finally{setLoading(false)}}
  async function choosePeriod(p:Period){setPeriod(p);setLoading(true);setError('');try{await loadMetrics(p,month)}catch{setError('Impossible de charger cette période.')}finally{setLoading(false)}}
  async function chooseMonth(v:string){setMonth(v);setPeriod('month');setLoading(true);setError('');try{await loadMetrics('month',v)}catch{setError('Impossible de charger ce mois.')}finally{setLoading(false)}}

  useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();const ok=session?.user?.email?.toLowerCase()===ADMIN_EMAIL;setAllowed(ok);setReady(true);if(ok)await load();else if(session)window.location.replace('/dashboard');else window.location.replace('/login')})()},[supabase]);

  if(!ready||!allowed)return <div className="admin-loading">Vérification de l’accès…</div>;
  const conversion=metrics?.catalog_views?Math.round((metrics.whatsapp_clicks/metrics.catalog_views)*1000)/10:0;
  const maxMonth=Math.max(1,...(metrics?.revenue_by_month||[]).map(x=>Number(x.amount_minor)||0));

  return <main className="admin-shell"><header className="admin-top"><div><span className="eyebrow">QATALINK ADMIN</span><h1>Pilotage de la plateforme</h1><p>Activité réelle, revenus et usages de Qatalink.</p></div><div className="admin-actions"><Link className="btn btn-ghost" href="/dashboard"><ArrowLeft size={15}/>Dashboard</Link><Link className="btn btn-ghost" href="/admin/support"><Headphones size={15}/>Support</Link><button className="btn btn-primary" onClick={load} disabled={loading}><RefreshCw size={15}/>{loading?'Actualisation…':'Actualiser'}</button></div></header>
  {error&&<div className="admin-error">{error}</div>}

  <section className="admin-kpis"><Metric icon={<Users/>} label="Utilisateurs réels" value={data?.users||0}/><Metric icon={<Building2/>} label="Entreprises" value={data?.businesses||0}/><Metric icon={<BookOpen/>} label="Catalogues" value={data?.catalogs||0}/><Metric icon={<Boxes/>} label="Articles" value={data?.items||0}/><Metric icon={<CreditCard/>} label="Abonnements actifs" value={data?.active_subscriptions||0}/><Metric icon={<ShieldCheck/>} label="Essais actifs" value={data?.active_trials||0}/></section>

  <section className="admin-card admin-performance"><div className="admin-card-head"><div><h2>Performance globale</h2><p>Les comptes test et leurs activités sont exclus de tous les chiffres ci-dessous.</p></div><span className="admin-wallet">{data?.excluded_test_accounts||0} comptes test exclus</span></div>
    <div className="admin-periods"><button className={period==='30d'?'active':''} onClick={()=>choosePeriod('30d')}>30 jours</button><button className={period==='90d'?'active':''} onClick={()=>choosePeriod('90d')}>90 jours</button><button className={period==='year'?'active':''} onClick={()=>choosePeriod('year')}>Cette année</button><button className={period==='all'?'active':''} onClick={()=>choosePeriod('all')}>Depuis le début</button><label className={period==='month'?'active':''}><span>Mois</span><input type="month" value={month} max={monthValue()} onChange={e=>chooseMonth(e.target.value)}/></label></div>
    <div className="admin-revenue-grid"><div className="admin-revenue-main"><span>Chiffre d’affaires</span><strong>{money(metrics?.revenue_minor||0)}</strong><small>{metrics?.payment_count||0} paiement(s) confirmé(s)</small></div><Usage icon={<QrCode/>} label="Scans QR" value={metrics?.scans||0}/><Usage icon={<Eye/>} label="Vues catalogues" value={metrics?.catalog_views||0}/><Usage icon={<Users/>} label="Visiteurs" value={metrics?.unique_sessions||0}/><Usage icon={<BarChart3/>} label="Vues articles" value={metrics?.item_views||0}/><Usage icon={<ShoppingCart/>} label="Ajouts panier" value={metrics?.add_to_cart||0}/><Usage icon={<MousePointerClick/>} label="Intentions" value={metrics?.checkout_starts||0}/><Usage icon={<MessageCircle/>} label="Clics WhatsApp" value={metrics?.whatsapp_clicks||0}/><Usage icon={<CircleDollarSign/>} label="Vue → WhatsApp" value={`${conversion} %`}/></div>
    {!!metrics?.revenue_by_month?.length&&<div className="admin-monthly"><h3>Revenus par mois</h3>{metrics.revenue_by_month.map(m=><div className="admin-month-row" key={m.month}><span>{monthLabel(m.month)}</span><div><i style={{width:`${Math.max(3,(Number(m.amount_minor)/maxMonth)*100)}%`}}/></div><b>{money(m.amount_minor)}</b><small>{m.payments} paiement(s)</small></div>)}</div>}
  </section>

  <section className="admin-card"><div className="admin-card-head"><div><h2>Entreprises clientes</h2><p>Liens publics et performances individuelles, hors comptes test.</p></div><span className="admin-wallet">{new Intl.NumberFormat('fr-FR').format(data?.credits_in_wallets||0)} crédits clients</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Entreprise</th><th>Propriétaire</th><th>Activité</th><th>Catalogues publics</th><th>Statistiques</th><th>Formule</th><th>État</th><th>Création</th></tr></thead><tbody>{(data?.recent_businesses||[]).map(b=><tr key={b.id}><td><b>{b.name}</b><small>{b.slug}</small></td><td>{b.owner_email||'—'}</td><td>{b.business_type||'—'}</td><td><div className="admin-catalog-links">{(b.catalog_links||[]).length?(b.catalog_links||[]).map(c=><a className="admin-catalog-link" key={c.id} href={`https://qatalink.com/c/${c.public_slug}`} target="_blank" rel="noreferrer"><ExternalLink size={12}/>{c.title||'Catalogue'}{!c.is_active&&' · inactif'}</a>):<span>—</span>}</div></td><td><BusinessStatsView stats={b.stats}/></td><td>{planLabel(b.plan_code)}</td><td><span className={'admin-status '+(b.subscription_status||'none')}>{statusLabel(b.subscription_status)}</span></td><td>{new Date(b.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div></section></main>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <div className="admin-metric"><span>{icon}</span><div><b>{new Intl.NumberFormat('fr-FR').format(value)}</b><small>{label}</small></div></div>}
function Usage({icon,label,value}:{icon:React.ReactNode;label:string;value:number|string}){return <div className="admin-usage"><span>{icon}</span><div><b>{typeof value==='number'?new Intl.NumberFormat('fr-FR').format(value):value}</b><small>{label}</small></div></div>}
function BusinessStatsView({stats}:{stats:BusinessStats}){const s=stats||{scans:0,catalog_views:0,item_views:0,add_to_cart:0,checkout_starts:0,whatsapp_clicks:0,unique_sessions:0};return <div className="admin-business-stats"><span><b>{s.catalog_views||0}</b><em>vues</em></span><span><b>{s.unique_sessions||0}</b><em>visiteurs</em></span><span><b>{s.scans||0}</b><em>scans</em></span><span><b>{s.item_views||0}</b><em>articles vus</em></span><span><b>{s.add_to_cart||0}</b><em>paniers</em></span><span><b>{s.checkout_starts||0}</b><em>intentions</em></span><span><b>{s.whatsapp_clicks||0}</b><em>WhatsApp</em></span></div>}
function money(v:number){return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(v)||0).replace(/\u202f/g,' ')} F CFA`}
function monthLabel(v:string){const [y,m]=v.split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(y,m-1,1))}
function planLabel(v:string|null){if(v==='linkhub')return'Vitrine';if(v==='interactive')return'Interactif';if(v==='static')return'Basic';if(v==='trial')return'Essai';return'—'}
function statusLabel(v:string|null){if(v==='active')return'Actif';if(v==='trialing')return'Essai';if(v==='past_due')return'À régulariser';if(v==='canceled')return'Arrêté';return'—'}
