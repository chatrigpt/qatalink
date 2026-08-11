'use client';

import {useEffect,useMemo,useState} from 'react';
import {CreditCard} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

function label(plan:string,status:string,end:string|null){
  const active=!end||new Date(end).getTime()>Date.now();
  if(!active)return'GRATUIT';
  if(plan==='trial'&&status==='trialing')return'ESSAI 24 H';
  if(plan==='static')return'BASIC';
  if(plan==='interactive')return'INTERACTIF';
  if(plan==='linkhub')return'VITRINE';
  return'GRATUIT';
}

export function SubscriptionEntryControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [planLabel,setPlanLabel]=useState('');
  const [show,setShow]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session||cancelled)return;
      const params=new URLSearchParams(location.search);
      const catalogId=params.get('catalog');
      let businessId='';
      if(catalogId){
        const {data:c}=await supabase.from('catalogs').select('business_id').eq('id',catalogId).maybeSingle();
        businessId=String(c?.business_id||'');
      }
      if(!businessId){
        const {data:bs}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
        businessId=String(bs?.[0]?.id||'');
      }
      if(!businessId||cancelled)return;
      const {data:ss}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
      const s=ss?.[0];
      if(!cancelled)setPlanLabel(s?label(String(s.plan_code),String(s.status),s.current_period_end):'GRATUIT');
    })();
    return()=>{cancelled=true};
  },[supabase]);

  useEffect(()=>{
    const sync=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent||'';
      setShow(title.includes('Abonnement'));
      if(planLabel){
        const eyebrow=document.querySelector<HTMLElement>('.dash-v3-top .eyebrow');
        if(eyebrow&&eyebrow.textContent!==planLabel)eyebrow.textContent=planLabel;
      }
    };
    sync();
    const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    const onClick=()=>setTimeout(sync,30);document.addEventListener('click',onClick,true);
    return()=>{observer.disconnect();document.removeEventListener('click',onClick,true)};
  },[planLabel]);

  function openPaywall(){
    const candidates=Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
    const target=candidates.find(b=>/voir les formules/i.test((b.textContent||'').trim()));
    if(target){target.click();return}
    window.alert('Les formules ne sont pas encore disponibles. Réessayez dans un instant.');
  }

  if(!show)return null;
  return <button className="subscription-floating-entry" onClick={openPaywall}><CreditCard size={16}/>Voir les formules</button>;
}
