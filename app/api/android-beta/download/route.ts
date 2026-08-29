import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const APK_URL='https://github.com/chatrigpt/qatalink/releases/download/android-beta/qatalink-android-beta.apk';

export async function GET(req:NextRequest){
  try{
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
    const channel=(req.nextUrl.searchParams.get('src')||'landing').slice(0,40);
    const ua=(req.headers.get('user-agent')||'').slice(0,240);
    await supabase.rpc('register_apk_download',{p_channel:channel,p_user_agent:ua});
  }catch(error){
    console.error('[Qatalink:ApkDownloadCounter]',error);
  }
  return NextResponse.redirect(APK_URL,302);
}
