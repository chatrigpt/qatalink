'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,BookOpen,Boxes,Building2,CreditCard,RefreshCw,ShieldCheck,Users} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type RecentBusiness={id:string;name:string;slug:string;business_type:string;published:boolean;created_at:string;owner_email:string|null;catalog_count:number;plan_code:string|null;subscription_status:string|null};
type Overview={users:number;businesses:number;catalogs:number;items:number;active_subscriptions:number;active_trials:number;credits_in_wallets:number;recent_businesses:RecentBusiness[]};
const ADMIN_EMAIL='kouameismael@gmail.com';

export default function AdminPage(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ready,setReady]=useState(false);const [allowed,setAllowed]=useState(false);const [data,setData]=useState<Overview|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');

  async function load(){setLoading(true);setError('');const {data:d,error:e}=await supabase.rpc('admin_qatalink_overview');if(e)setError('Impossible de charger les données d’administration.');else setData(d as Overview);setLoading(false)}

  useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();const ok=session?.user?.email?.toLowerCase()===ADMIN_EMAIL;setAllowed(ok);setReady(true);if(ok)await load();else if(session)window.location.replace('/dashboard');else window.location.replace('/login')})()},[supabase]);

  if(!ready||!allowed)return <div className="admin-loading">Vérification de l’accès…</div>;
  return <main className="admin-shell"><header className="admin-top"><div><span className="eyebrow">QATALINK ADMIN</span><h1>Pilotage de la plateforme</h1><p>Vue synthétique de l’activité et des comptes récents.</p></div><div className="admin-actions"><Link className="btn btn-ghost" href="/dashboard"><ArrowLeft size={15}/>Dashboard</Link><button className="btn btn-primary" onClick={load} disabled={loading}><RefreshCw size={15}/>{loading?'Actualisation…':'Actualiser'}</button></div></header>
  {error&&<div className="admin-error">{error}</div>}
  <section className="admin-kpis">
    <Metric icon={<Users/>} label="Utilisateurs" value={data?.users||0}/><Metric icon={<Building2/>} label="Entreprises" value={data?.businesses||0}/><Metric icon={<BookOpen/>} label="Catalogues" value={data?.catalogs||0}/><Metric icon={<Boxes/>} label="Articles" value={data?.items||0}/><Metric icon={<CreditCard/>} label="Abonnements actifs" value={data?.active_subscriptions||0}/><Metric icon={<ShieldCheck/>} label="Essais actifs" value={data?.active_trials||0}/>
  </section>
  <section className="admin-card"><div className="admin-card-head"><div><h2>Entreprises récentes</h2><p>Les 50 dernières entreprises créées sur Qatalink.</p></div><span className="admin-wallet">{new Intl.NumberFormat('fr-FR').format(data?.credits_in_wallets||0)} crédits disponibles</span></div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Entreprise</th><th>Propriétaire</th><th>Activité</th><th>Catalogues</th><th>Formule</th><th>État</th><th>Création</th></tr></thead><tbody>{(data?.recent_businesses||[]).map(b=><tr key={b.id}><td><b>{b.name}</b><small>{b.slug}</small></td><td>{b.owner_email||'—'}</td><td>{b.business_type||'—'}</td><td>{b.catalog_count}</td><td>{planLabel(b.plan_code)}</td><td><span className={'admin-status '+(b.subscription_status||'none')}>{statusLabel(b.subscription_status)}</span></td><td>{new Date(b.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div>
  </section></main>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}){return <div className="admin-metric"><span>{icon}</span><div><b>{new Intl.NumberFormat('fr-FR').format(value)}</b><small>{label}</small></div></div>}
function planLabel(v:string|null){if(v==='linkhub')return'Vitrine';if(v==='interactive')return'Interactif';if(v==='static')return'Basic';if(v==='trial')return'Essai';return'—'}
function statusLabel(v:string|null){if(v==='active')return'Actif';if(v==='trialing')return'Essai';if(v==='past_due')return'À régulariser';if(v==='canceled')return'Arrêté';return'—'}
