'use client';

import {useEffect,useMemo} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const NATIVE_ID=26083001;
const DELAY_MS=2*60*60*1000;
const DEADLINE_KEY='qatalink_first_catalog_resume_deadline';
const SIGNATURE_KEY='qatalink_first_catalog_resume_signature';

type ResumeState={done:boolean;signature:string;title:string;body:string;url:string};

async function showBrowserNotification(state:ResumeState){
  if(typeof window==='undefined'||state.done||!('Notification'in window)||Notification.permission!=='granted')return;
  try{
    const registration=await navigator.serviceWorker?.getRegistration();
    if(registration)await registration.showNotification(state.title,{body:state.body,icon:'/qatalink-icon.svg',badge:'/qatalink-icon.svg',tag:'first-catalog-resume',data:{url:state.url}});
    else new Notification(state.title,{body:state.body,icon:'/qatalink-icon.svg',tag:'first-catalog-resume'});
  }catch{}
}

export function FirstCatalogResumeReminder(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);

  useEffect(()=>{
    let disposed=false;
    let browserTimer:number|undefined;
    let checkTimer:number|undefined;
    let activityTimer:number|undefined;
    let current:ResumeState|null=null;

    const clearBrowserTimer=()=>{if(browserTimer){window.clearTimeout(browserTimer);browserTimer=undefined}};
    const cancelAll=async()=>{
      clearBrowserTimer();
      localStorage.removeItem(DEADLINE_KEY);localStorage.removeItem(SIGNATURE_KEY);
      try{await window.qatalinkNativeCancelNotification?.(NATIVE_ID)}catch{}
    };

    const loadState=async():Promise<ResumeState|null>=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session)return null;
      const {data:profile}=await supabase.from('profiles').select('access_mode').eq('id',session.user.id).maybeSingle();
      if(profile?.access_mode&&profile.access_mode!=='pro')return null;
      const {data:businesses}=await supabase.from('businesses').select('id,published').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const business=businesses?.[0];
      if(!business)return{done:false,signature:'create-business',title:'Votre catalogue vous attend',body:'Reprenez là où vous vous êtes arrêté : créez votre première activité et votre premier catalogue.',url:'/create'};
      const {data:catalogs}=await supabase.from('catalogs').select('id,title,is_active').eq('business_id',business.id).order('created_at',{ascending:true}).limit(1);
      const catalog=catalogs?.[0];
      if(!catalog)return{done:false,signature:`create-catalog:${business.id}`,title:'Votre premier catalogue n’est pas terminé',body:'Il ne vous reste que quelques étapes. Reprenez la création de votre menu ou catalogue.',url:'/create'};
      const {count}=await supabase.from('items').select('*',{count:'exact',head:true}).eq('catalog_id',catalog.id);
      if((count||0)===0)return{done:false,signature:`items:${catalog.id}`,title:'Prochaine étape : ajoutez vos offres',body:`« ${catalog.title||'Votre catalogue'} » est créé. Ajoutez maintenant vos produits, services ou plats pour le rendre utile.`,url:`/dashboard?tab=items&catalog=${catalog.id}`};
      const published=!!business.published&&catalog.is_active!==false;
      if(!published)return{done:false,signature:`publish:${catalog.id}`,title:'Votre catalogue est presque prêt',body:'Vos offres sont déjà là. Publiez maintenant votre catalogue pour obtenir votre QR permanent et commencer à le partager.',url:`/dashboard?tab=qr&catalog=${catalog.id}`};
      return{done:true,signature:`done:${catalog.id}`,title:'',body:'',url:''};
    };

    const arm=async(state:ResumeState,reset=false)=>{
      if(disposed)return;current=state;
      if(state.done){await cancelAll();return}
      const oldSignature=localStorage.getItem(SIGNATURE_KEY)||'';
      let deadline=Number(localStorage.getItem(DEADLINE_KEY)||0);
      if(reset||oldSignature!==state.signature||!deadline||deadline<Date.now())deadline=Date.now()+DELAY_MS;
      localStorage.setItem(SIGNATURE_KEY,state.signature);localStorage.setItem(DEADLINE_KEY,String(deadline));
      clearBrowserTimer();
      browserTimer=window.setTimeout(()=>{if(!disposed&&current&&!current.done)void showBrowserNotification(current)},Math.max(1000,deadline-Date.now()));
      try{await window.qatalinkNativeScheduleNotification?.(NATIVE_ID,state.title,state.body,state.url,deadline)}catch{}
    };

    const refresh=async(reset=false)=>{const state=await loadState();if(disposed)return;if(!state){await cancelAll();return}await arm(state,reset)};
    const activity=()=>{if(activityTimer)window.clearTimeout(activityTimer);activityTimer=window.setTimeout(()=>{if(current&&!current.done)void arm(current,true)},15000)};

    void refresh(false);
    checkTimer=window.setInterval(()=>void refresh(false),60000);
    document.addEventListener('pointerdown',activity,true);document.addEventListener('keydown',activity,true);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh(false)});
    return()=>{disposed=true;clearBrowserTimer();if(checkTimer)clearInterval(checkTimer);if(activityTimer)clearTimeout(activityTimer);document.removeEventListener('pointerdown',activity,true);document.removeEventListener('keydown',activity,true)};
  },[supabase]);

  return null;
}
