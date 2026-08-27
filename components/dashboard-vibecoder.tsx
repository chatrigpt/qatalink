'use client';

import {ExternalLink,History,Paperclip,RotateCcw,Sparkles,Upload,X} from 'lucide-react';
import {useEffect,useMemo,useState} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Catalog={id:string;title:string;public_slug:string;hub_public_slug:string};
type VibePlan={summary:string;reference_target:string;catalog_theme:Record<string,any>;hub:Record<string,any>;buttons:Array<Record<string,any>>};
type HistoryRow={id:string;prompt?:string|null;summary?:string|null;event_type:string;created_at:string};

const examples=[
  'Rends les boutons de la page centrale en gradient doré métallique avec le texte en noir.',
  'Assombris davantage la bannière pour que le texte blanc ressorte mieux.',
  'Utilise Playfair Display pour les grands titres et Plus Jakarta Sans pour le reste.',
  'Garde tout le contenu mais rends le catalogue plus premium, avec des cartes arrondies et une ambiance crème et or.'
];

export function DashboardVibecoder(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [ready,setReady]=useState(false);const [open,setOpen]=useState(false);const [session,setSession]=useState<any>(null);const [catalogs,setCatalogs]=useState<Catalog[]>([]);const [catalogId,setCatalogId]=useState('');const [prompt,setPrompt]=useState('');const [referenceUrl,setReferenceUrl]=useState('');const [referenceName,setReferenceName]=useState('');const [plan,setPlan]=useState<VibePlan|null>(null);const [menuUrl,setMenuUrl]=useState('');const [hubUrl,setHubUrl]=useState('');const [history,setHistory]=useState<HistoryRow[]>([]);const [busy,setBusy]=useState('');const [notice,setNotice]=useState('');

  useEffect(()=>{if(typeof window==='undefined'||!location.pathname.startsWith('/dashboard'))return;setReady(true);void bootstrap()},[]);
  useEffect(()=>{if(open&&session&&catalogId)void loadHistory()},[open,session,catalogId]);

  async function bootstrap(){const {data:{session:s}}=await supabase.auth.getSession();if(!s)return;setSession(s);const params=new URLSearchParams(location.search);const requested=params.get('catalog')||'';const {data:rows}=await supabase.from('catalogs').select('id,title,public_slug,hub_public_slug').eq('is_active',true).order('created_at',{ascending:false});const list=(rows||[]) as Catalog[];setCatalogs(list);setCatalogId(list.some(c=>c.id===requested)?requested:list[0]?.id||'')}

  async function api(body:Record<string,unknown>){
    if(!session)return null;
    const r=await fetch('/api/vibe/design',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({catalog_id:catalogId,...body})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||d.error||'Menu magique est momentanément indisponible.');
    return d;
  }

  async function loadHistory(){
    try{const d=await api({action:'history'});setHistory(Array.isArray(d?.history)?d.history:[]);if(d?.menu_url)setMenuUrl(d.menu_url);if(d?.hub_url)setHubUrl(d.hub_url)}catch{}
  }

  async function uploadReference(file:File){if(!session||!catalogId)return;setBusy('upload');setNotice('');const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${session.user.id}/menu-magique-references/${catalogId}/${Date.now()}-${safe}`;const up=await supabase.storage.from('catalog-assets').upload(path,file,{contentType:file.type||'image/jpeg'});if(up.error){setNotice(up.error.message);setBusy('');return}const {data:u}=supabase.storage.from('catalog-assets').getPublicUrl(path);setReferenceUrl(u.publicUrl);setReferenceName(file.name);setBusy('');setPlan(null)}

  async function execute(){if(!session||!catalogId||!prompt.trim())return;setBusy('execute');setNotice('');setPlan(null);try{const d=await api({prompt:prompt.trim(),reference_image_url:referenceUrl,execute:true});setPlan(d.plan||null);setMenuUrl(d.menu_url||'');setHubUrl(d.hub_url||'');setNotice('C’est fait : le design a été appliqué au catalogue. Ouvrez le catalogue réel pour vérifier le rendu.');await loadHistory()}catch(e:any){setNotice(e?.message||'Impossible d’appliquer les modifications.')}finally{setBusy('')}}

  async function rollback(row:HistoryRow){if(!session||busy)return;const ok=window.confirm('Restaurer ce design ? Le design actuel sera lui aussi sauvegardé dans l’historique.');if(!ok)return;setBusy(`rollback:${row.id}`);setNotice('');try{const d=await api({action:'rollback',history_id:row.id});setMenuUrl(d.menu_url||menuUrl);setHubUrl(d.hub_url||hubUrl);setNotice('Ancien design restauré. Vous pouvez ouvrir le catalogue pour le vérifier.');setPlan(null);await loadHistory()}catch(e:any){setNotice(e?.message||'Impossible de restaurer cette version.')}finally{setBusy('')}}

  function reset(){setPrompt('');setReferenceUrl('');setReferenceName('');setPlan(null);setNotice('')}
  if(!ready||!catalogId)return null;
  const changedTheme=plan?Object.keys(plan.catalog_theme||{}):[];const changedHub=plan?Object.keys(plan.hub||{}):[];const changedButtons=plan?.buttons?.length||0;

  return <><button className="vibe-trigger" onClick={()=>setOpen(true)} title="Menu magique utilise 3 crédits IA par demande"><Sparkles size={17}/><span>Menu magique</span><small>3 crédits</small></button>{open&&<div className="vibe-backdrop"><section className="vibe-panel"><header><div><span>QATALINK · MENU MAGIQUE</span><h2>Demandez. Le design change.</h2><p>Décrivez uniquement ce que vous voulez modifier visuellement. Menu magique applique directement le changement au catalogue sélectionné. Chaque demande utilise <b>3 crédits IA</b>.</p></div><button onClick={()=>setOpen(false)}><X/></button></header><div className="vibe-body"><section className="vibe-card"><label className="vibe-label">Catalogue concerné</label><select className="input" value={catalogId} onChange={e=>{setCatalogId(e.target.value);setPlan(null);setNotice('')}}>{catalogs.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></section>
  <section className="vibe-card"><label className="vibe-label">Que voulez-vous changer dans le design ?</label><textarea className="input vibe-prompt" rows={6} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ex : rends les boutons en gradient doré métallique avec le texte noir, assombris la bannière et mets Playfair Display sur les titres."/><div className="vibe-examples">{examples.map((x,i)=><button key={i} onClick={()=>setPrompt(x)}>{x}</button>)}</div></section>
  <section className="vibe-card"><div className="vibe-card-head"><div><b>Référence visuelle facultative</b><small>Ajoutez une capture, un flyer, un menu ou une inspiration. L’image sert de référence visuelle sauf si vous demandez explicitement de l’utiliser.</small></div><Paperclip size={20}/></div>{referenceUrl&&<div className="vibe-reference"><img src={referenceUrl} alt="Référence"/><div><b>{referenceName||'Image de référence'}</b><button onClick={()=>{setReferenceUrl('');setReferenceName('')}}>Retirer</button></div></div>}<label className="btn btn-ghost vibe-upload"><Upload size={15}/>{busy==='upload'?'Import…':'Ajouter une image de référence'}<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadReference(f);e.currentTarget.value=''}}/></label></section>
  {notice&&<div className="vibe-notice">{notice}</div>}
  <button className="btn btn-primary vibe-main" disabled={busy==='execute'||busy==='upload'||!prompt.trim()} onClick={execute}><Sparkles size={16}/>{busy==='execute'?'Application du design…':'Exécuter les modifications · 3 crédits'}</button>
  {plan&&<section className="vibe-card vibe-plan"><div className="vibe-plan-title"><Sparkles size={19}/><div><b>Design appliqué</b><p>{plan.summary}</p></div></div><div className="vibe-impact"><span>{changedTheme.length} réglage(s) catalogue</span><span>{changedHub.length} réglage(s) page centrale</span><span>{changedButtons} bouton(s) personnalisé(s)</span>{plan.reference_target!=='none'&&<span>Image : {plan.reference_target}</span>}</div></section>}
  {(menuUrl||hubUrl)&&<section className="vibe-card vibe-preview-links"><b>Voir le rendu réel</b><p>Ces boutons ouvrent les pages publiques réellement publiées, pas une maquette.</p><div>{menuUrl&&<a className="btn btn-primary" href={menuUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Voir le catalogue</a>}{hubUrl&&<a className="btn btn-ghost" href={hubUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Voir la page centrale</a>}</div></section>}
  <section className="vibe-card vibe-history"><div className="vibe-history-head"><div><History size={18}/><span><b>Historique des designs</b><small>Revenez à une version précédente quand vous voulez.</small></span></div><button onClick={loadHistory}>Actualiser</button></div>{history.length?<div className="vibe-history-list">{history.map(row=><article key={row.id}><div><b>{row.summary||row.prompt||'Version précédente'}</b><small>{new Date(row.created_at).toLocaleString('fr-FR')} · {row.event_type==='before_rollback'?'avant restauration':'avant modification'}</small>{row.prompt&&<p>{row.prompt}</p>}</div><button disabled={!!busy} onClick={()=>rollback(row)}><RotateCcw size={14}/>{busy===`rollback:${row.id}`?'Restauration…':'Restaurer'}</button></article>)}</div>:<div className="vibe-history-empty">Aucune ancienne version pour ce catalogue pour le moment.</div>}</section>
  <button className="vibe-reset" onClick={reset}>Réinitialiser la demande</button></div></section></div>}</>;
}
