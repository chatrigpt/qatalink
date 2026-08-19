import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const MAX_EDGE=1400;const WEBP_QUALITY=78;
function normalizePoyoKey(value:string|undefined){let key=(value||'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').trim()}
async function compress(bytes:Buffer){return sharp(bytes,{failOn:'none'}).rotate().resize({width:MAX_EDGE,height:MAX_EDGE,fit:'inside',withoutEnlargement:true}).webp({quality:WEBP_QUALITY,effort:4,smartSubsample:true}).toBuffer()}
async function submitFallback(key:string,prompt:string){const r=await fetch('https://api.poyo.ai/api/generate/submit',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'nano-banana-2-new',input:{prompt,size:'1:1',resolution:'1K'}}),cache:'no-store'});const data:any=await r.json().catch(()=>null);return{ok:r.ok&&!!data?.data?.task_id,data,taskId:data?.data?.task_id}}

export async function POST(req:NextRequest){
  try{
    const key=normalizePoyoKey(process.env.POYO_API_KEY);if(!key)return NextResponse.json({success:false,error:'GENERATION_UNAVAILABLE'},{status:503});
    const body=await req.json();const accessKey=String(body?.access_key||'').trim();const pin=String(body?.pin||'');const jobId=String(body?.job_id||'');
    if(!accessKey||!pin||!jobId)return NextResponse.json({success:false,error:'ACCESS_REQUIRED'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data:job,error:jobError}=await supabase.rpc('get_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_job_id:jobId});
    if(jobError||!job)return NextResponse.json({success:false,error:'ACCESS_DENIED'},{status:403});
    if(job.status==='completed')return NextResponse.json({success:true,status:'completed',job_id:job.id,item_id:job.item_id,image_url:job.result_image_url});
    if(job.status==='failed')return NextResponse.json({success:true,status:'failed',job_id:job.id,item_id:job.item_id,error:job.error_message||'GENERATION_FAILED',refunded:job.credit_refunded});
    if(!job.provider_task_id)return NextResponse.json({success:true,status:'processing',job_id:job.id,item_id:job.item_id});

    const provider=await fetch(`https://api.poyo.ai/api/generate/status/${encodeURIComponent(job.provider_task_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});
    const providerData:any=await provider.json().catch(()=>null);if(!provider.ok)return NextResponse.json({success:true,status:'processing',job_id:job.id,item_id:job.item_id});
    const task=providerData?.data||{};
    if(task.status==='failed'){
      const alreadyFallback=String(job.provider||'').includes('nano-banana');
      if(!alreadyFallback){const fb=await submitFallback(key,job.prompt);if(fb.ok){await supabase.rpc('activate_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_job_id:job.id,p_provider:'poyo:nano-banana-2-new',p_task_id:fb.taskId,p_payload:{...(fb.data||{}),fallback_used:true}});return NextResponse.json({success:true,status:'processing',job_id:job.id,item_id:job.item_id,fallback:true})}}
      const {data:failed}=await supabase.rpc('fail_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_job_id:job.id,p_error:'GENERATION_FAILED',p_payload:providerData||{}});
      return NextResponse.json({success:true,status:'failed',job_id:job.id,item_id:job.item_id,refunded:true,balance:failed?.balance});
    }
    if(task.status!=='finished')return NextResponse.json({success:true,status:'processing',job_id:job.id,item_id:job.item_id,progress:Number(task.progress||0)});
    const file=Array.isArray(task.files)?task.files.find((f:any)=>f?.file_type==='image'&&f?.file_url)||task.files[0]:null;const fileUrl=file?.file_url;if(!fileUrl)return NextResponse.json({success:true,status:'processing',job_id:job.id,item_id:job.item_id,progress:100});
    const download=await fetch(fileUrl,{cache:'no-store'});if(!download.ok)return NextResponse.json({success:true,status:'processing',job_id:job.id,item_id:job.item_id});
    const source=Buffer.from(await download.arrayBuffer());const optimized=await compress(source);
    const {data:token,error:tokenError}=await supabase.rpc('issue_catalog_team_storage_token',{p_access_key:accessKey,p_pin:pin,p_purpose:'generate'});if(tokenError||!token)return NextResponse.json({success:false,error:'STORAGE_TOKEN_FAILED'},{status:500});
    const storagePath=`team/${token}/${job.item_id}/${Date.now()}-${job.id}.webp`;
    const upload=await supabase.storage.from('generated-assets').upload(storagePath,optimized,{contentType:'image/webp',upsert:false,cacheControl:'31536000'});if(upload.error)return NextResponse.json({success:false,error:'UPLOAD_FAILED',detail:upload.error.message},{status:500});
    const {data:pub}=supabase.storage.from('generated-assets').getPublicUrl(storagePath);const imageUrl=pub.publicUrl;
    const compression={format:'webp',quality:WEBP_QUALITY,max_edge:MAX_EDGE,source_bytes:source.length,stored_bytes:optimized.length,reduction_percent:source.length?Math.round((1-optimized.length/source.length)*100):0};
    const {error:completeError}=await supabase.rpc('complete_catalog_team_image_job',{p_access_key:accessKey,p_pin:pin,p_job_id:job.id,p_image_url:imageUrl,p_storage_path:storagePath,p_payload:{...(providerData||{}),compression}});
    if(completeError)return NextResponse.json({success:false,error:'FINALIZE_FAILED'},{status:500});
    return NextResponse.json({success:true,status:'completed',job_id:job.id,item_id:job.item_id,image_url:imageUrl,compression});
  }catch(error){console.error('[Qatalink:OpsImageStatus]',error);return NextResponse.json({success:false,error:'STATUS_FAILED'},{status:500})}
}
