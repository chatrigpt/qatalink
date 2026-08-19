import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

function normalizePoyoKey(value:string|undefined){let key=(value||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').trim()}
function clean(value:unknown,max=4000){return String(value??'').trim().slice(0,max)}
function buildPrompt(ctx:any,customPrompt:string){
  const local=String(ctx?.business_type||'')==='restaurant'?'For Ivorian dishes, preserve authentic ingredients, portions, textures and local presentation credible for Côte d’Ivoire / Abidjan.':'Keep the scene commercially credible for Côte d’Ivoire and the business sector.';
  return `Create an exceptionally realistic, high-end commercial image for a Qatalink digital catalogue item.\n\nBusiness: ${ctx?.business_name||'Business'}\nSector: ${ctx?.business_type||'general'}\nCatalogue: ${ctx?.catalog_title||'Catalogue'}\nCategory: ${ctx?.category_name||'General'}\nItem: ${ctx?.item_name||'Item'}\nDescription: ${ctx?.description||'No additional description'}\nMarket: Côte d’Ivoire. ${local}${customPrompt?`\nUSER VISUAL DIRECTION: ${customPrompt}`:''}\n\nMANDATORY QUALITY:\n- Photorealistic premium commercial photography, crisp details, believable light, shadows, reflections and materials.\n- Rich vibrant but natural colors; no fake HDR, no neon oversaturation.\n- Food/drink: premium authentic food photography. Product/object: polished studio or editorial product photography. Service: realistic real-world scene showing the service.\n- Correct anatomy and geometry, no cheap CGI, no plastic/cartoon look, no AI artifacts.\n- Square 1:1, subject clearly visible.\n- No text, letters, prices, captions, watermark or invented logo.`;
}
async function submit(key:string,model:string,prompt:string){
  const input=model==='gpt-image-2'?{prompt,quality:'low',size:'1:1',resolution:'1K'}:{prompt,size:'1:1',resolution:'1K'};
  const r=await fetch('https://api.poyo.ai/api/generate/submit',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,input}),cache:'no-store'});
  const raw=await r.text();let data:any=null;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,500)}}
  return {ok:r.ok&&!!data?.data?.task_id,status:r.status,data,taskId:data?.data?.task_id,input};
}

export async function POST(req:NextRequest){
  try{
    const key=normalizePoyoKey(process.env.POYO_API_KEY);if(!key)return NextResponse.json({success:false,error:'GENERATION_UNAVAILABLE'},{status:503});
    const body=await req.json();const accessKey=clean(body?.access_key,128);const pin=clean(body?.pin,32);const itemId=clean(body?.item_id,64);const customPrompt=clean(body?.custom_prompt,4000);
    if(!accessKey||!pin||!itemId)return NextResponse.json({success:false,error:'ACCESS_REQUIRED'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data:ctx,error:ctxError}=await supabase.rpc('get_catalog_team_generation_context',{p_access_key:accessKey,p_pin:pin,p_item_id:itemId});
    if(ctxError||!ctx)return NextResponse.json({success:false,error:ctxError?.message||'ACCESS_DENIED'},{status:403});
    const prompt=buildPrompt(ctx,customPrompt);
    const {data:job,error:jobError}=await supabase.rpc('create_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_item_id:itemId,p_prompt:prompt,p_provider:'poyo:gpt-image-2'});
    if(jobError||!job)return NextResponse.json({success:false,error:jobError?.message||'JOB_FAILED',balance:Number(ctx?.balance||0)},{status:String(jobError?.message||'').includes('INSUFFICIENT')?402:403});
    let submitted=await submit(key,'gpt-image-2',prompt);let provider='poyo:gpt-image-2';
    if(!submitted.ok&&submitted.status!==401&&submitted.status!==403){submitted=await submit(key,'nano-banana-2-new',prompt);provider='poyo:nano-banana-2-new'}
    if(!submitted.ok){await supabase.rpc('fail_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_job_id:job.job_id,p_error:'GENERATION_SUBMIT_FAILED',p_payload:submitted.data||{}});return NextResponse.json({success:false,error:'GENERATION_FAILED'},{status:502})}
    const {error:activateError}=await supabase.rpc('activate_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_job_id:job.job_id,p_provider:provider,p_task_id:submitted.taskId,p_payload:{...(submitted.data||{}),request_input:submitted.input}});
    if(activateError)return NextResponse.json({success:false,error:'JOB_ACTIVATION_FAILED'},{status:500});
    return NextResponse.json({success:true,job_id:job.job_id,item_id:itemId,status:'processing',balance:job.balance,credit_cost:job.cost,generation_profile:provider.includes('gpt-image-2')?'gpt-image-2:low:1K':'nano-banana-2-new:1K'});
  }catch(error){console.error('[Qatalink:OpsImageGenerate]',error);return NextResponse.json({success:false,error:'GENERATION_FAILED'},{status:500})}
}
