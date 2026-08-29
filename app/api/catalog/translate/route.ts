import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'crypto';
import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const PUBLIC_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const PROVIDER_KEY=(process.env.POYO_API_KEY||'').replace(/^Bearer\s+/i,'').trim();
const ELIGIBLE_PLANS=new Set(['interactive','linkhub']);

function client(key:string){return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function cleanJson(raw:string){const value=raw.trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const a=value.indexOf('{'),b=value.lastIndexOf('}');if(a<0||b<=a)throw new Error('INVALID_TRANSLATION');return JSON.parse(value.slice(a,b+1))}
function sourcePayload(data:any){
  const categories=Array.isArray(data?.categories)?data.categories:[];
  const pages=Array.isArray(data?.pages)?data.pages:[];
  return {
    catalog:{id:data?.catalog?.id,title:data?.catalog?.title||'',display_name:data?.catalog?.display_name||'',description:data?.catalog?.description||''},
    pages:pages.map((p:any)=>({id:p.id,title:p.title||p.name||'',description:p.description||''})),
    categories:categories.map((c:any)=>({id:c.id,name:c.name||'',description:c.description||'',items:(Array.isArray(c.items)?c.items:[]).map((i:any)=>({id:i.id,name:i.name||'',description:i.description||''}))})),
    flow_labels:(data?.business?.customer_flow_settings?.mode_labels&&typeof data.business.customer_flow_settings.mode_labels==='object')?data.business.customer_flow_settings.mode_labels:{}
  };
}
function fingerprint(payload:any){return createHash('sha256').update(JSON.stringify(payload)).digest('hex')}

async function translateToEnglish(payload:any){
  if(!PROVIDER_KEY)throw new Error('TRANSLATION_UNAVAILABLE');
  const system='Translate a commerce catalog from French to natural, concise English. Return ONLY valid JSON with exactly the same object/array structure and all IDs unchanged. Translate only human-readable titles, names, descriptions and flow label values. Never translate IDs, URLs, prices, product codes, brand names or proper business names. Do not add commentary.';
  const r=await fetch('https://api.poyo.ai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${PROVIDER_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-2.5-flash',temperature:.15,max_tokens:7000,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(payload)}]}),cache:'no-store'});
  if(!r.ok)throw new Error('TRANSLATION_UNAVAILABLE');
  const d=await r.json().catch(()=>null);const content=d?.choices?.[0]?.message?.content;if(!content)throw new Error('TRANSLATION_UNAVAILABLE');return cleanJson(String(content));
}

export async function POST(req:NextRequest){
  try{
    const {slug,target='en'}=await req.json();
    if(!slug||target!=='en')return NextResponse.json({error:'INVALID_REQUEST'},{status:400});
    const pub=client(PUBLIC_KEY);const {data,error}=await pub.rpc('get_public_catalog',{p_slug:String(slug)});if(error||!data)return NextResponse.json({error:'CATALOG_NOT_FOUND'},{status:404});
    if(!ELIGIBLE_PLANS.has(String(data?.plan_code||'')))return NextResponse.json({error:'TRANSLATION_REQUIRES_PRO'},{status:403});
    const catalogId=String(data?.catalog?.id||'');if(!catalogId)return NextResponse.json({error:'CATALOG_NOT_FOUND'},{status:404});
    const source=sourcePayload(data);const fp=fingerprint(source);
    const db=SERVICE_KEY?client(SERVICE_KEY):null;
    if(db){const {data:cached}=await db.from('catalog_translation_cache').select('translated_payload').eq('catalog_id',catalogId).eq('target_language','en').eq('source_fingerprint',fp).order('updated_at',{ascending:false}).limit(1).maybeSingle();if(cached?.translated_payload)return NextResponse.json({language:'en',translation:cached.translated_payload,cached:true},{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}})}
    const translation=await translateToEnglish(source);
    if(db)await db.from('catalog_translation_cache').upsert({catalog_id:catalogId,target_language:'en',source_fingerprint:fp,translated_payload:translation,updated_at:new Date().toISOString()},{onConflict:'catalog_id,target_language,source_fingerprint'});
    return NextResponse.json({language:'en',translation},{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}});
  }catch{return NextResponse.json({error:'TRANSLATION_UNAVAILABLE'},{status:503})}
}
