'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Copy,RefreshCw} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const PUBLIC_ORIGIN='https://qatalink.com';

function slugify(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'catalogue';
}

export function QrCanonicalControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);
  const [catalogId,setCatalogId]=useState('');
  const [slug,setSlug]=useState('');
  const [title,setTitle]=useState('Catalogue');
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    let request=0;
    const resolve=()=>{
      document.querySelectorAll('.catalog-v2-card small').forEach(el=>{
        const text=el.textContent||'';
        if(text.startsWith('/q/'))el.textContent=text.replace(/^\/q\//,'/c/');
      });

      const pageTitle=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(pageTitle!=='QR & partage'){setHost(null);return}
      const wrap=document.querySelector('.qr-v3-wrap');
      const card=wrap?.querySelector('.dash-card')||null;
      const qrImg=wrap?.querySelector('.qr-v3-card img') as HTMLImageElement|null;
      const rawSrc=qrImg?.getAttribute('src')||'';
      const match=rawSrc.match(/\/api\/qr\/([^?]+)/);
      const nextSlug=match?decodeURIComponent(match[1]):'';
      setHost(card);
      if(!nextSlug)return;
      setSlug(nextSlug);
      const canonical=`${PUBLIC_ORIGIN}/c/${nextSlug}`;
      const share=wrap?.querySelector('.share-link');
      if(share&&share.textContent!==canonical)share.textContent=canonical;
      const preview=wrap?.querySelector('a[target="_blank"]') as HTMLAnchorElement|null;
      if(preview)preview.href=canonical;
      const current=++request;
      (async()=>{
        const {data}=await supabase.from('catalogs').select('id,title').eq('public_slug',nextSlug).maybeSingle();
        if(current!==request)return;
        setCatalogId(data?.id||'');
        setTitle(data?.title||'Catalogue');
      })();
    };
    resolve();
    const mo=new MutationObserver(()=>setTimeout(resolve,30));
    mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','href','class']});
    document.addEventListener('click',resolve,true);
    return()=>{request++;mo.disconnect();document.removeEventListener('click',resolve,true)};
  },[supabase]);

  async function copyCanonical(){
    if(!slug)return;
    await navigator.clipboard.writeText(`${PUBLIC_ORIGIN}/c/${slug}`);
    setCopied(true);setTimeout(()=>setCopied(false),1400);
  }

  async function resetQr(){
    if(!catalogId||busy)return;
    const ok=window.confirm('Réinitialiser le QR code de ce catalogue ?\n\nUn nouveau lien et un nouveau QR seront créés. Les anciens QR déjà imprimés ou téléchargés ne redirigeront plus vers ce catalogue.');
    if(!ok)return;
    setBusy(true);
    const random=crypto.randomUUID().replace(/-/g,'').slice(0,10);
    const nextSlug=`${slugify(title)}-${random}`;
    const {error}=await supabase.from('catalogs').update({public_slug:nextSlug}).eq('id',catalogId);
    if(error){alert(error.message||'Impossible de réinitialiser le QR pour le moment.');setBusy(false);return}
    window.location.reload();
  }

  if(!host||!slug)return null;
  return createPortal(
    <div className="qr-canonical-controls">
      <div className="qr-canonical-copy"><span>Adresse officielle du QR</span><strong>{PUBLIC_ORIGIN}/c/{slug}</strong><small>Tous les nouveaux QR Qatalink utilisent qatalink.com et ouvrent directement le catalogue.</small></div>
      <div className="qr-canonical-actions">
        <button className="btn btn-ghost" onClick={copyCanonical}><Copy size={14}/>{copied?'Copié':'Copier le lien'}</button>
        <button className="btn btn-ghost qr-reset-btn" onClick={resetQr} disabled={busy}><RefreshCw size={14}/>{busy?'Réinitialisation…':'Obtenir un nouveau QR'}</button>
      </div>
    </div>,
    host
  );
}
