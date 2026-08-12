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

function normalizeWhatsapp(v:any){
  const raw=String(v??'').trim();
  if(!raw)return null;
  const digits=raw.replace(/\D/g,'');
  if(!digits)return null;
  return `+${digits}`;
}

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const body=await req.json();
    const sourceType=body?.source_type==='text'?'text_import':body?.source_type==='image'?'ocr_import':'manual';
    const payload=body?.catalog||{};
    const presetId=String(body?.preset_id||'').trim();
    const requestedBusinessName=String(body?.business_name||payload?.business?.name||'').trim();
    const whatsappNumber=normalizeWhatsapp(body?.whatsapp_number||payload?.business?.phone_whatsapp||payload?.business?.whatsapp_number);

    let preset:any=null;
    if(presetId){
      const {data:presetRow}=await supabase.from('sector_presets').select('*').eq('id',presetId).maybeSingle();
      preset=presetRow||null;
    }

    let businessId:string|undefined;
    let businessName=requestedBusinessName||'Mon entreprise';
    const {data:owned,error:ownedError}=await supabase.from('businesses').select('id,name,business_type').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);
    if(ownedError)return NextResponse.json({success:false,error:ownedError.message},{status:500});
    businessId=owned?.[0]?.id;
    if(!requestedBusinessName&&owned?.[0]?.name)businessName=owned[0].name;

    const businessPatch:any={};
    if(businessName)businessPatch.name=businessName;
    if(preset?.business_type)businessPatch.business_type=preset.business_type;
    else if(payload?.business?.business_type)businessPatch.business_type=payload.business.business_type;
    if(payload?.business?.description)businessPatch.description=payload.business.description;
    if(whatsappNumber)businessPatch.whatsapp_number=whatsappNumber;
    if(payload?.business?.currency_code)businessPatch.currency_code=payload.business.currency_code;

    if(!businessId){
      const suffix=user.id.replace(/-/g,'').slice(0,8);
      const {data:created,error:createError}=await supabase.from('businesses').insert({owner_user_id:user.id,name:businessName,slug:`${slugify(businessName)}-${suffix}`,business_type:preset?.business_type||payload?.business?.business_type||'other',currency_code:payload?.business?.currency_code||'XOF',country_code:payload?.business?.country_code||'CI',description:payload?.business?.description||null,whatsapp_number:whatsappNumber,theme_preset:presetId||null}).select('id').single();
      if(createError||!created)return NextResponse.json({success:false,error:createError?.message||'Impossible de créer l’entreprise.'},{status:500});
      businessId=created.id;
    }else{
      if(presetId)businessPatch.theme_preset=presetId;
      if(Object.keys(businessPatch).length)await supabase.from('businesses').update(businessPatch).eq('id',businessId);
    }

    const [{data:subRows,error:subError},{count:catalogCount}]=await Promise.all([
      supabase.from('subscriptions').select('plan_code,status,current_period_start,current_period_end').eq('business_id',businessId).order('created_at',{ascending:false}).limit(20),
      supabase.from('catalogs').select('*',{count:'exact',head:true}).eq('business_id',businessId)
    ]);
    if(subError)return NextResponse.json({success:false,error:'Subscription check failed'},{status:500});
    const now=Date.now();
    const validSub=(subRows||[]).find((s:any)=>(s.status==='active'||s.status==='trialing')&&(!s.current_period_end||new Date(s.current_period_end).getTime()>now));
    const pretrialEligible=!validSub&&(subRows||[]).length===0&&(catalogCount||0)===0;
    if(!validSub&&!pretrialEligible)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const requestedTitle=String(payload?.catalog?.title||payload?.title||body?.catalog_title||'').trim();
    const title=requestedTitle||businessName||preset?.default_catalog_title||'Nouveau catalogue';
    const catalogType=(payload?.catalog?.type==='catalog'||preset?.catalog_type==='catalog')?'catalog':'menu';
    const publicSlug=`${slugify(businessName||title)}-${crypto.randomUUID().slice(0,8)}`;
    const {data:catalogRow,error:catalogError}=await supabase.from('catalogs').insert({business_id:businessId,title,catalog_type:catalogType,public_slug:publicSlug,source:sourceType,is_default:false,is_active:true}).select('id,public_slug').single();
    if(catalogError||!catalogRow)return NextResponse.json({success:false,error:catalogError?.message||'Impossible de créer le catalogue.'},{status:500});

    const cleanup=async()=>{try{await supabase.from('catalogs').delete().eq('id',catalogRow.id)}catch{}};

    const theme={...(preset?.default_theme||{}),...(body?.theme_overrides||{})};
    const {error:themeError}=await supabase.from('catalog_theme_settings').insert({catalog_id:catalogRow.id,preset_id:presetId||null,primary_color:theme.primary_color||'#B5122B',secondary_color:theme.secondary_color||'#F7E8EA',background_color:theme.background_color||'#FFFFFF',text_color:theme.text_color||'#171719',heading_font:theme.heading_font||'Plus Jakarta Sans',body_font:theme.body_font||'Plus Jakarta Sans',border_radius:theme.border_radius||'18px',card_style:theme.card_style||'soft',button_style:theme.button_style||'rounded',layout_style:theme.layout_style||'cards',hero_style:theme.hero_style||'minimal',show_business_name:true,show_logo:true,show_prices:true,header_alignment:'left'});
    if(themeError){await cleanup();return NextResponse.json({success:false,error:themeError.message},{status:500})}

    let categories=Array.isArray(payload?.categories)?payload.categories:[];
    if(!categories.length&&Array.isArray(preset?.default_categories))categories=preset.default_categories.map((name:string,index:number)=>({name,sort_order:index+1,items:[]}));
    if(!categories.length&&sourceType==='manual')categories=[{name:'Catégorie 1',sort_order:1,items:[]}];

    const itemIds:string[]=[];
    for(let ci=0;ci<categories.length;ci++){
      const category=categories[ci]||{};
      const {data:catRow,error:catError}=await supabase.from('categories').insert({catalog_id:catalogRow.id,name:String(category.name||`Catégorie ${ci+1}`),description:category.description||null,sort_order:Number(category.sort_order||ci+1),is_visible:true}).select('id').single();
      if(catError||!catRow){await cleanup();return NextResponse.json({success:false,error:catError?.message||'Impossible de créer une catégorie.'},{status:500})}
      const items=Array.isArray(category.items)?category.items:[];
      for(let ii=0;ii<items.length;ii++){
        const item=items[ii]||{};
        if(!String(item.name||'').trim())continue;
        const metadata={image_prompt:item.image_prompt||'',sku:item.sku||'',source_warning:item.warning||null};
        const {data:itemRow,error:itemError}=await supabase.from('items').insert({catalog_id:catalogRow.id,category_id:catRow.id,name:String(item.name).trim(),slug:`${slugify(String(item.name))}-${crypto.randomUUID().slice(0,6)}`,item_type:'product',short_description:item.description||null,description:item.description||null,price_minor:normalizePrice(item.price),currency_code:item.currency_code||payload?.business?.currency_code||'XOF',is_available:item.available!==false,sort_order:Number(item.sort_order||ii+1),metadata,raw_extracted_text:null}).select('id').single();
        if(itemError){await cleanup();return NextResponse.json({success:false,error:itemError.message},{status:500})}
        if(itemRow)itemIds.push(itemRow.id);
      }
    }

    let trial:any=null;
    if(pretrialEligible){
      const {data:trialData,error:trialError}=await supabase.rpc('start_qatalink_trial_for_current_user',{p_business_id:businessId});
      if(trialError){await cleanup();const code=String(trialError.message||'');return NextResponse.json({success:false,error:code.includes('TRIAL_ALREADY_USED')?'SUBSCRIPTION_REQUIRED':'TRIAL_START_FAILED'},{status:code.includes('TRIAL_ALREADY_USED')?402:500})}
      trial=trialData||null;
    }

    return NextResponse.json({success:true,catalog_id:catalogRow.id,public_slug:catalogRow.public_slug,item_ids:itemIds,preset_id:presetId||null,trial_started:!!trial?.started,trial_ends_at:trial?.current_period_end||validSub?.current_period_end||null});
  }catch(e:any){
    return NextResponse.json({success:false,error:e?.message||'Import failed'},{status:500});
  }
}
