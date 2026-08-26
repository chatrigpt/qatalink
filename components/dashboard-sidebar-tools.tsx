'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link2,Palette,Route} from 'lucide-react';

function clickHidden(selector:string){const node=document.querySelector<HTMLButtonElement>(selector);node?.click()}

const ORDER:Record<string,number>={
  'vue d’ensemble':10,
  'catalogues':20,
  'articles':30,
  'apparence':40,
  'qr & partage':50,
  'statistiques':60,
  'stock':70,
  'point de vente':80,
  'abonnement':90,
  'studio avancé':100,
  'vitrine & médias':110,
  'parcours client':120,
  'prévisions':130,
  'paramètres':140,
  'paramètre':140,
  'administration':150,
};

function clean(value:string){return value.replace(/beta/ig,'').replace(/\s+/g,' ').trim().toLowerCase()}
function childLabel(node:Element){const button=node.matches('button')?node:node.querySelector('button');return clean(button?.textContent||node.textContent||'')}

function normalizeNav(){
  for(const selector of ['.dash-v3-nav','.dash-v3-mobile-tabs']){
    const container=document.querySelector<HTMLElement>(selector);
    if(!container)continue;
    const children=Array.from(container.children) as HTMLElement[];
    for(const child of children){
      const label=childLabel(child);
      if(label==='administration'){
        child.style.display='none';
        child.setAttribute('aria-hidden','true');
        continue;
      }
      child.style.removeProperty('display');
      child.removeAttribute('aria-hidden');
      child.style.order=String(ORDER[label]??1000);
    }
  }
}

export function DashboardSidebarTools(){
  const [desktop,setDesktop]=useState<Element|null>(null);const [mobile,setMobile]=useState<Element|null>(null);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|null=null;
    const resolve=()=>{
      setDesktop(document.querySelector('.dash-v3-nav'));
      setMobile(document.querySelector('.dash-v3-mobile-tabs'));
      if(timer)clearTimeout(timer);
      timer=setTimeout(normalizeNav,0);
    };
    resolve();
    const observer=new MutationObserver(resolve);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{if(timer)clearTimeout(timer);observer.disconnect()};
  },[]);
  useEffect(()=>{const id=setTimeout(normalizeNav,0);return()=>clearTimeout(id)},[desktop,mobile]);

  const tools=<>
    <button className="dash-tool-nav dash-tool-studio" onClick={()=>clickHidden('.advanced-studio-trigger')}><Palette size={16}/><span>Studio avancé</span></button>
    <button className="dash-tool-nav dash-tool-vitrine" onClick={()=>clickHidden('.vitrine-media-trigger')}><Link2 size={16}/><span>Vitrine & médias</span></button>
    <button className="dash-tool-nav dash-tool-flow" onClick={()=>window.dispatchEvent(new CustomEvent('qatalink:customer-flow-open'))}><Route size={16}/><span>Parcours client</span></button>
  </>;
  return <>{desktop&&createPortal(tools,desktop)}{mobile&&createPortal(tools,mobile)}</>;
}
