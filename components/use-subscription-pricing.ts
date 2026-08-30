'use client';

import {useEffect,useMemo,useState} from 'react';

type PricingCurrency='XOF'|'USD';
type Rates={xof_per_eur:number;usd_per_eur:number};

// UEMOA (XOF) + CEMAC (XAF): outside these countries, subscription prices are displayed in USD.
const CFA_COUNTRIES=new Set(['BJ','BF','CI','GW','ML','NE','SN','TG','CM','CF','TD','CG','GQ','GA']);
const FALLBACK_RATES:Rates={xof_per_eur:655.957,usd_per_eur:1.16};

async function fetchJson<T>(url:string,fallback:T):Promise<T>{
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return fallback;return await r.json() as T}catch{return fallback}
}

export function useSubscriptionPricing(){
  const [currency,setCurrency]=useState<PricingCurrency>('XOF');
  const [rates,setRates]=useState<Rates>(FALLBACK_RATES);

  useEffect(()=>{
    let alive=true;
    Promise.all([
      fetchJson<{country_code?:string|null}>('/api/geo',{}),
      fetchJson<Partial<Rates>>('/api/currency/rates',{})
    ]).then(([geo,fx])=>{
      if(!alive)return;
      const country=String(geo?.country_code||'').toUpperCase();
      if(country&&!CFA_COUNTRIES.has(country))setCurrency('USD');
      else setCurrency('XOF');
      const xof=Number(fx?.xof_per_eur),usd=Number(fx?.usd_per_eur);
      if(Number.isFinite(xof)&&xof>0&&Number.isFinite(usd)&&usd>0)setRates({xof_per_eur:xof,usd_per_eur:usd});
    });
    return()=>{alive=false};
  },[]);

  return useMemo(()=>{
    const toUsd=(xof:number)=>xof/rates.xof_per_eur*rates.usd_per_eur;
    const format=(xof:number)=>currency==='USD'
      ?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.round(toUsd(xof)))
      :new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Math.round(xof)).replace(/\u202f/g,' ')+' F';
    return {currency,format,isUsd:currency==='USD'};
  },[currency,rates]);
}
