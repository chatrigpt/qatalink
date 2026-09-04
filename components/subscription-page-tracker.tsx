'use client';
import {useEffect,useMemo} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function SubscriptionPageTracker(){
 const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
 useEffect(()=>{let last='';let dead=false;const track=async(source:string)=>{const key=`${source}:${new Date().toISOString().slice(0,13)}`;if(key===last)return;last=key;await supabase.rpc('track_subscription_page_view',{p_source:source})};const sync=()=>{if(dead)return;const p=new URLSearchParams(location.search);const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';if(p.get('tab')==='subscription'||title==='Abonnement & crédits')void track('dashboard_subscription');else if(p.get('paywall')==='1'||document.querySelector('.pricing-gate,.pricing-modal'))void track('paywall')};sync();const o=new MutationObserver(sync);o.observe(document.body,{subtree:true,childList:true,characterData:true});const t=setInterval(sync,1500);window.addEventListener('popstate',sync);return()=>{dead=true;o.disconnect();clearInterval(t);window.removeEventListener('popstate',sync)}},[supabase]);return null;
}
