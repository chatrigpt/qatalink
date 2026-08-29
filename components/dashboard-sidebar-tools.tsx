'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link2,Palette,Route} from 'lucide-react';

function clickHidden(selector:string){document.querySelector<HTMLButtonElement>(selector)?.click()}

export function DashboardSidebarTools(){
  const [desktop,setDesktop]=useState<Element|null>(null);
  const [mobile,setMobile]=useState<Element|null>(null);

  useEffect(()=>{
    let cancelled=false;
    const resolve=()=>{
      if(cancelled)return;
      setDesktop(document.querySelector('.dash-v3-nav'));
      setMobile(document.querySelector('.dash-v3-mobile-tabs'));
    };
    resolve();
    const timers=[150,500,1200].map(ms=>setTimeout(resolve,ms));
    const onRoute=()=>setTimeout(resolve,0);
    window.addEventListener('popstate',onRoute);
    window.addEventListener('qatalink:catalog-change',onRoute as EventListener);
    return()=>{cancelled=true;timers.forEach(clearTimeout);window.removeEventListener('popstate',onRoute);window.removeEventListener('qatalink:catalog-change',onRoute as EventListener)};
  },[]);

  const tools=<>
    <button className="dash-tool-nav dash-tool-flow" onClick={()=>window.dispatchEvent(new CustomEvent('qatalink:customer-flow-open'))}><Route size={16}/><span>Parcours client</span></button>
    <button className="dash-tool-nav dash-tool-vitrine" onClick={()=>clickHidden('.vitrine-media-trigger')}><Link2 size={16}/><span>Vitrine & médias</span></button>
    <button className="dash-tool-nav dash-tool-studio" onClick={()=>clickHidden('.advanced-studio-trigger')}><Palette size={16}/><span>Studio avancé</span></button>
  </>;

  return <>{desktop&&createPortal(tools,desktop)}{mobile&&createPortal(tools,mobile)}</>;
}
