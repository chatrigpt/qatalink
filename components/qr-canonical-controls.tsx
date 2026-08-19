'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Copy,Download,ExternalLink,RefreshCw} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const PUBLIC_ORIGIN='https://qatalink.com';

function slugify(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'catalogue'}

export function QrCanonicalControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);const [catalogId,setCatalogId]=useState('');const [slug,setSlug]=useState('');const [hubSlug,setHubSlug]=useState('');const [hubAllowed,setHubAllowed]=useState(false);const [title,setTitle]=useState('Catalogue');const [busy,setBusy]=useState(false);const [copied,setCopied]=useState<'catalog'|'hub'|''>('');

  useEffect(()=>{
    let request=0;
    const resolve=()=>{
      document.querySelectorAll('.catalog-v2-card small').forEach(el=>{const text=el.textContent||'';if(text.startsWith('/q/'))el.textContent=text.replace(/^\/q\//,'/c/')});
      const pageTitle=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(pageTitle!=='QR & partage'){setHost(null);return}
      const wrap=document.querySelector('.qr-v3-wrap');const card=wrap?.querySelector('.dash-card')||null;const qrImg=wrap?.querySelector('.qr-v3-card img') as HTMLImageElement|null;const rawSrc=qrImg?.getAttribute('src')||'';const match=rawSrc.match(/\/api\/qr\/([^?]+)/);const nextSlug=match?decodeURIComponent(match[1]):'';setHost(card);if(!nextSlug)return;setSlug(nextSlug);
      const canonical=`${PUBLIC_ORIGIN}/c/${nextSlug}`;const share=wrap?.querySelector('.share-link');if(share&&share.textContent!==canonical)share.textContent=canonical;const preview=wrap?.querySelector('a[target="_blank"]') as HTMLAnchorElement|null;if(preview)preview.href=canonical;
      const current=++request;(async()=>{const {data}=await supabase.from('catalogs').select('id,title,business_id,hub_public_slug').eq('public_slug',nextSlug).maybeSingle();if(current!==request)return;setCatalogId(data?.id||'');setTitle(data?.title||'Catalogue');setHubSlug(data?.hub_public_slug||'');if(!data?.business_id){setHubAllowed(false);return}const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',data.business_id).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);if(current!==request)return;const s=subs?.[0];const valid=!!s&&(!s.current_period_end||new Date(s.current_period_end).getTime()>Date.now());setHubAllowed(valid&&['interactive','linkhub','trial'].includes(String(s?.plan_code||'')))})();
    };
    resolve();const mo=new MutationObserver(()=>setTimeout(resolve,30));mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','href','class']});document.addEventListener('click',resolve,true);return()=>{request++;mo.disconnect();document.removeEventListener('click',resolve,true)};
  },[supabase]);

  async function copy(value:string,kind:'catalog'|'hub'){if(!value)return;await navigator.clipboard.writeText(value);setCopied(kind);setTimeout(()=>setCopied(''),1400)}
  async function resetQr(){if(!catalogId||busy)return;const ok=window.confirm('Réinitialiser le QR code de ce catalogue ?\n\nUn nouveau lien et un nouveau QR seront créés. Les anciens QR du menu ne redirigeront plus vers ce catalogue. Le QR de la page centrale, lui, restera inchangé.');if(!ok)return;setBusy(true);const random=crypto.randomUUID().replace(/-/g,'').slice(0,10);const nextSlug=`${slugify(title)}-${random}`;const {error}=await supabase.from('catalogs').update({public_slug:nextSlug}).eq('id',catalogId);if(error){alert(error.message||'Impossible de réinitialiser le QR pour le moment.');setBusy(false);return}window.location.reload()}

  if(!host||!slug)return null;
  const catalogUrl=`${PUBLIC_ORIGIN}/c/${slug}`;const hubUrl=hubSlug?`${PUBLIC_ORIGIN}/h/${hubSlug}`:'';
  return createPortal(<div className="qr-canonical-controls">
    <div className="qr-canonical-copy"><span>Adresse officielle du QR menu/catalogue</span><strong>{catalogUrl}</strong><small>Ce QR ouvre directement le menu/catalogue.</small></div>
    <div className="qr-canonical-actions"><button className="btn btn-ghost" onClick={()=>copy(catalogUrl,'catalog')}><Copy size={14}/>{copied==='catalog'?'Copié':'Copier le lien'}</button><button className="btn btn-ghost qr-reset-btn" onClick={resetQr} disabled={busy}><RefreshCw size={14}/>{busy?'Réinitialisation…':'Obtenir un nouveau QR menu'}</button></div>
    {hubAllowed&&hubSlug&&<div className="qr-hub-permanent"><div className="qr-hub-image"><img src={`/api/hub-qr/${hubSlug}`} alt="QR page centrale"/></div><div className="qr-hub-copy"><span>PAGE CENTRALE DE CE CATALOGUE</span><strong>{hubUrl}</strong><small>Ce lien et ce QR sont créés avec le catalogue et restent identiques, même si vous modifiez le logo, les boutons, les couleurs, les liens ou le contenu.</small><div className="qr-canonical-actions"><button className="btn btn-ghost" onClick={()=>copy(hubUrl,'hub')}><Copy size={14}/>{copied==='hub'?'Copié':'Copier le lien'}</button><a className="btn btn-ghost" href={`/api/hub-qr/${hubSlug}?download=1`}><Download size={14}/>Télécharger le QR</a><a className="btn btn-ghost" href={hubUrl} target="_blank"><ExternalLink size={14}/>Ouvrir</a></div></div></div>}
  </div>,host);
}
