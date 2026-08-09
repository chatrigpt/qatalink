import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';
const IMAGE_CREDIT_COST=5;

function buildPrompt(input:{businessName:string;businessType:string;catalogTitle:string;categoryName:string;itemName:string;description:string;seedPrompt:string}){
  return `Create a square 1:1 premium commercial illustration for a Qatalink digital menu/catalogue item.
Business: ${input.businessName || 'Business'}
Sector: ${input.businessType || 'general retail/service'}
Catalogue: ${input.catalogTitle || 'Catalogue'}
Category: ${input.categoryName || 'General'}
Item: ${input.itemName}
Description: ${input.description || 'No additional description'}
Existing visual hint: ${input.seedPrompt || 'None'}

Requirements:
- Represent the exact item clearly and faithfully.
- Adapt the visual language to the sector: appetizing restaurant photography for food, clean studio product photography for retail, elegant service/lifestyle visualization for spa or hotel, realistic property presentation for real estate.
- Premium commercial quality, clean composition, realistic lighting, subject easy to recognize at small mobile-card size.
- Single hero subject or coherent serving when appropriate.
- No text, no letters, no price labels, no watermark, no logos unless the item itself inherently contains packaging branding described by the user.
- No unrelated props that could confuse the product identity.
- Neutral or softly contextual background, strong separation of subject from background.
- Square 1:1 composition.`;
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

    const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end,business_id').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
    const sub=subs?.[0];
    const hasAccess=!!sub&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!hasAccess)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});
    if(!['trial','interactive','linkhub'].includes(String(sub.plan_code)))return NextResponse.json({success:false,error:'IMAGE_GENERATION_NOT_INCLUDED',message:'La génération d’images est disponible avec Interactif ou Vitrine.'},{status:403});

    const body=await req.json();
    const ids=(Array.isArray(body?.item_ids)?body.item_ids:[body?.item_id]).filter(Boolean).slice(0,50);
    if(!ids.length)return NextResponse.json({success:false,error:'item_id or item_ids required'},{status:400});

    const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',sub.business_id).maybeSingle();
    const required=ids.length*IMAGE_CREDIT_COST;
    const currentBalance=Number(wallet?.balance||0);
    if(currentBalance<required)return NextResponse.json({success:false,error:'INSUFFICIENT_CREDITS',message:`Il faut ${required} crédits pour générer ${ids.length} image(s).`,balance:currentBalance,required},{status:402});

    const jobs:any[]=[];
    let lastBalance=currentBalance;

    for(const itemId of ids){
      const {data:item,error:itemError}=await supabase.from('items').select('id,name,description,short_description,metadata,catalog_id,category_id').eq('id',itemId).single();
      if(itemError||!item){jobs.push({item_id:itemId,error:itemError?.message||'Item not found'});continue;}
      const {data:catalog}=await supabase.from('catalogs').select('id,title,business_id').eq('id',item.catalog_id).single();
      if(!catalog){jobs.push({item_id:itemId,error:'Catalog not found'});continue;}
      const {data:business}=await supabase.from('businesses').select('name,business_type').eq('id',catalog.business_id).single();
      const {data:category}=item.category_id?await supabase.from('categories').select('name').eq('id',item.category_id).maybeSingle():{data:null};
      const prompt=buildPrompt({businessName:business?.name||'',businessType:business?.business_type||'',catalogTitle:catalog.title||'',categoryName:category?.name||'',itemName:item.name,description:item.description||item.short_description||'',seedPrompt:item.metadata?.image_prompt||''});

      const {data:job,error:jobError}=await supabase.from('item_image_generation_jobs').insert({business_id:catalog.business_id,item_id:item.id,prompt,status:'pending',provider:'poyo:gpt-image-2',credit_cost:IMAGE_CREDIT_COST}).select('id').single();
      if(jobError||!job){jobs.push({item_id:itemId,error:jobError?.message||'Could not save generation job'});continue;}

      const {data:balanceAfter,error:creditError}=await supabase.rpc('consume_image_credits',{p_business_id:catalog.business_id,p_job_id:job.id,p_cost:IMAGE_CREDIT_COST});
      if(creditError){
        await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:creditError.message,completed_at:new Date().toISOString()}).eq('id',job.id);
        jobs.push({item_id:itemId,job_id:job.id,error:creditError.message});
        continue;
      }
      lastBalance=Number(balanceAfter??lastBalance-IMAGE_CREDIT_COST);

      const provider=await fetch('https://api.poyo.ai/api/generate/submit',{
        method:'POST',
        headers:{Authorization:`Bearer ${poyoKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({model:'gpt-image-2',input:{prompt,quality:'low',size:'1:1'}}),
        cache:'no-store'
      });
      const providerData=await provider.json().catch(()=>null);
      if(!provider.ok){
        await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:providerData?.error?.message||providerData?.error||'PoYo submit failed',provider_payload:providerData||{},completed_at:new Date().toISOString()}).eq('id',job.id);
        const {data:refunded}=await supabase.rpc('refund_failed_image_credits',{p_business_id:catalog.business_id,p_job_id:job.id});
        if(refunded!==null)lastBalance=Number(refunded);
        jobs.push({item_id:itemId,job_id:job.id,error:providerData?.error?.message||providerData?.error||'PoYo submit failed',refunded:true});
        continue;
      }
      const taskId=providerData?.data?.task_id;
      if(!taskId){
        await supabase.from('item_image_generation_jobs').update({status:'failed',error_message:'PoYo did not return task_id',provider_payload:providerData||{},completed_at:new Date().toISOString()}).eq('id',job.id);
        const {data:refunded}=await supabase.rpc('refund_failed_image_credits',{p_business_id:catalog.business_id,p_job_id:job.id});
        if(refunded!==null)lastBalance=Number(refunded);
        jobs.push({item_id:itemId,job_id:job.id,error:'PoYo did not return task_id',refunded:true});
        continue;
      }

      const {error:updateError}=await supabase.from('item_image_generation_jobs').update({status:'processing',provider_task_id:taskId,provider_payload:providerData}).eq('id',job.id);
      if(updateError){jobs.push({item_id:itemId,job_id:job.id,error:updateError.message});continue;}
      jobs.push({item_id:itemId,job_id:job.id,task_id:taskId,status:'processing',credit_cost:IMAGE_CREDIT_COST,balance:lastBalance});
    }

    return NextResponse.json({success:true,jobs,credit_cost_per_image:IMAGE_CREDIT_COST,balance:lastBalance});
  }catch(e:any){return NextResponse.json({success:false,error:e?.message||'Generation submit failed'},{status:500})}
}
