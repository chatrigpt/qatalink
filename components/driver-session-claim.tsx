'use client';
import {useEffect,useMemo} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';
export function DriverSessionClaim({token}:{token:string}){const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);useEffect(()=>{if(!token)return;try{localStorage.setItem('qatalink_last_driver_token',token)}catch{};void(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)return;await supabase.rpc('claim_driver_delivery',{p_driver_token:token});await supabase.from('user_role_events').insert({user_id:session.user.id,role:'driver',event_type:'mission_open',metadata:{mission:token.slice(-6)}})})()},[token,supabase]);return null}
