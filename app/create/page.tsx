'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Building2, FileImage, FileText, Hotel, House, Plus, Scissors, ShoppingBag, Sparkles, UtensilsCrossed } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { PricingGate } from '@/components/pricing-gate';

type Mode='image'|'text'|'blank';
type Preset={id:string;label:string;business_type:string;catalog_type:string;default_catalog_title:string;default_categories:string[];default_theme:any};

const presetIcons:Record<string,React.ReactNode>={restaurant:<UtensilsCrossed size={20}/>,hotel:<Hotel size={20}/>,spa_beauty:<Scissors size={20}/>,real_estate:<House size={20}/>,retail:<ShoppingBag size={20}/>};
const countryCodes=[
  ['CI','🇨🇮','+225','Côte d’Ivoire'],['SN','🇸🇳','+221','Sénégal'],['BF','🇧🇫','+226','Burkina Faso'],['BJ','🇧🇯','+229','Bénin'],['TG','🇹🇬','+228','Togo'],['ML','🇲🇱','+223','Mali'],['NE','🇳🇪','+227','Niger'],['GH','🇬🇭','+233','Ghana'],['NG','🇳🇬','+234','Nigeria'],['FR','🇫🇷','+33','France'],['BE','🇧🇪','+32','Belgique'],['GB','🇬🇧','+44','Royaume-Uni'],['US','🇺🇸','+1','États-Unis / Canada']
] as const;
function digitsOnly(v:string){return v.replace(/\D/g,'')}

