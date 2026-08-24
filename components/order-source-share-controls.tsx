'use client';

import {Copy} from 'lucide-react';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

const ORIGIN='https://qatalink.com';

export function OrderSourceShareControls(){
  const [host,setHost]=useState<Element|null>(null);
  const [slug,setSlug]=useState('');
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let timer:any;
    const resolve=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(title!=='QR & partage'){setHost(null);setSlug('');return}
      const wrap=document.querySelector('.qr-v3-wrap');
      const card=wrap?.querySelector('.dash-card')||null;
      const img=wrap?.querySelector<HTMLImageElement>('.qr-v3-card img');
      const match=(img?.getAttribute('src')||'').match(/\/api\/qr\/([^?]+)/);
      setHost(card);setSlug(match?decodeURIComponent(match[1]):'');
    };
    resolve();
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(resolve,40)});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','class']});
    return()=>{clearTimeout(timer);observer.disconnect()};
  },[]);

  if(!host||!slug)return null;
  const url=`${ORIGIN}/c/${slug}?src=shared_link`;
  async function copy(){await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1400)}
  return createPortal(<div className="q-source-share-control"><div><span>LIEN À PARTAGER</span><strong>{url}</strong><small>Utilisez ce lien pour WhatsApp, SMS, réseaux sociaux ou campagnes. Les commandes seront automatiquement attribuées à « Lien partagé » dans vos statistiques.</small></div><button className="btn btn-ghost" onClick={copy}><Copy size={14}/>{copied?'Copié':'Copier le lien partagé'}</button></div>,host);
}
