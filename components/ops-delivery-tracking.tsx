'use client';

import {useEffect,useState} from 'react';

function copy(value:string){return navigator.clipboard?.writeText(value).catch(()=>{})}

export function OpsDeliveryTracking(){
  const [modal,setModal]=useState<{order:string;driver:string;tracking:string}|null>(null);
  useEffect(()=>{
    if(!location.pathname.startsWith('/ops/'))return;const accessKey=decodeURIComponent(location.pathname.split('/')[2]||'');const storageKey=`qatalink_ops_pin_${accessKey}`;let stopped=false;let timer:any;let observer:MutationObserver|null=null;
    async function refresh(){
      const pin=sessionStorage.getItem(storageKey)||'';if(!pin)return;
      try{const r=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action:'list',limit:150}),cache:'no-store'});const data=await r.json();if(!r.ok||stopped)return;const byNumber=new Map<string,any>((data.orders||[]).map((o:any)=>[String(o.order_number),o]));
        document.querySelectorAll<HTMLElement>('.ops-order').forEach(card=>{
          const number=card.querySelector('header b')?.textContent?.trim()||'';const order=byNumber.get(number);if(!order)return;
          card.classList.toggle('status-out_for_delivery',order.status==='out_for_delivery');
          if(order.status==='out_for_delivery'&&!order.bill_id){const badge=card.querySelector<HTMLElement>('header strong');if(badge)badge.textContent='En livraison'}
          const select=card.querySelector<HTMLSelectElement>('footer select');if(select&&!select.querySelector('option[value="out_for_delivery"]')&&order.flow_mode==='delivery'){const opt=document.createElement('option');opt.value='out_for_delivery';opt.textContent='En livraison';select.insertBefore(opt,select.querySelector('option[value="completed"]'));if(order.status==='out_for_delivery')select.value='out_for_delivery'}
          if(order.flow_mode!=='delivery'||['completed','cancelled'].includes(String(order.status||''))){card.querySelector('[data-delivery-start]')?.remove();return}
          const footer=card.querySelector<HTMLElement>('footer');if(!footer||footer.querySelector('[data-delivery-start]'))return;const btn=document.createElement('button');btn.type='button';btn.className='ops-delivery-button';btn.setAttribute('data-delivery-start','1');btn.innerHTML='<span aria-hidden="true">→</span> <span>Démarrer livraison</span>';btn.onclick=async()=>{const label=window.prompt('Nom ou repère du livreur (facultatif) :','')??'';try{btn.setAttribute('disabled','true');btn.innerHTML='<span aria-hidden="true">→</span> <span>Préparation…</span>';const res=await fetch('/api/ops/delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action:'start',order_id:order.id,driver_label:label}),cache:'no-store'});const j=await res.json();if(!res.ok)throw new Error(j?.error||'DELIVERY_FAILED');setModal({order:number,driver:j.driver_url,tracking:j.tracking_url});btn.innerHTML='<span aria-hidden="true">→</span> <span>Liens de suivi</span>';btn.removeAttribute('disabled')}catch(e:any){btn.innerHTML='<span aria-hidden="true">→</span> <span>Démarrer livraison</span>';btn.removeAttribute('disabled');const msg=String(e?.message||'Impossible de démarrer le suivi.');alert(msg.includes('BUSINESS_PLAN_REQUIRED')?'Le suivi GPS des livraisons est réservé à Business.':msg.includes('DELIVERY_ALREADY_FINISHED')?'Cette livraison est déjà terminée et ne peut pas être redémarrée.':msg)}};footer.appendChild(btn);
        });
      }catch{}
    }
    void refresh();timer=setInterval(refresh,5000);observer=new MutationObserver(()=>void refresh());observer.observe(document.body,{subtree:true,childList:true});return()=>{stopped=true;clearInterval(timer);observer?.disconnect()};
  },[]);
  if(!modal)return null;
  return <div className="ops-delivery-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setModal(null)}}><section className="ops-delivery-modal"><button className="ops-delivery-close" onClick={()=>setModal(null)}>×</button><span className="ops-delivery-kicker">BUSINESS · LIVRAISON</span><h2>{modal.order}</h2><p>Envoyez le premier lien au livreur. Le second est celui que le client utilise pour suivre sa commande et voir le GPS lorsqu’elle est en livraison.</p><div className="ops-delivery-link"><b>Lien livreur</b><code>{modal.driver}</code><div><button onClick={()=>copy(modal.driver)}>Copier</button><a href={modal.driver} target="_blank" rel="noreferrer">Ouvrir</a></div></div><div className="ops-delivery-link customer"><b>Lien client</b><code>{modal.tracking}</code><div><button onClick={()=>copy(modal.tracking)}>Copier</button><a href={modal.tracking} target="_blank" rel="noreferrer">Ouvrir</a></div></div><small>Le livreur doit autoriser la géolocalisation précise et garder la page ouverte pendant le trajet. Le client ne voit une position « en direct » que si Qatalink reçoit un signal récent.</small></section></div>;
}
