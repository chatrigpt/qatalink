'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Menu,X,LogIn,UserPlus,LayoutDashboard,ChevronRight} from 'lucide-react';
import {useEffect,useState} from 'react';
import {ThemeToggle} from '@/components/theme-toggle';

type Props={variant?:'main'|'turnkey'};

export function LandingResponsiveHeader({variant='main'}:Props){
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const onResize=()=>{if(window.innerWidth>860)setOpen(false)};
    window.addEventListener('resize',onResize);
    return()=>window.removeEventListener('resize',onResize);
  },[]);

  const nav=variant==='turnkey'?
    [
      ['Découvrir Qatalink','/'],
      ['Fonctionnalités','/#features'],
      ['Comment ça marche','/#how'],
      ['Commandes','/#operations'],
      ['Tarifs','/#pricing'],
      ['Solution clé-en-main','/cle-en-main#demande'],
    ]:
    [
      ['Fonctionnalités','#features'],
      ['Comment ça marche','#how'],
      ['Commandes','#operations'],
      ['Tarifs','#pricing'],
      ['Clé-en-main','/cle-en-main'],
    ];

  return <header className="qk-landing-header">
    <div className="qk-landing-header-inner">
      <Link className="brand qk-landing-brand" href="/" onClick={()=>setOpen(false)}><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/><span>qatalink</span></Link>
      <nav className="qk-landing-desktop-nav">{nav.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}</nav>
      <div className="qk-landing-desktop-actions"><ThemeToggle/><Link className="btn btn-ghost" href="/login">Se connecter</Link><Link className="btn btn-primary" href="/create">Créer</Link></div>
      <div className="qk-landing-mobile-actions"><ThemeToggle/><button className="qk-hamburger" type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?'Fermer le menu':'Ouvrir le menu'} aria-expanded={open}>{open?<X size={22}/>:<Menu size={22}/>}</button></div>
    </div>
    {open&&<div className="qk-mobile-menu-backdrop" onClick={()=>setOpen(false)}><div className="qk-mobile-menu" onClick={e=>e.stopPropagation()}>
      <div className="qk-mobile-menu-nav">{nav.map(([label,href])=><Link key={label} href={href} onClick={()=>setOpen(false)}><span>{label}</span><ChevronRight size={17}/></Link>)}</div>
      <div className="qk-mobile-menu-divider"/>
      <Link className="qk-mobile-account" href="/login" onClick={()=>setOpen(false)}><LogIn size={18}/><span><b>Se connecter</b><small>Accéder à mon espace Qatalink</small></span></Link>
      <Link className="qk-mobile-account" href="/login?mode=signup&next=/dashboard" onClick={()=>setOpen(false)}><UserPlus size={18}/><span><b>S’inscrire</b><small>Créer un compte gratuitement</small></span></Link>
      <Link className="qk-mobile-account" href="/dashboard" onClick={()=>setOpen(false)}><LayoutDashboard size={18}/><span><b>Tableau de bord</b><small>Gérer mes catalogues et mon activité</small></span></Link>
      <Link className="btn btn-primary qk-mobile-create" href="/create" onClick={()=>setOpen(false)}>Créer mon menu/catalogue</Link>
    </div></div>}
  </header>;
}
