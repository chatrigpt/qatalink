'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileImage,FilePlus2,FileText,Plus,RefreshCw,UploadCloud,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Mode='image'|'text';
const MAX_IMAGES=8;
const MAX_IMAGE_BYTES=10*1024*1024;

type PickedFile={file:File;key:string};

export function CatalogCompletionControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<Mode>('image');
  const [files,setFiles]=useState<PickedFile[]>([]);
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [feedback,setFeedback]=useState('');
  const inputRef=useRef<HTMLInputElement|null>(null);

  useEffect(()=>{
    if(typeof window==='undefined'||window.location.pathname!=='/dashboard')return;
    let timer:ReturnType<typeof setTimeout>|null=null;
    const resolve=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      setHost(title==='Articles & catégories'?document.querySelector('.dash-toolbar'):null);
    };
    const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(resolve,70)};
    schedule();const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    return()=>{if(timer)clearTimeout(timer);observer.disconnect()};
  },[]);

  function reset(){setMode('image');setFiles([]);setText('');setError('');if(inputRef.current)inputRef.current.value=''}
  function close(){if(busy)return;setOpen(false);reset()}

  function addFiles(list:FileList|null){
    if(!list)return;
    const incoming=Array.from(list);
    const valid=incoming.filter(file=>file.type.startsWith('image/')&&file.size<=MAX_IMAGE_BYTES);
    const rejected=incoming.length-valid.length;
    setFiles(current=>{
      const map=new Map(current.map(entry=>[entry.key,entry]));
      for(const file of valid){const key=`${file.name}:${file.size}:${file.lastModified}`;if(!map.has(key)&&map.size<MAX_IMAGES)map.set(key,{file,key})}
      return Array.from(map.values()).slice(0,MAX_IMAGES);
    });
    if(rejected)setError('Certaines images ont été ignorées : utilisez uniquement des images de moins de 10 Mo.');
    else if(files.length+valid.length>MAX_IMAGES)setError(`Vous pouvez ajouter jusqu’à ${MAX_IMAGES} images à la fois.`);
    else setError('');
    if(inputRef.current)inputRef.current.value='';
  }

  async function resolveContext(){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)throw new Error('Votre session a expiré.');
    const {data:businessRows}=await supabase.from('businesses').select('id,name,business_type,currency_code,country_code,theme_preset').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
    const business=businessRows?.[0];if(!business)throw new Error('Entreprise introuvable.');
    let catalogId=new URLSearchParams(window.location.search).get('catalog')||'';
    if(!catalogId){const {data:catalogs}=await supabase.from('catalogs').select('id').eq('business_id',business.id).order('created_at',{ascending:false}).limit(1);catalogId=String(catalogs?.[0]?.id||'')}
    if(!catalogId)throw new Error('Catalogue introuvable.');
    let preset:any=null;
    if(business.theme_preset){const {data}=await supabase.from('sector_presets').select('id,label,default_categories').eq('id',business.theme_preset).maybeSingle();preset=data||null}
    return {session,business,catalogId,preset};
  }

  async function uploadImages(userId:string){
    const urls:string[]=[];
    for(let index=0;index<files.length;index++){
      const file=files[index].file;
      const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
      const path=`${userId}/supplement-${Date.now()}-${index}-${safe}`;
      const up=await supabase.storage.from('ocr-source').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
      if(up.error)throw new Error(`Impossible d’envoyer « ${file.name} ».`);
      const {data:urlData}=supabase.storage.from('ocr-source').getPublicUrl(path);urls.push(urlData.publicUrl);
    }
    return urls;
  }

  async function submit(){
    if(busy)return;
    if(mode==='text'&&!text.trim()){setError('Collez le texte contenant les informations à ajouter.');return}
    if(mode==='image'&&!files.length){setError('Ajoutez au moins une image.');return}
    setBusy(true);setError('');
    try{
      const {session,business,catalogId,preset}=await resolveContext();
      const source=mode==='text'?{text:text.trim()}:{image_urls:await uploadImages(session.user.id)};
      const ocr=await fetch('/api/ocr',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({input_type:mode,source,business_context:{name:business.name,business_type:business.business_type,currency_code:business.currency_code||'XOF',country_code:business.country_code||'CI',language:'fr'},preset:{id:preset?.id||business.theme_preset||'',label:preset?.label||'',categories:preset?.default_categories||[]},completion_mode:true})});
      const ocrData=await ocr.json().catch(()=>({}));
      if(ocr.status===402)throw new Error('Votre abonnement doit être actif pour compléter ce catalogue.');
      if(!ocr.ok||!ocrData?.catalog)throw new Error(ocrData?.message||ocrData?.error||'Impossible d’analyser ce complément.');
      const append=await fetch('/api/catalogs/append',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({catalog_id:catalogId,catalog:ocrData.catalog})});
      const result=await append.json().catch(()=>({}));
      if(!append.ok)throw new Error(result?.message||result?.error||'Impossible de compléter le catalogue.');
      const added=Number(result.items_added||0),updated=Number(result.items_updated||0),cats=Number(result.categories_added||0);
      setFeedback(`${added} article(s) ajouté(s)${updated?` · ${updated} complété(s)`:''}${cats?` · ${cats} catégorie(s) ajoutée(s)`:''}.`);
      setOpen(false);reset();
      window.setTimeout(()=>window.location.reload(),900);
    }catch(e:any){setError(e?.message||'Une erreur est survenue.')}finally{setBusy(false)}
  }

  const action=host&&createPortal(<button type="button" className="btn btn-ghost q-catalog-complete-trigger" onClick={()=>{reset();setOpen(true)}}><FilePlus2 size={15}/>Compléter le catalogue</button>,host);
  const modal=open&&createPortal(<div className="q-catalog-complete-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="q-catalog-complete-modal" role="dialog" aria-modal="true"><header><div><span className="eyebrow">COMPLÉTER CE CATALOGUE</span><h2>Ajoutez ce qui manque sans tout recommencer</h2><p>Envoyez une ou plusieurs nouvelles pages de menu, une capture ou un bloc de texte. Qatalink ajoute les nouveaux éléments et complète les articles déjà reconnus.</p></div><button type="button" onClick={close} aria-label="Fermer"><X/></button></header><div className="q-catalog-complete-tabs"><button type="button" className={mode==='image'?'active':''} onClick={()=>{setMode('image');setError('')}}><FileImage size={17}/>Image(s)</button><button type="button" className={mode==='text'?'active':''} onClick={()=>{setMode('text');setError('')}}><FileText size={17}/>Bloc de texte</button></div>{mode==='image'?<div className="q-catalog-complete-source"><button type="button" className="q-catalog-complete-drop" onClick={()=>inputRef.current?.click()}><UploadCloud size={28}/><b>Ajouter des images</b><span>Jusqu’à {MAX_IMAGES} pages · 10 Mo max par image</span></button><input ref={inputRef} hidden multiple type="file" accept="image/*" onChange={e=>addFiles(e.target.files)}/>{files.length>0&&<div className="q-catalog-complete-files">{files.map((entry,index)=><div key={entry.key}><span><b>{index+1}</b>{entry.file.name}</span><button type="button" onClick={()=>setFiles(current=>current.filter(file=>file.key!==entry.key))}><X size={13}/></button></div>)}</div>}<button type="button" className="btn btn-ghost q-catalog-add-more" onClick={()=>inputRef.current?.click()} disabled={files.length>=MAX_IMAGES}><Plus size={14}/>Ajouter une autre image</button></div>:<textarea className="q-catalog-complete-text" rows={12} value={text} onChange={e=>setText(e.target.value)} placeholder={'Collez uniquement les informations à ajouter. Exemple :\n\nDESSERTS\nFondant au chocolat — 3 500 F\nTiramisu — 3 000 F\n\nBOISSONS\nEau gazeuse 50 cl — 1 500 F'}/>} {error&&<div className="q-catalog-complete-error">{error}</div>}<footer><button type="button" className="btn btn-ghost" onClick={close} disabled={busy}>Annuler</button><button type="button" className="btn btn-primary" onClick={submit} disabled={busy||(mode==='image'&&!files.length)||(mode==='text'&&!text.trim())}>{busy?<><RefreshCw size={14}/>Analyse et ajout…</>:<><FilePlus2 size={14}/>Ajouter au catalogue</>}</button></footer></section></div>,document.body);

  return <>{action}{modal}{feedback&&createPortal(<div className="q-catalog-complete-feedback">{feedback}</div>,document.body)}</>;
}
