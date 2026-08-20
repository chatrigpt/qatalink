import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function POST(req:NextRequest){
  try{
    const body=await req.json().catch(()=>({}));
    const accessKey=String(body?.access_key||'').trim();
    const pin=String(body?.pin||'');
    if(!accessKey||!pin)return NextResponse.json({success:false,error:'ACCESS_REQUIRED'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await supabase.rpc('get_catalog_team_stock_alerts',{
      p_access_key:accessKey,
      p_pin:pin,
      p_limit:Math.min(12,Math.max(1,Number(body?.limit||6))),
    });
    if(error)return NextResponse.json({success:false,error:error.message||'ACCESS_DENIED'},{status:403});
    return NextResponse.json({success:true,...data});
  }catch(error){
    console.error('[Qatalink:OpsStock]',error);
    return NextResponse.json({success:false,error:'OPS_STOCK_FAILED'},{status:500});
  }
}
