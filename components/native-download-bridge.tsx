'use client';

import {Capacitor,registerPlugin} from '@capacitor/core';
import {Download,CheckCircle2,XCircle} from 'lucide-react';
import {useEffect,useState} from 'react';

type DownloadsPlugin={save(options:{filename:string;base64:string;mimeType?:string}):Promise<{uri:string;filename:string}>};
const NativeDownloads=registerPlugin<DownloadsPlugin>('QatalinkDownloads');

function safeName(anchor:HTMLAnchorElement){
  const requested=(anchor.getAttribute('download')||'').trim();
  if(requested)return requested.replace(/[\\/:*?"<>|]+/g,'-').slice(0,180);
  try{const part=new URL(anchor.href,location.href).pathname.split('/').filter(Boolean).pop()||'qatalink-download';return decodeURIComponent(part).replace(/[\\/:*?"<>|]+/g,'-').slice(0,180)}catch{return 'qatalink-download'}
}
function blobBase64(blob:Blob){return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=()=>reject(r.error||new Error('READ_FAILED'));r.readAsDataURL(blob)})}

export function NativeDownloadBridge(){
  const [message,setMessage]=useState<{ok:boolean;text:string}|null>(null);
  useEffect(()=>{
    if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='android')return;
    const onClick=async(event:MouseEvent)=>{
      const target=event.target as Element|null;const anchor=target?.closest?.('a[download]') as HTMLAnchorElement|null;
      if(!anchor||anchor.dataset.qatalinkNativeSaving==='1')return;
      event.preventDefault();event.stopPropagation();anchor.dataset.qatalinkNativeSaving='1';
      const filename=safeName(anchor);
      try{
        const response=await fetch(anchor.href);if(!response.ok)throw new Error(`HTTP_${response.status}`);
        const blob=await response.blob();const base64=await blobBase64(blob);
        await NativeDownloads.save({filename,base64,mimeType:blob.type||'application/octet-stream'});
        setMessage({ok:true,text:`${filename} enregistré dans Téléchargements`});
      }catch(error){
        console.error('[Qatalink:NativeDownload]',error);setMessage({ok:false,text:'Impossible d’enregistrer le fichier. Réessayez.'});
      }finally{delete anchor.dataset.qatalinkNativeSaving;window.setTimeout(()=>setMessage(null),4200)}
    };
    document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true);
  },[]);
  if(!message)return null;
  return <div className={`qatalink-native-download-toast ${message.ok?'ok':'error'}`}>{message.ok?<CheckCircle2 size={18}/>:<XCircle size={18}/>}<Download size={16}/><span>{message.text}</span><style jsx>{`.qatalink-native-download-toast{position:fixed;left:50%;top:max(14px,calc(env(safe-area-inset-top) + 10px));transform:translateX(-50%);z-index:2147483600;max-width:min(92vw,520px);display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:14px;color:#fff;font-size:12px;font-weight:850;box-shadow:0 14px 38px rgba(0,0,0,.28)}.qatalink-native-download-toast.ok{background:#166534}.qatalink-native-download-toast.error{background:#991b1b}`}</style></div>
}
