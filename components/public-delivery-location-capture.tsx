'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {MapPin} from 'lucide-react';

type GpsPoint={lat:number;lng:number;accuracy:number;capturedAt:string};
type Anchor={left:number;top:number;width:number}|null;

function deliverySelected(){const active=document.querySelector<HTMLElement>('.public-v2-flow-modes button.active');return !!active&&/livraison/i.test(active.textContent||'')}
function findFieldInput(kind:'phone'|'address'){const labels=[...document.querySelectorAll<HTMLLabelElement>('.public-v2-flow-fields label')];const rx=kind==='phone'?/téléphone|telephone/i:/adresse/i;const label=labels.find(row=>rx.test(row.textContent||''));return label?.querySelector<HTMLInputElement|HTMLTextAreaElement>('input,textarea')||null}
function setReactInputValue(input:HTMLInputElement|HTMLTextAreaElement,value:string){const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(input,value);else input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}
function gpsMapsUrl(point:GpsPoint){return `https://maps.google.com/?q=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`}
function mergeAddressWithGps(current:string,point:GpsPoint){const clean=current.replace(/\s*[—|·]?\s*Position GPS exacte\s*:\s*https:\/\/maps\.google\.com\/\?q=[^\s]+/gi,'').replace(/^Position GPS exacte enregistrée$/i,'').trim();const gps=`Position GPS exacte : ${gpsMapsUrl(point)}`;return clean?`${clean} — ${gps}`:gps}
function withGpsInWhatsapp(url:string,point:GpsPoint){
  try{
    const parsed=new URL(url,location.origin);if(!/(^|\.)wa\.me$/i.test(parsed.hostname)&&!/(^|\.)whatsapp\.com$/i.test(parsed.hostname))return url;
    const text=parsed.searchParams.get('text')||'';const maps=gpsMapsUrl(point);if(text.includes(maps)||/Position GPS (exacte|client)/i.test(text)&&text.includes('maps.google.com'))return parsed.toString();
    parsed.searchParams.set('text',`${text}${text?'\n\n':''}📍 Position GPS client : ${maps}`);return parsed.toString();
  }catch{return url}
}

export function PublicDeliveryLocationCapture(){
  const [mounted,setMounted]=useState(false);const [deliveryActive,setDeliveryActive]=useState(false);const [point,setPoint]=useState<GpsPoint|null>(null);const [locating,setLocating]=useState(false);const [status,setStatus]=useState('');const [statusType,setStatusType]=useState<'idle'|'success'|'error'>('idle');const [anchor,setAnchor]=useState<Anchor>(null);
  useEffect(()=>{setMounted(true);return()=>setMounted(false)},[]);
  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;let frame=0;
    const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const active=deliverySelected();setDeliveryActive(active);document.body.classList.toggle('q-gps-inline-active',active);if(!active){setAnchor(null);return}const input=findFieldInput('address');if(!input){setAnchor(null);return}const r=input.getBoundingClientRect();setAnchor({left:r.left,top:r.bottom+6,width:r.width})})};
    sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.addEventListener('click',sync,true);document.addEventListener('scroll',sync,true);window.addEventListener('resize',sync);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('click',sync,true);document.removeEventListener('scroll',sync,true);window.removeEventListener('resize',sync);document.body.classList.remove('q-gps-inline-active')};
  },[]);
  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    const originalFetch=window.fetch.bind(window);const originalOpen=window.open;
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(url.includes('/api/orders/public')&&init?.method?.toUpperCase()==='POST'&&typeof init.body==='string'){
        try{const body=JSON.parse(init.body);if(String(body?.flow_mode||'')==='delivery'&&point){if(!body.flow_fields||typeof body.flow_fields!=='object')body.flow_fields={};body.flow_fields.gps_lat=String(point.lat);body.flow_fields.gps_lng=String(point.lng);body.flow_fields.gps_accuracy=String(point.accuracy);body.flow_fields.gps_captured_at=point.capturedAt;body.flow_fields.gps_maps_url=gpsMapsUrl(point);body.flow_fields.address=mergeAddressWithGps(String(body.flow_fields.address||''),point);init={...init,body:JSON.stringify(body)}}}catch{}
      }
      return originalFetch(input,init);
    }) as typeof window.fetch;
    window.open=(function(url?:string|URL,target?:string,features?:string){let next=url;if(point&&deliverySelected()&&typeof url==='string')next=withGpsInWhatsapp(url,point);return originalOpen.call(window,next as any,target,features)}) as typeof window.open;
    return()=>{window.fetch=originalFetch;window.open=originalOpen};
  },[point]);
  useEffect(()=>{
    if(!location.pathname.startsWith('/c/'))return;
    const clickGuard=(event:MouseEvent)=>{if(!deliverySelected())return;const target=event.target;if(!(target instanceof Element))return;const submit=target.closest('.public-v2-confirm-order');if(!submit)return;const phone=findFieldInput('phone')?.value.trim()||'';const address=findFieldInput('address')?.value.trim()||'';if(phone&&address)return;event.preventDefault();event.stopImmediatePropagation();if(!phone&&!address)alert('Pour une livraison, le numéro de téléphone et l’adresse sont obligatoires.');else if(!phone)alert('Pour une livraison, renseignez votre numéro de téléphone.');else alert('Pour une livraison, renseignez votre adresse ou utilisez votre position GPS exacte.')};
    document.addEventListener('click',clickGuard,true);return()=>document.removeEventListener('click',clickGuard,true);
  },[]);
  function locate(){
    if(!navigator.geolocation){setStatus('La géolocalisation n’est pas disponible sur cet appareil.');setStatusType('error');return}
    setLocating(true);setStatus('Localisation en cours…');setStatusType('idle');
    navigator.geolocation.getCurrentPosition(pos=>{const next={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,capturedAt:new Date().toISOString()};setPoint(next);const address=findFieldInput('address');if(address)setReactInputValue(address,mergeAddressWithGps(address.value,next));setStatus(`Position enregistrée · précision ≈ ${Math.round(pos.coords.accuracy)} m · le lien GPS sera transmis dans la commande et dans WhatsApp`);setStatusType('success');setLocating(false)},err=>{setStatus(err.code===1?'Autorisez la localisation si vous souhaitez utiliser cette option.':err.code===3?'Le GPS met trop de temps à répondre. Réessayez dans une zone plus dégagée.':'Impossible de récupérer votre position. Vous pouvez saisir l’adresse manuellement.');setStatusType('error');setLocating(false)},{enableHighAccuracy:true,maximumAge:0,timeout:18000});
  }
  if(!mounted||!deliveryActive||!anchor)return null;
  return createPortal(<><style>{`.q-gps-inline-active .public-v2-flow-fields label:has(input[placeholder="Adresse ou repère"]){margin-bottom:72px}`}</style><div className="q-delivery-gps-inline" style={{position:'fixed',left:anchor.left,top:anchor.top,width:anchor.width,zIndex:10001}}><button type="button" className="q-delivery-gps-button-inline" disabled={locating} onClick={locate}><MapPin size={16}/><span>{locating?'Localisation en cours…':point?'Actualiser ma position GPS':'Utiliser ma position GPS exacte'}</span></button>{status&&<small className={`q-delivery-gps-status-inline ${statusType}`}>{status}</small>}</div></>,document.body);
}
