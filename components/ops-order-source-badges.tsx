'use client';

import {useEffect} from 'react';

const LABELS:Record<string,string>={catalog:'Catalogue / accès direct',qr:'QR code',pos:'Caisse',shared_link:'Lien partagé',hub:'Page centrale',whatsapp:'WhatsApp',phone:'Téléphone',manual:'Saisie manuelle',other:'Autre'};

export function OpsOrderSourceBadges(){
  useEffect(()=>{
    if(!window.location.pathname.startsWith('/ops/'))return;
    const accessKey=decodeURIComponent(window.location.pathname.split('/')[2]||'');
    const storageKey=`qatalink_ops_pin_${accessKey}`;
    let stopped=false;let timer:any;let first:any;
    async function refresh(){
      const pin=sessionStorage.getItem(storageKey)||'';if(!pin)return;
      try{
        const response=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action:'sources',limit:150}),cache:'no-store'});
        const data=await response.json();if(!response.ok||stopped)return;
        const map=new Map<string,string>((data.sources||[]).map((row:any)=>[String(row.order_number),String(row.source||'catalog')]));
        document.querySelectorAll<HTMLElement>('.ops-order').forEach(card=>{
          const num=card.querySelector('header b')?.textContent?.trim()||'';const source=map.get(num);if(!source)return;
          let meta=card.querySelector<HTMLElement>('.ops-order-meta');if(!meta){meta=document.createElement('div');meta.className='ops-order-meta';card.querySelector('header')?.insertAdjacentElement('afterend',meta)}
          let badge=meta.querySelector<HTMLElement>('.ops-source-badge');if(!badge){badge=document.createElement('span');badge.className='ops-source-badge';meta.prepend(badge)}
          const next=`Source : ${LABELS[source]||source}`;if(badge.textContent!==next)badge.textContent=next;badge.dataset.source=source;
        });
      }catch{}
    }
    first=setTimeout(refresh,700);timer=setInterval(refresh,5000);
    return()=>{stopped=true;clearTimeout(first);clearInterval(timer)};
  },[]);
  return null;
}
