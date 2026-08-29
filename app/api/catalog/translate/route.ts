import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
export const maxDuration=60;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const PUBLIC_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PROVIDER_KEY=(process.env.POYO_API_KEY||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/^Bearer\s+/i,'').trim();
const ELIGIBLE_PLANS=new Set(['interactive','linkhub']);
const MODELS=['gemini-2.5-flash','gemini-3.5-flash'];

type TranslationRow={kind:'catalog'|'business'|'page'|'category'|'item'|'flow';id:string;parent_id?:string|null;title?:string;name?:string;description?:string;value?:string};

function client(key:string){return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function cleanJson(raw:string){const value=raw.trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=value.indexOf('{'),b=value.lastIndexOf('}');if(a<0||b<=a)throw new Error('INVALID_TRANSLATION_JSON');return JSON.parse(value.slice(a,b+1))}
function chunks<T>(rows:T[],size:number){const out:T[][]=[];for(let i=0;i<rows.length;i+=size)out.push(rows.slice(i,i+size));return out}
function sourcePayload(data:any){
  const categories=Array.isArray(data?.categories)?data.categories:[];
  const pages=Array.isArray(data?.pages)?data.pages:[];
  return {
    catalog:{id:data?.catalog?.id,title:data?.catalog?.title||'',display_name:data?.catalog?.display_name||'',description:data?.catalog?.description||''},
    business:{id:data?.business?.id||data?.catalog?.business_id||'business',name:data?.business?.name||'',description:data?.business?.description||''},
    pages:pages.map((p:any)=>({id:p.id,title:p.title||p.name||'',description:p.description||''})),
    categories:categories.map((c:any)=>({id:c.id,name:c.name||'',description:c.description||'',items:(Array.isArray(c.items)?c.items:[]).map((i:any)=>({id:i.id,name:i.name||'',description:i.description||''}))})),
    flow_labels:(data?.business?.customer_flow_settings?.mode_labels&&typeof data.business.customer_flow_settings.mode_labels==='object')?data.business.customer_flow_settings.mode_labels:{}
  };
}
function flatten(payload:any):TranslationRow[]{
  const rows:TranslationRow[]=[];
  rows.push({kind:'catalog',id:String(payload.catalog?.id||'catalog'),title:String(payload.catalog?.title||''),name:String(payload.catalog?.display_name||''),description:String(payload.catalog?.description||'')});
  rows.push({kind:'business',id:String(payload.business?.id||'business'),name:String(payload.business?.name||''),description:String(payload.business?.description||'')});
  for(const p of payload.pages||[])rows.push({kind:'page',id:String(p.id),title:String(p.title||''),description:String(p.description||'')});
  for(const c of payload.categories||[]){rows.push({kind:'category',id:String(c.id),name:String(c.name||''),description:String(c.description||'')});for(const i of c.items||[])rows.push({kind:'item',id:String(i.id),parent_id:String(c.id),name:String(i.name||''),description:String(i.description||'')})}
  for(const [key,value] of Object.entries(payload.flow_labels||{}))rows.push({kind:'flow',id:String(key),value:String(value||'')});
  return rows;
}
function rebuild(source:any,rows:TranslationRow[]){
  const byKey=new Map(rows.map(r=>[`${r.kind}:${r.id}`,r]));
  const catalogRow=byKey.get(`catalog:${String(source.catalog?.id||'catalog')}`);const businessRow=byKey.get(`business:${String(source.business?.id||'business')}`);
  return {
    catalog:{...source.catalog,title:catalogRow?.title||source.catalog?.title||'',display_name:catalogRow?.name||source.catalog?.display_name||'',description:catalogRow?.description??source.catalog?.description??''},
    business:{...source.business,name:source.business?.name||'',description:businessRow?.description??source.business?.description??''},
    pages:(source.pages||[]).map((p:any)=>{const r=byKey.get(`page:${String(p.id)}`);return {...p,title:r?.title||p.title||'',description:r?.description??p.description??''}}),
    categories:(source.categories||[]).map((c:any)=>{const r=byKey.get(`category:${String(c.id)}`);return {...c,name:r?.name||c.name||'',description:r?.description??c.description??'',items:(c.items||[]).map((i:any)=>{const x=byKey.get(`item:${String(i.id)}`);return {...i,name:x?.name||i.name||'',description:x?.description??i.description??''}})}}),
    flow_labels:Object.fromEntries(Object.keys(source.flow_labels||{}).map(key=>[key,byKey.get(`flow:${key}`)?.value||source.flow_labels[key]]))
  };
}
function fingerprint(payload:any){return createHash('sha256').update(JSON.stringify(payload)).digest('hex')}

async function translateBatch(rows:TranslationRow[],batchIndex:number){
  if(!PROVIDER_KEY)throw new Error('TRANSLATION_KEY_MISSING');
  const system='You translate commerce catalogue copy from French to concise natural English. Return ONLY valid JSON in the shape {"rows":[...]}. Keep every row kind, id and parent_id exactly unchanged and in the same order. Translate only title, name, description and value fields. Business and brand names must stay unchanged. Never translate product codes, URLs, prices or IDs. Never invent details.';
  let lastError='TRANSLATION_UNAVAILABLE';
  for(const model of MODELS){
    try{
      const response=await fetch('https://api.poyo.ai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${PROVIDER_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:.1,max_tokens:3200,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({rows})}]}),cache:'no-store'});
      const raw=await response.text();let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,800)}}
      if(!response.ok){lastError=`${model}:${response.status}:${String(data?.error?.message||data?.message||'provider error').slice(0,180)}`;continue}
      const content=data?.choices?.[0]?.message?.content;if(!content){lastError=`${model}:empty`;continue}
      const parsed=cleanJson(String(content));const translated=Array.isArray(parsed?.rows)?parsed.rows:[];
      if(translated.length!==rows.length){lastError=`${model}:row_count_${translated.length}_${rows.length}`;continue}
      return translated as TranslationRow[];
    }catch(error:any){lastError=`${model}:${String(error?.message||error).slice(0,180)}`}
  }
  throw new Error(`TRANSLATION_BATCH_${batchIndex}_FAILED:${lastError}`);
}

