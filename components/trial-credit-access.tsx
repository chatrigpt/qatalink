'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function TrialCreditAccess(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [trialActive,setTrialActive]=useState(false);
  const buying=useRef(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session||cancelled)return;
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const businessId=businesses?.[0]?.id;
      if(!businessId||cancelled)return;
      const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['trialing']).order('created_at',{ascending:false}).limit(1);
      const sub=subs?.[0];
      const active=!!sub&&sub.plan_code==='trial'&&sub.status==='trialing'&&!!sub.current_period_end&&new Date(sub.current_period_end).getTime()>Date.now();
      if(!cancelled)setTrialActive(active);
    })();
    return()=>{cancelled=true};
  },[supabase]);

  useEffect(()=>{
    if(!trialActive)return;

    const patchButtons=()=>{
      const packButton=document.querySelector<HTMLButtonElement>('.credit-pack button.btn-primary');
      if(packButton){packButton.disabled=false;if(/s’abonner pour recharger/i.test(packButton.textContent||''))packButton.textContent='Acheter maintenant'}
      const modalButtons=Array.from(document.querySelectorAll<HTMLButtonElement>('.credit-modal button.btn-primary'));
      for(const button of modalButtons){if(/choisir un abonnement/i.test(button.textContent||'')){button.disabled=false;button.textContent='Recharger maintenant'}}
    };

    const checkout=async()=>{
      if(buying.current)return;
      buying.current=true;
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session){window.location.href='/login';return}
        const r=await fetch('/api/checkout/maketou/credits',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:'{}'});
        const d=await r.json().catch(()=>({}));
        if(!r.ok){window.alert(d.message||d.error||'Impossible de créer le paiement.');return}
        const cart=d.cart?.id||d.id;
        const url=d.redirectUrl||d.redirectURL;
        if(cart)localStorage.setItem('qatalink_maketou_cart_id',cart);
        if(url)window.location.href=url;else window.alert('Le service de paiement n’a pas renvoyé de lien.');
      }finally{buying.current=false}
    };

    const click=(event:MouseEvent)=>{
      const button=(event.target as HTMLElement|null)?.closest('button') as HTMLButtonElement|null;
      if(!button)return;
      const inPack=!!button.closest('.credit-pack');
      const inModal=!!button.closest('.credit-modal');
      const text=(button.textContent||'').trim();
      const shouldBuy=(inPack&&/acheter maintenant|s’abonner pour recharger/i.test(text))||(inModal&&/recharger maintenant|choisir un abonnement/i.test(text));
      if(!shouldBuy)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      void checkout();
    };

    patchButtons();
    const observer=new MutationObserver(patchButtons);observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
    document.addEventListener('click',click,true);
    return()=>{observer.disconnect();document.removeEventListener('click',click,true)};
  },[trialActive,supabase]);

  return null;
}
