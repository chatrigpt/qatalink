'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link2,Palette,Route,ShieldCheck} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

function clickHidden(selector:string){const node=document.querySelector<HTMLButtonElement>(selector);node?.click()}

const ORDER:Record<string,number>={
  'vue d’ensemble':10,
  'catalogues':20,
  'articles':30,
  'stock':40,
  'studio avancé':50,
  'vitrine & médias':60,
  'parcours client':70,
  'apparence':80,
  'qr & partage':90,
  'statistiques':100,
  'abonnement':110,
  'administration':120,
};

function normalizeNav(){
  for(const selector of ['.dash-v3-nav','.dash-v3-mobile-tabs']){
    const container=document.querySelector<HTMLElement>(selector);
    if(!container)continue;
    const buttons=Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    for(const button of buttons){
      const label=(button.textContent||'').trim().toLowerCase();
      if(label==='paramètres'||label==='paramètre'){
        button.style.display='none';
        button.setAttribute('aria-hidden','true');
        continue;
      }
      button.style.removeProperty('display');
      button.removeAttribute('aria-hidden');
      button.style.order=String(ORDER[label]??1000);
    }
  }
}

export function DashboardSidebarTools(){
  const [desktop,setDesktop]=useState<Element|null>(null);const [mobile,setMobile]=useState<Element|null>(null);const [isAdmin,setIsAdmin]=useState(false);
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
    const supabase=createSupabaseBrowserClient();
    supabase.auth.getSession().then(({data})=>setIsAdmin(data.session?.user?.email?.toLowerCase()==='kouameismael@gmail.com'));
    return()=>{if(timer)clearTimeout(timer);observer.disconnect()};
  },[]);
  useEffect(()=>{const id=setTimeout(normalizeNav,0);return()=>clearTimeout(id)},[desktop,mobile,isAdmin]);

  const tools=<>
    <button className="dash-tool-nav dash-tool-studio" onClick={()=>clickHidden('.advanced-studio-trigger')}><Palette size={16}/><span>Studio avancé</span></button>
    <button className="dash-tool-nav dash-tool-vitrine" onClick={()=>clickHidden('.vitrine-media-trigger')}><Link2 size={16}/><span>Vitrine & médias</span></button>
    <button className="dash-tool-nav dash-tool-flow" onClick={()=>window.dispatchEvent(new CustomEvent('qatalink:customer-flow-open'))}><Route size={16}/><span>Parcours client</span></button>
    {isAdmin&&<button className="dash-tool-nav dash-tool-admin" onClick={()=>window.location.href='/admin'}><ShieldCheck size={16}/><span>Administration</span></button>}
  </>;
  return <>{desktop&&createPortal(tools,desktop)}{mobile&&createPortal(tools,mobile)}</>;
}
