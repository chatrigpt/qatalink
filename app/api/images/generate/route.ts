import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'crypto';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const IMAGE_CREDIT_COST=5;

function normalizePoyoKey(value:string|undefined){
  let key=(value||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
  if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'"))) key=key.slice(1,-1).trim();
  key=key.replace(/^Bearer\s+/i,'').trim();
  return key;
}

function keyDiagnostics(key:string){
  return {
    key_length:key.length,
    key_fingerprint:createHash('sha256').update(key).digest('hex').slice(0,12),
    has_internal_whitespace:/\s/.test(key),
    vercel_env:process.env.VERCEL_ENV||null,
    vercel_region:process.env.VERCEL_REGION||null,
    deployment_id:process.env.VERCEL_DEPLOYMENT_ID||null,
  };
}

function buildPrompt(input:{businessName:string;businessType:string;catalogTitle:string;categoryName:string;itemName:string;description:string;seedPrompt:string}){
  const localHint=input.businessType==='restaurant'?'The visual should feel credible for a premium business in Côte d’Ivoire / Abidjan. For Ivorian dishes, respect local presentation and ingredients.':input.businessType==='hotel'||input.businessType==='spa_beauty'?'Use people with Black African features when a person is relevant, and an aesthetic credible for a premium business in Abidjan, Côte d’Ivoire.':input.businessType==='real_estate'?'Use architecture and landscaping credible for Abidjan and Côte d’Ivoire; avoid obviously European or American suburban cues.':input.businessType==='retail'?'Use styling and models credible for a contemporary premium brand serving Côte d’Ivoire; when a person is relevant, use Black African features.':'Keep the visual commercially credible for Côte d’Ivoire.';
  return `Create a square 1:1 premium commercial illustration for a Qatalink digital menu/catalogue item.\nBusiness: ${input.businessName||'Business'}\nSector: ${input.businessType||'general retail/service'}\nCatalogue: ${input.catalogTitle||'Catalogue'}\nCategory: ${input.categoryName||'General'}\nItem: ${input.itemName}\nDescription: ${input.description||'No additional description'}\nExisting visual hint: ${input.seedPrompt||'None'}\nLocal market: Côte d’Ivoire. ${localHint}\n\nRequirements:\n- Represent the exact item clearly and faithfully.\n- Adapt the visual language to the sector.\n- Premium commercial quality, realistic lighting, subject easy to recognize at small mobile-card size.\n- No text, no letters, no price labels, no watermark.\n- No unrelated props that could confuse the product identity.\n- Square 1:1 composition.`;
}

async function submitModel(key:string,model:string,prompt:string){
  const input=model==='nano-banana-2-new'?{prompt,size:'1:1',resolution:'2K'}:{prompt,quality:'low',size:'1:1'};
  const r=await fetch('https://api.poyo.ai/api/generate/submit',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,input}),cache:'no-store'});
  const raw=await r.text();
  let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,500)}}
  const taskId=data?.data?.task_id;
  const error=data?.error?.message||data?.error||data?.message||(!r.ok?`Generation submit failed (${r.status})`:'Missing task id');
  return {ok:r.ok&&!!taskId,status:r.status,data,taskId,error};
}

