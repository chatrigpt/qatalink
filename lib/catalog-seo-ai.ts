import {createHash} from 'crypto';
import {createClient} from '@supabase/supabase-js';
import {catalogEffective,cleanSeoText} from '@/lib/public-seo';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PROVIDER_KEY=(process.env.POYO_API_KEY||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/^Bearer\s+/i,'').trim();
const MODELS=['gemini-2.5-flash','gemini-3.5-flash'];
const MIN_ITEMS=4;

export type CatalogSeoProfile={title:string;description:string;keywords:string[];bannerText?:string;generated:boolean};

function db(){return SERVICE_KEY?createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null}
function fingerprint(source:any){return createHash('sha256').update(JSON.stringify(source)).digest('hex')}
function jsonObject(raw:string){const clean=raw.trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=clean.indexOf('{'),b=clean.lastIndexOf('}');if(a<0||b<=a)throw new Error('SEO_INVALID_JSON');return JSON.parse(clean.slice(a,b+1))}
function shortType(type:string){if(type==='restaurant')return'restaurant';if(type==='retail')return'boutique';if(type==='hotel')return'hôtel';if(type==='spa_beauty')return'salon / spa';if(type==='real_estate')return'agence immobilière';return'commerce'}
function deterministic(data:any):CatalogSeoProfile{
  const {catalog,business,items,categories}=catalogEffective(data);const location=[business.neighborhood,business.city].filter(Boolean).join(', ');const category=categories.find((c:any)=>c?.name)?.name||'';const itemNames=items.slice(0,4).map((i:any)=>cleanSeoText(i.name,45)).filter(Boolean);
  const signal=category||itemNames[0]||shortType(String(business.business_type||''));
  const title=cleanSeoText(`${business.name||catalog.title}${signal?` — ${signal}`:''}${location?` à ${location}`:''}`,60);
  const description=cleanSeoText(`${cleanSeoText(catalog.description||business.description,120)||`Découvrez ${business.name||catalog.title}, ${shortType(String(business.business_type||''))}.`} ${itemNames.length?`Parmi les offres : ${itemNames.join(', ')}.`:''}${location?` À ${location}.`:''}`,160);
  return {title,description,keywords:[business.name,catalog.title,category,...itemNames,location].map((x:any)=>cleanSeoText(x,70)).filter(Boolean),generated:false};
}

async function callModel(model:string,source:any,coverUrl:string,withImage:boolean){
  const instruction=`Tu optimises les métadonnées SEO d'une vraie page de commerce Qatalink. Produis une présentation courte, humaine et spécifique au commerce à partir uniquement des données fournies. Le commerce a plusieurs articles : utilise les catégories, noms et descriptions pour comprendre ce qu'il propose. Si une bannière est jointe, lis son texte visible comme par OCR et utilise seulement les informations réellement lisibles. Ne fabrique jamais d'adresse, d'horaire, de spécialité, de marque, de prix ou de service.\n\nRetourne uniquement un JSON valide avec exactement : {"title":"...","description":"...","keywords":["..."],"banner_text":"..."}.\n- title : 38 à 60 caractères si possible, orienté commerce + activité/offre/localité. Ne mets PAS Qatalink dans le titre. Évite les titres génériques du type « Menu | Qatalink » ou « Catalogue | Qatalink ». N'utilise « menu » ou « catalogue » que si cela améliore réellement la compréhension.\n- description : 125 à 160 caractères, naturelle, utile, sans superlatifs inventés.\n- keywords : 6 à 12 expressions réellement déduites des données.\n- banner_text : transcription concise du texte utile vu sur la bannière, ou chaîne vide si aucun texte exploitable.\nLe nom propre du commerce doit rester inchangé.`;
  const text=JSON.stringify(source);
  const content:any=withImage&&coverUrl?[{type:'text',text},{type:'image_url',image_url:{url:coverUrl}}]:text;
  const response=await fetch('https://api.poyo.ai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${PROVIDER_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:.18,max_tokens:950,messages:[{role:'system',content:instruction},{role:'user',content}]}),cache:'no-store'});
  const raw=await response.text();let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,700)}}
  if(!response.ok)throw new Error(`${model}:${response.status}:${String(data?.error?.message||data?.message||'provider error').slice(0,160)}`);
  const result=data?.choices?.[0]?.message?.content;if(!result)throw new Error(`${model}:empty`);return jsonObject(String(result));
}

