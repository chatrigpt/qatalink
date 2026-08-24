'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

function GoogleIcon(){
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.509h3.232c1.891-1.741 2.982-4.305 2.982-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.041.955-3.386.955-2.605 0-4.809-1.759-5.596-4.123H3.064v2.591A9.997 9.997 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.404 13.9A6.02 6.02 0 0 1 6.09 12c0-.659.114-1.3.314-1.9V7.509H3.064A9.99 9.99 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491L6.404 13.9Z"/><path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.695 2 12 2a9.997 9.997 0 0 0-8.936 5.509l3.34 2.591C7.191 7.736 9.395 5.977 12 5.977Z"/></svg>
}

function safeNext(){
  if(typeof window==='undefined')return'/dashboard';
  const raw=new URLSearchParams(window.location.search).get('next')||'';
  if(raw.startsWith('/')&&!raw.startsWith('//'))return raw;
  return'/dashboard';
}

export default function Login(){
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [fullName,setFullName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(false);
  const [googleLoading,setGoogleLoading]=useState(false);
  const supabase=createSupabaseBrowserClient();

  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get('mode');if(requested==='signup')setMode('signup')},[]);

  async function signInWithGoogle(){
    setMsg('');
    setGoogleLoading(true);
    const redirectTo=`${window.location.origin}${safeNext()}`;
    const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if(error){setMsg(error.message);setGoogleLoading(false);}
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();setLoading(true);setMsg('');
    const destination=safeNext();
    if(mode==='login'){
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setMsg(error.message);else window.location.href=destination;
    }else{
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName},emailRedirectTo:`${window.location.origin}${destination}`}});
      if(error)setMsg(error.message);
      else if(data.session) window.location.href=destination;
      else setMsg('Compte créé. Vérifiez votre e-mail puis reprenez exactement là où vous vous étiez arrêté.');
    }
    setLoading(false);
  }

  return <div className="auth-wrap"><div className="auth-card">
    <Link href="/" className="brand"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
    <h1>{mode==='login'?'Bon retour 👋':'Créez votre compte gratuit'}</h1>
    <p style={{color:'var(--muted)'}}>{mode==='login'?'Connectez-vous pour reprendre votre catalogue.':'Aucune carte requise. Après l’inscription, vous revenez directement à votre tableau de bord.'}</p>

    <button type="button" className="btn btn-ghost" style={{width:'100%',marginTop:18,display:'flex',alignItems:'center',justifyContent:'center',gap:10}} onClick={signInWithGoogle} disabled={googleLoading||loading}>
      <GoogleIcon/>{googleLoading?'Connexion à Google…':'Continuer avec Google'}
    </button>
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'18px 0',color:'var(--muted)',fontSize:12}}><span style={{height:1,background:'var(--border)',flex:1}}/><span>OU</span><span style={{height:1,background:'var(--border)',flex:1}}/></div>

    <div style={{display:'flex',gap:8,margin:'0 0 18px'}}>
      <button type="button" className={'btn '+(mode==='login'?'btn-primary':'btn-ghost')} onClick={()=>{setMode('login');setMsg('')}}>Connexion</button>
      <button type="button" className={'btn '+(mode==='signup'?'btn-primary':'btn-ghost')} onClick={()=>{setMode('signup');setMsg('')}}>Créer un compte</button>
    </div>
    <form className="form" onSubmit={submit}>
      {mode==='signup'&&<div className="field"><label>Nom complet</label><input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} required/></div>}
      <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
      <div className="field"><label>Mot de passe</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/></div>
      {msg&&<div className={msg.startsWith('Compte créé')?'success':'error'}>{msg}</div>}
      {mode==='signup'&&<p className="auth-legal">En créant un compte, vous acceptez les <Link href="/cgu" target="_blank">CGU</Link> et reconnaissez avoir lu la <Link href="/confidentialite" target="_blank">Politique de confidentialité</Link>. Cela s’applique également à la création d’un nouveau compte via Google.</p>}
      <button className="btn btn-primary" disabled={loading||googleLoading}>{loading?'Patientez…':mode==='login'?'Se connecter':'Créer mon compte gratuit'}</button>
    </form>
  </div></div>
}
