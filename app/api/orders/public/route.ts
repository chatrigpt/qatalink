import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const slug=String(body?.slug||'').trim();
    const items=Array.isArray(body?.items)?body.items:[];
    const flowMode=body?.flow_mode?String(body.flow_mode):null;
    const flowFields=body?.flow_fields&&typeof body.flow_fields==='object'?body.flow_fields:{};
    if(!slug||!items.length)return NextResponse.json({success:false,error:'INVALID_ORDER'},{status:400});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await supabase.rpc('create_public_order',{p_slug:slug,p_items:items,p_flow_mode:flowMode,p_flow_fields:flowFields});
    if(error){
      const msg=String(error.message||'');
      const status=msg.includes('CATALOG_UNAVAILABLE')?404:msg.includes('ORDER_CAPTURE_DISABLED')?409:msg.includes('ITEMS_UNAVAILABLE')?409:400;
      return NextResponse.json({success:false,error:msg||'ORDER_FAILED'},{status});
    }
    return NextResponse.json({success:true,order:data});
  }catch{
    return NextResponse.json({success:false,error:'ORDER_FAILED'},{status:500});
  }
}
