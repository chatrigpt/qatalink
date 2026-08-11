'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {RefreshCw,ArrowUpRight,CreditCard} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Sub={plan_code:string;status:string;current_period_end:string|null}|null;

function isCurrent(sub:Sub){return !!sub&&(sub.status==='active'||sub.status==='trialing')&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now())}
function planName(sub:Sub){
  if(!isCurrent(sub))return'GRATUIT';
  if(sub?.status==='trialing'&&sub.plan_code==='trial')return'ESSAI 24 H';
  if(sub?.plan_code==='static')return'BASIC';
  if(sub?.plan_code==='interactive')return'INTERACTIF';
  if(sub?.plan_code==='linkhub')return'VITRINE';
  return'GRATUIT';
}

export function DashboardUtilityControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [headerTarget,setHeaderTarget]=useState<Element|null>(null);
  const [titleTarget,setTitleTarget]=useState<Element|null>(null);
  const [subscriptionTarget,setSubscriptionTarget]=useState<Element|null>(null);
  const [sub,setSub]=useState<Sub>(null);
  const [showSubscription,setShowSubscription]=useState(false);
  const [refreshing,setRefreshing]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    const resolve=()=>{
      const actions=document.querySelector('.dash-v3-actions');
      setHeaderTarget(actions);
      const title=document.querySelector('.dash-v3-top h1')?.textContent||'';
      const onSubscription=title.includes('Abonnement');
      setShowSubscription(onSubscription);
      setTitleTarget(document.querySelector('.dash-v3-top > div:first-child'));
      if(onSubscription){
        const main=document.querySelector('.dash-v3-main');
        const sections=main?.querySelectorAll(':scope > .dash-section');
        setSubscriptionTarget(sections&&sections.length?sections[0]:null);
      }else setSubscriptionTarget(null);
    };
    resolve();
    const observer=new MutationObserver(resolve);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    const click=()=>setTimeout(resolve,30);document.addEventListener('click',click,true);
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session||cancelled)return;
      const p=new URLSearchParams(window.location.search);const catalogId=p.get('catalog');let businessId='';
      if(catalogId){const {data:c}=await supabase.from('catalogs').select('business_id').eq('id',catalogId).maybeSingle();businessId=c?.business_id||''}
      if(!businessId){const {data:bs}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);businessId=bs?.[0]?.id||''}
      if(!businessId||cancelled)return;
      const {data:ss}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
      if(!cancelled)setSub((ss?.[0]||null) as Sub);
    })();
    return()=>{cancelled=true;observer.disconnect();document.removeEventListener('click',click,true)};
  },[supabase]);

  useEffect(()=>{
    if(!titleTarget)return;
    const native=titleTarget.querySelector<HTMLElement>(':scope > .eyebrow');
    if(native)native.style.display='none';
    return()=>{if(native)native.style.display=''};
  },[titleTarget]);

  async function refreshApp(){
    if(refreshing)return;setRefreshing(true);
    try{
      if('serviceWorker'in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(async reg=>{try{await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'})}catch{}}));
      }
    }finally{
      const url=new URL(window.location.href);url.searchParams.set('_refresh',Date.now().toString());window.location.replace(url.toString());
    }
  }

  function openPaywall(){
    const url=new URL(window.location.href);url.searchParams.set('paywall','1');window.history.replaceState({},'',url.toString());window.dispatchEvent(new Event('qatalink:pricing-open'));
  }

  const valid=isCurrent(sub);
  const trial=valid&&sub?.status==='trialing'&&sub.plan_code==='trial';
  const label=trial?'Payer mon abonnement':valid?'Prendre un abonnement supérieur':'Payer mon abonnement';
  const currentPlan=planName(sub);

  return <>
    {titleTarget&&createPortal(<span className="eyebrow dashboard-correct-plan">{currentPlan}</span>,titleTarget)}
    {headerTarget&&createPortal(<button className="btn btn-ghost dashboard-refresh-btn" onClick={refreshApp} disabled={refreshing} title="Actualiser l’application"><RefreshCw size={16}/><span>{refreshing?'Actualisation…':'Actualiser'}</span></button>,headerTarget)}
    {showSubscription&&headerTarget&&createPortal(<button className="btn btn-primary dashboard-subscription-header-btn" onClick={openPaywall}><CreditCard size={16}/><span>{label}</span></button>,headerTarget)}
    {subscriptionTarget&&createPortal(<section className="dash-card subscription-paywall-cta"><div><span className="eyebrow">ABONNEMENT</span><h3>{label}</h3><p>Consultez les formules et choisissez celle qui vous convient.</p></div><button className="btn btn-primary" onClick={openPaywall}>{label}<ArrowUpRight size={16}/></button></section>,subscriptionTarget)}
  </>;
}
