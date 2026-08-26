import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

function client(){return createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}

export async function GET(req:NextRequest){
  try{
    const token=String(req.nextUrl.searchParams.get('token')||'').trim();if(!token)return NextResponse.json({success:false,error:'TOKEN_REQUIRED'},{status:400});
    const supabase=client();const {data,error}=await supabase.rpc('qatalink_driver_delivery_details',{p_driver_token:token});
    if(error||!data)return NextResponse.json({success:false,error:error?.message||'DELIVERY_NOT_FOUND'},{status:404});
    return NextResponse.json({success:true,delivery:data},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch{return NextResponse.json({success:false,error:'DELIVERY_FAILED'},{status:500})}
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();const token=String(body?.token||'').trim();const action=String(body?.action||'location');if(!token)return NextResponse.json({success:false,error:'TOKEN_REQUIRED'},{status:400});
    const supabase=client();
    if(action==='complete'){
      const {data,error}=await supabase.rpc('qatalink_driver_complete',{p_driver_token:token});
      if(error)return NextResponse.json({success:false,error:error.message||'COMPLETE_FAILED'},{status:400});
      return NextResponse.json({success:true,completed:!!data});
    }
    if(action==='pause'){
      const {data,error}=await supabase.rpc('qatalink_driver_pause',{p_driver_token:token});
      if(error)return NextResponse.json({success:false,error:error.message||'PAUSE_FAILED'},{status:400});
      return NextResponse.json({success:true,paused:!!data});
    }
    if(action!=='location')return NextResponse.json({success:false,error:'INVALID_ACTION'},{status:400});
    const lat=Number(body?.lat),lng=Number(body?.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180||(Math.abs(lat)<1e-8&&Math.abs(lng)<1e-8))return NextResponse.json({success:false,error:'INVALID_COORDINATES'},{status:400});
    const nullable=(v:any)=>Number.isFinite(Number(v))?Number(v):null;
    const {data,error}=await supabase.rpc('qatalink_driver_update_location',{p_driver_token:token,p_lat:lat,p_lng:lng,p_accuracy:nullable(body?.accuracy),p_heading:nullable(body?.heading),p_speed:nullable(body?.speed)});
    if(error)return NextResponse.json({success:false,error:error.message||'LOCATION_FAILED'},{status:400});
    return NextResponse.json({success:true,updated:!!data,at:new Date().toISOString()},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch{return NextResponse.json({success:false,error:'DELIVERY_FAILED'},{status:500})}
}
