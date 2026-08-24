import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();const token=String(body?.token||'').trim();const action=String(body?.action||'location');if(!token)return NextResponse.json({success:false,error:'TOKEN_REQUIRED'},{status:400});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    if(action==='complete'){
      const {data,error}=await supabase.rpc('qatalink_driver_complete',{p_driver_token:token});if(error)return NextResponse.json({success:false,error:error.message||'COMPLETE_FAILED'},{status:400});return NextResponse.json({success:true,completed:!!data});
    }
    const lat=Number(body?.lat),lng=Number(body?.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)return NextResponse.json({success:false,error:'INVALID_COORDINATES'},{status:400});
    const nullable=(v:any)=>Number.isFinite(Number(v))?Number(v):null;
    const {data,error}=await supabase.rpc('qatalink_driver_update_location',{p_driver_token:token,p_lat:lat,p_lng:lng,p_accuracy:nullable(body?.accuracy),p_heading:nullable(body?.heading),p_speed:nullable(body?.speed)});
    if(error)return NextResponse.json({success:false,error:error.message||'LOCATION_FAILED'},{status:400});return NextResponse.json({success:true,updated:!!data,at:new Date().toISOString()});
  }catch{return NextResponse.json({success:false,error:'DELIVERY_FAILED'},{status:500})}
}
