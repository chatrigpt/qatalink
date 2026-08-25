'use client';

import {useEffect} from 'react';

export function PublicDeliveryTrackingHandoff(){
  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    const original=window.fetch.bind(window);let lastUrl='';
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const response=await original(input,init);const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(url.includes('/api/orders/public')){response.clone().json().then((j:any)=>{const tracking=String(j?.order?.tracking_url||'');if(tracking){lastUrl=tracking;try{sessionStorage.setItem('qatalink_last_delivery_tracking',tracking)}catch{}queueMicrotask(inject)}}).catch(()=>{})}return response;
    }) as typeof window.fetch;
    function inject(){const tracking=lastUrl||(()=>{try{return sessionStorage.getItem('qatalink_last_delivery_tracking')||''}catch{return''}})();if(!tracking)return;document.querySelectorAll<HTMLElement>('.public-v2-order-success').forEach(host=>{if(host.querySelector('[data-q-delivery-track]'))return;const a=document.createElement('a');a.href=tracking;a.target='_blank';a.rel='noreferrer';a.setAttribute('data-q-delivery-track','1');a.className='public-delivery-track-cta';a.innerHTML='<span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span><div><b>Suivre ma livraison</b><small>Voir les étapes et la position du livreur en direct</small></div><strong>→</strong>';const firstAction=host.querySelector('a,button');if(firstAction)host.insertBefore(a,firstAction);else host.appendChild(a)})}
    const observer=new MutationObserver(inject);observer.observe(document.body,{subtree:true,childList:true});inject();return()=>{observer.disconnect();window.fetch=original};
  },[]);
  return null;
}
