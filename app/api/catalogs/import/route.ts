import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function slugify(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'catalogue';
}

function normalizePrice(v:any){
  const n=Number(String(v??0).replace(/[^0-9.-]/g,''));
  return Number.isFinite(n)?Math.max(0,Math.round(n)):0;
}

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const {data:subs}=await supabase.from('subscriptions').select('status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
    const sub=subs?.[0];
    const hasAccess=!!sub&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!hasAccess)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const body=await req.json();
    const sourceType=body?.source_type==='text'?'text_import':body?.source_type==='image'?'ocr_import':'manual';
    const payload=body?.catalog||{};

    let businessId:string|undefined;
    const {data:owned,error:ownedError}=await supabase.from('businesses').select('id,name').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);
    if(ownedError)return NextResponse.json({success:false,error:ownedError.message},{status:500});
    businessId=owned?.[0]?.id;

    if(!businessId){
      const suffix=user.id.replace(/-/g,'').slice(0,8);
      const businessName=String(payload?.business?.name||'Mon entreprise').trim()||'Mon entreprise';
      const {data:created,error:createError}=await supabase.from('businesses').insert({owner_user_id:user.id,name:businessName,slug:`${slugify(businessName)}-${suffix}`,business_type:'other',currency_code:payload?.business?.currency_code||'XOF',country_code:payload?.business?.country_code||'CI',description:payload?.business?.description||null,whatsapp_number:payload?.business?.phone_whatsapp||null}).select('id').single();
      if(createError||!created)return NextResponse.json({success:false,error:createError?.message||'Impossible de créer l’entreprise.'},{status:500});
      businessId=created.id;
    }else if(payload?.business){
      const patch:any={};
      if(payload.business.name)patch.name=payload.business.name;
      if(payload.business.description)patch.description=payload.business.description;
      if(payload.business.phone_whatsapp)patch.whatsapp_number=payload.business.phone_whatsapp;
      if(Object.keys(patch).length)await supabase.from('businesses').update(patch).eq('id',businessId);
    }

    const title=String(payload?.catalog?.title||payload?.title||'Nouveau catalogue').trim()||'Nouveau catalogue';
    const catalogType=payload?.catalog?.type==='catalog'?'catalog':'menu';
    const publicSlug=`${slugify(title)}-${crypto.randomUUID().slice(0,8)}`;
    const {data:catalogRow,error:catalogError}=await supabase.from('catalogs').insert({business_id:businessId,title,catalog_type:catalogType,public_slug:publicSlug,source:sourceType,is_default:false,is_active:true}).select('id,public_slug').single();
    if(catalogError||!catalogRow)return NextResponse.json({success:false,error:catalogError?.message||'Impossible de créer le catalogue.'},{status:500});

    const categories=Array.isArray(payload?.categories)?payload.categories:[];
    const itemIds:string[]=[];

    if(!categories.length && sourceType==='manual'){
      const {error}=await supabase.from('categories').insert({catalog_id:catalogRow.id,name:'Catégorie 1',sort_order:1,is_visible:true});
      if(error)return NextResponse.json({success:false,error:error.message},{status:500});
    }

    for(let ci=0;ci<categories.length;ci++){
      const category=categories[ci]||{};
      const {data:catRow,error:catError}=await supabase.from('categories').insert({catalog_id:catalogRow.id,name:String(category.name||`Catégorie ${ci+1}`),description:category.description||null,sort_order:Number(category.sort_order||ci+1),is_visible:true}).select('id').single();
      if(catError||!catRow)return NextResponse.json({success:false,error:catError?.message||'Impossible de créer une catégorie.'},{status:500});
      const items=Array.isArray(category.items)?category.items:[];
      for(let ii=0;ii<items.length;ii++){
        const item=items[ii]||{};
        if(!String(item.name||'').trim())continue;
        const metadata={image_prompt:item.image_prompt||'',sku:item.sku||'',source_warning:item.warning||null};
        const {data:itemRow,error:itemError}=await supabase.from('items').insert({catalog_id:catalogRow.id,category_id:catRow.id,name:String(item.name).trim(),slug:`${slugify(String(item.name))}-${crypto.randomUUID().slice(0,6)}`,item_type:'product',short_description:item.description||null,description:item.description||null,price_minor:normalizePrice(item.price),currency_code:item.currency_code||payload?.business?.currency_code||'XOF',is_available:item.available!==false,sort_order:Number(item.sort_order||ii+1),metadata,raw_extracted_text:null}).select('id').single();
        if(itemError)return NextResponse.json({success:false,error:itemError.message},{status:500});
        if(itemRow)itemIds.push(itemRow.id);
      }
    }

    return NextResponse.json({success:true,catalog_id:catalogRow.id,public_slug:catalogRow.public_slug,item_ids:itemIds});
  }catch(e:any){
    return NextResponse.json({success:false,error:e?.message||'Import failed'},{status:500});
  }
}
