'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ImagePlus,RefreshCw,Sparkles,Upload,WandSparkles,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type ItemRef={id:string;name:string;description:string|null;sort_order:number};
type Target={id:string;name:string;hasImage:boolean}|null;
type Mode='auto'|'custom'|null;
type ReferenceImage={file:File;preview:string}|null;

type StatusResult={job_id:string;item_id:string;status:'processing'|'completed'|'failed';image_url?:string;error?:string};

export function ItemImageGenerationControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [target,setTarget]=useState<Target>(null);
  const [mode,setMode]=useState<Mode>(null);
  const [customPrompt,setCustomPrompt]=useState('');
  const [referenceImage,setReferenceImage]=useState<ReferenceImage>(null);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [feedback,setFeedback]=useState('');
  const itemsRef=useRef<ItemRef[]>([]);
  const decorateTimer=useRef<number|null>(null);
  const fileInputRef=useRef<HTMLInputElement|null>(null);

  function clearReference(){
    setReferenceImage(current=>{if(current?.preview)URL.revokeObjectURL(current.preview);return null});
    if(fileInputRef.current)fileInputRef.current.value='';
  }
  function closeModal(){if(working)return;setTarget(null);setMode(null);setCustomPrompt('');clearReference();setError('')}

  async function resolveItems(){
    if(typeof window==='undefined'||window.location.pathname!=='/dashboard')return [] as ItemRef[];
    let catalogId=new URLSearchParams(window.location.search).get('catalog')||'';
    if(!catalogId){
      const {data:b}=await supabase.from('businesses').select('id').order('created_at',{ascending:true}).limit(1).maybeSingle();
      if(b?.id){const {data:c}=await supabase.from('catalogs').select('id').eq('business_id',b.id).order('created_at',{ascending:false}).limit(1).maybeSingle();catalogId=c?.id||''}
    }
    if(!catalogId)return [] as ItemRef[];
    const {data}=await supabase.from('items').select('id,name,description,sort_order').eq('catalog_id',catalogId).order('sort_order');
    itemsRef.current=(data||[]) as ItemRef[];
    return itemsRef.current;
  }

  function decorateCards(items=itemsRef.current){
    const cards=Array.from(document.querySelectorAll<HTMLElement>('.editor-v2-grid .item-v2-card'));
    if(!cards.length)return;
    cards.forEach((card,index)=>{
      const item=items[index];if(!item)return;
      card.dataset.qatalinkItemId=item.id;
      const media=card.querySelector<HTMLElement>('.item-v2-media');if(!media)return;
      const hasImage=!!media.querySelector('img');
      let row=card.querySelector<HTMLElement>(':scope > .qatalink-image-action-row');
      if(!row){row=document.createElement('div');row.className='qatalink-image-action-row';media.insertAdjacentElement('afterend',row)}
      row.innerHTML='';
      const button=document.createElement('button');button.type='button';button.className='qatalink-image-action-button';
      button.innerHTML=hasImage?'<span aria-hidden="true">↻</span><span><b>Régénérer l’image</b><small>Créer une nouvelle version · 5 crédits</small></span>':'<span aria-hidden="true">✦</span><span><b>Générer une image</b><small>Créer une illustration professionnelle · 5 crédits</small></span>';
      button.addEventListener('click',()=>{clearReference();setTarget({id:item.id,name:item.name,hasImage});setMode(null);setCustomPrompt('');setError('')});
      row.appendChild(button);
    });
  }

  async function refreshDecorations(){const items=await resolveItems();decorateCards(items)}

  useEffect(()=>{
    if(typeof window==='undefined'||window.location.pathname!=='/dashboard')return;
    void refreshDecorations();
    const observer=new MutationObserver(()=>{if(decorateTimer.current)window.clearTimeout(decorateTimer.current);decorateTimer.current=window.setTimeout(()=>void refreshDecorations(),100)});
    observer.observe(document.body,{childList:true,subtree:true});
    const onPop=()=>void refreshDecorations();window.addEventListener('popstate',onPop);
    return()=>{observer.disconnect();window.removeEventListener('popstate',onPop);if(decorateTimer.current)window.clearTimeout(decorateTimer.current);document.querySelectorAll('.qatalink-image-action-row').forEach(el=>el.remove());clearReference()};
  },[]);

  function chooseReference(file?:File){
    if(!file)return;
    if(!file.type.startsWith('image/')){setError('Choisissez un fichier image.');return}
    if(file.size>12*1024*1024){setError('L’image de référence doit faire moins de 12 Mo.');return}
    clearReference();
    setReferenceImage({file,preview:URL.createObjectURL(file)});
    setError('');
  }

  function updateCreditDisplay(balance:unknown){
    if(balance===null||balance===undefined)return;
    const value=String(Number(balance));
    const pill=document.querySelector<HTMLElement>('.credit-pill strong');if(pill)pill.textContent=value;
  }

  function applyCompletedImage(itemId:string,imageUrl:string){
    const card=document.querySelector<HTMLElement>(`.item-v2-card[data-qatalink-item-id="${itemId}"]`);if(!card)return;
    const media=card.querySelector<HTMLElement>('.item-v2-media');if(!media)return;
    let image=media.querySelector<HTMLImageElement>('img');
    if(!image){image=document.createElement('img');image.alt=itemsRef.current.find(i=>i.id===itemId)?.name||'Illustration';const placeholder=media.querySelector('svg');if(placeholder)placeholder.replaceWith(image);else media.prepend(image)}
    image.src=imageUrl;
    const item=itemsRef.current.find(i=>i.id===itemId);if(item)decorateCards(itemsRef.current);
  }

  async function pollJobs(jobIds:string[],itemId:string,token:string){
    let pending=[...jobIds];let attempts=0;
    while(pending.length&&attempts<100){
      attempts++;await new Promise(resolve=>window.setTimeout(resolve,3000));
      const r=await fetch('/api/images/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({job_ids:pending})});
      const data=await r.json().catch(()=>null);if(!r.ok)continue;
      const results=(data?.results||[]) as StatusResult[];
      const completed=results.find(x=>x.status==='completed'&&x.item_id===itemId&&x.image_url);
      if(completed?.image_url){applyCompletedImage(itemId,completed.image_url);setFeedback('Votre nouvelle illustration est prête.');window.setTimeout(()=>setFeedback(''),4200)}
      if(results.some(x=>x.status==='failed')){setFeedback('Une génération a échoué. Les crédits concernés sont recrédités lorsqu’ils ont été débités.');window.setTimeout(()=>setFeedback(''),5200)}
      pending=results.filter(x=>x.status==='processing').map(x=>x.job_id);
      localStorage.setItem('qatalink_pending_image_jobs',JSON.stringify(pending));
    }
    if(!pending.length)localStorage.removeItem('qatalink_pending_image_jobs');
  }

  async function uploadReference(token:string){
    if(!target||!referenceImage)return null;
    const form=new FormData();form.set('item_id',target.id);form.set('file',referenceImage.file);
    const response=await fetch('/api/images/reference',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.message||'Impossible d’envoyer l’image de référence.');
    return {url:String(data.reference_image_url||''),storagePath:String(data.reference_storage_path||'')};
  }

  async function launch(){
    if(!target||!mode||working)return;
    if(mode==='custom'&&!customPrompt.trim()){setError('Décrivez simplement l’image que vous souhaitez obtenir.');return}
    setWorking(true);setError('');
    try{
      const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Votre session a expiré. Reconnectez-vous puis réessayez.');
      const reference=mode==='custom'?await uploadReference(session.access_token):null;
      const r=await fetch('/api/images/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({item_ids:[target.id],generation_mode:mode,custom_prompt:mode==='custom'?customPrompt.trim():undefined,reference_image_url:reference?.url||undefined,reference_storage_path:reference?.storagePath||undefined})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){
        if(data?.error==='INSUFFICIENT_CREDITS')setError(`Cette image demande 5 crédits. Votre solde actuel est de ${Number(data?.balance||0)}.`);
        else setError(data?.message||'Impossible de lancer la génération pour le moment.');
        return;
      }
      updateCreditDisplay(data?.balance);
      const jobs=(data?.jobs||[]).map((j:any)=>j?.job_id).filter(Boolean) as string[];
      if(!jobs.length){setError('La génération n’a pas pu démarrer. Réessayez dans un instant.');return}
      const previous=JSON.parse(localStorage.getItem('qatalink_pending_image_jobs')||'[]');
      const merged=[...new Set([...(Array.isArray(previous)?previous:[]),...jobs])];localStorage.setItem('qatalink_pending_image_jobs',JSON.stringify(merged));
      const itemId=target.id;const usedReference=!!referenceImage;setTarget(null);setMode(null);setCustomPrompt('');clearReference();setFeedback(usedReference?'Illustration guidée par votre image en cours de création…':target.hasImage?'Nouvelle version en cours de création…':'Illustration en cours de création…');window.setTimeout(()=>setFeedback(''),3500);
      void pollJobs(jobs,itemId,session.access_token);
    }catch(e:any){setError(e?.message||'Impossible de lancer la génération pour le moment.')}finally{setWorking(false)}
  }

  if(typeof window!=='undefined'&&window.location.pathname!=='/dashboard')return null;

  return <>
    {feedback&&<div className="qatalink-image-feedback" role="status"><Sparkles size={17}/><span>{feedback}</span><button onClick={()=>setFeedback('')} aria-label="Fermer"><X size={14}/></button></div>}
    {target&&<div className="qatalink-image-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeModal()}}><section className="qatalink-image-modal" role="dialog" aria-modal="true" aria-labelledby="image-generation-title"><button className="qatalink-image-modal-close" onClick={closeModal} aria-label="Fermer"><X size={18}/></button><div className="qatalink-image-modal-icon">{target.hasImage?<RefreshCw size={23}/>:<ImagePlus size={23}/>}</div><span className="eyebrow">ILLUSTRATION QATALINK</span><h2 id="image-generation-title">{target.hasImage?'Comment voulez-vous recréer cette image ?':'Comment voulez-vous créer cette image ?'}</h2><p className="qatalink-image-modal-lead">Pour « {target.name} », choisissez la méthode la plus simple pour vous.</p>
      <div className="qatalink-generation-choices">
        <button type="button" className={mode==='auto'?'selected':''} onClick={()=>{setMode('auto');clearReference();setError('')}}><span className="qatalink-generation-choice-icon"><Sparkles size={20}/></span><span><b>Laisser Qatalink créer l’image</b><small>Qatalink utilise le nom et la description de l’article pour créer automatiquement une image réaliste et professionnelle.</small></span></button>
        <button type="button" className={mode==='custom'?'selected':''} onClick={()=>{setMode('custom');setError('')}}><span className="qatalink-generation-choice-icon"><WandSparkles size={20}/></span><span><b>Décrire l’image que je veux</b><small>Ajoutez vos instructions et, si vous le souhaitez, une image de référence pour guider fidèlement le résultat.</small></span></button>
      </div>
      {mode==='custom'&&<div className="qatalink-custom-image-prompt"><label htmlFor="qatalink-custom-image-description">{target.hasImage?'Décrivez la nouvelle version souhaitée':'Décrivez l’image souhaitée'}</label><textarea id="qatalink-custom-image-description" rows={5} maxLength={4000} autoFocus value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder="Exemple : garde exactement la forme et les couleurs du produit de ma photo, posé sur une table claire avec une lumière naturelle et un fond premium."/><small>Le texte explique ce que vous voulez obtenir. L’image de référence permet de montrer précisément le produit, le plat, le packaging, les couleurs ou le style à respecter.</small>
        <div className="qatalink-reference-image-block"><div className="qatalink-reference-image-head"><span><b>Image de référence</b><small>Optionnel · JPG, PNG ou WebP · 12 Mo max.</small></span>{referenceImage&&<button type="button" onClick={clearReference} aria-label="Retirer l’image"><X size={15}/>Retirer</button>}</div>{referenceImage?<button type="button" className="qatalink-reference-preview" onClick={()=>fileInputRef.current?.click()}><img src={referenceImage.preview} alt="Aperçu de l’image de référence"/><span><RefreshCw size={16}/>Changer l’image</span></button>:<button type="button" className="qatalink-reference-upload" onClick={()=>fileInputRef.current?.click()}><Upload size={20}/><span><b>Ajouter une image</b><small>Montrez à Qatalink le produit, le plat ou le rendu à prendre comme référence.</small></span></button>}<input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={e=>chooseReference(e.target.files?.[0])}/></div>
      </div>}
      {error&&<div className="qatalink-image-error">{error}{error.includes('crédits')&&<a href="/dashboard?tab=subscription">Recharger mes crédits</a>}</div>}
      <div className="qatalink-image-modal-actions"><button type="button" className="btn btn-ghost" onClick={closeModal} disabled={working}>Annuler</button><button type="button" className="btn btn-primary" onClick={launch} disabled={!mode||working||(mode==='custom'&&!customPrompt.trim())}>{working?referenceImage?'Envoi + lancement…':'Lancement…':target.hasImage?'Régénérer l’image · 5 crédits':'Générer l’image · 5 crédits'}</button></div>
    </section></div>}
  </>;
}
