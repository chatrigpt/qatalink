import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function addMonths(base:Date,months:number){const d=new Date(base);d.setMonth(d.getMonth()+months);return d;}

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

    const {cart_id}=await req.json();
    if(!cart_id)return NextResponse.json({error:'cart_id required'},{status:400});

    const {data:payment,error:paymentError}=await supabase.from('payments').select('*').eq('provider','maketou').eq('provider_cart_id',cart_id).maybeSingle();
    if(paymentError)return NextResponse.json({error:paymentError.message},{status:500});
    if(!payment)return NextResponse.json({error:'Payment not found'},{status:404});

    if(payment.status==='completed')return NextResponse.json({status:'completed',payment_id:payment.id});

    const r=await fetch(`https://api.maketou.net/api/v1/stores/cart/${encodeURIComponent(cart_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});
    const data=await r.json();
    if(!r.ok)return NextResponse.json({status:'pending',provider:data},{status:200});
    if(data.status!=='completed')return NextResponse.json({status:data.status||'pending'});

    const amount=Number(data.total_price??payment.amount_minor);
    if(amount!==Number(payment.amount_minor))return NextResponse.json({error:'Payment amount mismatch'},{status:409});

    const now=new Date();
    const periodMonths=Number(payment.period_months||((payment.billing_period==='annual')?12:1));
    const {data:existing}=await supabase.from('subscriptions').select('*').eq('business_id',payment.business_id).order('created_at',{ascending:false}).limit(1);
    const current=existing?.[0];
    const extensionBase=current?.current_period_end&&new Date(current.current_period_end)>now?new Date(current.current_period_end):now;
    const end=addMonths(extensionBase,periodMonths).toISOString();

    if(current){
      const {error:subError}=await supabase.from('subscriptions').update({plan_code:payment.plan_code,provider:'maketou',status:'active',renewal_mode:'manual',current_period_start:now.toISOString(),current_period_end:end,updated_at:now.toISOString()}).eq('id',current.id);
      if(subError)return NextResponse.json({error:subError.message},{status:500});
    }else{
      const {error:subError}=await supabase.from('subscriptions').insert({business_id:payment.business_id,plan_code:payment.plan_code,provider:'maketou',status:'active',renewal_mode:'manual',current_period_start:now.toISOString(),current_period_end:end});
      if(subError)return NextResponse.json({error:subError.message},{status:500});
    }

    const {error:updateError}=await supabase.from('payments').update({status:'completed',completed_at:now.toISOString(),raw_provider_response:data}).eq('id',payment.id).eq('status','pending');
    if(updateError)return NextResponse.json({error:updateError.message},{status:500});

    return NextResponse.json({status:'completed',plan_code:payment.plan_code,billing_period:payment.billing_period||'monthly',current_period_end:end});
  }catch(e:any){return NextResponse.json({error:e.message},{status:500})}
}
