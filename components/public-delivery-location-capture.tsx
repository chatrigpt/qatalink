'use client';

import {useEffect} from 'react';

type GpsPoint={lat:number;lng:number;accuracy:number;capturedAt:string};

function deliverySelected(){
  const active=document.querySelector<HTMLElement>('.public-v2-flow-modes button.active');
  return !!active&&/livraison/i.test(active.textContent||'');
}

function findFieldLabel(kind:'phone'|'address'){
  const labels=[...document.querySelectorAll<HTMLLabelElement>('.public-v2-flow-fields label')];
  const rx=kind==='phone'?/téléphone|telephone/i:/adresse/i;
  return labels.find(label=>rx.test(label.textContent||''))||null;
}

export function PublicDeliveryLocationCapture(){
  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    let point:GpsPoint|null=null;
    const originalFetch=window.fetch.bind(window);
    let observer:MutationObserver|null=null;

    function markRequired(label:HTMLLabelElement|null){
      if(!label)return;
      const field=label.querySelector<HTMLInputElement>('input,textarea');
      if(field)field.required=true;
      const firstText=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      if(firstText?.textContent)firstText.textContent=firstText.textContent.replace(/\s*[\[(]?(facultatif|optionnel)[\])]?/ig,'').trim()+' ';
      if(!label.querySelector('.q-delivery-required')){
        const star=document.createElement('span');star.className='q-delivery-required';star.textContent='*';
        if(firstText)firstText.after(star);else label.prepend(star);
      }
    }

    function ensureGpsUi(){
      if(!deliverySelected())return;
      const fields=document.querySelector<HTMLElement>('.public-v2-flow-fields');
      if(!fields)return;
      const phoneLabel=findFieldLabel('phone');const addressLabel=findFieldLabel('address');
      markRequired(phoneLabel);markRequired(addressLabel);
      if(fields.querySelector('[data-q-delivery-gps]')){updateSubmit();return}
      const box=document.createElement('section');box.className='q-delivery-gps';box.setAttribute('data-q-delivery-gps','1');
      box.innerHTML='<div class="q-delivery-gps-head"><span>📍</span><div><b>Position exacte de livraison *</b><small>Utilisez le GPS du téléphone pour permettre au livreur de vous trouver et calculer la distance restante.</small></div></div><button type="button" class="q-delivery-gps-button">Utiliser ma position GPS</button><div class="q-delivery-gps-status">Position GPS non enregistrée.</div>';
      const button=box.querySelector<HTMLButtonElement>('.q-delivery-gps-button')!;const status=box.querySelector<HTMLElement>('.q-delivery-gps-status')!;
      button.onclick=()=>{
        if(!navigator.geolocation){status.textContent='La géolocalisation n’est pas disponible sur cet appareil.';status.classList.add('error');return}
        button.disabled=true;button.textContent='Localisation en cours…';status.classList.remove('error','success');
        navigator.geolocation.getCurrentPosition(pos=>{
          point={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,capturedAt:new Date().toISOString()};
          status.textContent=`Position enregistrée · précision ≈ ${Math.round(pos.coords.accuracy)} m`;status.classList.add('success');button.disabled=false;button.textContent='Actualiser ma position';updateSubmit();
        },err=>{status.textContent=err.code===1?'Autorisez la localisation précise pour continuer.':'Impossible de récupérer votre position. Activez le GPS et réessayez.';status.classList.add('error');button.disabled=false;button.textContent='Réessayer';updateSubmit()},{enableHighAccuracy:true,maximumAge:0,timeout:18000});
      };
      if(addressLabel)addressLabel.insertAdjacentElement('afterend',box);else fields.appendChild(box);
      fields.querySelectorAll('input,textarea').forEach(el=>el.addEventListener('input',updateSubmit));updateSubmit();
    }

    function updateSubmit(){
      const flow=document.querySelector<HTMLElement>('.public-v2-flow');if(!flow)return;
      const submit=flow.querySelector<HTMLAnchorElement>(':scope > a');if(!submit||!deliverySelected())return;
      const phone=findFieldLabel('phone')?.querySelector<HTMLInputElement>('input')?.value.trim()||'';const address=findFieldLabel('address')?.querySelector<HTMLInputElement>('input,textarea')?.value.trim()||'';const ok=!!phone&&!!address&&!!point;
      submit.classList.toggle('q-delivery-incomplete',!ok);submit.setAttribute('aria-disabled',ok?'false':'true');submit.title=ok?'':'Renseignez le téléphone, l’adresse et votre position GPS.';
    }

    const clickGuard=(event:MouseEvent)=>{
      if(!deliverySelected())return;const target=event.target as Element|null;const submit=target?.closest('.public-v2-flow > a');if(!submit)return;
      const phone=findFieldLabel('phone')?.querySelector<HTMLInputElement>('input')?.value.trim()||'';const address=findFieldLabel('address')?.querySelector<HTMLInputElement>('input,textarea')?.value.trim()||'';
      if(phone&&address&&point)return;event.preventDefault();event.stopImmediatePropagation();const missing=[!phone?'le numéro de téléphone':'',!address?'l’adresse':'',!point?'la position GPS':''].filter(Boolean).join(', ');alert(`Pour une livraison, renseignez ${missing}.`);
    };

    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(url.includes('/api/orders/public')&&init?.method?.toUpperCase()==='POST'&&typeof init.body==='string'){
        try{const body=JSON.parse(init.body);if(String(body?.flow_mode||'')==='delivery'){if(!body.flow_fields||typeof body.flow_fields!=='object')body.flow_fields={};if(point){body.flow_fields.gps_lat=String(point.lat);body.flow_fields.gps_lng=String(point.lng);body.flow_fields.gps_accuracy=String(point.accuracy);body.flow_fields.gps_captured_at=point.capturedAt}init={...init,body:JSON.stringify(body)}}}catch{}
      }
      return originalFetch(input,init);
    }) as typeof window.fetch;

    const refresh=()=>{if(deliverySelected())ensureGpsUi()};observer=new MutationObserver(refresh);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.addEventListener('click',clickGuard,true);document.addEventListener('input',updateSubmit,true);refresh();
    return()=>{observer?.disconnect();document.removeEventListener('click',clickGuard,true);document.removeEventListener('input',updateSubmit,true);window.fetch=originalFetch};
  },[]);
  return null;
}
