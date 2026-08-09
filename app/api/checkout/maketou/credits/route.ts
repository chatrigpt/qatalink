import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CREDIT_PRODUCT_ID='d873adbc-a2c6-44d4-92f1-67f2a0f2f958';
const CREDIT_PACK_AMOUNT=2000;
const CREDIT_PACK_SIZE=100;
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

export async function POST(req:NextRequest){
  const key=process.env.MAKETOU_API_KEY;
  if(!key)return NextResponse.json({error:'MAKETOU_API_KEY missing'},{status:503});
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({error:'Unauthorized'},{status:401});

    const {data:owned}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);
    const businessId=owned?.[0]?.id;
    if(!businessId)return NextResponse.json({error:'Business not found'},{status:404});

    const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['active']).order('created_at',{ascending:false}).limit(1);
    const sub=subs?.[0];
    const valid=!!sub&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!valid||!['static','interactive','linkhub'].includes(String(sub?.plan_code)))return NextResponse.json({error:'CREDIT_PACK_REQUIRES_PAID_PLAN',message:'Les packs de crédits sont réservés aux abonnés Basic, Interactif et Vitrine.'},{status:403});

    const body=await req.json().catch(()=>({}));
    const fullName=String(user.user_metadata?.full_name||'').trim();
    const parts=fullName.split(/\s+/).filter(Boolean);
    const firstName=body.firstName||parts[0]||'Client';
    const lastName=body.lastName||parts.slice(1).join(' ')||'Qatalink';
    const appUrl=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin;
    const payload={
      productDocumentId:CREDIT_PRODUCT_ID,
      email:user.email||'',
      firstName,
      lastName,
      redirectURL:`${appUrl}/dashboard?payment=pending&kind=credits`,
      meta:{user_id:user.id,business_id:businessId,purchase_type:'credits',credits:CREDIT_PACK_SIZE,plan_code:sub.plan_code}
    };

    const r=await fetch('https://api.maketou.net/api/v1/stores/cart/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),cache:'no-store'});
    const data=await r.json().catch(()=>null);
    if(!r.ok)return NextResponse.json({...data,error:data?.message||data?.error||'Maketou a refusé le panier.'},{status:r.status});

    const cartId=data?.cart?.id||data?.id;
    if(cartId){
      const {error:paymentError}=await supabase.from('payments').insert({business_id:businessId,plan_code:sub.plan_code,provider:'maketou',provider_cart_id:cartId,amount_minor:CREDIT_PACK_AMOUNT,currency_code:'XOF',status:'pending',customer_email:user.email||null,billing_period:'credits',period_months:0,purchase_type:'credits',credits_amount:CREDIT_PACK_SIZE,raw_provider_response:data});
      if(paymentError&&paymentError.code!=='23505')return NextResponse.json({error:paymentError.message},{status:500});
    }
    return NextResponse.json({...data,credits:CREDIT_PACK_SIZE,amount:CREDIT_PACK_AMOUNT},{status:r.status});
  }catch(e:any){return NextResponse.json({error:e?.message||'Credit checkout failed'},{status:500})}
}
