'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { PricingGate } from '@/components/pricing-gate';

export default function Create(){
  const [mode,setMode]=useState<'image'|'text'>('image');
  const [text,setText]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(false);
  const [ready,setReady]=useState(false);
  const [hasAccess,setHasAccess]=useState(false);
  const [trialActive,setTrialActive]=useState(false);
  const [trialExpiresAt,setTrialExpiresAt]=useState<string|null>(null);
  const [gate,setGate]=useState(false);
  const supabase=createSupabaseBrowserClient();

  useEffect(()=>{
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){window.location.href='/login';return;}
      const {data}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
      const candidate=data?.[0];
      const valid=!!candidate && (!candidate.current_period_end || new Date(candidate.current_period_end).getTime()>Date.now());
      const trial=!!candidate&&candidate.plan_code==='trial'&&candidate.status==='trialing'&&valid;
      setHasAccess(valid);
      setTrialActive(trial);
      setTrialExpiresAt(trial?candidate.current_period_end:null);
      setReady(true);
      const reminder=localStorage.getItem('qatalink_trial_reminder_on_arrival');
      if(trial&&reminder){localStorage.removeItem('qatalink_trial_reminder_on_arrival');setGate(true);}
      if(!valid)setGate(true);
    })();
  },[]);

  async function start(e:React.FormEvent){
    e.preventDefault();
    if(!hasAccess){setGate(true);return;}
    setLoading(true);setMsg('');
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){window.location.href='/login';return;}
      const user=session.user;
      let payload:any={input_type:mode,business_context:{currency_code:'XOF',country_code:'CI',language:'fr'}};
      if(mode==='text'){
        if(!text.trim())throw new Error('Ajoutez le contenu de votre menu ou catalogue.');
        payload.source={text};
      }else{
        if(!file)throw new Error('Ajoutez une image.');
        const path=`${user.id}/${Date.now()}-${file.name.replace(/\s+/g,'-')}`;
        const up=await supabase.storage.from('ocr-source').upload(path,file,{upsert:false});
        if(up.error)throw up.error;
        const {data:urlData}=supabase.storage.from('ocr-source').getPublicUrl(path);
        payload.source={image_url:urlData.publicUrl,file_name:file.name,mime_type:file.type};
      }
      const r=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});
      const data=await r.json();
      if(r.status===402){setHasAccess(false);setTrialActive(false);setGate(true);throw new Error('Votre essai est terminé. Activez une formule pour continuer.');}
      if(!r.ok)throw new Error(data.error||data.message||'Erreur pendant la génération.');
      localStorage.setItem('qatalink_import_preview',JSON.stringify(data));
      if(trialActive)localStorage.setItem('qatalink_trial_reminder_on_arrival','1');
      window.location.href='/dashboard';
    }catch(err:any){setMsg(err.message||'Erreur');setLoading(false)}
  }

  if(!ready)return <div className="auth-wrap"><div className="auth-card"><b>Chargement de votre espace…</b></div></div>;

  return <div className="auth-wrap"><div className="auth-card" style={{width:'min(700px,100%)'}}>
    <Link href="/dashboard" className="brand"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
    <h1>Créez votre catalogue</h1>
    <p style={{color:'var(--muted)'}}>{trialActive?'Votre essai 24 h vous donne accès à toute la création.':'Une image ou du texte suffit. Vous pourrez tout modifier ensuite.'}</p>
    <div style={{display:'flex',gap:8,margin:'18px 0'}}><button className={'btn '+(mode==='image'?'btn-primary':'btn-ghost')} onClick={()=>setMode('image')}>Depuis une image</button><button className={'btn '+(mode==='text'?'btn-primary':'btn-ghost')} onClick={()=>setMode('text')}>Depuis un texte</button></div>
    <form className="form" onSubmit={start}>
      {mode==='image'?<div className="upload"><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><p style={{color:'var(--muted)',fontSize:13}}>Photo ou capture de votre menu/catalogue.</p></div>:<textarea className="input" rows={10} placeholder="Ex : Entrées — Salade avocat 2500 F..." value={text} onChange={e=>setText(e.target.value)}/>} 
      {msg&&<div className="error">{msg}</div>}
      <button className="btn btn-primary" disabled={loading}>{loading?'Génération...':'Générer mon Qatalink'}</button>
    </form>
  </div><PricingGate open={gate} onClose={()=>setGate(false)} title={trialActive?'Votre essai est en cours':'Choisissez une formule pour continuer'} trialActive={trialActive} trialExpiresAt={trialExpiresAt}/></div>
}
