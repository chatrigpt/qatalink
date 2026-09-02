'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ExternalLink,LayoutTemplate} from 'lucide-react';

export function CatalogHubShortcut(){
 const [host,setHost]=useState<Element|null>(null);
 useEffect(()=>{const sync=()=>{const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim();setHost(title==='Vos catalogues'?document.querySelector('.dash-v3-main .dash-section'):null)};sync();const o=new MutationObserver(sync);o.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>o.disconnect()},[]);
 if(!host)return null;
 function openEditor(){const p=new URLSearchParams(location.search);p.set('tab','qr');p.set('tool','hub');history.replaceState({},'',`/dashboard?${p.toString()}`);const qr=Array.from(document.querySelectorAll<HTMLButtonElement>('.dash-v3-nav button,.dash-v3-mobile-tabs button')).find(b=>(b.textContent||'').includes('QR & partage'));qr?.click();window.setTimeout(()=>document.querySelector('.q-free-hub')?.scrollIntoView({behavior:'smooth',block:'start'}),500)}
 return createPortal(<section className="dash-card q-catalog-hub-shortcut"><div><span className="eyebrow">PAGE CENTRALE</span><h3>Modifier la page centrale de ce catalogue</h3><p>Retrouvez son identité, ses liens, ses boutons et son apparence sans chercher dans les réglages.</p></div><button className="btn btn-ghost" onClick={openEditor}><LayoutTemplate size={15}/>Modifier la page centrale <ExternalLink size={14}/></button><style jsx>{`.q-catalog-hub-shortcut{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:16px}.q-catalog-hub-shortcut h3{margin:3px 0 5px}.q-catalog-hub-shortcut p{margin:0;color:var(--muted,#777)}@media(max-width:760px){.q-catalog-hub-shortcut{align-items:stretch;flex-direction:column}.q-catalog-hub-shortcut button{width:100%;min-width:0}}`}</style></section>,host)}
