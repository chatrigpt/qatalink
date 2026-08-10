'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';

type Currency='XOF'|'EUR'|'USD';
type Rates={xof_per_eur:number;usd_per_eur:number};
type GeoData={country_code?:string|null};
type RateData={xof_per_eur?:number|string|null;usd_per_eur?:number|string|null};

const XOF_COUNTRIES=new Set(['CI','SN','ML','BF','BJ','TG','NE','GW']);
const EUR_COUNTRIES=new Set(['AT','BE','HR','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES','AD','MC','SM','VA','ME','XK']);
const USD_COUNTRIES=new Set(['US','EC','SV','PA','TL','FM','MH','PW']);

function autoCurrency(country:string):Currency{
  const code=country.toUpperCase();
  if(XOF_COUNTRIES.has(code))return 'XOF';
  if(EUR_COUNTRIES.has(code))return 'EUR';
  if(USD_COUNTRIES.has(code))return 'USD';
  return 'USD';
}
function toEur(value:number,base:Currency,r:Rates){if(base==='EUR')return value;if(base==='XOF')return value/r.xof_per_eur;return value/r.usd_per_eur}
function fromEur(value:number,target:Currency,r:Rates){if(target==='EUR')return value;if(target==='XOF')return value*r.xof_per_eur;return value*r.usd_per_eur}
function fmt(value:number,currency:Currency){
  if(currency==='XOF')return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Math.round(value)).replace(/\u202f/g,' ')} F CFA`;
  if(currency==='EUR')return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value).replace(/\u202f/g,' ');
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
}
function parseNumber(raw:string){return Number(raw.replace(/[\s\u00A0\u202F]/g,'').replace(',','.'))}

async function fetchJson<T>(url:string,fallback:T,init?:RequestInit):Promise<T>{
  try{
    const response=await fetch(url,init);
    if(!response.ok)return fallback;
    return await response.json() as T;
  }catch{
    return fallback;
  }
}

export function PublicCurrencyLocalizer({baseCurrency='XOF'}:{baseCurrency?:string}){
  const base=(['XOF','EUR','USD'].includes(baseCurrency)?baseCurrency:'XOF') as Currency;
  const [currency,setCurrency]=useState<Currency>(base);
  const [rates,setRates]=useState<Rates|null>(null);
  const [host,setHost]=useState<Element|null>(null);
  const originals=useMemo(()=>new WeakMap<Text,string>(),[]);
  const hrefs=useMemo(()=>new WeakMap<HTMLAnchorElement,string>(),[]);

  useEffect(()=>{
    setHost(document.querySelector('.public-v2-hero')||document.querySelector('.public-v2'));
    Promise.all([
      fetchJson<GeoData>('/api/geo',{}, {cache:'no-store'}),
      fetchJson<RateData|null>('/api/currency/rates',null)
    ]).then(([geo,fx])=>{
      const xof=Number(fx?.xof_per_eur);
      const usd=Number(fx?.usd_per_eur);
      if(Number.isFinite(xof)&&xof>0&&Number.isFinite(usd)&&usd>0)setRates({xof_per_eur:xof,usd_per_eur:usd});
      const stored=localStorage.getItem('qatalink_public_currency') as Currency|null;
      if(stored&&['XOF','EUR','USD'].includes(stored))setCurrency(stored);
      else if(geo.country_code)setCurrency(autoCurrency(String(geo.country_code)));
    });
  },[]);

  useEffect(()=>{localStorage.setItem('qatalink_public_currency',currency)},[currency]);

  useEffect(()=>{
    if(!rates)return;
    const rxByBase:Record<Currency,RegExp>={
      XOF:/(\d[\d\s\u00A0\u202F]*(?:[.,]\d+)?)\s*(?:F\s*CFA|F)(?![A-Za-z])/g,
      EUR:/(\d[\d\s\u00A0\u202F]*(?:[.,]\d+)?)\s*€/g,
      USD:/\$\s*(\d[\d,]*(?:\.\d+)?)/g
    };
    const convertText=(source:string)=>source.replace(rxByBase[base],(_m,n)=>{
      const value=parseNumber(String(n));if(!Number.isFinite(value))return _m;
      return fmt(fromEur(toEur(value,base,rates),currency),currency);
    });
    const walk=(root:Node)=>{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node=walker.nextNode() as Text|null;
      while(node){
        const parent=node.parentElement;
        if(parent&&!parent.closest('.currency-switcher')&&!['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)){
          if(!originals.has(node))originals.set(node,node.nodeValue||'');
          const original=originals.get(node)||'';
          const next=convertText(original);
          if(node.nodeValue!==next)node.nodeValue=next;
        }
        node=walker.nextNode() as Text|null;
      }
      document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"],a[href*="api.whatsapp.com"]').forEach(a=>{
        if(!hrefs.has(a))hrefs.set(a,a.href);
        const original=hrefs.get(a)||a.href;
        try{
          const u=new URL(original);const msg=u.searchParams.get('text');
          if(msg)u.searchParams.set('text',convertText(msg));a.href=u.toString();
        }catch{}
      });
    };
    const root=document.querySelector('.public-v2');if(!root)return;
    walk(root);
    const mo=new MutationObserver(mutations=>{for(const m of mutations)m.addedNodes.forEach(n=>walk(n));walk(root)});
    mo.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href']});
    return()=>mo.disconnect();
  },[currency,rates,base,originals,hrefs]);

  if(!host)return null;
  return createPortal(<div className="currency-switcher" aria-label="Choisir la monnaie">
    {(['XOF','EUR','USD'] as Currency[]).map(c=><button key={c} className={currency===c?'active':''} onClick={()=>setCurrency(c)}>{c==='XOF'?'F CFA':c}</button>)}
  </div>,host);
}
