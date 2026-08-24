import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();const accessKey=String(body?.access_key||'').trim();const pin=String(body?.pin||'');const action=String(body?.action||'start');
    if(!accessKey||!pin)return NextResponse.json({success:false,error:'ACCESS_REQUIRED'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    if(action==='start'){
      const orderId=String(body?.order_id||'');if(!orderId)return NextResponse.json({success:false,error:'ORDER_REQUIRED'},{status:400});
      const {data,error}=await supabase.rpc('qatalink_team_start_delivery',{p_access_key:accessKey,p_pin:pin,p_order_id:orderId,p_driver_label:String(body?.driver_label||'')});
      if(error){const msg=String(error.message||'DELIVERY_START_FAILED');return NextResponse.json({success:false,error:msg},{status:msg.includes('BUSINESS_PLAN_REQUIRED')?403:400})}
      const origin='https://qatalink.com';
      return NextResponse.json({success:true,...data,driver_url:`${origin}/livreur/${data.driver_token}`,tracking_url:`${origin}/suivi/${data.tracking_token}`});
    }
    return NextResponse.json({success:false,error:'INVALID_ACTION'},{status:400});
  }catch{return NextResponse.json({success:false,error:'DELIVERY_FAILED'},{status:500})}
}
