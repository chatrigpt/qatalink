import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';
function extFor(ct:string,url:string){if(ct.includes('webp'))return'webp';if(ct.includes('jpeg')||ct.includes('jpg'))return'jpg';if(ct.includes('png'))return'png';return url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i)?.[1]||'png'}

export async function POST(req:NextRequest){
  try{
    const poyoKey=process.env.POYO_API_KEY;if(!poyoKey)return NextResponse.json({error:'POYO_API_KEY missing'},{status:503});
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const body=await req.json();const jobId=String(body?.job_id||'');if(!jobId)return NextResponse.json({error:'job_id required'},{status:400});
    const {data:job,error:jobError}=await supabase.from('catalog_background_generation_jobs').select('*').eq('id',jobId).single();if(jobError||!job)return NextResponse.json({error:'Job not found'},{status:404});
    if(job.status==='completed')return NextResponse.json({success:true,status:'completed',image_url:job.result_image_url});
    if(job.status==='failed')return NextResponse.json({success:false,status:'failed',error:job.error_message,refunded:job.credit_refunded});
    const provider=await fetch(`https://api.poyo.ai/api/generate/status/${encodeURIComponent(job.provider_task_id)}`,{headers:{Authorization:`Bearer ${poyoKey}`},cache:'no-store'});const d:any=await provider.json().catch(()=>null);if(!provider.ok)return NextResponse.json({success:true,status:'processing'});
    const task=d?.data||{};
    if(task.status==='failed'){
      await supabase.from('catalog_background_generation_jobs').update({status:'failed',error_message:task.error_message||task.error||'Generation failed',provider_payload:d,completed_at:new Date().toISOString()}).eq('id',job.id);
      await supabase.rpc('refund_failed_background_credits',{p_business_id:job.business_id,p_job_id:job.id});
      return NextResponse.json({success:false,status:'failed',error:task.error_message||task.error||'Generation failed',refunded:true});
    }
    if(task.status!=='finished'){await supabase.from('catalog_background_generation_jobs').update({status:'processing',provider_payload:d}).eq('id',job.id);return NextResponse.json({success:true,status:'processing',progress:Number(task.progress||0)});}
    const file=Array.isArray(task.files)?task.files.find((f:any)=>f?.file_type==='image'&&f?.file_url)||task.files[0]:null;const fileUrl=file?.file_url;if(!fileUrl)return NextResponse.json({success:true,status:'processing',progress:100});
    const dl=await fetch(fileUrl,{cache:'no-store'});if(!dl.ok)return NextResponse.json({success:true,status:'processing',error:'Download pending'});
    const ct=dl.headers.get('content-type')||'image/png';const ext=extFor(ct,fileUrl);const bytes=Buffer.from(await dl.arrayBuffer());const path=`${user.id}/backgrounds/${job.catalog_id}/${Date.now()}-${job.id}.${ext}`;
    const up=await supabase.storage.from('generated-assets').upload(path,bytes,{contentType:ct,upsert:false,cacheControl:'31536000'});if(up.error)return NextResponse.json({success:true,status:'processing',error:up.error.message});
    const {data:u}=supabase.storage.from('generated-assets').getPublicUrl(path);const imageUrl=u.publicUrl;
    await supabase.from('catalog_theme_settings').upsert({catalog_id:job.catalog_id,background_image_url:imageUrl,background_mode:'solid',updated_at:new Date().toISOString()},{onConflict:'catalog_id'});
    await Promise.all([supabase.from('businesses').update({published:true}).eq('id',job.business_id),supabase.from('catalogs').update({is_active:true}).eq('id',job.catalog_id)]);
    await supabase.from('catalog_background_generation_jobs').update({status:'completed',result_image_url:imageUrl,provider_payload:d,completed_at:new Date().toISOString()}).eq('id',job.id);
    return NextResponse.json({success:true,status:'completed',image_url:imageUrl});
  }catch(e:any){return NextResponse.json({error:e?.message||'Status failed'},{status:500})}
}
