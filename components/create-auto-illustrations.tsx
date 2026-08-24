'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {ImagePlus,RefreshCw,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const MAX=12;const MAX_BYTES=10*1024*1024;
type Uploaded={name:string;url:string;storage_path:string};

export function CreateAutoIllustrations(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);const [host,setHost]=useState<Element|null>(null);const [rows,setRows]=useState<Uploaded[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{if(typeof window==='undefined'||location.pathname!=='/create')return;const find=()=>{const cards=document.querySelectorAll('.activation-create-form .create-step-card');setHost(cards[1]||document.querySelector('.activation-create-form'))};find();const o=new MutationObserver(find);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect()},[]);
  useEffect(()=>{if(location.pathname!=='/create')return;try{const saved=JSON.parse(localStorage.getItem('qatalink_pending_uploaded_illustrations')||'[]');if(Array.isArray(saved))setRows(saved)}catch{}},[]);
  function persist(next:Uploaded[]){setRows(next);localStorage.setItem('qatalink_pending_uploaded_illustrations',JSON.stringify(next))}
  async function upload(list:FileList|null){if(!list)return;const incoming=Array.from(list).filter(f=>f.type.startsWith('image/')&&f.size<=MAX_BYTES).slice(0,Math.max(0,MAX-rows.length));if(!incoming.length){setError('Utilisez des images de moins de 10 Mo.');return}setBusy(true);setError('');try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Session expirée.');const next=[...rows];for(let i=0;i<incoming.length;i++){const f=incoming[i];const safe=f.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${session.user.id}/pending-auto-illustrations/${Date.now()}-${i}-${safe}`;const up=await supabase.storage.from('catalog-assets').upload(path,f,{contentType:f.type||'image/jpeg',upsert:false});if(up.error)throw new Error(`Impossible d’envoyer « ${f.name} ».`);const {data:u}=supabase.storage.from('catalog-assets').getPublicUrl(path);next.push({name:f.name,url:u.publicUrl,storage_path:path})}persist(next.slice(0,MAX))}catch(e:any){setError(e.message||'Import impossible.')}finally{setBusy(false)}}
  if(!host)return null;
  return createPortal(<div className="create-auto-illustrations"><div className="create-step-label"><span>+</span><div><b>Photos des plats / produits <em style={{fontStyle:'normal',color:'#bd1530'}}>facultatif</em></b><small>Ajoutez vos vraies photos en plus du texte ou des pages du menu. Après création, Qatalink les reconnaît et les attribue automatiquement aux bons articles.</small></div></div><label className="btn btn-ghost" style={{display:'inline-flex',gap:8,alignItems:'center',marginTop:12}}><ImagePlus size={16}/>{busy?<><RefreshCw size={14}/>Envoi…</>:`Ajouter des photos à attribuer (${rows.length}/${MAX})`}<input hidden multiple type="file" accept="image/*" onChange={e=>{void upload(e.target.files);e.currentTarget.value=''}}/></label>{rows.length>0&&<div className="create-source-files" style={{marginTop:10}}>{rows.map((r,i)=><span key={`${r.url}-${i}`}><b>{i+1}</b><em>{r.name}</em><button type="button" onClick={()=>persist(rows.filter((_,n)=>n!==i))}><X size={12}/></button></span>)}</div>}{error&&<small style={{display:'block',marginTop:8,color:'#a8172d'}}>{error}</small>}<small style={{display:'block',marginTop:8,color:'var(--muted)'}}>Ces images ne servent pas à lire le menu : elles servent à illustrer automatiquement les articles correspondants.</small></div>,host);
}
