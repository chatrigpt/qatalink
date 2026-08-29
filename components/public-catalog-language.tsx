'use client';

import {useEffect,useMemo,useState} from 'react';
import {Languages} from 'lucide-react';
import {PublicCatalogV2} from '@/components/public-catalog-v2';

type Lang='fr'|'en';
type Currency='XOF'|'EUR'|'USD';

function applyTranslation(data:any,t:any){
  if(!t)return data;
  const pageMap=new Map((t.pages||[]).map((x:any)=>[String(x.id),x]));
  const catMap=new Map((t.categories||[]).map((x:any)=>[String(x.id),x]));
  const itemMap=new Map<string,any>();
  for(const c of t.categories||[])for(const i of c.items||[])itemMap.set(String(i.id),i);
  const pages=(Array.isArray(data?.pages)?data.pages:[]).map((p:any)=>{const x=pageMap.get(String(p.id)) as any;return x?{...p,title:x.title||p.title,name:x.title||p.name,description:x.description??p.description}:p});
  const categories=(Array.isArray(data?.categories)?data.categories:[]).map((c:any)=>{const x=catMap.get(String(c.id)) as any;return {...c,name:x?.name||c.name,description:x?.description??c.description,items:(Array.isArray(c.items)?c.items:[]).map((i:any)=>{const y=itemMap.get(String(i.id));return y?{...i,name:y.name||i.name,description:y.description??i.description}:i})}});
  const catalog={...data.catalog,title:t.catalog?.title||data.catalog?.title,display_name:t.catalog?.display_name||data.catalog?.display_name,description:t.catalog?.description??data.catalog?.description};
  const customerFlow={...(data?.business?.customer_flow_settings||{})};if(t.flow_labels&&typeof t.flow_labels==='object')customerFlow.mode_labels={...(customerFlow.mode_labels||{}),...t.flow_labels};
  const business={...data.business,description:t.business?.description??data.business?.description,customer_flow_settings:customerFlow};
  return {...data,__qatalink_locale:'en',catalog,pages,categories,business};
}

function currencyButton(next:Currency){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.public-v2 .currency-switcher button'));return buttons.find(button=>next==='XOF'?/F\s*CFA/i.test(button.textContent||''):(button.textContent||'').trim()===next)||null}

export function PublicCatalogLanguage({data}:{data:any}){
  const eligible=['interactive','linkhub'].includes(String(data?.plan_code||''));
  const baseCurrency=(['XOF','EUR','USD'].includes(String(data?.business?.currency_code))?String(data.business.currency_code):'XOF') as Currency;
  const [lang,setLang]=useState<Lang>('fr');const [translation,setTranslation]=useState<any>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [currency,setCurrency]=useState<Currency>(baseCurrency);
  const shown=useMemo(()=>lang==='en'&&translation?applyTranslation(data,translation):{...data,__qatalink_locale:'fr'},[data,lang,translation]);

  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|null=null;
    try{const stored=localStorage.getItem('qatalink_public_currency') as Currency|null;if(stored&&['XOF','EUR','USD'].includes(stored))setCurrency(stored)}catch{}
    timer=setTimeout(()=>{const active=document.querySelector<HTMLButtonElement>('.public-v2 .currency-switcher button.active');const text=(active?.textContent||'').trim();if(/F\s*CFA/i.test(text))setCurrency('XOF');else if(text==='EUR'||text==='USD')setCurrency(text)},850);
    return()=>{if(timer)clearTimeout(timer)};
  },[data?.catalog?.id]);

  async function chooseLanguage(next:Lang){
    if(next==='fr'){setLang('fr');setError('');return}
    if(translation){setLang('en');setError('');return}
    setBusy(true);setError('');
    try{const r=await fetch('/api/catalog/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:data?.catalog?.public_slug,target:'en'})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.translation)throw new Error('UNAVAILABLE');setTranslation(d.translation);setLang('en')}catch{setError('Traduction momentanément indisponible. Réessayez.')}finally{setBusy(false)}
  }
  function chooseCurrency(next:Currency){setCurrency(next);try{localStorage.setItem('qatalink_public_currency',next)}catch{};requestAnimationFrame(()=>currencyButton(next)?.click())}

  return <div className="public-catalog-language-shell">
    <div className="public-preference-switch" role="group" aria-label="Langue et monnaie du catalogue">
      {eligible&&<><Languages size={14}/><button className={lang==='fr'?'active':''} onClick={()=>void chooseLanguage('fr')}>FR</button><button className={lang==='en'?'active':''} disabled={busy} onClick={()=>void chooseLanguage('en')}>{busy?'…':'EN'}</button><i aria-hidden="true"/></>}
      <button title="Franc CFA" className={currency==='XOF'?'active':''} onClick={()=>chooseCurrency('XOF')}>F</button><button title="Euro" className={currency==='EUR'?'active':''} onClick={()=>chooseCurrency('EUR')}>€</button><button title="Dollar US" className={currency==='USD'?'active':''} onClick={()=>chooseCurrency('USD')}>$</button>
      {error&&<span className="public-preference-error" title={error}>!</span>}
    </div>
    <PublicCatalogV2 data={shown}/>
  </div>
}
