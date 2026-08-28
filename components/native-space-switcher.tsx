'use client';

import {useEffect,useMemo,useState} from 'react';
import {Bike,BriefcaseBusiness,ChevronUp,ShoppingBag,Users,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function NativeSpaceSwitcher(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]),[native,setNative]=useState(false),[open,setOpen]=useState(false);
  useEffect(()=>{const check=()=>setNative(document.documentElement.dataset.qatalinkNative==='true');check();const id=setInterval(check,500);return()=>clearInterval(id)},[]);
  if(!native||location.pathname==='/mobile'||location.pathname.startsWith('/login'))return null;
  async function go(mode:'client'|'pro'|'team'|'driver',fallback:string){try{const {data:{session}}=await supabase.auth.getSession();if(session)await supabase.rpc('set_my_access_mode',{p_mode:mode})}catch{}location.href=fallback}
  function team(){let key='';try{key=localStorage.getItem('qatalink_last_team_key')||''}catch{}location.href=key?`/ops/${encodeURIComponent(key)}`:'/mobile#team'}
  function driver(){let token='';try{token=localStorage.getItem('qatalink_last_driver_token')||''}catch{}location.href=token?`/livreur/${encodeURIComponent(token)}`:'/mobile#driver'}
  return <div className="native-space-switcher"><button className="native-space-trigger" onClick={()=>setOpen(v=>!v)}>{open?<X size={17}/>:<ChevronUp size={17}/>}<span>Espaces</span></button>{open&&<div className="native-space-menu"><button onClick={()=>void go('client','/app')}><ShoppingBag/><span><b>Client</b><small>Explorer et commander</small></span></button><button onClick={()=>void go('pro','/dashboard')}><BriefcaseBusiness/><span><b>Pro</b><small>Dashboard et catalogues</small></span></button><button onClick={team}><Users/><span><b>Caisse / Équipe</b><small>Dernier accès enregistré</small></span></button><button onClick={driver}><Bike/><span><b>Livreur</b><small>Dernière mission</small></span></button><button className="native-space-all" onClick={()=>location.href='/mobile'}>Voir tous mes espaces</button></div>}</div>
}
