import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
function normalizePoyoKey(value:string|undefined){let key=(value||'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();key=key.replace(/^Bearer\s+/i,'').trim();return key}
function extensionFor(contentType:string,url:string){if(contentType.includes('webp'))return'webp';if(contentType.includes('jpeg')||contentType.includes('jpg'))return'jpg';if(contentType.includes('png'))return'png';return url.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/)?.[1]?.toLowerCase()||'png'}
async function refund(supabase:any,job:any){if(job.credit_debited&&!job.credit_refunded){const {data}=await supabase.rpc('refund_failed_image_credits',{p_business_id:job.business_id,p_job_id:job.id});return data===null||data===undefined?null:Number(data)}return null}
async function submitFallback(key:string,prompt:string){const r=await fetch('https://api.poyo.ai/api/generate/submit',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'nano-banana-2-new',input:{prompt,size:'1:1',resolution:'2K'}}),cache:'no-store'});const data:any=await r.json().catch(()=>null);return {ok:r.ok&&!!data?.data?.task_id,status:r.status,data,taskId:data?.data?.task_id}}

export async function POST(req:NextRequest){
  try{
    const key=normalizePoyoKey(process.env.POYO_API_KEY);if(!key)return NextResponse.json({success:false,error:'GENERATION_UNAVAILABLE'},{status:503});
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const body=await req.json();const jobIds=(Array.isArray(body?.job_ids)?body.job_ids:[body?.job_id]).filter(Boolean).slice(0,50);if(!jobIds.length)return NextResponse.json({success:false,error:'NO_JOBS'},{status:400});
    const results:any[]=[];
    for(const jobId of jobIds){
      const {data:job}=await supabase.from('item_image_generation_jobs').select('*').eq('id',jobId).maybeSingle();if(!job){results.push({job_id:jobId,status:'failed',error:'JOB_UNAVAILABLE'});continue}
      if(job.status==='completed'){results.push({job_id:job.id,item_id:job.item_id,status:'completed',image_url:job.result_image_url});continue}
      if(job.status==='failed'){results.push({job_id:job.id,item_id:job.item_id,status:'failed',error:'GENERATION_FAILED',refunded:job.credit_refunded});continue}
      if(!job.provider_task_id){await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:'MISSING_TASK',completed_at:new Date().toISOString()}).eq('id',job.id);const balance=await refund(supabase,job);results.push({job_id:job.id,item_id:job.item_id,status:'failed',error:'GENERATION_FAILED',refunded:true,balance});continue}
      const provider=await fetch(`https://api.poyo.ai/api/generate/status/${encodeURIComponent(job.provider_task_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});const providerData:any=await provider.json().catch(()=>null);if(provider.status===401){await supabase.from('item_image_generation_jobs').update({error_message:'POYO_AUTH_FAILED',provider_payload:{...(providerData||{}),http_status:401}}).eq('id',job.id);results.push({job_id:job.id,item_id:job.item_id,status:'processing',error:'POYO_AUTH_FAILED'});continue}if(!provider.ok){results.push({job_id:job.id,item_id:job.item_id,status:'processing'});continue}
      const task=providerData?.data||{};
      if(task.status==='failed'){
        const alreadyFallback=String(job.provider||'').includes('nano-banana');
        if(!alreadyFallback){const fb=await submitFallback(key,job.prompt);if(fb.ok){await supabase.from('item_image_generation_jobs').update({status:'processing',provider:'poyo:nano-banana-2-new',provider_task_id:fb.taskId,provider_payload:{...fb.data,fallback_used:true},error_message:null}).eq('id',job.id);results.push({job_id:job.id,item_id:job.item_id,status:'processing',fallback:true});continue}}
        await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:'GENERATION_FAILED',provider_payload:providerData||{},completed_at:new Date().toISOString()}).eq('id',job.id);const balance=await refund(supabase,job);results.push({job_id:job.id,item_id:job.item_id,status:'failed',error:'GENERATION_FAILED',refunded:true,balance});continue
      }
      if(task.status!=='finished'){await supabase.from('item_image_generation_jobs').update({status:'processing',provider_payload:providerData}).eq('id',job.id);results.push({job_id:job.id,item_id:job.item_id,status:'processing',progress:Number(task.progress||0)});continue}
      const file=Array.isArray(task.files)?task.files.find((f:any)=>f?.file_type==='image'&&f?.file_url)||task.files[0]:null;const fileUrl=file?.file_url;if(!fileUrl){results.push({job_id:job.id,item_id:job.item_id,status:'processing',progress:100});continue}
      const download=await fetch(fileUrl,{cache:'no-store'});if(!download.ok){results.push({job_id:job.id,item_id:job.item_id,status:'processing'});continue}
      const contentType=download.headers.get('content-type')||'image/png';const ext=extensionFor(contentType,fileUrl);const bytes=Buffer.from(await download.arrayBuffer());const storagePath=`${user.id}/${job.item_id}/${Date.now()}-${job.id}.${ext}`;const upload=await supabase.storage.from('generated-assets').upload(storagePath,bytes,{contentType,upsert:false,cacheControl:'31536000'});if(upload.error){results.push({job_id:job.id,item_id:job.item_id,status:'processing'});continue}
      const {data:publicUrlData}=supabase.storage.from('generated-assets').getPublicUrl(storagePath);const imageUrl=publicUrlData.publicUrl;const {data:item}=await supabase.from('items').select('name').eq('id',job.item_id).maybeSingle();await supabase.from('item_images').update({is_primary:false}).eq('item_id',job.item_id).eq('is_primary',true);const {error:imageError}=await supabase.from('item_images').insert({item_id:job.item_id,image_url:imageUrl,storage_path:storagePath,alt_text:item?.name||'Illustration',is_primary:true,sort_order:0,source:'generated',prompt_used:job.prompt,generation_status:'completed'});if(imageError){results.push({job_id:job.id,item_id:job.item_id,status:'processing'});continue}await supabase.from('item_image_generation_jobs').update({status:'completed',result_image_url:imageUrl,provider_payload:providerData,error_message:null,completed_at:new Date().toISOString()}).eq('id',job.id);results.push({job_id:job.id,item_id:job.item_id,status:'completed',image_url:imageUrl,credit_cost:job.credit_cost||5});
    }
    return NextResponse.json({success:true,results});
  }catch{return NextResponse.json({success:false,error:'STATUS_FAILED'},{status:500})}
}
