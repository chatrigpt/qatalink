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
 return createPortal(<><button className={`q-mobile-plan-pill ${active?'active':''}`} onClick={()=>{window.location.href='/dashboard?tab=subscription'}} title={active?`Formule ${text}`:'Voir les formules Qatalink'}><Gem size={13}/><span>{text}</span></button><style jsx global>{`
 .q-mobile-plan-pill{display:none}
 @media(max-width:980px){.q-mobile-plan-pill{position:absolute;right:63px;top:calc(env(safe-area-inset-top) + 11px);height:39px;max-width:150px;border:1px solid color-mix(in srgb,var(--brand-primary,#d3163c) 22%,var(--border-default,#e8e8ec));border-radius:12px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--brand-primary,#d3163c);color:#fff;font:850 10px/1.15 var(--font-jakarta),sans-serif;cursor:pointer;text-align:left}.q-mobile-plan-pill span{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.q-mobile-plan-pill.active{background:var(--brand-soft,#fff0f3);color:var(--brand-primary,#d3163c)}}
 @media(max-width:390px){.q-mobile-plan-pill{max-width:126px;font-size:9px;padding:0 8px}}
 `}</style></>,host);
}
