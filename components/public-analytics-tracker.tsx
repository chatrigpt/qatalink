'use client';

import {useEffect} from 'react';

function getSessionId(){
  const key='qatalink_public_session';
  let id=sessionStorage.getItem(key);
  if(!id){id=(crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`);sessionStorage.setItem(key,id)}
  return id;
}

export function PublicAnalyticsTracker(){
  useEffect(()=>{
    const match=location.pathname.match(/^\/c\/([^/?#]+)/);
    if(!match)return;
    const slug=decodeURIComponent(match[1]);
    const sessionId=getSessionId();
    const seen=new Set<string>();
    const send=(event_type:string,item_name?:string,metadata:any={})=>{
      fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({slug,event_type,item_name:item_name||null,session_id:sessionId,metadata})}).catch(()=>{});
    };
    send('catalog_view');

    let observer:IntersectionObserver|null=null;
    const observeItems=()=>{
      observer?.disconnect();
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting||entry.intersectionRatio<.45)continue;
          const el=entry.target as HTMLElement;
          const name=el.querySelector('h4')?.textContent?.trim();
          if(name&&!seen.has(name)){seen.add(name);send('item_view',name)}
        }
      },{threshold:[.45]});
      document.querySelectorAll('.public-v2-item').forEach(el=>observer?.observe(el));
    };
    const findItem=(target:Element|null)=>target?.closest('.public-v2-item')?.querySelector('h4')?.textContent?.trim()||undefined;
    const click=(e:MouseEvent)=>{
      const target=e.target as Element|null;if(!target)return;
      const qty=target.closest('.public-v2-qty');
      const button=target.closest('button');
      if(qty&&button){const buttons=[...qty.querySelectorAll('button')];if(buttons[buttons.length-1]===button)send('add_to_cart',findItem(target));}
      if(target.closest('.public-v2-cart-count'))send('cart_open');
      if(target.closest('.public-v2-whatsapp button')||target.closest('.public-v2-cart footer button'))send('checkout_start');
      const flowButton=target.closest('.public-v2-flow-modes button');
      if(flowButton)send('flow_mode_select',undefined,{label:flowButton.textContent?.trim()||''});
      const wa=target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]');
      if(wa)send('whatsapp_click');
    };
    observeItems();document.addEventListener('click',click,true);
    const mo=new MutationObserver(()=>observeItems());
    mo.observe(document.body,{childList:true,subtree:true});
    return()=>{document.removeEventListener('click',click,true);observer?.disconnect();mo.disconnect()};
  },[]);
  return null;
}
