'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function Login(){
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [fullName,setFullName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(false);
  const supabase=createSupabaseBrowserClient();

  async function submit(e:React.FormEvent){
    e.preventDefault();setLoading(true);setMsg('');
    if(mode==='login'){
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setMsg(error.message);else window.location.href='/dashboard';
    }else{
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}});
      if(error)setMsg(error.message);
      else if(data.session) window.location.href='/dashboard';
      else setMsg('Compte créé. Vérifiez votre e-mail puis connectez-vous.');
    }
    setLoading(false);
  }

  return <div className="auth-wrap"><div className="auth-card">
    <Link href="/" className="brand"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
    <h1>{mode==='login'?'Bon retour 👋':'Créez votre compte gratuit'}</h1>
    <p style={{color:'var(--muted)'}}>{mode==='login'?'Connectez-vous pour gérer vos catalogues.':'Aucune carte requise. Vous accédez d’abord au dashboard, puis choisissez un abonnement au moment de créer.'}</p>
    <div style={{display:'flex',gap:8,margin:'18px 0'}}>
      <button type="button" className={'btn '+(mode==='login'?'btn-primary':'btn-ghost')} onClick={()=>{setMode('login');setMsg('')}}>Connexion</button>
      <button type="button" className={'btn '+(mode==='signup'?'btn-primary':'btn-ghost')} onClick={()=>{setMode('signup');setMsg('')}}>Créer un compte</button>
    </div>
    <form className="form" onSubmit={submit}>
      {mode==='signup'&&<div className="field"><label>Nom complet</label><input className="input" value={fullName} onChange={e=>setFullName(e.target.value)} required/></div>}
      <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
      <div className="field"><label>Mot de passe</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6}/></div>
      {msg&&<div className={msg.startsWith('Compte créé')?'success':'error'}>{msg}</div>}
      <button className="btn btn-primary" disabled={loading}>{loading?'Patientez…':mode==='login'?'Se connecter':'Créer mon compte gratuit'}</button>
    </form>
  </div></div>
}
