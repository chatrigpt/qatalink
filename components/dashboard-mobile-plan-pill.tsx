'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Gem} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const labels:Record<string,string>={static:'Starter',interactive:'Pro',linkhub:'Business',trial:'Essai'};

export function DashboardMobilePlanPill(){
 const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);const [host,setHost]=useState<Element|null>(null);const [plan,setPlan]=useState('free');const [active,setActive]=useState(false);
 useEffect(()=>{let cancelled=false;const locate=()=>setHost(document.querySelector('.q-ops-mobile-bar'));locate();const mo=new MutationObserver(locate);mo.observe(document.body,{childList:true,subtree:true});void(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)return;const {data:b}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);if(!b?.[0])return;const {data:s}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',b[0].id).order('created_at',{ascending:false}).limit(1);const row=s?.[0];const valid=!!row&&['active','trialing'].includes(String(row.status))&&(!row.current_period_end||new Date(row.current_period_end).getTime()>Date.now());if(!cancelled){setActive(valid);setPlan(valid?String(row.plan_code||'free'):'free')}})();return()=>{cancelled=true;mo.disconnect()}},[supabase]);
 if(!host)return null;const text=active?(labels[plan]||'Abonnement actif'):'Passer au niveau supérieur';
 return createPortal(<button className={`q-mobile-plan-pill ${active?'active':''}`} onClick={()=>{window.location.href='/dashboard?tab=subscription'}} title={active?`Formule ${text}`:'Voir les formules Qatalink'}><Gem size={13}/><span>{text}</span></button>,host);
}
