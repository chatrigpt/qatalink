'use client';
import Image from 'next/image';
import { useEffect } from 'react';

export default function ScanSplash({slug}:{slug:string}){
  useEffect(()=>{
    const timer=setTimeout(()=>window.location.replace(`/c/${encodeURIComponent(slug)}`),1350);
    return()=>clearTimeout(timer);
  },[slug]);

  return <main className="qatalink-scan-splash" aria-label="Ouverture du catalogue Qatalink">
    <div className="scan-glow scan-glow-one"/><div className="scan-glow scan-glow-two"/>
    <div className="scan-brand-card">
      <div className="scan-logo-wrap"><Image src="/qatalink-logo.png" width={68} height={68} alt="Qatalink" priority/></div>
      <div className="scan-wordmark">qatalink</div>
      <p>Ouverture du menu interactif…</p>
      <div className="scan-progress"><span/></div>
    </div>
  </main>;
}