async function generateProfile(source:any,coverUrl:string){
  if(!PROVIDER_KEY)throw new Error('SEO_PROVIDER_UNAVAILABLE');let lastError='SEO_PROVIDER_UNAVAILABLE';
  for(const model of MODELS){
    if(coverUrl){try{return await callModel(model,source,coverUrl,true)}catch(error:any){lastError=String(error?.message||error)}}
    try{return await callModel(model,source,'',false)}catch(error:any){lastError=String(error?.message||error)}
  }
  throw new Error(lastError);
}

export async function getCatalogSeoProfile(data:any):Promise<CatalogSeoProfile|null>{
  const {catalog,business,items,categories}=catalogEffective(data);const usable=items.filter((i:any)=>i?.name);if(usable.length<MIN_ITEMS)return null;
  const source={
    catalog_id:catalog.id,
    business_name:cleanSeoText(business.name,120),
    business_type:String(business.business_type||''),
    catalog_type:String(catalog.type||catalog.catalog_type||''),
    catalog_title:cleanSeoText(catalog.title,120),
    catalog_description:cleanSeoText(catalog.description,600),
    business_description:cleanSeoText(business.description,600),
    city:cleanSeoText(business.city,100),
    neighborhood:cleanSeoText(business.neighborhood,100),
    categories:categories.slice(0,16).map((c:any)=>({name:cleanSeoText(c.name,90),description:cleanSeoText(c.description,220)})),
    items:usable.slice(0,32).map((i:any)=>({name:cleanSeoText(i.name,100),description:cleanSeoText(i.description,220),category:cleanSeoText(i.category_name,90)}))
  };
  const fp=fingerprint({...source,cover_url:business.cover_url||''});const database=db();
  if(database){const {data:cached}=await database.from('catalog_seo_profiles').select('source_fingerprint,meta_title,meta_description,keywords,extracted_banner_text').eq('catalog_id',String(catalog.id)).maybeSingle();if(cached?.source_fingerprint===fp&&cached?.meta_title&&cached?.meta_description)return {title:String(cached.meta_title),description:String(cached.meta_description),keywords:Array.isArray(cached.keywords)?cached.keywords:[],bannerText:String(cached.extracted_banner_text||''),generated:true}}
  const fallback=deterministic(data);
  try{
    const generated=await generateProfile(source,String(business.cover_url||''));const title=cleanSeoText(generated?.title||fallback.title,60).replace(/\s*[|—-]\s*Qatalink\s*$/i,'');const description=cleanSeoText(generated?.description||fallback.description,160);const keywords=(Array.isArray(generated?.keywords)?generated.keywords:[]).map((x:any)=>cleanSeoText(x,80)).filter(Boolean).slice(0,12);const bannerText=cleanSeoText(generated?.banner_text,700);
    const profile={title:title||fallback.title,description:description||fallback.description,keywords:keywords.length?keywords:fallback.keywords,bannerText,generated:true};
    if(database)await database.from('catalog_seo_profiles').upsert({catalog_id:String(catalog.id),source_fingerprint:fp,item_count:usable.length,meta_title:profile.title,meta_description:profile.description,keywords:profile.keywords,extracted_banner_text:profile.bannerText||null,source_context:{catalog_type:source.catalog_type,business_type:source.business_type,cover_used:!!business.cover_url},generated_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'catalog_id'});
    return profile;
  }catch(error:any){console.error('[Qatalink:CatalogSeoProfile]',String(error?.message||error));return fallback}
}
