import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const allowed=new Set(['catalog_view','item_view','add_to_cart','cart_open','checkout_start','flow_mode_select','whatsapp_click']);

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const slug=String(body?.slug||'').slice(0,180);
    const eventType=String(body?.event_type||'');
    if(!slug||!allowed.has(eventType))return NextResponse.json({ok:false},{status:400});
    const supabase=createClient(url,key,{auth:{persistSession:false}});
    await supabase.rpc('track_catalog_event',{
      p_slug:slug,
      p_event_type:eventType,
      p_item_name:body?.item_name?String(body.item_name).slice(0,240):null,
      p_session_id:body?.session_id?String(body.session_id).slice(0,120):null,
      p_metadata:body?.metadata&&typeof body.metadata==='object'?body.metadata:{},
      p_user_agent:req.headers.get('user-agent'),
      p_referrer:req.headers.get('referer')
    });
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:false},{status:200})}
}
