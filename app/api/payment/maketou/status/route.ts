import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function addMonths(base:Date,months:number){const d=new Date(base);d.setMonth(d.getMonth()+months);return d;}
function normalizePaymentKey(value:string|undefined){let key=(value||'').replace(/^\uFEFF/,'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').replace(/[\u200B-\u200D\u2060]/g,'').trim();}

export async function POST(req:NextRequest){
  const key=normalizePaymentKey(process.env.MAKETOU_API_KEY);
  if(!key)return NextResponse.json({error:'PAYMENT_UNAVAILABLE'},{status:503});
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'SESSION_EXPIRED',message:'Votre session a expiré. Actualisez la page puis réessayez.'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({error:'SESSION_EXPIRED',message:'Votre session a expiré. Actualisez la page puis réessayez.'},{status:401});

    const body=await req.json().catch(()=>({}));
    const requestedCartId=String(body?.cart_id||'').trim();
    const {data:owned}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id);
    const businessIds=(owned||[]).map((b:any)=>String(b.id));
    if(!businessIds.length)return NextResponse.json({error:'Payment not found'},{status:404});

    let q=supabase.from('payments').select('*').eq('provider','maketou').in('business_id',businessIds);
    q=requestedCartId?q.eq('provider_cart_id',requestedCartId):q.order('created_at',{ascending:false}).limit(1);
    const {data:rows,error:paymentError}=await q;
    if(paymentError)return NextResponse.json({error:'Impossible de vérifier le paiement.'},{status:500});
    const payment=Array.isArray(rows)?rows[0]:rows;
    if(!payment)return NextResponse.json({error:'Payment not found'},{status:404});
    if(!businessIds.includes(String(payment.business_id)))return NextResponse.json({error:'Unauthorized'},{status:403});

    if(payment.status==='completed'){
      const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',payment.business_id).maybeSingle();
      return NextResponse.json({status:'completed',payment_id:payment.id,purchase_type:payment.purchase_type||'subscription',plan_code:payment.plan_code,credits_added:Number(payment.credits_amount||0),credit_balance:Number(wallet?.balance||0)});
    }

    const r=await fetch(`https://api.maketou.net/api/v1/stores/cart/${encodeURIComponent(payment.provider_cart_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({status:'pending'});
    if(data.status!=='completed')return NextResponse.json({status:data.status||'pending'});

    const amount=Number(data.total_price??payment.amount_minor);
    if(amount!==Number(payment.amount_minor))return NextResponse.json({error:'PAYMENT_VALIDATION_FAILED'},{status:409});

    const now=new Date();

    if(payment.purchase_type==='credits'){
      const {error:updateError}=await supabase.from('payments').update({status:'completed',completed_at:now.toISOString(),raw_provider_response:data}).eq('id',payment.id).eq('status','pending');
      if(updateError)return NextResponse.json({error:'Impossible de finaliser le paiement.'},{status:500});
      const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',payment.business_id).maybeSingle();
      return NextResponse.json({status:'completed',purchase_type:'credits',credits_added:Number(payment.credits_amount||0),credit_balance:Number(wallet?.balance||0)});
    }

    const periodMonths=Number(payment.period_months||((payment.billing_period==='annual')?12:1));
    const {data:existing}=await supabase.from('subscriptions').select('*').eq('business_id',payment.business_id).order('created_at',{ascending:false}).limit(1);
    const current=existing?.[0];
    const extensionBase=current?.current_period_end&&new Date(current.current_period_end)>now?new Date(current.current_period_end):now;
    const end=addMonths(extensionBase,periodMonths).toISOString();

    if(current){
      const {error:subError}=await supabase.from('subscriptions').update({plan_code:payment.plan_code,provider:'maketou',status:'active',renewal_mode:'manual',current_period_start:now.toISOString(),current_period_end:end,updated_at:now.toISOString()}).eq('id',current.id);
      if(subError)return NextResponse.json({error:'Impossible d’activer votre formule.'},{status:500});
    }else{
      const {error:subError}=await supabase.from('subscriptions').insert({business_id:payment.business_id,plan_code:payment.plan_code,provider:'maketou',status:'active',renewal_mode:'manual',current_period_start:now.toISOString(),current_period_end:end});
      if(subError)return NextResponse.json({error:'Impossible d’activer votre formule.'},{status:500});
    }

    const {error:updateError}=await supabase.from('payments').update({status:'completed',completed_at:now.toISOString(),raw_provider_response:data}).eq('id',payment.id).eq('status','pending');
    if(updateError)return NextResponse.json({error:'Impossible de finaliser le paiement.'},{status:500});

    const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',payment.business_id).maybeSingle();
    return NextResponse.json({status:'completed',purchase_type:'subscription',plan_code:payment.plan_code,billing_period:payment.billing_period||'monthly',current_period_end:end,credit_balance:Number(wallet?.balance||0)});
  }catch{return NextResponse.json({error:'Impossible de vérifier le paiement.'},{status:500})}
}
