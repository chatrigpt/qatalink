'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Copy,Download,ExternalLink} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const PUBLIC_ORIGIN='https://qatalink.com';

export function QrCanonicalControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);
  const [hubSlug,setHubSlug]=useState('');
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    let timer:ReturnType<typeof setTimeout>|null=null;

    const resolve=()=>{
      const pageTitle=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(pageTitle!=='QR & partage'){
        setHost(null);
        setHubSlug('');
        return;
      }

      const wrap=document.querySelector('.qr-v3-wrap');
      const card=wrap?.querySelector('.dash-card')||null;
      setHost(card);
      if(!card)return;

      const params=new URLSearchParams(window.location.search);
      const catalogId=params.get('catalog')||'';
      const qrImg=wrap?.querySelector('.qr-v3-card img') as HTMLImageElement|null;
      const rawSrc=qrImg?.getAttribute('src')||'';
      const match=rawSrc.match(/\/api\/qr\/([^?]+)/);
      const publicSlug=match?decodeURIComponent(match[1]):'';

      if(!catalogId&&!publicSlug){
        setHubSlug('');
        return;
      }

      void (async()=>{
        const query=supabase.from('catalogs').select('hub_public_slug').limit(1);
        const {data}=catalogId
          ?await query.eq('id',catalogId).maybeSingle()
          :await query.eq('public_slug',publicSlug).maybeSingle();
        if(cancelled)return;
        setHubSlug(String(data?.hub_public_slug||''));
      })();
    };

    const schedule=()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(resolve,40);
    };

    resolve();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','href','class']});
    document.addEventListener('click',schedule,true);
    window.addEventListener('popstate',schedule);

    return()=>{
      cancelled=true;
      if(timer)clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('click',schedule,true);
      window.removeEventListener('popstate',schedule);
    };
  },[supabase]);

  async function copyHub(){
    if(!hubSlug)return;
    await navigator.clipboard.writeText(`${PUBLIC_ORIGIN}/h/${hubSlug}`);
    setCopied(true);
    setTimeout(()=>setCopied(false),1400);
  }

  if(!host||!hubSlug)return null;
  const hubUrl=`${PUBLIC_ORIGIN}/h/${hubSlug}`;

  return createPortal(
    <div className="qr-canonical-controls qr-hub-only">
      <div className="qr-hub-permanent">
        <div className="qr-hub-image">
          <img src={`/api/hub-qr/${hubSlug}`} alt="QR permanent de la page centrale"/>
        </div>
        <div className="qr-hub-copy">
          <span>PAGE CENTRALE DE CE CATALOGUE</span>
          <strong>{hubUrl}</strong>
          <small>Ce lien et ce QR sont permanents. Vous pouvez modifier le logo, les boutons, les couleurs, les liens et le contenu de la page centrale sans changer le QR.</small>
          <div className="qr-canonical-actions">
            <button className="btn btn-ghost" onClick={copyHub}><Copy size={14}/>{copied?'Copié':'Copier le lien'}</button>
            <a className="btn btn-ghost" href={`/api/hub-qr/${hubSlug}?download=1`}><Download size={14}/>Télécharger le QR</a>
            <a className="btn btn-ghost" href={hubUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Ouvrir la page centrale</a>
          </div>
        </div>
      </div>
    </div>,
    host
  );
}
