'use client';

import {useEffect} from 'react';

export function DashboardHubCatalogSync(){
  useEffect(()=>{
    const sync=()=>{
      const requested=new URLSearchParams(window.location.search).get('catalog')||'';
      if(!requested)return;
      const panel=document.querySelector<HTMLElement>('.vm-panel');
      if(!panel||panel.dataset.catalogSynced===requested)return;
      const cards=Array.from(panel.querySelectorAll<HTMLElement>('.vm-card'));
      const card=cards.find(node=>node.querySelector('h3')?.textContent?.trim()==='Page centrale de quel catalogue ?');
      const select=card?.querySelector<HTMLSelectElement>('select');
      if(!select||!Array.from(select.options).some(option=>option.value===requested))return;
      if(select.value!==requested){
        const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')?.set;
        setter?.call(select,requested);
        select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      panel.dataset.catalogSynced=requested;
    };
    sync();
    const observer=new MutationObserver(()=>queueMicrotask(sync));
    observer.observe(document.body,{childList:true,subtree:true});
    const onHistory=()=>setTimeout(sync,0);
    window.addEventListener('popstate',onHistory);
    return()=>{observer.disconnect();window.removeEventListener('popstate',onHistory)};
  },[]);
  return null;
}
