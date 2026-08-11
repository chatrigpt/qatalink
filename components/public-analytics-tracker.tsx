'use client';

import {useEffect} from 'react';

function getSessionId(){
  const fallback=()=>`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try{
    const key='qatalink_public_session';
    let id=sessionStorage.getItem(key);
    if(!id){id=(globalThis.crypto?.randomUUID?.()||fallback());sessionStorage.setItem(key,id)}
    return id;
  }catch{return fallback()}
}

export function PublicAnalyticsTracker(){
  useEffect(()=>{
    try{
      const match=location.pathname.match(/^\/c\/([^/?#]+)/);if(!match)return;
      const slug=decodeURIComponent(match[1]);const sessionId=getSessionId();const seen=new Set<string>();
      const send=(event_type:string,item_name?:string,metadata:any={})=>{try{fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({slug,event_type,item_name:item_name||null,session_id:sessionId,metadata})}).catch(()=>{})}catch{}};
      send('catalog_view');
      let observer:IntersectionObserver|null=null;
      const observeItems=()=>{try{observer?.disconnect();if(typeof IntersectionObserver==='undefined')return;observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting||entry.intersectionRatio<.45)continue;const el=entry.target as HTMLElement;const name=el.querySelector('h4')?.textContent?.trim();if(name&&!seen.has(name)){seen.add(name);send('item_view',name)}}},{threshold:[.45]});document.querySelectorAll('.public-v2-item').forEach(el=>observer?.observe(el))}catch{}};
      const findItem=(target:Element|null)=>target?.closest('.public-v2-item')?.querySelector('h4')?.textContent?.trim()||undefined;
      const click=(e:MouseEvent)=>{try{const target=e.target as Element|null;if(!target)return;const qty=target.closest('.public-v2-qty');const button=target.closest('button');if(qty&&button){const buttons=[...qty.querySelectorAll('button')];if(buttons[buttons.length-1]===button)send('add_to_cart',findItem(target))}if(target.closest('.public-v2-cart-count'))send('cart_open');if(target.closest('.public-v2-whatsapp button')||target.closest('.public-v2-cart footer button'))send('checkout_start');const flowButton=target.closest('.public-v2-flow-modes button');if(flowButton)send('flow_mode_select',undefined,{label:flowButton.textContent?.trim()||''});const wa=target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]');if(wa)send('whatsapp_click')}catch{}};
      observeItems();document.addEventListener('click',click,true);
      let mo:MutationObserver|null=null;try{if(typeof MutationObserver!=='undefined'){mo=new MutationObserver(()=>observeItems());mo.observe(document.body,{childList:true,subtree:true})}}catch{}
      return()=>{document.removeEventListener('click',click,true);observer?.disconnect();mo?.disconnect()};
    }catch{return}
  },[]);
  return null;
}
