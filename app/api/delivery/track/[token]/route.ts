import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function GET(_req:NextRequest,{params}:{params:Promise<{token:string}>}){
  try{
    const {token}=await params;const trackingToken=String(token||'').trim();if(!trackingToken)return NextResponse.json({success:false,error:'TOKEN_REQUIRED'},{status:400});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await supabase.rpc('qatalink_public_delivery_status',{p_tracking_token:trackingToken});
    if(error)return NextResponse.json({success:false,error:'TRACKING_NOT_FOUND'},{status:404});
    return NextResponse.json({success:true,tracking:data},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch{return NextResponse.json({success:false,error:'TRACKING_FAILED'},{status:500})}
}
