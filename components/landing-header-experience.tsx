'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,ChevronRight,LayoutDashboard,LogIn,Menu,UserPlus,X} from 'lucide-react';
import {ThemeToggle} from '@/components/theme-toggle';

const LINKS=[
  ['Fonctionnalités','/#features'],
  ['Comment ça marche','/#how'],
  ['Commandes','/#operations'],
  ['Tarifs','/#pricing'],
  ['Clé-en-main','/cle-en-main'],
] as const;

export function LandingHeaderExperience(){
  const [host,setHost]=useState<Element|null>(null);
  const [open,setOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);

  useEffect(()=>{
    if(!['/','/cle-en-main'].includes(location.pathname))return;
    let observer:MutationObserver|null=null;
    const apply=()=>{
      const header=document.querySelector('.landing-nav')||document.querySelector('.tk-nav');
      if(!header)return;
      const actions=(header.querySelector('.landing-nav-actions')||header.querySelector(':scope > div:last-child')) as Element|null;
      if(actions)setHost(actions);
      const nav=header.querySelector('.navlinks');
      if(nav){
        const existing=new Set(Array.from(nav.querySelectorAll('a')).map(a=>(a.textContent||'').trim().toLowerCase()));
        for(const [label,href] of LINKS){if(existing.has(label.toLowerCase()))continue;const a=document.createElement('a');a.textContent=label;a.setAttribute('href',href);a.setAttribute('data-qatalink-standard-link','1');nav.appendChild(a)}
      }
      const oldLogin=actions?.querySelector('a[href^="/login"]') as HTMLElement|null;if(oldLogin)oldLogin.style.display='none';
    };
    apply();observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});
    const close=()=>{if(window.innerWidth>760)setMobileOpen(false)};window.addEventListener('resize',close);
    return()=>{observer?.disconnect();window.removeEventListener('resize',close);document.querySelectorAll('[data-qatalink-standard-link]').forEach(x=>x.remove())};
  },[]);

  if(!host)return null;

  return createPortal(<>
    <div className="landing-account-menu landing-account-desktop"><button type="button" className="btn btn-ghost landing-account-trigger" onClick={()=>setOpen(v=>!v)}>Compte <ChevronDown size={15}/></button>{open&&<div className="landing-account-dropdown"><a href="/login?next=/dashboard"><LogIn/>Se connecter</a><a href="/login?mode=signup&next=/dashboard"><UserPlus/>S’inscrire</a><a href="/dashboard"><LayoutDashboard/>Tableau de bord</a></div>}</div>

    <div className="landing-mobile-menu">
      <button className="landing-mobile-trigger" type="button" aria-label={mobileOpen?'Fermer le menu':'Ouvrir le menu'} aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}>{mobileOpen?<X size={22}/>:<Menu size={22}/>}</button>
      {mobileOpen&&<div className="landing-mobile-panel">
        <div className="landing-mobile-theme"><span>Apparence</span><ThemeToggle/></div>
        <nav>{LINKS.map(([label,href])=><a key={label} href={href} onClick={()=>setMobileOpen(false)}><span>{label}</span><ChevronRight size={17}/></a>)}</nav>
        <div className="landing-mobile-separator"/>
        <a className="landing-mobile-account-link" href="/login?next=/dashboard" onClick={()=>setMobileOpen(false)}><LogIn/><span><b>Se connecter</b><small>Accéder à mon espace</small></span></a>
        <a className="landing-mobile-account-link" href="/login?mode=signup&next=/dashboard" onClick={()=>setMobileOpen(false)}><UserPlus/><span><b>S’inscrire</b><small>Créer un compte gratuit</small></span></a>
        <a className="landing-mobile-account-link" href="/dashboard" onClick={()=>setMobileOpen(false)}><LayoutDashboard/><span><b>Tableau de bord</b><small>Gérer mes catalogues</small></span></a>
        <a className="btn btn-primary landing-mobile-create" href="/create" onClick={()=>setMobileOpen(false)}>Créer mon menu/catalogue</a>
      </div>}
    </div>
  </>,host);
}
