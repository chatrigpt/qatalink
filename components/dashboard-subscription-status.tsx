'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {CheckCircle2,Clock3,CreditCard} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Sub={plan_code:string;status:string;current_period_start:string|null;current_period_end:string|null};

function planLabel(v:string){if(v==='static')return'Starter';if(v==='interactive')return'Pro';if(v==='linkhub')return'Business';if(v==='trial')return'Essai 7 jours';return'—'}
function date(v:string|null){return v?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v)):'Sans date de fin'}

export function DashboardSubscriptionStatus(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [target,setTarget]=useState<Element|null>(null);
  const [sub,setSub]=useState<Sub|null>(null);
  const [businessName,setBusinessName]=useState('');

  useEffect(()=>{
    let cancelled=false;
    const resolveTarget=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent||'';
      if(!title.includes('Abonnement')){setTarget(null);return}
      const sections=document.querySelectorAll('.dash-v3-main > .dash-section');
      setTarget(sections.length?sections[sections.length-1]:null);
    };
    resolveTarget();
    const observer=new MutationObserver(resolveTarget);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    const click=()=>setTimeout(resolveTarget,40);document.addEventListener('click',click,true);
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session||cancelled)return;
      const p=new URLSearchParams(location.search);const catalogId=p.get('catalog');
      let business:any=null;
      if(catalogId){const {data:c}=await supabase.from('catalogs').select('business_id').eq('id',catalogId).maybeSingle();if(c?.business_id){const {data:b}=await supabase.from('businesses').select('id,name').eq('id',c.business_id).maybeSingle();business=b}}
      if(!business){const {data:bs}=await supabase.from('businesses').select('id,name').order('created_at',{ascending:true}).limit(1);business=bs?.[0]||null}
      if(!business||cancelled)return;setBusinessName(business.name||'Votre entreprise');
      const {data:ss}=await supabase.from('subscriptions').select('plan_code,status,current_period_start,current_period_end').eq('business_id',business.id).order('created_at',{ascending:false}).limit(1);if(!cancelled)setSub((ss?.[0]||null) as Sub|null);
    })();
    return()=>{cancelled=true;observer.disconnect();document.removeEventListener('click',click,true)};
  },[supabase]);

  if(!target)return null;
  const now=Date.now();
  const end=sub?.current_period_end?new Date(sub.current_period_end).getTime():null;
  const valid=!!sub&&(sub.status==='active'||sub.status==='trialing')&&(!end||end>now);
  const grace=!!sub&&sub.plan_code==='trial'&&!!end&&end<=now&&end+48*36e5>now;
  const statusLabel=valid?'Actif':grace?'Grâce 48 h':'Inactif';
  return createPortal(<section className="dash-card subscription-current-card">
    <div className="subscription-current-icon">{valid||grace?<CheckCircle2/>:<CreditCard/>}</div>
    <div className="subscription-current-copy"><span className="eyebrow">ABONNEMENT EN COURS</span><h3>{sub?planLabel(sub.plan_code):'Aucune formule active'}</h3><p>{businessName}</p></div>
    <div className="subscription-current-meta"><span className={'admin-status '+(valid?'active':grace?'pending':'none')}>{statusLabel}</span>{sub?.current_period_end&&<small><Clock3 size={13}/>{grace?'Fin de grâce autour du ':valid?'Jusqu’au ':'Terminé le '}{date(grace?new Date(end!+48*36e5).toISOString():sub.current_period_end)}</small>}</div>
  </section>,target);
}
