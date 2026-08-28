'use client';

import {useEffect,useMemo,useState} from 'react';
import {Bike,BriefcaseBusiness,Grid2X2,ShoppingBag,Users,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const RECEIPT_CATALOG_URL_PREFIX='qatalink_receipt_catalog_url:';

export function NativeSpaceSwitcher(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]),[native,setNative]=useState(false),[open,setOpen]=useState(false);

  useEffect(()=>{const check=()=>setNative(document.documentElement.dataset.qatalinkNative==='true');check();const id=setInterval(check,350);return()=>clearInterval(id)},[]);

  useEffect(()=>{
    const match=location.pathname.match(/^\/ops\/([^/?#]+)/);if(!match)return;
    const accessKey=decodeURIComponent(match[1]);let stopped=false;
    const sync=async()=>{
      if(stopped)return;let pin='';try{pin=sessionStorage.getItem(`qatalink_ops_pin_${accessKey}`)||''}catch{}if(!pin)return;
      try{const r=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action:'list',limit:1}),cache:'no-store'}),d=await r.json();const url=String(d?.catalog?.catalog_url||'').trim();if(r.ok&&/^https:\/\/qatalink\.com\/c\//i.test(url))localStorage.setItem(`${RECEIPT_CATALOG_URL_PREFIX}${accessKey}`,url)}catch{}
    };
    void sync();const id=setInterval(()=>void sync(),1800);return()=>{stopped=true;clearInterval(id)};
  },[]);

  useEffect(()=>{
    if(!location.pathname.startsWith('/livreur/'))return;let stopped=false,timer:ReturnType<typeof setTimeout>|null=null;
    const resolve=()=>{if(stopped)return;if(timer)clearTimeout(timer);timer=setTimeout(async()=>{
      const nodes=[...document.querySelectorAll<HTMLElement>('.delivery-driver-status b')];
      const target=nodes.find(node=>/maps\.google|google\.com\/maps/i.test(node.textContent||''));if(!target||target.dataset.qAreaResolved==='1')return;
      const raw=target.textContent||'',m=raw.match(/[?&]q=([-\d.]+),([-\d.]+)/i);if(!m)return;
      try{const r=await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(m[1])}&lng=${encodeURIComponent(m[2])}`,{cache:'no-store'}),d=await r.json(),area=String(d?.area||'').trim();if(area){target.textContent=area;target.dataset.qAreaResolved='1'}}catch{}
    },80)};
    resolve();const mo=new MutationObserver(resolve);mo.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>{stopped=true;if(timer)clearTimeout(timer);mo.disconnect()};
  },[]);

  useEffect(()=>{
    if(!native)return;const permissions=(navigator as any).permissions;if(!permissions?.query)return;let original:any;
    try{original=permissions.query.bind(permissions);permissions.query=(descriptor:any)=>descriptor?.name==='geolocation'?Promise.resolve({state:'prompt'}):original(descriptor)}catch{return}
    return()=>{try{permissions.query=original}catch{}};
  },[native]);

  useEffect(()=>{
    if(!native||!location.pathname.startsWith('/livreur/'))return;let timer:ReturnType<typeof setTimeout>|null=null;
    const fixCopy=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{document.querySelectorAll<HTMLElement>('.delivery-driver-status b,.delivery-privacy span').forEach(el=>{const text=el.textContent||'';if(/Safari/i.test(text))el.textContent=text.replace(/Dans Safari, autorisez la localisation précise pour qatalink\.com\./gi,'Autorisez la localisation précise pour Qatalink dans les réglages Android.').replace(/Sur iPhone, privilégiez Safari[^.]*\./gi,'Gardez Qatalink ouvert pendant le trajet.')})},60)};
    fixCopy();const mo=new MutationObserver(fixCopy);mo.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>{if(timer)clearTimeout(timer);mo.disconnect()};
  },[native]);

  if(!native||location.pathname==='/mobile'||location.pathname.startsWith('/login'))return null;
  async function go(mode:'client'|'pro'|'team'|'driver',fallback:string){try{const {data:{session}}=await supabase.auth.getSession();if(session)await supabase.rpc('set_my_access_mode',{p_mode:mode})}catch{}location.href=fallback}
  function team(){let key='';try{key=localStorage.getItem('qatalink_last_team_key')||''}catch{}location.href=key?`/ops/${encodeURIComponent(key)}`:'/mobile#team'}
  function driver(){let token='';try{token=localStorage.getItem('qatalink_last_driver_token')||''}catch{}location.href=token?`/livreur/${encodeURIComponent(token)}`:'/mobile#driver'}
  return <><style>{`
    html[data-qatalink-native=true] .native-space-switcher{right:10px!important;left:auto!important;top:max(10px,env(safe-area-inset-top))!important;bottom:auto!important}
    html[data-qatalink-native=true] .native-space-trigger{width:40px!important;height:40px!important;padding:0!important;border-radius:12px!important;justify-content:center!important;background:rgba(17,17,17,.88)!important;box-shadow:0 8px 22px rgba(0,0,0,.16)!important;backdrop-filter:blur(10px)}
    html[data-qatalink-native=true] .native-space-trigger span{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
    html[data-qatalink-native=true] .native-space-menu{top:48px!important;bottom:auto!important;right:0!important}
  `}</style><div className="native-space-switcher"><button className="native-space-trigger" aria-label="Changer d’espace" title="Espaces" onClick={()=>setOpen(v=>!v)}>{open?<X size={17}/>:<Grid2X2 size={17}/>}<span>Espaces</span></button>{open&&<div className="native-space-menu"><button onClick={()=>void go('client','/app')}><ShoppingBag/><span><b>Client</b><small>Mes adresses et Explorer</small></span></button><button onClick={()=>void go('pro','/dashboard')}><BriefcaseBusiness/><span><b>Pro</b><small>Dashboard et catalogues</small></span></button><button onClick={team}><Users/><span><b>Caisse / Équipe</b><small>Dernier accès enregistré</small></span></button><button onClick={driver}><Bike/><span><b>Livreur</b><small>Dernière mission</small></span></button><button className="native-space-all" onClick={()=>location.href='/mobile'}>Voir tous mes espaces</button></div>}</div></>;
}
