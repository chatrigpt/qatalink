import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
export async function GET(){try{const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);const {data,error}=await supabase.rpc('pwa_install_count');if(error)throw error;return NextResponse.json({count:Number(data||0)},{headers:{'Cache-Control':'no-store'}})}catch(error){console.error('[Qatalink:PwaStats]',error);return NextResponse.json({count:0},{status:500})}}
