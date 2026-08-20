'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle,CheckCircle2,Warehouse} from 'lucide-react';

type StockAlert={id:string;name:string;unit:string;quantity:number;threshold:number;severity:'low'|'critical'};
type Payload={enabled:boolean;count:number;items:StockAlert[]};

function accessKeyFromPath(){
  if(typeof window==='undefined')return'';
  const match=window.location.pathname.match(/^\/ops\/([^/?#]+)/);
  return decodeURIComponent(match?.[1]||'');
}

function formatQuantity(value:number,unit:string){
  const formatted=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3}).format(Number(value||0));
  return `${formatted} ${unit||''}`.trim();
}

export function OpsStockAlerts(){
  const accessKey=useMemo(()=>accessKeyFromPath(),[]);
  const storageKey=useMemo(()=>accessKey?`qatalink_ops_pin_${accessKey}`:'',[accessKey]);
  const [host,setHost]=useState<Element|null>(null);
  const [payload,setPayload]=useState<Payload|null>(null);

  useEffect(()=>{
    if(!accessKey)return;
    let stopped=false;
    let timer:ReturnType<typeof setInterval>|null=null;
    let observer:MutationObserver|null=null;

    const resolveHost=()=>{
      const metrics=document.querySelector('.ops-metrics');
      if(!metrics){setHost(null);return}
      let target=document.querySelector('.ops-stock-alert-host');
      if(!target){
        target=document.createElement('div');
        target.className='ops-stock-alert-host';
        metrics.insertAdjacentElement('afterend',target);
      }
      setHost(target);
    };

    const load=async()=>{
      let pin='';
      try{pin=sessionStorage.getItem(storageKey)||''}catch{}
      if(!pin||pin.length<4)return;
      try{
        const response=await fetch('/api/ops/stock',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({access_key:accessKey,pin,limit:6}),
          cache:'no-store',
        });
        const data=await response.json().catch(()=>null);
        if(!stopped&&response.ok&&data)setPayload({enabled:!!data.enabled,count:Number(data.count||0),items:Array.isArray(data.items)?data.items:[]});
      }catch{}
    };

    resolveHost();
    void load();
    timer=setInterval(()=>void load(),10000);
    observer=new MutationObserver(resolveHost);
    observer.observe(document.body,{childList:true,subtree:true});

    return()=>{stopped=true;if(timer)clearInterval(timer);observer?.disconnect()};
  },[accessKey,storageKey]);

  if(!host||!payload?.enabled)return null;

  return createPortal(<section className={`ops-stock-alerts ${payload.count?'has-alerts':'is-ok'}`}>
    <div className="ops-stock-alerts-head">
      <div className="ops-stock-alerts-title"><span className="ops-stock-alerts-icon"><Warehouse size={18}/></span><div><b>Alertes stock</b><small>Suivi automatique des niveaux faibles</small></div></div>
      <span className={`ops-stock-alert-count ${payload.count?'warning':'ok'}`}>{payload.count?`${payload.count} à surveiller`:'Stock sous contrôle'}</span>
    </div>
    {payload.count===0?<div className="ops-stock-ok"><CheckCircle2 size={18}/><span>Aucun produit n’est actuellement sous son seuil d’alerte.</span></div>:<div className="ops-stock-alert-list">
      {payload.items.map(item=><article key={item.id} className={`ops-stock-alert-item ${item.severity}`}>
        <span className="ops-stock-product-icon"><AlertTriangle size={16}/></span>
        <div><b>{item.name}</b><small>Stock : {formatQuantity(item.quantity,item.unit)} · Seuil : {formatQuantity(item.threshold,item.unit)}</small></div>
        <em>{item.severity==='critical'?'Alerte':'Faible'}</em>
      </article>)}
    </div>}
  </section>,host);
}
