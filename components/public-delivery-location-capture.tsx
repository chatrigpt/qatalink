'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

type GpsPoint={lat:number;lng:number;accuracy:number;capturedAt:string};

function deliverySelected(){
  const active=document.querySelector<HTMLElement>('.public-v2-flow-modes button.active');
  return !!active&&/livraison/i.test(active.textContent||'');
}

function findFieldValue(kind:'phone'|'address'){
  const labels=[...document.querySelectorAll<HTMLLabelElement>('.public-v2-flow-fields label')];
  const rx=kind==='phone'?/téléphone|telephone/i:/adresse/i;
  const label=labels.find(row=>rx.test(row.textContent||''));
  return label?.querySelector<HTMLInputElement|HTMLTextAreaElement>('input,textarea')?.value.trim()||'';
}

export function PublicDeliveryLocationCapture(){
  const [mounted,setMounted]=useState(false);
  const [deliveryActive,setDeliveryActive]=useState(false);
  const [point,setPoint]=useState<GpsPoint|null>(null);
  const [locating,setLocating]=useState(false);
  const [status,setStatus]=useState('Position GPS non enregistrée.');
  const [statusType,setStatusType]=useState<'idle'|'success'|'error'>('idle');

  useEffect(()=>{setMounted(true);return()=>setMounted(false)},[]);

  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    const sync=()=>setDeliveryActive(deliverySelected());
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',sync,true);
    return()=>{observer.disconnect();document.removeEventListener('click',sync,true)};
  },[]);

  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    const originalFetch=window.fetch.bind(window);
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(url.includes('/api/orders/public')&&init?.method?.toUpperCase()==='POST'&&typeof init.body==='string'){
        try{
          const body=JSON.parse(init.body);
          if(String(body?.flow_mode||'')==='delivery'){
            if(!body.flow_fields||typeof body.flow_fields!=='object')body.flow_fields={};
            if(point){
              body.flow_fields.gps_lat=String(point.lat);
              body.flow_fields.gps_lng=String(point.lng);
              body.flow_fields.gps_accuracy=String(point.accuracy);
              body.flow_fields.gps_captured_at=point.capturedAt;
            }
            init={...init,body:JSON.stringify(body)};
          }
        }catch{}
      }
      return originalFetch(input,init);
    }) as typeof window.fetch;
    return()=>{window.fetch=originalFetch};
  },[point]);

  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    const clickGuard=(event:MouseEvent)=>{
      if(!deliverySelected())return;
      const target=event.target;
      if(!(target instanceof Element))return;
      const submit=target.closest('.public-v2-flow > a');
      if(!submit)return;
      const phone=findFieldValue('phone');
      const address=findFieldValue('address');
      if(phone&&address&&point)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const missing=[!phone?'le numéro de téléphone':'',!address?'l’adresse':'',!point?'la position GPS':''].filter(Boolean).join(', ');
      alert(`Pour une livraison, renseignez ${missing}.`);
    };
    document.addEventListener('click',clickGuard,true);
    return()=>document.removeEventListener('click',clickGuard,true);
  },[point]);

  function locate(){
    if(!navigator.geolocation){setStatus('La géolocalisation n’est pas disponible sur cet appareil.');setStatusType('error');return}
    setLocating(true);setStatus('Localisation en cours…');setStatusType('idle');
    navigator.geolocation.getCurrentPosition(pos=>{
      setPoint({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,capturedAt:new Date().toISOString()});
      setStatus(`Position enregistrée · précision ≈ ${Math.round(pos.coords.accuracy)} m`);
      setStatusType('success');setLocating(false);
    },err=>{
      setStatus(err.code===1?'Autorisez la localisation précise pour continuer.':'Impossible de récupérer votre position. Activez le GPS et réessayez.');
      setStatusType('error');setLocating(false);
    },{enableHighAccuracy:true,maximumAge:0,timeout:18000});
  }

  if(!mounted||!deliveryActive)return null;
  return createPortal(
    <aside className="q-delivery-gps" data-q-delivery-gps="1" style={{position:'fixed',left:'50%',bottom:18,transform:'translateX(-50%)',zIndex:10000,width:'min(92vw,520px)',boxShadow:'0 18px 60px rgba(0,0,0,.18)'}}>
      <div className="q-delivery-gps-head"><span>📍</span><div><b>Position exacte de livraison *</b><small>Ajoutez votre position GPS pour que le livreur puisse vous trouver et calculer la distance restante.</small></div></div>
      <button type="button" className="q-delivery-gps-button" disabled={locating} onClick={locate}>{locating?'Localisation en cours…':point?'Actualiser ma position':'Utiliser ma position GPS'}</button>
      <div className={`q-delivery-gps-status ${statusType==='success'?'success':statusType==='error'?'error':''}`}>{status}</div>
    </aside>,
    document.body
  );
}
