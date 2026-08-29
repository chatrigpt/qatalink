'use client';

import {useMemo,useState} from 'react';
import {Languages} from 'lucide-react';
import {PublicCatalogV2} from '@/components/public-catalog-v2';

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
  return {...data,catalog,pages,categories,business:{...data.business,customer_flow_settings:customerFlow}};
}

export function PublicCatalogLanguage({data}:{data:any}){
  const eligible=['interactive','linkhub'].includes(String(data?.plan_code||''));
  const [lang,setLang]=useState<'fr'|'en'>('fr');const [translation,setTranslation]=useState<any>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const shown=useMemo(()=>lang==='en'&&translation?applyTranslation(data,translation):data,[data,lang,translation]);
  async function choose(next:'fr'|'en'){
    if(next==='fr'){setLang('fr');setError('');return}
    if(translation){setLang('en');return}
    setBusy(true);setError('');
    try{const r=await fetch('/api/catalog/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:data?.catalog?.public_slug,target:'en'})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.translation)throw new Error('UNAVAILABLE');setTranslation(d.translation);setLang('en')}catch{setError('La traduction anglaise est momentanément indisponible.')}finally{setBusy(false)}
  }
  return <div className="public-catalog-language-shell">{eligible&&<div className="public-language-switch" role="group" aria-label="Langue du catalogue"><Languages size={15}/><button className={lang==='fr'?'active':''} onClick={()=>void choose('fr')}>FR</button><button className={lang==='en'?'active':''} disabled={busy} onClick={()=>void choose('en')}>{busy?'…':'EN'}</button>{error&&<span title={error}>!</span>}</div>}<PublicCatalogV2 data={shown}/></div>
}