export default function Create(){
  const [mode,setMode]=useState<Mode>('image');
  const [businessName,setBusinessName]=useState('');
  const [title,setTitle]=useState('');
  const [titleTouched,setTitleTouched]=useState(false);
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
  const [presets,setPresets]=useState<Preset[]>([]);
  const [presetId,setPresetId]=useState('restaurant');
  const [dialCode,setDialCode]=useState('+225');
  const [whatsappLocal,setWhatsappLocal]=useState('');
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);

  const selectedPreset=presets.find(p=>p.id===presetId)||null;
  const whatsappNumber=useMemo(()=>{const local=digitsOnly(whatsappLocal);const dial=digitsOnly(dialCode);if(!local)return'';return `+${local.startsWith(dial)?local:dial+local}`},[dialCode,whatsappLocal]);
  const progressStep=msg.includes('Analyse')||msg.includes('Organisation')?1:msg.includes('Création de votre catalogue')?2:msg.includes('illustration')||msg.includes('Illustration')?3:0;

  useEffect(()=>{
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){window.location.href='/login?next=/create';return;}
      const [{data:subs},{data:presetRows},{data:owned}]=await Promise.all([
        supabase.from('subscriptions').select('plan_code,status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1),
        supabase.from('sector_presets').select('*').order('label'),
        supabase.from('businesses').select('name,business_type,theme_preset,whatsapp_number').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1)
      ]);
      const candidate=subs?.[0];
      const valid=!!candidate&&(!candidate.current_period_end||new Date(candidate.current_period_end).getTime()>Date.now());
      const trial=!!candidate&&candidate.plan_code==='trial'&&candidate.status==='trialing'&&valid;
      const existing=owned?.[0];
      const rows=(presetRows||[]) as Preset[];
      setPresets(rows);
      const initialPreset=existing?.theme_preset||rows.find(p=>p.business_type===existing?.business_type)?.id||'restaurant';
      setPresetId(initialPreset);
      const initialBusiness=existing?.name&&existing.name!=='Mon entreprise'?existing.name:'';
      setBusinessName(initialBusiness);
      setTitle(initialBusiness||rows.find(p=>p.id===initialPreset)?.default_catalog_title||'Catalogue principal');
      const existingPhone=String(existing?.whatsapp_number||'').replace(/\D/g,'');
      if(existingPhone){const match=countryCodes.find(c=>existingPhone.startsWith(digitsOnly(c[2])));if(match){setDialCode(match[2]);setWhatsappLocal(existingPhone.slice(digitsOnly(match[2]).length))}else setWhatsappLocal(existingPhone)}
      setHasAccess(valid);setTrialActive(trial);setTrialExpiresAt(trial?candidate.current_period_end:null);setReady(true);
      if(!valid)setGate(true);
    })();
  },[supabase]);

  useEffect(()=>{if(!selectedPreset)return;if(!titleTouched)setTitle(businessName.trim()||selectedPreset.default_catalog_title)},[presetId,businessName,selectedPreset,titleTouched]);

  async function authSession(){const {data:{session}}=await supabase.auth.getSession();if(!session){window.location.href='/login?next=/create';throw new Error('Session expirée')}return session}

  async function persistCatalog(session:any,catalog:any,sourceType:Mode){
    const r=await fetch('/api/catalogs/import',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({source_type:sourceType,catalog,preset_id:presetId,business_name:businessName.trim(),catalog_title:title.trim(),whatsapp_number:whatsappNumber})});
    const data=await r.json();
    if(r.status===402){setHasAccess(false);setTrialActive(false);setGate(true);throw new Error('Votre essai est terminé. Activez une formule pour continuer.')}
    if(!r.ok)throw new Error('Impossible d’enregistrer le catalogue. Réessayez.');
    return data;
  }

  async function start(e:React.FormEvent){
    e.preventDefault();if(!hasAccess){setGate(true);return}
    setLoading(true);setMsg('');
    try{
      const session=await authSession();const user=session.user;let catalogPayload:any;
      const effectiveBusinessName=businessName.trim()||'Mon entreprise';
      const businessContext={name:effectiveBusinessName,business_type:selectedPreset?.business_type||'other',currency_code:'XOF',country_code:'CI',language:'fr',phone_whatsapp:whatsappNumber};
      if(mode==='blank'){
        const cats=(selectedPreset?.default_categories||[]).map((name,index)=>({name,sort_order:index+1,items:[]}));
        catalogPayload={schema:'qatalink_catalog_v2',source_type:'manual',business:businessContext,catalog:{title:title.trim()||selectedPreset?.default_catalog_title||'Catalogue principal',type:selectedPreset?.catalog_type||'catalog',notes:''},categories:cats};
      }else{
        let source:any;
        if(mode==='text'){if(!text.trim())throw new Error('Ajoutez le contenu de votre menu ou catalogue.');source={text:text.trim()}}
        else{if(!file)throw new Error('Ajoutez une image.');const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${user.id}/${Date.now()}-${safe}`;const up=await supabase.storage.from('ocr-source').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});if(up.error)throw new Error('Impossible d’importer cette image. Réessayez.');const {data:urlData}=supabase.storage.from('ocr-source').getPublicUrl(path);source={image_url:urlData.publicUrl,file_name:file.name,mime_type:file.type}}
        setMsg(mode==='image'?'Analyse de votre image…':'Organisation de votre contenu…');
        const ocr=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({input_type:mode,source,business_context:businessContext,preset:{id:presetId,label:selectedPreset?.label,categories:selectedPreset?.default_categories||[]}})});
        const ocrData=await ocr.json();
        if(ocr.status===402){setHasAccess(false);setTrialActive(false);setGate(true);throw new Error('Votre essai est terminé. Activez une formule pour continuer.')}
        if(!ocr.ok||!ocrData?.catalog)throw new Error('Impossible d’organiser ce contenu. Vérifiez votre image ou votre texte puis réessayez.');
        catalogPayload=ocrData.catalog;catalogPayload.business={...(catalogPayload.business||{}),...businessContext};catalogPayload.catalog={...(catalogPayload.catalog||{}),title:title.trim()||selectedPreset?.default_catalog_title||effectiveBusinessName,type:selectedPreset?.catalog_type||catalogPayload.catalog?.type||'catalog'};
      }
      setMsg('Création de votre catalogue…');const saved=await persistCatalog(session,catalogPayload,mode);localStorage.setItem('qatalink_import_preview',JSON.stringify({status:'completed',catalog_id:saved.catalog_id,source:mode,preset_id:presetId}));
      if(autoImages&&Array.isArray(saved.item_ids)&&saved.item_ids.length){setMsg(`Création de ${saved.item_ids.length} illustration(s)…`);const gen=await fetch('/api/images/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({item_ids:saved.item_ids})});const genData=await gen.json();if(!gen.ok&&genData?.error==='INSUFFICIENT_CREDITS')setMsg('Catalogue créé. Il vous manque des crédits pour lancer toutes les illustrations.');if(gen.ok&&Array.isArray(genData.jobs)){const jobIds=genData.jobs.map((j:any)=>j.job_id).filter(Boolean);localStorage.setItem('qatalink_pending_image_jobs',JSON.stringify(jobIds))}}
      window.location.href=`/dashboard?tab=overview&catalog=${encodeURIComponent(saved.catalog_id)}&created=1`;
    }catch(err:any){setMsg(err?.message||'Une erreur est survenue. Réessayez.');setLoading(false)}
  }

  if(!ready)return <div className="auth-wrap"><div className="auth-card"><b>Préparation de votre espace…</b></div></div>;
  return <div className="auth-wrap create-wrap"><div className="auth-card create-card activation-create-card">
    <Link href="/dashboard" className="brand"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
    <div className="create-activation-head"><span className="eyebrow">OBJECTIF : PREMIER CATALOGUE EN LIGNE</span><h1>Transformez ce que vous avez déjà</h1><p>{trialActive?'Tout est ouvert pendant 24 h. Commencez par obtenir un résultat visible, vous personnaliserez le reste ensuite.':'Importez une carte, collez un texte ou partez de zéro. Qatalink construit la première version pour vous.'}</p></div>

    <form className="form activation-create-form" onSubmit={start}>
      <section className="create-step-card"><div className="create-step-label"><span>1</span><div><b>Choisissez votre activité</b><small>Qatalink adapte automatiquement les catégories et le parcours client.</small></div></div><div className="preset-grid">{presets.map(p=><button key={p.id} type="button" className={'preset-card '+(presetId===p.id?'active':'')} onClick={()=>{setPresetId(p.id);setTitleTouched(false)}}><span>{presetIcons[p.id]||<Building2 size={20}/>}</span><b>{p.label}</b><small>{(p.default_categories||[]).slice(0,3).join(' · ')}</small></button>)}</div></section>

      <section className="create-step-card"><div className="create-step-label"><span>2</span><div><b>Donnez-nous votre contenu</b><small>Pas besoin de tout paramétrer avant de voir le résultat.</small></div></div><div className="create-modes"><button type="button" className={'create-mode '+(mode==='image'?'active':'')} onClick={()=>setMode('image')}><FileImage size={19}/><span>Depuis une image</span></button><button type="button" className={'create-mode '+(mode==='text'?'active':'')} onClick={()=>setMode('text')}><FileText size={19}/><span>Depuis un texte</span></button><button type="button" className={'create-mode '+(mode==='blank'?'active':'')} onClick={()=>setMode('blank')}><Plus size={19}/><span>Créer de zéro</span></button></div>
        {mode==='image'&&<div className="upload create-upload"><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><p>{file?file.name:'Photo, capture ou scan de votre menu/catalogue.'}</p></div>}
        {mode==='text'&&<textarea className="input" rows={11} placeholder={'Collez votre contenu ici. Exemple :\nPLATS\nPoulet braisé — 3 500 F\nPoisson braisé — 5 000 F\n\nBOISSONS\nBissap — 1 000 F'} value={text} onChange={e=>setText(e.target.value)}/>}
        {mode==='blank'&&<div className="blank-create-note"><Plus size={22}/><div><b>Structure {selectedPreset?.label||'personnalisée'} prête</b><span>{(selectedPreset?.default_categories||['Catégorie 1']).join(' · ')}. Vous pourrez tout renommer, supprimer ou compléter ensuite.</span></div></div>}
      </section>

      {mode!=='blank'&&<label className="auto-image-option"><input type="checkbox" checked={autoImages} onChange={e=>setAutoImages(e.target.checked)}/><Sparkles size={18}/><span><b>Créer aussi les illustrations automatiquement</b><small>Optionnel · 5 crédits par image. Vous pourrez aussi les générer plus tard.</small></span></label>}

      <details className="create-identity-optional"><summary>Ajouter mon identité maintenant <span>optionnel</span></summary><div className="create-identity-grid"><div className="field"><label>Nom de l’entreprise</label><input className="input" value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Ex : Chez Awa, Glow Beauty…"/></div><div className="field"><label>Nom du catalogue</label><input className="input" value={title} onChange={e=>{setTitleTouched(true);setTitle(e.target.value)}} placeholder={selectedPreset?.default_catalog_title||'Catalogue principal'}/></div><div className="field wide"><label>WhatsApp de l’entreprise</label><div style={{display:'grid',gridTemplateColumns:'minmax(138px,.45fr) minmax(0,1fr)',gap:8}}><select className="input" value={dialCode} onChange={e=>setDialCode(e.target.value)}>{countryCodes.map(c=><option key={c[0]} value={c[2]}>{c[1]} {c[2]}</option>)}</select><input className="input" inputMode="tel" value={whatsappLocal} onChange={e=>setWhatsappLocal(digitsOnly(e.target.value))} placeholder="0700000000"/></div><small className="field-help">Vous pourrez compléter ces informations plus tard dans Paramètres.</small></div></div></details>

      {loading&&<div className="activation-progress" aria-live="polite"><div className={progressStep>=1?'done active':''}><span>1</span><b>Lecture du contenu</b></div><div className={progressStep>=2?'done active':''}><span>2</span><b>Organisation du catalogue</b></div><div className={progressStep>=3?'done active':''}><span>3</span><b>Préparation du rendu</b></div><p>{msg||'Traitement en cours…'}</p></div>}
      {!loading&&msg&&<div className="error">{msg}</div>}
      <button className="btn btn-primary create-value-cta" disabled={loading}>{loading?'Votre catalogue prend forme…':mode==='blank'?'Créer et voir mon catalogue':'Créer et voir mon catalogue'}</button>
      <small className="create-value-note">Vous pourrez modifier les prix, photos, catégories, couleurs et textes après la génération.</small>
    </form>
  </div><PricingGate open={gate} onClose={()=>setGate(false)} title={trialActive?'Votre essai est en cours':'Choisissez une formule pour continuer'} trialActive={trialActive} trialExpiresAt={trialExpiresAt}/></div>
}
