import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const productIds={basic:'73c8f809-3d0b-4976-9ccf-6b8d2b69f362',interactive:'14ff1299-91b3-41fe-93e1-c378b8bf6e01',vitrine:'7424d0a9-a4ea-46be-907c-d5406673bac5'} as const;
const prices={basic:3500,interactive:5000,vitrine:7500} as const;
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

    const {plan,firstName,lastName,business_id}=await req.json();
    if(!(plan in productIds))return NextResponse.json({error:'Invalid plan'},{status:400});
    const p=plan as keyof typeof productIds;
    const appUrl=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin;
    const payload={productDocumentId:productIds[p],email:user.email||'',firstName:firstName||'Client',lastName:lastName||'Qatalink',customerPrice:prices[p],redirectURL:`${appUrl}/dashboard?payment=pending`,meta:{user_id:user.id,business_id:business_id||null,plan:p,billing_period:'monthly'}};
    const r=await fetch('https://api.maketou.net/api/v1/stores/cart/checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify(payload),cache:'no-store'});
    const data=await r.json();
    return NextResponse.json(data,{status:r.status});
  }catch(e:any){return NextResponse.json({error:e.message},{status:500})}
}