export async function POST(req:NextRequest){
  try{
    const poyoKey=normalizePoyoKey(process.env.POYO_API_KEY);
    if(!poyoKey)return NextResponse.json({success:false,error:'GENERATION_UNAVAILABLE',diagnostics:{key_present:false,vercel_env:process.env.VERCEL_ENV||null}},{status:503});
    const diagnostics=keyDiagnostics(poyoKey);
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const body=await req.json();const ids=[...new Set((Array.isArray(body?.item_ids)?body.item_ids:[body?.item_id]).filter(Boolean))].slice(0,50) as string[];if(!ids.length)return NextResponse.json({success:false,error:'NO_ITEMS'},{status:400});
    const {data:requestedItems,error:requestedError}=await supabase.from('items').select('id,catalog_id').in('id',ids);if(requestedError||!requestedItems?.length||requestedItems.length!==ids.length)return NextResponse.json({success:false,error:'ITEMS_UNAVAILABLE'},{status:403});
    const catalogIds=[...new Set(requestedItems.map((i:any)=>i.catalog_id))];const {data:requestedCatalogs}=await supabase.from('catalogs').select('id,business_id').in('id',catalogIds);if(!requestedCatalogs?.length)return NextResponse.json({success:false,error:'CATALOG_UNAVAILABLE'},{status:404});
    const businessIds=[...new Set(requestedCatalogs.map((c:any)=>c.business_id))];if(businessIds.length!==1)return NextResponse.json({success:false,error:'ONE_BUSINESS_PER_BATCH',message:'Générez les images d’une entreprise à la fois.'},{status:400});const businessId=String(businessIds[0]);
    const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);const sub=subs?.[0];const hasAccess=!!sub&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());if(!hasAccess)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});
    const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',businessId).maybeSingle();const required=ids.length*IMAGE_CREDIT_COST;const currentBalance=Number(wallet?.balance||0);if(currentBalance<required)return NextResponse.json({success:false,error:'INSUFFICIENT_CREDITS',message:`Il faut ${required} crédits pour générer ${ids.length} image(s).`,balance:currentBalance,required},{status:402});
    const {data:business}=await supabase.from('businesses').select('name,business_type').eq('id',businessId).single();const jobs:any[]=[];let lastBalance=currentBalance;
    for(const itemId of ids){
      const {data:item}=await supabase.from('items').select('id,name,description,short_description,metadata,catalog_id,category_id').eq('id',itemId).single();if(!item){jobs.push({item_id:itemId,error:'ITEM_UNAVAILABLE'});continue}
      const {data:catalog}=await supabase.from('catalogs').select('id,title,business_id').eq('id',item.catalog_id).single();if(!catalog||String(catalog.business_id)!==businessId){jobs.push({item_id:itemId,error:'ITEM_UNAVAILABLE'});continue}
      const {data:category}=item.category_id?await supabase.from('categories').select('name').eq('id',item.category_id).maybeSingle():{data:null};const prompt=buildPrompt({businessName:business?.name||'',businessType:business?.business_type||'',catalogTitle:catalog.title||'',categoryName:category?.name||'',itemName:item.name,description:item.description||item.short_description||'',seedPrompt:item.metadata?.image_prompt||''});
      const {data:job,error:jobError}=await supabase.from('item_image_generation_jobs').insert({business_id:businessId,item_id:item.id,prompt,status:'pending',provider:'poyo:gpt-image-2',credit_cost:IMAGE_CREDIT_COST}).select('id').single();if(jobError||!job){jobs.push({item_id:itemId,error:'JOB_CREATE_FAILED'});continue}
      const {data:balanceAfter,error:creditError}=await supabase.rpc('consume_image_credits',{p_business_id:businessId,p_job_id:job.id,p_cost:IMAGE_CREDIT_COST});if(creditError){await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:'CREDIT_ERROR',completed_at:new Date().toISOString()}).eq('id',job.id);jobs.push({item_id:itemId,job_id:job.id,error:'CREDIT_ERROR'});continue}lastBalance=Number(balanceAfter??lastBalance-IMAGE_CREDIT_COST);
      let submitted=await submitModel(poyoKey,'gpt-image-2',prompt);let provider='poyo:gpt-image-2';
      if(!submitted.ok&&submitted.status!==401&&submitted.status!==403){submitted=await submitModel(poyoKey,'nano-banana-2-new',prompt);provider='poyo:nano-banana-2-new'}
      if(!submitted.ok){
        const authFailure=submitted.status===401||submitted.status===403;
        const safePayload={...(submitted.data||{}),http_status:submitted.status,poyo_diagnostics:diagnostics};
        await supabase.from('item_image_generation_jobs').update({status:'failed',provider,error_message:String(submitted.error||'GENERATION_FAILED'),provider_payload:safePayload,completed_at:new Date().toISOString()}).eq('id',job.id);
        const {data:refunded}=await supabase.rpc('refund_failed_image_credits',{p_business_id:businessId,p_job_id:job.id});if(refunded!==null&&refunded!==undefined)lastBalance=Number(refunded);
        console.error('[Qatalink:Poyo]',{status:submitted.status,error:submitted.error,...diagnostics});
        jobs.push({item_id:itemId,job_id:job.id,error:authFailure?'POYO_AUTH_FAILED':'GENERATION_FAILED',provider_status:submitted.status,refunded:true,diagnostics:authFailure?diagnostics:undefined});continue
      }
      await supabase.from('item_image_generation_jobs').update({status:'processing',provider,provider_task_id:submitted.taskId,provider_payload:{...submitted.data,fallback_used:provider.includes('nano-banana'),poyo_diagnostics:diagnostics}}).eq('id',job.id);jobs.push({item_id:itemId,job_id:job.id,task_id:submitted.taskId,status:'processing',credit_cost:IMAGE_CREDIT_COST,balance:lastBalance});
    }
    return NextResponse.json({success:true,jobs,credit_cost_per_image:IMAGE_CREDIT_COST,balance:lastBalance,business_id:businessId});
  }catch(error){console.error('[Qatalink:ImagesGenerate]',error);return NextResponse.json({success:false,error:'GENERATION_FAILED'},{status:500})}
}
