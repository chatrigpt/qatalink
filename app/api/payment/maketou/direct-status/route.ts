import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
function normalizePaymentKey(value:string|undefined){let key=(value||'').replace(/^\uFEFF/,'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').replace(/[\u200B-\u200D\u2060]/g,'').trim()}
function planLabel(code:string){if(code==='interactive')return'Pro';if(code==='linkhub')return'Business';if(code==='static')return'Starter';return code||'Qatalink'}

export async function GET(req:NextRequest){
 const key=normalizePaymentKey(process.env.MAKETOU_API_KEY);if(!key)return NextResponse.json({error:'PAYMENT_UNAVAILABLE'},{status:503});
 try{
  const token=String(req.nextUrl.searchParams.get('token')||'').trim();if(!/^[0-9a-f-]{36}$/i.test(token))return NextResponse.json({error:'INVALID_TOKEN'},{status:400});
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  const {data:p,error}=await supabase.rpc('public_direct_payment_lookup',{p_token:token});if(error||!p?.provider_cart_id)return NextResponse.json({error:'PAYMENT_NOT_FOUND'},{status:404});
  const r=await fetch(`https://api.maketou.net/api/v1/stores/cart/${encodeURIComponent(String(p.provider_cart_id))}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)return NextResponse.json({status:'pending',email:p.customer_email,plan:planLabel(String(p.plan_code||''))});
  const providerStatus=String(data?.status||'pending').toLowerCase();const amount=Number(data?.total_price??data?.cart?.total_price??p.amount_minor);if(providerStatus==='completed'&&amount!==Number(p.amount_minor))return NextResponse.json({error:'PAYMENT_VALIDATION_FAILED'},{status:409});
  return NextResponse.json({status:providerStatus,email:p.customer_email,plan:planLabel(String(p.plan_code||'')),billing_period:p.billing_period,amount:Number(p.amount_minor||0),currency:p.currency_code||'XOF'});
 }catch{return NextResponse.json({error:'PAYMENT_CHECK_FAILED'},{status:500})}
}
