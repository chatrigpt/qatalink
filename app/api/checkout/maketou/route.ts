import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const products={
  basic:{
    monthly:{id:'73c8f809-3d0b-4976-9ccf-6b8d2b69f362',amount:3500,months:1},
    annual:{id:'f2c709b7-b79e-4762-adbc-4996bb91199d',amount:38500,months:12},
  },
  interactive:{
    monthly:{id:'14ff1299-91b3-41fe-93e1-c378b8bf6e01',amount:5000,months:1},
    annual:{id:'3cc5a39e-b51b-4de2-a07c-c672f88c4561',amount:55000,months:12},
  },
  vitrine:{
    monthly:{id:'7424d0a9-a4ea-46be-907c-d5406673bac5',amount:7500,months:1},
    annual:{id:'02e1bf83-34b3-4cb2-bdb7-4ce0efce1053',amount:82500,months:12},
  },
} as const;

const planCodes={basic:'static',interactive:'interactive',vitrine:'linkhub'} as const;
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function normalizePaymentKey(value:string|undefined){
  let key=(value||'').replace(/^\uFEFF/,'').trim();
  if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();
  key=key.replace(/^Bearer\s+/i,'').replace(/[\u200B-\u200D\u2060]/g,'').trim();
  return key;
}

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

    const {plan,firstName,lastName,billingPeriod='monthly'}=await req.json();
    if(!(plan in products))return NextResponse.json({error:'Invalid plan'},{status:400});
    if(!['monthly','annual'].includes(billingPeriod))return NextResponse.json({error:'Invalid billing period'},{status:400});
    const p=plan as keyof typeof products;
    const period=billingPeriod as 'monthly'|'annual';
    const product=products[p][period];

    let businessId:string|undefined;
    const {data:owned}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);
    businessId=owned?.[0]?.id;

    if(!businessId){
      const suffix=user.id.replace(/-/g,'').slice(0,8);
      const {data:created,error:createError}=await supabase.from('businesses').insert({owner_user_id:user.id,name:'Mon entreprise',slug:`mon-entreprise-${suffix}`,business_type:'other',currency_code:'XOF',country_code:'CI'}).select('id').single();
      if(createError||!created)return NextResponse.json({error:'Impossible de préparer votre espace entreprise.'},{status:500});
      businessId=created.id;
    }

    const requestOrigin=req.headers.get('origin');
    const appUrl=(requestOrigin&&/^https?:\/\//i.test(requestOrigin)?requestOrigin:(process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin)).replace(/\/$/,'');
    const payload={
      productDocumentId:product.id,
      email:user.email||'',
      firstName:firstName||'Client',
      lastName:lastName||'Qatalink',
      redirectURL:`${appUrl}/payment/return?kind=subscription`,
      meta:{user_id:user.id,business_id:businessId,plan:p,plan_code:planCodes[p],billing_period:period,period_months:product.months}
    };

    const r=await fetch('https://api.maketou.net/api/v1/stores/cart/checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify(payload),cache:'no-store'});
    const data=await r.json().catch(()=>null);
    if(!r.ok)return NextResponse.json({error:'Impossible de démarrer le paiement.',provider_status:r.status},{status:r.status});

    const cartId=data?.cart?.id||data?.id;
    if(cartId){
      const {error:paymentError}=await supabase.from('payments').insert({business_id:businessId,plan_code:planCodes[p],provider:'maketou',provider_cart_id:cartId,amount_minor:product.amount,currency_code:'XOF',status:'pending',customer_email:user.email||null,billing_period:period,period_months:product.months,raw_provider_response:data});
      if(paymentError && paymentError.code!=='23505')return NextResponse.json({error:'Impossible de préparer le suivi du paiement.'},{status:500});
    }

    return NextResponse.json(data,{status:r.status});
  }catch{return NextResponse.json({error:'Impossible de démarrer le paiement.'},{status:500})}
}
