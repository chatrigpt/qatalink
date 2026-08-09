'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FileImage, FileText, Plus, Sparkles } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { PricingGate } from '@/components/pricing-gate';

type Mode='image'|'text'|'blank';

export default function Create(){
  const [mode,setMode]=useState<Mode>('image');
  const [title,setTitle]=useState('Menu principal');
  const [text,setText]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [autoImages,setAutoImages]=useState(false);
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
      setHasAccess(valid);setTrialActive(trial);setTrialExpiresAt(trial?candidate.current_period_end:null);setReady(true);
      const reminder=localStorage.getItem('qatalink_trial_reminder_on_arrival');
      if(trial&&reminder){localStorage.removeItem('qatalink_trial_reminder_on_arrival');setGate(true);}
      if(!valid)setGate(true);
    })();
  },[]);

  async function authSession(){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){window.location.href='/login';throw new Error('Session expirée');}
    return session;
  }

  async function persistCatalog(session:any,catalog:any,sourceType:Mode){
    const r=await fetch('/api/catalogs/import',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({source_type:sourceType,catalog})});
    const data=await r.json();
    if(r.status===402){setHasAccess(false);setTrialActive(false);setGate(true);throw new Error('Votre essai est terminé. Activez une formule pour continuer.');}
    if(!r.ok)throw new Error(data.error||'Impossible d’enregistrer le catalogue.');
    return data;
  }

  async function start(e:React.FormEvent){
    e.preventDefault();
    if(!hasAccess){setGate(true);return;}
    setLoading(true);setMsg('');
    try{
      const session=await authSession();
      const user=session.user;
      let catalogPayload:any;

      if(mode==='blank'){
        catalogPayload={schema:'qatalink_catalog_v2',source_type:'manual',business:{currency_code:'XOF',country_code:'CI',language:'fr'},catalog:{title:title.trim()||'Nouveau catalogue',type:'menu',notes:''},categories:[]};
      }else{
        let source:any;
        if(mode==='text'){
          if(!text.trim())throw new Error('Ajoutez le contenu de votre menu ou catalogue.');
          source={text:text.trim()};
        }else{
          if(!file)throw new Error('Ajoutez une image.');
          const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
          const path=`${user.id}/${Date.now()}-${safe}`;
          const up=await supabase.storage.from('ocr-source').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
          if(up.error)throw new Error(`Upload Supabase: ${up.error.message}`);
          const {data:urlData}=supabase.storage.from('ocr-source').getPublicUrl(path);
          source={image_url:urlData.publicUrl,file_name:file.name,mime_type:file.type};
        }

        setMsg(mode==='image'?'Analyse de l’image avec fal…':'Structuration du texte avec fal…');
        const ocr=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({input_type:mode,source,business_context:{currency_code:'XOF',country_code:'CI',language:'fr'}})});
        const ocrData=await ocr.json();
        if(ocr.status===402){setHasAccess(false);setTrialActive(false);setGate(true);throw new Error('Votre essai est terminé. Activez une formule pour continuer.');}
        if(!ocr.ok||!ocrData?.catalog)throw new Error(ocrData.error||'Fal n’a pas pu structurer le catalogue.');
        catalogPayload=ocrData.catalog;
        if(title.trim())catalogPayload.catalog={...(catalogPayload.catalog||{}),title:title.trim()};
      }

      setMsg('Enregistrement du catalogue…');
      const saved=await persistCatalog(session,catalogPayload,mode);
      localStorage.setItem('qatalink_import_preview',JSON.stringify({status:'completed',catalog_id:saved.catalog_id,source:mode}));

      if(autoImages&&Array.isArray(saved.item_ids)&&saved.item_ids.length){
        setMsg(`Lancement de ${saved.item_ids.length} illustration(s)…`);
        const gen=await fetch('/api/images/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({item_ids:saved.item_ids})});
        const genData=await gen.json();
        if(gen.ok&&Array.isArray(genData.jobs)){
          const jobIds=genData.jobs.map((j:any)=>j.job_id).filter(Boolean);
          localStorage.setItem('qatalink_pending_image_jobs',JSON.stringify(jobIds));
        }
      }

      if(trialActive)localStorage.setItem('qatalink_trial_reminder_on_arrival','1');
      window.location.href=`/dashboard?tab=items&catalog=${encodeURIComponent(saved.catalog_id)}&created=1`;
    }catch(err:any){setMsg(err?.message||'Erreur');setLoading(false)}
  }

  if(!ready)return <div className="auth-wrap"><div className="auth-card"><b>Chargement de votre espace…</b></div></div>;

  return <div className="auth-wrap create-wrap"><div className="auth-card create-card">
    <Link href="/dashboard" className="brand"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
    <h1>Créez votre catalogue</h1>
    <p style={{color:'var(--muted)'}}>{trialActive?'Votre essai 24 h vous donne accès à toute la création.':'Importez une carte existante ou partez de zéro.'}</p>

    <div className="create-modes">
      <button type="button" className={'create-mode '+(mode==='image'?'active':'')} onClick={()=>setMode('image')}><FileImage size={19}/><span>Depuis une image</span></button>
      <button type="button" className={'create-mode '+(mode==='text'?'active':'')} onClick={()=>setMode('text')}><FileText size={19}/><span>Depuis un texte</span></button>
      <button type="button" className={'create-mode '+(mode==='blank'?'active':'')} onClick={()=>setMode('blank')}><Plus size={19}/><span>Créer de zéro</span></button>
    </div>

    <form className="form" onSubmit={start}>
      <div className="field"><label>Nom du catalogue</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex : Menu principal"/></div>
      {mode==='image'&&<div className="upload create-upload"><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><p>{file?file.name:'Photo, capture ou scan de votre menu/catalogue.'}</p></div>}
      {mode==='text'&&<textarea className="input" rows={12} placeholder={'Collez votre carte complète ici. Exemple :\nPLATS\nPoulet braisé — 3 500 F\nPoisson braisé — 5 000 F\n\nBOISSONS\nBissap — 1 000 F'} value={text} onChange={e=>setText(e.target.value)}/>} 
      {mode==='blank'&&<div className="blank-create-note"><Plus size={22}/><div><b>Catalogue vide</b><span>Une première catégorie sera créée. Vous pourrez ajouter vos articles, descriptions, prix et images depuis le dashboard.</span></div></div>}
      {mode!=='blank'&&<label className="auto-image-option"><input type="checkbox" checked={autoImages} onChange={e=>setAutoImages(e.target.checked)}/><Sparkles size={18}/><span><b>Illustrer automatiquement les articles</b><small>PoYo générera une image 1:1 pour chaque article, puis Qatalink la sauvegardera dans Supabase.</small></span></label>}
      {msg&&<div className={loading?'progress-note':'error'}>{msg}</div>}
      <button className="btn btn-primary" disabled={loading}>{loading?'Traitement en cours…':mode==='blank'?'Créer mon catalogue':'Générer mon Qatalink'}</button>
    </form>
  </div><PricingGate open={gate} onClose={()=>setGate(false)} title={trialActive?'Votre essai est en cours':'Choisissez une formule pour continuer'} trialActive={trialActive} trialExpiresAt={trialExpiresAt}/></div>
}
