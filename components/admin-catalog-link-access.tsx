'use client';

import {useEffect} from 'react';

export function AdminCatalogLinkAccess(){
 useEffect(()=>{
  if(location.pathname!=='/admin')return;
  const enhance=()=>{
   document.querySelectorAll<HTMLAnchorElement>('.admin-catalog-links .admin-catalog-link').forEach(link=>{
    const url=link.href;
    link.dataset.publicUrl=url.replace(/^https?:\/\//,'');
    link.title=`Ouvrir ${url}`;
    const next=link.nextElementSibling as HTMLElement|null;
    if(next?.classList.contains('q-admin-copy-link'))return;
    const copy=document.createElement('button');copy.type='button';copy.className='q-admin-copy-link';copy.textContent='Copier le lien';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);copy.textContent='Lien copié ✓';setTimeout(()=>copy.textContent='Copier le lien',1300)}catch{window.prompt('Copiez ce lien',url)}};link.insertAdjacentElement('afterend',copy);
   });
  };
  enhance();const observer=new MutationObserver(()=>requestAnimationFrame(enhance));observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
 },[]);
 return <style jsx global>{`
  .admin-catalog-links{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:7px 8px!important;min-width:310px}
  .admin-catalog-link{grid-column:1/2;min-height:50px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:3px!important;padding:9px 12px!important;border-radius:13px!important;background:var(--brand-soft,#fff0f3)!important;border:1px solid color-mix(in srgb,var(--brand-primary,#d3163c) 22%,var(--border-default,#e8e8ec))!important;color:var(--brand-primary,#d3163c)!important;text-decoration:none!important;font-weight:850!important;box-sizing:border-box}
  .admin-catalog-link::after{content:attr(data-public-url);display:block;max-width:270px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary,#686c75);font-size:10px;font-weight:650}
  .q-admin-copy-link{grid-column:2/3;min-width:94px;border:1px solid var(--border-default,#e8e8ec);border-radius:12px;background:var(--bg-surface,#fff);color:var(--text-primary,#17181b);font:800 11px/1 var(--font-jakarta),sans-serif;padding:0 11px;cursor:pointer}
  .admin-catalog-link:hover{border-color:var(--brand-primary,#d3163c)!important;transform:translateY(-1px)}
  @media(max-width:760px){.admin-catalog-links{min-width:260px;grid-template-columns:1fr}.admin-catalog-link,.q-admin-copy-link{grid-column:1!important}.q-admin-copy-link{min-height:40px}.admin-catalog-link::after{max-width:220px}}
 `}</style>
}
