'use client';

import { Download, MonitorDown, Share2, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallButton(){
  const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const [open,setOpen]=useState(false);
  const [installed,setInstalled]=useState(false);

  const platform=useMemo(()=>{
    if(typeof navigator==='undefined')return 'desktop';
    const ua=navigator.userAgent.toLowerCase();
    if(/iphone|ipad|ipod/.test(ua))return 'ios';
    if(/android/.test(ua))return 'android';
    return 'desktop';
  },[]);

  useEffect(()=>{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(()=>undefined);
    }
    const standalone=window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone===true;
    setInstalled(standalone);
    const onPrompt=(event:Event)=>{
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled=()=>setInstalled(true);
    window.addEventListener('beforeinstallprompt',onPrompt);
    window.addEventListener('appinstalled',onInstalled);
    return()=>{
      window.removeEventListener('beforeinstallprompt',onPrompt);
      window.removeEventListener('appinstalled',onInstalled);
    };
  },[]);

  if(installed)return null;

  const action=async()=>{
    if(platform==='desktop'&&promptEvent){
      await promptEvent.prompt();
      const choice=await promptEvent.userChoice;
      if(choice.outcome==='accepted')setInstalled(true);
      setPromptEvent(null);
      return;
    }
    setOpen(true);
  };

  return <>
    <button className="pwa-install-trigger" onClick={action} type="button" aria-label="Installer Qatalink">
      <Download size={17}/><span>Installer l’app</span>
    </button>
    {open&&<div className="pwa-install-backdrop" onClick={()=>setOpen(false)}>
      <div className="pwa-install-modal" onClick={e=>e.stopPropagation()}>
        <button className="pwa-install-close" onClick={()=>setOpen(false)} aria-label="Fermer"><X size={18}/></button>
        <img src="/qatalink-logo.png" alt="Logo Qatalink" className="pwa-install-logo"/>
        <div className="eyebrow">QATALINK SUR VOTRE APPAREIL</div>
        <h3>{platform==='ios'?'Ajouter Qatalink sur votre iPhone':platform==='android'?'Créer un raccourci Qatalink':'Installer Qatalink sur votre ordinateur'}</h3>
        {platform==='ios'&&<div className="pwa-install-steps"><p><Share2 size={18}/><span>Ouvrez Qatalink dans <b>Safari</b>, touchez <b>Partager</b>.</span></p><p><Smartphone size={18}/><span>Choisissez <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</span></p></div>}
        {platform==='android'&&<div className="pwa-install-steps"><p><Smartphone size={18}/><span>Ouvrez le menu <b>⋮</b> de Chrome.</span></p><p><Download size={18}/><span>Choisissez <b>Ajouter à l’écran d’accueil</b>. Qatalink sera ajouté comme raccourci avec son logo.</span></p></div>}
        {platform==='desktop'&&<div className="pwa-install-steps"><p><MonitorDown size={18}/><span>Dans Chrome ou Edge, ouvrez le menu du navigateur puis choisissez <b>Installer Qatalink</b>.</span></p><p><Download size={18}/><span>L’application s’ouvrira ensuite dans sa propre fenêtre, sans onglets de navigateur.</span></p></div>}
        <button className="btn btn-primary" style={{width:'100%'}} onClick={()=>setOpen(false)}>J’ai compris</button>
      </div>
    </div>}
  </>;
}
