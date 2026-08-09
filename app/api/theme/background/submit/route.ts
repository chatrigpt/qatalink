import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';
const COST=5;

export async function POST(req:NextRequest){
  try{
    const poyoKey=process.env.POYO_API_KEY;
    if(!poyoKey)return NextResponse.json({error:'POYO_API_KEY missing'},{status:503});
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const body=await req.json();const catalogId=String(body?.catalog_id||'');const userPrompt=String(body?.prompt||'').trim();
    if(!catalogId||!userPrompt)return NextResponse.json({error:'catalog_id and prompt required'},{status:400});
    const {data:catalog,error:catError}=await supabase.from('catalogs').select('id,title,business_id').eq('id',catalogId).single();if(catError||!catalog)return NextResponse.json({error:'Catalog not found'},{status:404});
    const [{data:business},{data:wallet}]=await Promise.all([supabase.from('businesses').select('name,business_type').eq('id',catalog.business_id).single(),supabase.from('credit_wallets').select('balance').eq('business_id',catalog.business_id).maybeSingle()]);
    const balance=Number(wallet?.balance||0);if(balance<COST)return NextResponse.json({error:'INSUFFICIENT_CREDITS',balance,required:COST},{status:402});
    const prompt=`Create a premium vertical-friendly background image for a Qatalink digital menu/catalogue. Business: ${business?.name||''}. Sector: ${business?.business_type||'other'}. Catalogue: ${catalog.title}. User direction: ${userPrompt}. The background must remain usable behind text: visually elegant, low clutter in central reading areas, no text, no logos, no watermark, balanced lighting, professional brand atmosphere, high legibility overlay-friendly composition.`;
    const {data:job,error:jobError}=await supabase.from('catalog_background_generation_jobs').insert({business_id:catalog.business_id,catalog_id:catalog.id,prompt,status:'pending',provider:'poyo:gpt-image-2',credit_cost:COST}).select('id').single();
    if(jobError||!job)return NextResponse.json({error:jobError?.message||'Could not create job'},{status:500});
    const {data:newBalance,error:creditError}=await supabase.rpc('consume_background_image_credits',{p_business_id:catalog.business_id,p_job_id:job.id,p_cost:COST});
    if(creditError){await supabase.from('catalog_background_generation_jobs').update({status:'failed',error_message:creditError.message,completed_at:new Date().toISOString()}).eq('id',job.id);return NextResponse.json({error:creditError.message},{status:402});}
    const provider=await fetch('https://api.poyo.ai/api/generate/submit',{method:'POST',headers:{Authorization:`Bearer ${poyoKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-2',input:{prompt,quality:'low',size:'1:1'}}),cache:'no-store'});
    const d:any=await provider.json().catch(()=>null);const taskId=d?.data?.task_id;
    if(!provider.ok||!taskId){await supabase.from('catalog_background_generation_jobs').update({status:'failed',error_message:d?.error?.message||d?.error||'Provider submit failed',provider_payload:d||{},completed_at:new Date().toISOString()}).eq('id',job.id);await supabase.rpc('refund_failed_background_credits',{p_business_id:catalog.business_id,p_job_id:job.id});return NextResponse.json({error:d?.error||'Provider submit failed'},{status:502});}
    await supabase.from('catalog_background_generation_jobs').update({status:'processing',provider_task_id:taskId,provider_payload:d}).eq('id',job.id);
    return NextResponse.json({success:true,job_id:job.id,task_id:taskId,balance:Number(newBalance)});
  }catch(e:any){return NextResponse.json({error:e?.message||'Background generation failed'},{status:500})}
}
