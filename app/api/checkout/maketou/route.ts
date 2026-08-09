import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const productIds={basic:'73c8f809-3d0b-4976-9ccf-6b8d2b69f362',interactive:'14ff1299-91b3-41fe-93e1-c378b8bf6e01',vitrine:'7424d0a9-a4ea-46be-907c-d5406673bac5'} as const;
const monthlyPrices={basic:3500,interactive:5000,vitrine:7500} as const;
const planCodes={basic:'static',interactive:'interactive',vitrine:'linkhub'} as const;
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

    const {plan,firstName,lastName,billingPeriod='monthly'}=await req.json();
    if(!(plan in productIds))return NextResponse.json({error:'Invalid plan'},{status:400});
    if(!['monthly','annual'].includes(billingPeriod))return NextResponse.json({error:'Invalid billing period'},{status:400});
    const p=plan as keyof typeof productIds;
    const periodMonths=billingPeriod==='annual'?12:1;
    const amount=monthlyPrices[p]*periodMonths;

    let businessId:string|undefined;
    const {data:owned}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);
    businessId=owned?.[0]?.id;

    if(!businessId){
      const suffix=user.id.replace(/-/g,'').slice(0,8);
      const {data:created,error:createError}=await supabase.from('businesses').insert({owner_user_id:user.id,name:'Mon entreprise',slug:`mon-entreprise-${suffix}`,business_type:'other',currency_code:'XOF',country_code:'CI'}).select('id').single();
      if(createError||!created)return NextResponse.json({error:createError?.message||'Impossible de préparer votre espace entreprise.'},{status:500});
      businessId=created.id;
    }

    const appUrl=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin;
    const payload={
      productDocumentId:productIds[p],
      email:user.email||'',
      firstName:firstName||'Client',
      lastName:lastName||'Qatalink',
      customerPrice:amount,
      redirectURL:`${appUrl}/dashboard?payment=pending`,
      meta:{user_id:user.id,business_id:businessId,plan:p,plan_code:planCodes[p],billing_period:billingPeriod,period_months:periodMonths}
    };

    const r=await fetch('https://api.maketou.net/api/v1/stores/cart/checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify(payload),cache:'no-store'});
    const data=await r.json();
    if(!r.ok){
      const providerMessage=data?.message||data?.error||'Maketou a refusé le panier.';
      const hint=billingPeriod==='annual'?' Vérifiez que ce produit Maketou est configuré en « Prix libre » pour accepter le montant annuel.':'';
      return NextResponse.json({...data,error:`${providerMessage}${hint}`},{status:r.status});
    }

    const cartId=data.cart?.id||data.id;
    if(cartId){
      const {error:paymentError}=await supabase.from('payments').insert({business_id:businessId,plan_code:planCodes[p],provider:'maketou',provider_cart_id:cartId,amount_minor:amount,currency_code:'XOF',status:'pending',customer_email:user.email||null,billing_period:billingPeriod,period_months:periodMonths,raw_provider_response:data});
      if(paymentError && paymentError.code!=='23505')return NextResponse.json({error:paymentError.message},{status:500});
    }

    return NextResponse.json(data,{status:r.status});
  }catch(e:any){return NextResponse.json({error:e.message},{status:500})}
}
