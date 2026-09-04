import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const ADMIN_EMAIL='kouameismael@gmail.com';
const products={starter:{monthly:{id:'73c8f809-3d0b-4976-9ccf-6b8d2b69f362',amount:4900,months:1},annual:{id:'f2c709b7-b79e-4762-adbc-4996bb91199d',amount:53900,months:12}},pro:{monthly:{id:'14ff1299-91b3-41fe-93e1-c378b8bf6e01',amount:14900,months:1},annual:{id:'3cc5a39e-b51b-4de2-a07c-c672f88c4561',amount:163900,months:12}},business:{monthly:{id:'9f54571a-64ba-4e3f-9db9-acb3fe1cbe38',amount:29900,months:1},annual:{id:'00632f66-5485-44a6-b65a-be4c4528237b',amount:328900,months:12}}} as const;
const planCodes={starter:'static',pro:'interactive',business:'linkhub'} as const;
function normalizePaymentKey(value:string|undefined){let key=(value||'').replace(/^\uFEFF/,'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').replace(/[\u200B-\u200D\u2060]/g,'').trim()}

export async function POST(req:NextRequest){
 const key=normalizePaymentKey(process.env.MAKETOU_API_KEY);if(!key)return NextResponse.json({error:'PAYMENT_UNAVAILABLE'},{status:503});
 try{
  const auth=req.headers.get('authorization')||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return NextResponse.json({error:'UNAUTHORIZED'},{status:401});
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});const {data:{user}}=await supabase.auth.getUser(token);if(!user||String(user.email||'').toLowerCase()!==ADMIN_EMAIL)return NextResponse.json({error:'FORBIDDEN'},{status:403});
  const body=await req.json();const email=String(body?.email||'').trim().toLowerCase();const plan=String(body?.plan||'') as keyof typeof products;const billingPeriod=String(body?.billing_period||'monthly') as 'monthly'|'annual';if(!email||!(plan in products)||!['monthly','annual'].includes(billingPeriod))return NextResponse.json({error:'INVALID_REQUEST'},{status:400});
  const {data:target,error:targetError}=await supabase.rpc('admin_prepare_subscription_target',{p_email:email});if(targetError||!target?.business_id)return NextResponse.json({error:targetError?.message||'ACCOUNT_NOT_FOUND'},{status:404});
  const product=products[plan][billingPeriod];const origin=(req.headers.get('origin')||process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin).replace(/\/$/,'');const local=String(target.email||email).split('@')[0].replace(/[._-]+/g,' ').trim();const names=local.split(/\s+/).filter(Boolean);const payload={productDocumentId:product.id,email:target.email||email,firstName:names[0]||'Client',lastName:names.slice(1).join(' ')||'Qatalink',redirectURL:`${origin}/payment/return?kind=subscription`,meta:{user_id:target.user_id,business_id:target.business_id,plan,plan_code:planCodes[plan],billing_period:billingPeriod,period_months:product.months,created_by_admin:user.id}};
  const r=await fetch('https://api.maketou.net/api/v1/stores/cart/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),cache:'no-store'});const data=await r.json().catch(()=>null);if(!r.ok)return NextResponse.json({error:'Impossible de créer le lien de paiement.',provider_status:r.status},{status:r.status});
  const quoted=Number(data?.cart?.total_price??data?.total_price??NaN);if(Number.isFinite(quoted)&&quoted!==product.amount)return NextResponse.json({error:'PAYMENT_PRICE_MISMATCH',expected_amount:product.amount,provider_amount:quoted},{status:409});
  const cartId=data?.cart?.id||data?.id;const redirectUrl=data?.redirectUrl||data?.redirectURL||data?.url||data?.checkout_url||data?.cart?.checkout_url||data?.cart?.url;
  if(cartId){const {error}=await supabase.from('payments').insert({business_id:target.business_id,plan_code:planCodes[plan],provider:'maketou',provider_cart_id:cartId,amount_minor:product.amount,currency_code:'XOF',status:'pending',customer_email:target.email||email,billing_period:billingPeriod,period_months:product.months,raw_provider_response:data});if(error&&error.code!=='23505')return NextResponse.json({error:'PAYMENT_TRACKING_FAILED'},{status:500})}
  if(!redirectUrl)return NextResponse.json({error:'PAYMENT_LINK_UNAVAILABLE',cart_id:cartId},{status:502});return NextResponse.json({success:true,url:redirectUrl,cart_id:cartId,email:target.email,business_id:target.business_id,plan,billing_period:billingPeriod,amount:product.amount});
 }catch(e:any){return NextResponse.json({error:e?.message||'PAYMENT_LINK_FAILED'},{status:500})}
}
