import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function POST(req:NextRequest){
  try{
    const body=await req.json().catch(()=>({}));
    const deviceKey=String(body?.device_key||'').trim().slice(0,180);
    if(!deviceKey)return NextResponse.json({success:false,error:'DEVICE_KEY_REQUIRED'},{status:400});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
    const {data,error}=await supabase.rpc('register_pwa_install',{
      p_device_key:deviceKey,
      p_platform:String(body?.platform||'').slice(0,40),
      p_source:String(body?.source||'').slice(0,40),
      p_user_agent:(req.headers.get('user-agent')||'').slice(0,500),
    });
    if(error)throw error;
    return NextResponse.json({success:true,count:Number(data||0)});
  }catch(error){console.error('[Qatalink:PwaInstall]',error);return NextResponse.json({success:false,error:'TRACKING_FAILED'},{status:500})}
}
