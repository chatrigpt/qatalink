'use client';

import {useEffect} from 'react';

export function DriverNativeOpen({token}:{token:string}){
  useEffect(()=>{
    const cap=(window as any).Capacitor;
    if(cap?.isNativePlatform?.())return;
    if(!/Android/i.test(navigator.userAgent||''))return;
    const key=`qatalink_driver_native_attempt_${token}`;
    try{if(sessionStorage.getItem(key)==='1')return;sessionStorage.setItem(key,'1')}catch{}
    const timer=setTimeout(()=>{location.href=`qatalink://livreur/${encodeURIComponent(token)}`},180);
    return()=>clearTimeout(timer);
  },[token]);
  return null;
}
