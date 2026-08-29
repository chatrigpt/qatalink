import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime='nodejs';
export const maxDuration=60;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
function normalizeKey(value:string|undefined){let key=(value||'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').trim()}

async function refund(supabase:any,job:any){
  const {data}=await supabase.rpc('refund_ai_credits',{p_business_id:job.business_id,p_kind:'marketing_asset_generation',p_reference_id:String(job.id),p_refund_kind:'marketing_asset_generation_refund'});
  return data===null||data===undefined?null:Number(data);
}

export async function POST(req:NextRequest){
  try{
    const key=normalizeKey(process.env.POYO_API_KEY);if(!key)return NextResponse.json({success:false,error:'GENERATION_UNAVAILABLE'},{status:503});
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const body=await req.json();const jobId=String(body?.job_id||'').trim();if(!jobId)return NextResponse.json({success:false,error:'JOB_REQUIRED'},{status:400});
    const {data:job}=await supabase.from('marketing_asset_generation_jobs').select('*').eq('id',jobId).maybeSingle();
    if(!job)return NextResponse.json({success:false,error:'JOB_UNAVAILABLE'},{status:404});
    if(job.status==='completed')return NextResponse.json({success:true,status:'completed',job_id:job.id,image_url:job.result_image_url,credit_cost:job.credit_cost});
    if(job.status==='failed')return NextResponse.json({success:false,status:'failed',job_id:job.id,error:job.error_message||'GENERATION_FAILED'},{status:409});
    if(!job.provider_task_id){await supabase.from('marketing_asset_generation_jobs').update({status:'failed',error_message:'MISSING_TASK',completed_at:new Date().toISOString()}).eq('id',job.id);const balance=await refund(supabase,job);return NextResponse.json({success:false,status:'failed',error:'GENERATION_FAILED',refunded:true,balance},{status:409})}

    const provider=await fetch(`https://api.poyo.ai/api/generate/status/${encodeURIComponent(job.provider_task_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});
    const providerData:any=await provider.json().catch(()=>null);
    if(!provider.ok)return NextResponse.json({success:true,status:'processing',job_id:job.id});
    const task=providerData?.data||{};
    if(task.status==='failed'){
      await supabase.from('marketing_asset_generation_jobs').update({status:'failed',error_message:'GENERATION_FAILED',provider_payload:providerData||{},completed_at:new Date().toISOString()}).eq('id',job.id);
      const balance=await refund(supabase,job);
      return NextResponse.json({success:false,status:'failed',error:'GENERATION_FAILED',refunded:true,balance},{status:409});
    }
    if(task.status!=='finished'){
      await supabase.from('marketing_asset_generation_jobs').update({status:'processing',provider_payload:providerData||{}}).eq('id',job.id);
      return NextResponse.json({success:true,status:'processing',job_id:job.id,progress:Number(task.progress||0)});
    }
    const file=Array.isArray(task.files)?task.files.find((f:any)=>f?.file_type==='image'&&f?.file_url)||task.files[0]:null;
    const fileUrl=file?.file_url;if(!fileUrl)return NextResponse.json({success:true,status:'processing',job_id:job.id,progress:100});
    const download=await fetch(fileUrl,{cache:'no-store'});if(!download.ok)return NextResponse.json({success:true,status:'processing',job_id:job.id,progress:100});
    const source=Buffer.from(await download.arrayBuffer());
    const bytes=await sharp(source,{failOn:'none'}).rotate().resize({width:1600,height:2200,fit:'inside',withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toBuffer();
    const storagePath=`${user.id}/marketing/${job.business_id}/${Date.now()}-${job.id}.jpg`;
    const upload=await supabase.storage.from('generated-assets').upload(storagePath,bytes,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});
    if(upload.error)return NextResponse.json({success:true,status:'processing',job_id:job.id,progress:100});
    const {data:pub}=supabase.storage.from('generated-assets').getPublicUrl(storagePath);const imageUrl=pub.publicUrl;
    await supabase.from('marketing_asset_generation_jobs').update({status:'completed',result_image_url:imageUrl,storage_path:storagePath,provider_payload:providerData||{},error_message:null,completed_at:new Date().toISOString()}).eq('id',job.id);
    return NextResponse.json({success:true,status:'completed',job_id:job.id,image_url:imageUrl,credit_cost:job.credit_cost});
  }catch(error){console.error('[Qatalink:MarketingAssetStatus]',error);return NextResponse.json({success:false,error:'STATUS_FAILED'},{status:500})}
}
