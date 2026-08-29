import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const dynamic='force-dynamic';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function GET(){
  try{
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
    const {data,error}=await supabase.rpc('get_apk_download_count');
    if(error)throw error;
    return NextResponse.json({count:Number(data||0)},{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}});
  }catch{
    return NextResponse.json({count:0},{status:200});
  }
}
