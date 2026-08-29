import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const accessKey=String(body?.access_key||'').trim();
    const pin=String(body?.pin||'');
    const action=String(body?.action||'list');
    if(!accessKey||!pin)return NextResponse.json({success:false,error:'ACCESS_REQUIRED'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

    if(action==='status'){
      const orderId=String(body?.order_id||'');
      const status=String(body?.status||'');
      const {data,error}=await supabase.rpc('update_catalog_team_order_status',{p_access_key:accessKey,p_pin:pin,p_order_id:orderId,p_status:status});
      if(error)return NextResponse.json({success:false,error:error.message||'ACCESS_DENIED'},{status:403});
      return NextResponse.json({success:true,updated:!!data});
    }

    if(action==='merge'){
      const ids=[...new Set((Array.isArray(body?.order_ids)?body.order_ids:[]).map(String).filter(Boolean))];
      if(ids.length<2)return NextResponse.json({success:false,error:'SELECT_AT_LEAST_TWO'},{status:400});
      const {data,error}=await supabase.rpc('create_catalog_team_bill',{p_access_key:accessKey,p_pin:pin,p_order_ids:ids});
      if(error)return NextResponse.json({success:false,error:error.message||'MERGE_FAILED'},{status:403});
      return NextResponse.json({success:true,bill:data});
    }

    if(action==='edit'){
      const editAction=String(body?.edit_action||'');
      const payload=body?.payload&&typeof body.payload==='object'?body.payload:{};
      const {data,error}=await supabase.rpc('catalog_team_edit',{p_access_key:accessKey,p_pin:pin,p_action:editAction,p_payload:payload});
      if(error)return NextResponse.json({success:false,error:error.message||'EDIT_FAILED'},{status:403});
      return NextResponse.json({success:true,result:data});
    }

    if(action==='pos_catalog'){
      const {data,error}=await supabase.rpc('get_catalog_team_pos_catalog',{p_access_key:accessKey,p_pin:pin});
      if(error)return NextResponse.json({success:false,error:error.message||'ACCESS_DENIED'},{status:403});
      return NextResponse.json({success:true,...data});
    }

    if(action==='stats'){
      const start=String(body?.start||'');const end=String(body?.end||'');
      if(!start||!end||Number.isNaN(Date.parse(start))||Number.isNaN(Date.parse(end)))return NextResponse.json({success:false,error:'INVALID_PERIOD'},{status:400});
      const {data,error}=await supabase.rpc('get_catalog_team_pos_stats',{p_access_key:accessKey,p_pin:pin,p_start:start,p_end:end});
      if(error)return NextResponse.json({success:false,error:error.message||'STATS_FAILED'},{status:403});
      return NextResponse.json({success:true,...data});
    }

    if(action==='sources'){
      const {data,error}=await supabase.rpc('get_catalog_team_order_sources',{p_access_key:accessKey,p_pin:pin,p_limit:Math.min(200,Math.max(1,Number(body?.limit||150)))});
      if(error)return NextResponse.json({success:false,error:error.message||'ACCESS_DENIED'},{status:403});
      return NextResponse.json({success:true,sources:data||[]});
    }

    if(action==='pos_create'){
      const items=Array.isArray(body?.items)?body.items:[];
      if(!items.length)return NextResponse.json({success:false,error:'EMPTY_ORDER'},{status:400});
      const {data,error}=await supabase.rpc('create_catalog_team_pos_order',{
        p_access_key:accessKey,
        p_pin:pin,
        p_items:items,
        p_source:'pos',
        p_flow_mode:String(body?.flow_mode||''),
        p_table:String(body?.table||''),
        p_customer_name:String(body?.customer_name||''),
        p_customer_phone:String(body?.customer_phone||''),
        p_note:String(body?.note||''),
      });
      if(error)return NextResponse.json({success:false,error:error.message||'ORDER_CREATE_FAILED'},{status:403});
      return NextResponse.json({success:true,order:data});
    }

    const {data,error}=await supabase.rpc('get_catalog_team_orders',{p_access_key:accessKey,p_pin:pin,p_limit:Math.min(200,Math.max(1,Number(body?.limit||100)))});
    if(error)return NextResponse.json({success:false,error:error.message||'ACCESS_DENIED'},{status:403});
    return NextResponse.json({success:true,...data});
  }catch(error){
    console.error('[Qatalink:OpsOrders]',error);
    return NextResponse.json({success:false,error:'OPS_FAILED'},{status:500});
  }
}
