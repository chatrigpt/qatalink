'use client';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import { useEffect } from 'react';

export default function ScanSplash({target,isVitrine=false}:{target:string;isVitrine?:boolean}){
  const router=useRouter();
  useEffect(()=>{
    router.prefetch(target);
    const timer=setTimeout(()=>window.location.replace(target),320);
    return()=>clearTimeout(timer);
  },[target,router]);

  return <main className="qatalink-scan-splash" aria-label="Ouverture du catalogue">
    <div className="scan-glow scan-glow-one"/><div className="scan-glow scan-glow-two"/>
    <div className="scan-brand-card">
      <div className="scan-logo-wrap"><Image src="/qatalink-logo.png" width={68} height={68} alt="Qatalink" priority/></div>
      <div className="scan-wordmark">qatalink</div>
      <p>{isVitrine?'Ouverture de la vitrine…':'Ouverture du catalogue…'}</p>
      <div className="scan-progress"><span/></div>
    </div>
  </main>;
}
