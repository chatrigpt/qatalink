import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createHash} from 'crypto';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const IMAGE_CREDIT_COST=5;

type PromptInput={
  businessName:string;
  businessType:string;
  catalogTitle:string;
  categoryName:string;
  itemName:string;
  description:string;
  seedPrompt:string;
  customPrompt:string;
};

function normalizePoyoKey(value:string|undefined){
  let key=(value||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
  if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();
  key=key.replace(/^Bearer\s+/i,'').trim();
  return key;
}

function cleanText(value:unknown,max=4000){return String(value??'').trim().slice(0,max)}

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

function buildPrompt(input:PromptInput){
  const localHint=input.businessType==='restaurant'
    ?'The visual must feel authentic for a premium business in Côte d’Ivoire / Abidjan. For Ivorian dishes, preserve the real ingredients, portions, textures and local presentation.'
    :input.businessType==='hotel'||input.businessType==='spa_beauty'
      ?'When people are useful to explain the service, use credible Black African people and a polished premium setting appropriate for Abidjan, Côte d’Ivoire.'
      :input.businessType==='real_estate'
        ?'Use architecture, interiors and landscaping credible for Abidjan and Côte d’Ivoire; avoid obvious European or American suburban clichés.'
        :input.businessType==='retail'
          ?'Use premium product styling and, when people are relevant, credible Black African models for a contemporary brand serving Côte d’Ivoire.'
          :'Keep the scene commercially credible for Côte d’Ivoire and the business sector.';

  const custom=input.customPrompt
    ?`\nUSER VISUAL DIRECTION — follow this request closely while keeping the result realistic, premium and faithful to the item:\n${input.customPrompt}\n`
    :'';

  return `Create an exceptionally realistic, high-end commercial image for a Qatalink digital catalogue item. The result must look like professional advertising photography, not generic AI art.\n\nBusiness: ${input.businessName||'Business'}\nSector: ${input.businessType||'general retail/service'}\nCatalogue: ${input.catalogTitle||'Catalogue'}\nCategory: ${input.categoryName||'General'}\nItem: ${input.itemName}\nItem description: ${input.description||'No additional description'}\nExisting visual hint: ${input.seedPrompt||'None'}\nMarket context: Côte d’Ivoire. ${localHint}${custom}\nQUALITY AND REALISM — mandatory:\n- Photorealistic, premium commercial photography quality, crisp micro-detail and clean high-definition rendering.\n- Physically believable light, shadows, reflections, skin, fabric, food, materials and surfaces.\n- Rich, vibrant and appetizing colors while remaining natural and believable; avoid neon oversaturation and fake HDR.\n- Strong subject separation, polished composition, realistic depth of field and excellent clarity at small mobile catalogue-card size.\n- No cheap CGI look, no plastic textures, no cartoon styling, no flat icon look, no blurry or muddy details, no obvious AI artifacts.\n- Keep anatomy, hands, faces, product geometry and object proportions natural and correct.\n\nSUBJECT-SPECIFIC DIRECTION:\n- If this is food or a drink: use premium food photography, authentic ingredients and presentation, appetizing texture, fresh highlights and restaurant-quality plating.\n- If this is a physical product/object: use premium studio or editorial product photography, faithful geometry, materials, finish and useful context without distracting props.\n- If this is a service or intangible offer: create a photorealistic real-world scene that instantly shows the service being performed or experienced; use a credible professional environment and people only when they help explain the service. Do not use a generic icon or abstract illustration.\n- If the item belongs to another category, choose the most realistic commercial-photography interpretation that makes the offer immediately understandable.\n\nCOMPOSITION:\n- Square 1:1 composition, subject clearly visible and not cropped awkwardly.\n- Represent the exact item faithfully; do not substitute a different product, dish or service.\n- No unrelated props that could confuse the item identity.\n- No added text, letters, prices, captions, watermark or invented logo.\n- The final image should feel premium, contemporary, vibrant and ready for a professional sales catalogue.`;
}

async function submitModel(key:string,model:string,prompt:string){
  const input=model==='nano-banana-2-new'
    ?{prompt,size:'1:1',resolution:'2K'}
    :{prompt,quality:'high',size:'1:1',resolution:'4K'};
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

    const body=await req.json();
    const ids=[...new Set((Array.isArray(body?.item_ids)?body.item_ids:[body?.item_id]).filter(Boolean))].slice(0,50) as string[];
    if(!ids.length)return NextResponse.json({success:false,error:'NO_ITEMS'},{status:400});
    const generationMode=body?.generation_mode==='custom'?'custom':'auto';
    const customPrompt=generationMode==='custom'?cleanText(body?.custom_prompt):'';
    if(generationMode==='custom'&&ids.length!==1)return NextResponse.json({success:false,error:'CUSTOM_ONE_ITEM_ONLY',message:'La description personnalisée s’utilise sur une image à la fois.'},{status:400});
    if(generationMode==='custom'&&!customPrompt)return NextResponse.json({success:false,error:'CUSTOM_PROMPT_REQUIRED',message:'Décrivez l’image que vous souhaitez obtenir.'},{status:400});

    const {data:requestedItems,error:requestedError}=await supabase.from('items').select('id,catalog_id').in('id',ids);
    if(requestedError||!requestedItems?.length||requestedItems.length!==ids.length)return NextResponse.json({success:false,error:'ITEMS_UNAVAILABLE'},{status:403});
    const catalogIds=[...new Set(requestedItems.map((i:any)=>i.catalog_id))];
    const {data:requestedCatalogs}=await supabase.from('catalogs').select('id,business_id').in('id',catalogIds);
    if(!requestedCatalogs?.length)return NextResponse.json({success:false,error:'CATALOG_UNAVAILABLE'},{status:404});
    const businessIds=[...new Set(requestedCatalogs.map((c:any)=>c.business_id))];
    if(businessIds.length!==1)return NextResponse.json({success:false,error:'ONE_BUSINESS_PER_BATCH',message:'Générez les images d’une entreprise à la fois.'},{status:400});
    const businessId=String(businessIds[0]);

    const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
    const sub=subs?.[0];const hasAccess=!!sub&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!hasAccess)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});
    const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',businessId).maybeSingle();
    const required=ids.length*IMAGE_CREDIT_COST;const currentBalance=Number(wallet?.balance||0);
    if(currentBalance<required)return NextResponse.json({success:false,error:'INSUFFICIENT_CREDITS',message:`Il faut ${required} crédits pour générer ${ids.length} image(s).`,balance:currentBalance,required},{status:402});

    const {data:business}=await supabase.from('businesses').select('name,business_type').eq('id',businessId).single();
    const jobs:any[]=[];let lastBalance=currentBalance;
    for(const itemId of ids){
      const {data:item}=await supabase.from('items').select('id,name,description,short_description,metadata,catalog_id,category_id').eq('id',itemId).single();
      if(!item){jobs.push({item_id:itemId,error:'ITEM_UNAVAILABLE'});continue}
      const {data:catalog}=await supabase.from('catalogs').select('id,title,business_id').eq('id',item.catalog_id).single();
      if(!catalog||String(catalog.business_id)!==businessId){jobs.push({item_id:itemId,item_name:item.name,error:'ITEM_UNAVAILABLE'});continue}
      const {data:category}=item.category_id?await supabase.from('categories').select('name').eq('id',item.category_id).maybeSingle():{data:null};
      const prompt=buildPrompt({
        businessName:business?.name||'',
        businessType:business?.business_type||'',
        catalogTitle:catalog.title||'',
        categoryName:category?.name||'',
        itemName:item.name,
        description:item.description||item.short_description||'',
        seedPrompt:item.metadata?.image_prompt||'',
        customPrompt,
      });

      const {data:job,error:jobError}=await supabase.from('item_image_generation_jobs').insert({business_id:businessId,item_id:item.id,prompt,status:'pending',provider:'poyo:gpt-image-2',credit_cost:IMAGE_CREDIT_COST}).select('id').single();
      if(jobError||!job){jobs.push({item_id:itemId,item_name:item.name,error:'JOB_CREATE_FAILED'});continue}
      const {data:balanceAfter,error:creditError}=await supabase.rpc('consume_image_credits',{p_business_id:businessId,p_job_id:job.id,p_cost:IMAGE_CREDIT_COST});
      if(creditError){
        await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:'CREDIT_ERROR',completed_at:new Date().toISOString()}).eq('id',job.id);
        jobs.push({item_id:itemId,item_name:item.name,job_id:job.id,error:'CREDIT_ERROR'});continue
      }
      lastBalance=Number(balanceAfter??lastBalance-IMAGE_CREDIT_COST);

      let submitted=await submitModel(poyoKey,'gpt-image-2',prompt);let provider='poyo:gpt-image-2';
      if(!submitted.ok&&submitted.status!==401&&submitted.status!==403){submitted=await submitModel(poyoKey,'nano-banana-2-new',prompt);provider='poyo:nano-banana-2-new'}
      if(!submitted.ok){
        const authFailure=submitted.status===401||submitted.status===403;
        const safePayload={...(submitted.data||{}),http_status:submitted.status,poyo_diagnostics:diagnostics};
        await supabase.from('item_image_generation_jobs').update({status:'failed',provider,error_message:String(submitted.error||'GENERATION_FAILED'),provider_payload:safePayload,completed_at:new Date().toISOString()}).eq('id',job.id);
        const {data:refunded}=await supabase.rpc('refund_failed_image_credits',{p_business_id:businessId,p_job_id:job.id});if(refunded!==null&&refunded!==undefined)lastBalance=Number(refunded);
        console.error('[Qatalink:Poyo]',{status:submitted.status,error:submitted.error,...diagnostics});
        jobs.push({item_id:itemId,item_name:item.name,job_id:job.id,error:authFailure?'POYO_AUTH_FAILED':'GENERATION_FAILED',provider_status:submitted.status,refunded:true,diagnostics:authFailure?diagnostics:undefined});continue
      }
      await supabase.from('item_image_generation_jobs').update({status:'processing',provider,provider_task_id:submitted.taskId,provider_payload:{...submitted.data,fallback_used:provider.includes('nano-banana'),generation_mode:generationMode,poyo_diagnostics:diagnostics}}).eq('id',job.id);
      jobs.push({item_id:itemId,item_name:item.name,job_id:job.id,task_id:submitted.taskId,status:'processing',credit_cost:IMAGE_CREDIT_COST,balance:lastBalance});
    }
    return NextResponse.json({success:true,jobs,credit_cost_per_image:IMAGE_CREDIT_COST,balance:lastBalance,business_id:businessId});
  }catch(error){console.error('[Qatalink:ImagesGenerate]',error);return NextResponse.json({success:false,error:'GENERATION_FAILED'},{status:500})}
}
