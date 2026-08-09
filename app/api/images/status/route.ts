import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function extensionFor(contentType:string,url:string){
  if(contentType.includes('webp'))return 'webp';
  if(contentType.includes('jpeg')||contentType.includes('jpg'))return 'jpg';
  if(contentType.includes('png'))return 'png';
  const match=url.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  return match?.[1]?.toLowerCase()||'png';
}

async function failAndRefund(supabase:any,job:any,message:string,providerData:any){
  await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:message,provider_payload:providerData||{},completed_at:new Date().toISOString()}).eq('id',job.id);
  let balance:null|number=null;
  if(job.credit_debited&&!job.credit_refunded){
    const {data}=await supabase.rpc('refund_failed_image_credits',{p_business_id:job.business_id,p_job_id:job.id});
    if(data!==null&&data!==undefined)balance=Number(data);
  }
  return balance;
}

export async function POST(req:NextRequest){
  try{
    const poyoKey=process.env.POYO_API_KEY;
    if(!poyoKey)return NextResponse.json({success:false,error:'POYO_API_KEY missing'},{status:503});
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const body=await req.json();
    const jobIds=(Array.isArray(body?.job_ids)?body.job_ids:[body?.job_id]).filter(Boolean).slice(0,50);
    if(!jobIds.length)return NextResponse.json({success:false,error:'job_id or job_ids required'},{status:400});

    const results:any[]=[];
    for(const jobId of jobIds){
      const {data:job,error:jobError}=await supabase.from('item_image_generation_jobs').select('*').eq('id',jobId).maybeSingle();
      if(jobError||!job){results.push({job_id:jobId,status:'failed',error:jobError?.message||'Job not found'});continue;}
      if(job.status==='completed'){results.push({job_id:job.id,item_id:job.item_id,status:'completed',image_url:job.result_image_url});continue;}
      if(job.status==='failed'){results.push({job_id:job.id,item_id:job.item_id,status:'failed',error:job.error_message,refunded:job.credit_refunded});continue;}
      if(!job.provider_task_id){
        const balance=await failAndRefund(supabase,job,'Missing provider task id',{});
        results.push({job_id:job.id,item_id:job.item_id,status:'failed',error:'Missing provider task id',refunded:true,balance});continue;
      }

      const provider=await fetch(`https://api.poyo.ai/api/generate/status/${encodeURIComponent(job.provider_task_id)}`,{headers:{Authorization:`Bearer ${poyoKey}`},cache:'no-store'});
      const providerData=await provider.json().catch(()=>null);
      if(!provider.ok){results.push({job_id:job.id,item_id:job.item_id,status:'processing',error:providerData?.error?.message||'Provider status unavailable'});continue;}
      const task=providerData?.data||{};

      if(task.status==='failed'){
        const message=task.error_message||task.error||'Generation failed';
        const balance=await failAndRefund(supabase,job,message,providerData);
        results.push({job_id:job.id,item_id:job.item_id,status:'failed',error:message,refunded:true,balance});
        continue;
      }
      if(task.status!=='finished'){
        await supabase.from('item_image_generation_jobs').update({status:'processing',provider_payload:providerData}).eq('id',job.id);
        results.push({job_id:job.id,item_id:job.item_id,status:'processing',progress:Number(task.progress||0)});
        continue;
      }

      const file=Array.isArray(task.files)?task.files.find((f:any)=>f?.file_type==='image'&&f?.file_url)||task.files[0]:null;
      const fileUrl=file?.file_url;
      if(!fileUrl){results.push({job_id:job.id,item_id:job.item_id,status:'processing',progress:100,error:'Result file not ready'});continue;}

      const download=await fetch(fileUrl,{cache:'no-store'});
      if(!download.ok){results.push({job_id:job.id,item_id:job.item_id,status:'processing',error:'Could not download generated image'});continue;}
      const contentType=download.headers.get('content-type')||'image/png';
      const ext=extensionFor(contentType,fileUrl);
      const bytes=Buffer.from(await download.arrayBuffer());
      const storagePath=`${user.id}/${job.item_id}/${Date.now()}-${job.id}.${ext}`;
      const upload=await supabase.storage.from('generated-assets').upload(storagePath,bytes,{contentType,upsert:false,cacheControl:'31536000'});
      if(upload.error){results.push({job_id:job.id,item_id:job.item_id,status:'processing',error:`Supabase upload: ${upload.error.message}`});continue;}
      const {data:publicUrlData}=supabase.storage.from('generated-assets').getPublicUrl(storagePath);
      const imageUrl=publicUrlData.publicUrl;
      const {data:item}=await supabase.from('items').select('name').eq('id',job.item_id).maybeSingle();

      await supabase.from('item_images').update({is_primary:false}).eq('item_id',job.item_id).eq('is_primary',true);
      const {error:imageError}=await supabase.from('item_images').insert({item_id:job.item_id,image_url:imageUrl,storage_path:storagePath,alt_text:item?.name||'Illustration',is_primary:true,sort_order:0,source:'generated',prompt_used:job.prompt,generation_status:'completed'});
      if(imageError){results.push({job_id:job.id,item_id:job.item_id,status:'processing',error:imageError.message});continue;}
      await supabase.from('item_image_generation_jobs').update({status:'completed',result_image_url:imageUrl,provider_payload:providerData,error_message:null,completed_at:new Date().toISOString()}).eq('id',job.id);
      results.push({job_id:job.id,item_id:job.item_id,status:'completed',image_url:imageUrl,credit_cost:job.credit_cost||5});
    }

    return NextResponse.json({success:true,results});
  }catch(e:any){return NextResponse.json({success:false,error:e?.message||'Status check failed'},{status:500})}
}