async function translateToEnglish(payload:any){
  const rows=flatten(payload);const translated:TranslationRow[]=[];const batches=chunks(rows,18);
  for(let i=0;i<batches.length;i++)translated.push(...await translateBatch(batches[i],i));
  return rebuild(payload,translated);
}

export async function POST(req:NextRequest){
  try{
    const {slug,target='en'}=await req.json();
    if(!slug||target!=='en')return NextResponse.json({error:'INVALID_REQUEST'},{status:400});
    if(!PUBLIC_KEY)return NextResponse.json({error:'TRANSLATION_UNAVAILABLE'},{status:503});
    const pub=client(PUBLIC_KEY);const {data,error}=await pub.rpc('get_public_catalog',{p_slug:String(slug)});if(error||!data)return NextResponse.json({error:'CATALOG_NOT_FOUND'},{status:404});
    if(!ELIGIBLE_PLANS.has(String(data?.plan_code||'')))return NextResponse.json({error:'TRANSLATION_REQUIRES_PRO'},{status:403});
    const catalogId=String(data?.catalog?.id||'');if(!catalogId)return NextResponse.json({error:'CATALOG_NOT_FOUND'},{status:404});
    const source=sourcePayload(data);const fp=fingerprint(source);const db=SERVICE_KEY?client(SERVICE_KEY):null;
    if(db){const {data:cached}=await db.from('catalog_translation_cache').select('translated_payload').eq('catalog_id',catalogId).eq('target_language','en').eq('source_fingerprint',fp).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(cached?.translated_payload)return NextResponse.json({language:'en',translation:cached.translated_payload,cached:true},{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}})}
    const translation=await translateToEnglish(source);
    if(db)await db.from('catalog_translation_cache').upsert({catalog_id:catalogId,target_language:'en',source_fingerprint:fp,translated_payload:translation,updated_at:new Date().toISOString()},{onConflict:'catalog_id,target_language,source_fingerprint'});
    return NextResponse.json({language:'en',translation,cached:false},{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}});
  }catch(error:any){console.error('[Qatalink:CatalogTranslate]',String(error?.message||error));return NextResponse.json({error:'TRANSLATION_UNAVAILABLE'},{status:503})}
}
