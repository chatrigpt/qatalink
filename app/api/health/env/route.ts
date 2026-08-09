import { NextResponse } from 'next/server';

export async function GET(){
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
  const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';
  let googleProviderEnabled:boolean|null=null;
  try{
    const r=await fetch(`${supabaseUrl}/auth/v1/settings`,{headers:{apikey:supabaseKey},cache:'no-store'});
    if(r.ok){const data=await r.json();googleProviderEnabled=Boolean(data?.external?.google)}
  }catch{}
  return NextResponse.json({
    ok:true,
    environment:process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown',
    deployment:process.env.VERCEL_URL||null,
    maketouConfigured:Boolean(process.env.MAKETOU_API_KEY),
    falConfigured:Boolean(process.env.FAL_KEY),
    poyoConfigured:Boolean(process.env.POYO_API_KEY),
    supabaseUrlConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKeyConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    appUrlConfigured:Boolean(process.env.NEXT_PUBLIC_APP_URL),
    googleProviderEnabled,
  },{headers:{'Cache-Control':'no-store'}});
}
