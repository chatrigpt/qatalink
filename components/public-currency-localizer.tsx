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

function toEur(value:number,base:Currency,rates:Rates):number{
  if(base==='EUR')return value;
  if(base==='XOF')return value/rates.xof_per_eur;
  return value/rates.usd_per_eur;
}

function fromEur(value:number,target:Currency,rates:Rates):number{
  if(target==='EUR')return value;
  if(target==='XOF')return value*rates.xof_per_eur;
  return value*rates.usd_per_eur;
}

function formatCurrency(value:number,currency:Currency):string{
  if(currency==='XOF'){
    return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Math.round(value)).replace(/\u202f/g,' ')} F CFA`;
  }
  if(currency==='EUR'){
    return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value).replace(/\u202f/g,' ');
  }
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
}

function convertAmount(value:number,base:Currency,target:Currency,rates:Rates):string{
  const eurValue=toEur(value,base,rates);
  const converted=fromEur(eurValue,target,rates);
  return formatCurrency(converted,target);
}

function parseNumber(raw:string):number{
  return Number(raw.replace(/[\s\u00A0\u202F]/g,'').replace(',','.'));
}

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
      if(Number.isFinite(xof)&&xof>0&&Number.isFinite(usd)&&usd>0){
        setRates({xof_per_eur:xof,usd_per_eur:usd});
      }
      const stored=localStorage.getItem('qatalink_public_currency') as Currency|null;
      if(stored&&['XOF','EUR','USD'].includes(stored))setCurrency(stored);
      else if(geo.country_code)setCurrency(autoCurrency(String(geo.country_code)));
    });
  },[]);

  useEffect(()=>{
    localStorage.setItem('qatalink_public_currency',currency);
  },[currency]);

  useEffect(()=>{
    if(!rates)return;
    const rxByBase:Record<Currency,RegExp>={
      XOF:/(\d[\d\s\u00A0\u202F]*(?:[.,]\d+)?)\s*(?:F\s*CFA|F)(?![A-Za-z])/g,
      EUR:/(\d[\d\s\u00A0\u202F]*(?:[.,]\d+)?)\s*€/g,
      USD:/\$\s*(\d[\d,]*(?:\.\d+)?)/g
    };

    const convertText=(source:string):string=>source.replace(rxByBase[base],(match,rawNumber)=>{
      const value=parseNumber(String(rawNumber));
      if(!Number.isFinite(value))return match;
      return convertAmount(value,base,currency,rates);
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

      document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"],a[href*="api.whatsapp.com"]').forEach(anchor=>{
        if(!hrefs.has(anchor))hrefs.set(anchor,anchor.href);
        const original=hrefs.get(anchor)||anchor.href;
        try{
          const url=new URL(original);
          const message=url.searchParams.get('text');
          if(message)url.searchParams.set('text',convertText(message));
          anchor.href=url.toString();
        }catch{}
      });
    };

    const root=document.querySelector('.public-v2');
    if(!root)return;
    walk(root);
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations)mutation.addedNodes.forEach(node=>walk(node));
      walk(root);
    });
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['href']});
    return()=>observer.disconnect();
  },[currency,rates,base,originals,hrefs]);

  if(!host)return null;
  return createPortal(
    <div className="currency-switcher" aria-label="Choisir la monnaie">
      {(['XOF','EUR','USD'] as Currency[]).map(option=><button key={option} className={currency===option?'active':''} onClick={()=>setCurrency(option)}>{option==='XOF'?'F CFA':option}</button>)}
    </div>,
    host
  );
}
