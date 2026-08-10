'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link2,Palette,Route} from 'lucide-react';

function clickHidden(selector:string){
  const node=document.querySelector<HTMLButtonElement>(selector);
  node?.click();
}

export function DashboardSidebarTools(){
  const [desktop,setDesktop]=useState<Element|null>(null);
  const [mobile,setMobile]=useState<Element|null>(null);

  useEffect(()=>{
    const resolve=()=>{
      setDesktop(document.querySelector('.dash-v3-nav'));
      setMobile(document.querySelector('.dash-v3-mobile-tabs'));
    };
    resolve();
    const observer=new MutationObserver(resolve);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  const tools=<>
    <button className="dash-tool-nav" onClick={()=>clickHidden('.advanced-studio-trigger')}><Palette size={16}/><span>Studio avancé</span></button>
    <button className="dash-tool-nav" onClick={()=>clickHidden('.vitrine-media-trigger')}><Link2 size={16}/><span>Vitrine & médias</span></button>
    <button className="dash-tool-nav" onClick={()=>window.dispatchEvent(new CustomEvent('qatalink:customer-flow-open'))}><Route size={16}/><span>Parcours client</span></button>
  </>;

  return <>{desktop&&createPortal(tools,desktop)}{mobile&&createPortal(tools,mobile)}</>;
}
