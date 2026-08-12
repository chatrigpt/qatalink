'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,Clock3,ShieldCheck} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Trial={status:string;current_period_start:string|null;current_period_end:string|null};

function formatLeft(ms:number){
  const total=Math.max(0,Math.floor(ms/1000));
  const d=Math.floor(total/86400);const h=Math.floor((total%86400)/3600);const m=Math.floor((total%3600)/60);
  if(d>0)return`${d} j ${h} h`;
  if(h>0)return`${h} h ${m} min`;
  return`${m} min`;
}

export function TrialLifecycleBanner(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [trial,setTrial]=useState<Trial|null>(null);
  const [now,setNow]=useState(Date.now());

  useEffect(()=>{
    const resolve=()=>{
      const main=document.querySelector('.dash-v3-main') as HTMLElement|null;
      if(!main){setHost(null);return}
      let holder=main.querySelector(':scope > .trial-lifecycle-host') as HTMLElement|null;
      if(!holder){holder=document.createElement('div');holder.className='trial-lifecycle-host';const top=main.querySelector(':scope > .dash-v3-top');top?.insertAdjacentElement('afterend',holder)}
      const legacy=main.querySelector(':scope > .trial-v2') as HTMLElement|null;if(legacy)legacy.style.display='none';
      const eyebrow=main.querySelector('.dash-v3-top .eyebrow');if(eyebrow?.textContent?.includes('ESSAI 24 H'))eyebrow.textContent='ESSAI 7 JOURS';
      setHost(holder);
    };
    resolve();const mo=new MutationObserver(resolve);mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>mo.disconnect();
  },[]);

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session)return;
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);const businessId=businesses?.[0]?.id;if(!businessId)return;
      const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_start,current_period_end').eq('business_id',businessId).order('created_at',{ascending:false}).limit(1);const latest=subs?.[0];
      if(alive)setTrial(latest?.plan_code==='trial'?latest as Trial:null);
    };
    load();const id=window.setInterval(load,60000);return()=>{alive=false;clearInterval(id)};
  },[supabase]);

  useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[]);

  if(!host||!trial?.current_period_end)return null;
  const end=new Date(trial.current_period_end).getTime();const active=trial.status==='trialing'&&end>now;const graceEnd=end+48*36e5;const grace=end<=now&&graceEnd>now;const suspended=now>=graceEnd;
  const started=trial.current_period_start?new Date(trial.current_period_start).getTime():end-7*24*36e5;const day=Math.max(1,Math.min(7,Math.floor((now-started)/(24*36e5))+1));

  let eyebrow=`JOUR ${day} / 7`;let title='Essai complet actif';let body='Toutes les fonctions restent ouvertes. Votre priorité : publier, partager puis obtenir votre première interaction réelle.';let left=formatLeft(end-now);let urgent=false;
  if(active&&end-now<=24*36e5){eyebrow='DERNIÈRES 24 H';title='Gardez votre Qatalink sans interruption';body='Votre travail est conservé, et vous aurez encore 48 h de grâce sur le lien public après la fin de l’essai.';urgent=true}
  else if(grace){eyebrow='PÉRIODE DE GRÂCE';title='Votre essai est terminé, mais le lien reste encore accessible';body='L’édition est verrouillée. Activez une formule avant la fin de la grâce pour éviter la suspension du catalogue public.';left=formatLeft(graceEnd-now);urgent=true}
  else if(suspended){eyebrow='ESSAI TERMINÉ';title='Votre travail est conservé';body='Le catalogue public est suspendu, mais vos contenus, images et réglages sont toujours là. Activez une formule pour le remettre en ligne.';left='Données conservées';urgent=true}

  function openPricing(){const url=new URL(window.location.href);url.searchParams.set('paywall','1');window.history.pushState({},'',url.toString());window.dispatchEvent(new Event('qatalink:pricing-open'))}

  return createPortal(<div className={`trial-lifecycle-banner ${urgent?'urgent':''}`}><div className="trial-lifecycle-icon">{active&&!urgent?<ShieldCheck/>:<Clock3/>}</div><div className="trial-lifecycle-copy"><span className="eyebrow">{eyebrow}</span><b>{title}</b><p>{body}</p></div><div className="trial-lifecycle-meta"><strong>{left}</strong><button className={urgent?'btn btn-primary':'btn btn-ghost'} onClick={openPricing}>{urgent?'Garder mon catalogue':'Voir les formules'}<ArrowRight size={14}/></button></div></div>,host);
}
