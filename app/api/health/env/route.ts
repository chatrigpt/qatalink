import { NextResponse } from 'next/server';

export async function GET(){
  return NextResponse.json({
    ok:true,
    environment:process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown',
    deployment:process.env.VERCEL_URL||null,
    maketouConfigured:Boolean(process.env.MAKETOU_API_KEY),
    supabaseUrlConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableKeyConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    appUrlConfigured:Boolean(process.env.NEXT_PUBLIC_APP_URL),
  },{
    headers:{'Cache-Control':'no-store'}
  });
}
