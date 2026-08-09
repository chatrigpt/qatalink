'use client';
import Image from 'next/image';
import { useEffect } from 'react';

export default function ScanSplash({target,isVitrine=false}:{target:string;isVitrine?:boolean}){
  useEffect(()=>{
    const timer=setTimeout(()=>window.location.replace(target),1350);
    return()=>clearTimeout(timer);
  },[target]);

  return <main className="qatalink-scan-splash" aria-label="Ouverture de Qatalink">
    <div className="scan-glow scan-glow-one"/><div className="scan-glow scan-glow-two"/>
    <div className="scan-brand-card">
      <div className="scan-logo-wrap"><Image src="/qatalink-logo.png" width={68} height={68} alt="Qatalink" priority/></div>
      <div className="scan-wordmark">qatalink</div>
      <p>{isVitrine?'Ouverture de la vitrine…':'Ouverture du menu interactif…'}</p>
      <div className="scan-progress"><span/></div>
    </div>
  </main>;
}
