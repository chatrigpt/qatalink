'use client';
import {useEffect,useMemo} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function DirectSubscriptionSync(){
 const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
 useEffect(()=>{if(location.pathname!='/dashboard')return;let cancelled=false;void(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token||cancelled)return;try{const r=await fetch('/api/payment/maketou/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(cancelled||!r.ok||d.status!=='completed'||d.purchase_type!=='subscription')return;window.dispatchEvent(new CustomEvent('qatalink:subscription-synced',{detail:d}));const key=`qatalink_subscription_sync_${String(d.payment_id||d.current_period_end||'latest')}`;if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');window.location.reload()}}catch{}})();return()=>{cancelled=true}},[supabase]);return null;
}
