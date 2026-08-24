'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,LayoutDashboard,LogIn,UserPlus} from 'lucide-react';

export function LandingHeaderExperience(){
  const [host,setHost]=useState<Element|null>(null);const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!['/','/cle-en-main'].includes(location.pathname))return;
    let observer:MutationObserver|null=null;
    const apply=()=>{
      const header=document.querySelector('.landing-nav');
      if(!header)return;
      const actions=header.querySelector('.landing-nav-actions');if(actions)setHost(actions);
      const nav=header.querySelector('.navlinks');
      if(nav){
        const wanted=[['Fonctionnalités','/#features'],['Comment ça marche','/#how'],['Commandes','/#operations'],['Tarifs','/#pricing'],['Clé-en-main','/cle-en-main']];
        const existing=new Set(Array.from(nav.querySelectorAll('a')).map(a=>(a.textContent||'').trim().toLowerCase()));
        for(const [label,href] of wanted){if(existing.has(label.toLowerCase()))continue;const a=document.createElement('a');a.textContent=label;a.setAttribute('href',href);a.setAttribute('data-qatalink-standard-link','1');nav.appendChild(a)}
      }
      const oldLogin=actions?.querySelector('a[href^="/login"]') as HTMLElement|null;if(oldLogin)oldLogin.style.display='none';
    };
    apply();observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer?.disconnect();document.querySelectorAll('[data-qatalink-standard-link]').forEach(x=>x.remove())};
  },[]);
  if(!host)return null;
  return createPortal(<div className="landing-account-menu"><button type="button" className="btn btn-ghost landing-account-trigger" onClick={()=>setOpen(v=>!v)}>Compte <ChevronDown size={15}/></button>{open&&<div className="landing-account-dropdown"><a href="/login?next=/dashboard"><LogIn/>Se connecter</a><a href="/login?mode=signup&next=/dashboard"><UserPlus/>S’inscrire</a><a href="/dashboard"><LayoutDashboard/>Tableau de bord</a></div>}</div>,host);
}
