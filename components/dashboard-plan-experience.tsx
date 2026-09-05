'use client';
import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,Gem,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const labels:Record<string,string>={free:'FREE',static:'STARTER',interactive:'PRO',linkhub:'BUSINESS'};
const buttonLabels:Record<string,string>={free:'Gratuit',static:'Starter',interactive:'Pro',linkhub:'Business'};
const benefits:Record<string,string[]>={
 free:['Plus de capacité pour vos catalogues','Fonctions avancées de gestion','Outils de partage et de conversion enrichis'],
 static:['Commandes enregistrées dans Qatalink','Accès équipe et outils opérationnels','Plus d’automatisation et de pilotage'],
 interactive:['Vitrine et expérience commerciale plus complète','Fonctions Business et outils avancés','Davantage de possibilités pour faire grandir votre activité'],
 linkhub:['Votre formule Business est active','Accès aux fonctionnalités Business disponibles','Vous pouvez gérer votre abonnement depuis cet espace']
};

export function DashboardPlanExperience(){
 const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
 const [plan,setPlan]=useState('free');
 const [active,setActive]=useState(false);
 const [host,setHost]=useState<Element|null>(null);
 const [open,setOpen]=useState(false);

 useEffect(()=>{
  if(location.pathname!='/dashboard')return;
  let cancelled=false;
  const locate=()=>{
    const h=document.querySelector('.dash-v3-actions');
    setHost(h);
    h?.querySelectorAll<HTMLButtonElement>('button').forEach(button=>{
      const text=(button.textContent||'').trim();
      if(/^(Business|Pro|Starter|Gratuit)$/i.test(text)&&!button.classList.contains('q-plan-header-pill'))button.classList.add('q-native-plan-button');
    });
  };
  locate();
  const obs=new MutationObserver(locate);
  obs.observe(document.body,{childList:true,subtree:true});
  void(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return;
    const {data:b}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
    if(!b?.[0])return;
    const {data:s}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',b[0].id).order('created_at',{ascending:false}).limit(1);
    const row=s?.[0];
    const valid=!!row&&row.status==='active'&&(!row.current_period_end||new Date(row.current_period_end)>new Date());
    if(!cancelled){setPlan(valid?String(row.plan_code||'free'):'free');setActive(valid)}
  })();
  return()=>{cancelled=true;obs.disconnect()};
 },[supabase]);

 useEffect(()=>{
  const eyebrow=document.querySelector<HTMLElement>('.dash-v3-top .eyebrow');
  if(eyebrow&&labels[plan])eyebrow.textContent=labels[plan];
 },[plan]);

 const current=buttonLabels[plan]||'Gratuit';
 const pill=host?createPortal(
  <button type="button" className="q-plan-header-pill" onClick={()=>setOpen(true)} title="Découvrir les niveaux Qatalink">
    <Gem size={15}/><span>Passer au niveau supérieur</span>
  </button>,host):null;

 return <>{pill}{open&&<div className="q-plan-modal-backdrop" onClick={()=>setOpen(false)}><div className="q-plan-modal" onClick={e=>e.stopPropagation()}><button className="q-plan-modal-close" onClick={()=>setOpen(false)} aria-label="Fermer"><X size={18}/></button><div className="q-plan-modal-icon"><Gem size={24}/></div><small>VOTRE NIVEAU ACTUEL · {current.toUpperCase()}</small><h2>{plan==='linkhub'?'Votre formule Business':'Passez au niveau supérieur'}</h2><p>{plan==='linkhub'?'Votre formule Business est active. Vous pouvez gérer votre abonnement et consulter les possibilités disponibles.':'Débloquez les fonctions qui vous font gagner du temps et rendent votre espace plus puissant.'}</p><div className="q-plan-benefits">{(benefits[plan]||benefits.free).map(x=><div key={x}><Check size={16}/><span>{x}</span></div>)}</div><button className="q-plan-modal-action" onClick={()=>{window.location.href='/dashboard?tab=subscription'}}>{plan==='linkhub'?'Gérer mon abonnement':'Voir les niveaux et tarifs'}</button></div></div>}<style jsx global>{`
.q-native-plan-button{display:none!important}
.q-plan-header-pill{min-height:42px;border:0;border-radius:14px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:850 13px/1.15 var(--font-jakarta),Arial,sans-serif;cursor:pointer;background:#b5122b;color:#fff;box-shadow:0 10px 26px rgba(181,18,43,.22);white-space:normal;text-align:center}
.q-plan-header-pill:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(181,18,43,.3)}
.q-plan-modal-backdrop{position:fixed;inset:0;z-index:260;background:rgba(8,5,7,.62);backdrop-filter:blur(9px);display:grid;place-items:center;padding:16px}.q-plan-modal{position:relative;width:min(440px,100%);background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:28px;padding:26px;box-shadow:0 28px 90px rgba(0,0,0,.36)}.q-plan-modal-close{position:absolute;right:14px;top:14px;width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);display:grid;place-items:center}.q-plan-modal-icon{width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:#b5122b;color:#fff;margin-bottom:15px}.q-plan-modal small{color:#b5122b;font-weight:900;font-size:10px;letter-spacing:.1em}.q-plan-modal h2{margin:6px 0 8px;font-size:26px;letter-spacing:-.04em}.q-plan-modal>p{margin:0;color:var(--muted);line-height:1.5;font-size:13px}.q-plan-benefits{display:grid;gap:9px;margin:19px 0}.q-plan-benefits div{display:flex;align-items:flex-start;gap:9px;padding:11px 12px;border-radius:13px;background:color-mix(in srgb,#b5122b 5%,var(--surface));border:1px solid color-mix(in srgb,#b5122b 14%,var(--line));font-size:12px;font-weight:700}.q-plan-benefits svg{color:#b5122b;flex:0 0 auto}.q-plan-modal-action{width:100%;border:0;border-radius:14px;padding:13px 16px;background:#b5122b;color:#fff;font:850 13px/1 var(--font-jakarta),Arial,sans-serif;cursor:pointer}
@media(max-width:700px){
 .dash-v3-top{display:grid!important;grid-template-columns:1fr!important;align-items:stretch!important;gap:12px!important}
 .dash-v3-actions{width:100%!important;max-width:none!important;display:grid!important;grid-template-columns:42px 42px minmax(0,1fr)!important;gap:8px!important;align-items:stretch!important}
 .dash-v3-actions>.btn-primary{display:none!important}
 .q-plan-header-pill{grid-column:1/-1;width:100%!important;min-height:44px;font-size:12px;padding:10px 12px}
 .q-plan-modal{padding:22px 16px;border-radius:24px}.q-plan-modal h2{font-size:23px}
}
`}</style></>;
}
