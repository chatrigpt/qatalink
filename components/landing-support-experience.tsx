'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Bot,Headphones,MessagesSquare,Palette} from 'lucide-react';
import {SupportChat} from '@/components/support-chat';

export function LandingSupportExperience(){
  const [host,setHost]=useState<HTMLElement|null>(null);const [isLanding,setIsLanding]=useState(false);
  useEffect(()=>{
    if(window.location.pathname!=='/'){setIsLanding(false);return}setIsLanding(true);
    const faq=document.querySelector('#faq');if(!faq?.parentElement)return;
    let section=document.getElementById('help') as HTMLElement|null;
    if(!section){section=document.createElement('section');section.id='help';section.className='section landing-help-section';faq.parentElement.insertBefore(section,faq)}
    setHost(section);
    return()=>{if(section?.isConnected)section.remove()};
  },[]);
  if(!isLanding)return null;
  const open=(mode:'ai'|'human')=>window.dispatchEvent(new CustomEvent('qatalink:support-open',{detail:{mode}}));
  return <>{host&&createPortal(<div className="container"><div className="landing-help-card"><div className="landing-help-copy"><div className="eyebrow">BESOIN D’AIDE ?</div><h2>Une question ? Discutez avec Qatalink.</h2><p>Avant de créer votre catalogue ou pendant vos réglages, obtenez une réponse immédiate sur les thèmes, le QR code, WhatsApp, les paiements ou la mise en page. Et si votre situation nécessite une intervention, passez directement au Support Qatalink.</p><div className="landing-help-actions"><button className="btn btn-primary support-open-btn" onClick={()=>open('ai')}><Bot size={17}/>Discuter avec l’assistant</button><button className="btn btn-ghost support-open-btn" onClick={()=>open('human')}><Headphones size={17}/>DISCUTER AVEC LE SUPPORT</button></div></div><div className="landing-help-side"><div className="landing-help-point"><Palette size={19}/><div><b>Conseils adaptés à votre activité</b><span>Thème, couleurs, image de fond, disposition et lisibilité.</span></div></div><div className="landing-help-point"><MessagesSquare size={19}/><div><b>Votre conversation reste disponible</b><span>Reprenez vos questions après la création de votre catalogue depuis le dashboard.</span></div></div><div className="landing-help-point"><Bot size={19}/><div><b>IA ou humain, à vous de choisir</b><span>Réponse immédiate par l’assistant ou reprise par l’équipe Qatalink.</span></div></div></div></div></div>,host)}<SupportChat/></>;
}
