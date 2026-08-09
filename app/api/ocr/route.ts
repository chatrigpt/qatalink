import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const OCR_WEBHOOK='https://digitaladn225.app.n8n.cloud/webhook/qatalink-ocr';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const {data:subs,error:subError}=await supabase.from('subscriptions').select('status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
    if(subError)return NextResponse.json({success:false,error:'Subscription check failed'},{status:500});
    const sub=subs?.[0];
    const valid=!!sub&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!valid)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const body=await req.json();
    const payload={job_id:crypto.randomUUID(),schema_target:'qatalink_catalog_v1',...body,options:{extract_prices:true,extract_descriptions:true,group_into_categories:true,generate_item_image_prompts:true,normalize_spelling:true,preserve_raw_text:true,...body.options}};
    const r=await fetch(OCR_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
    const text=await r.text();
    let data:any;try{data=JSON.parse(text)}catch{data={success:false,status:'invalid_json',raw:text}}
    return NextResponse.json(data,{status:r.ok?200:r.status});
  }catch(e:any){return NextResponse.json({success:false,error:e.message},{status:500})}
}
