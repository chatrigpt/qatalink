import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'crypto';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const MENU_MAGIC_CREDIT_COST=3;

type ButtonStyle='solid'|'gradient'|'glossy'|'metallic';

async function refundMenuMagicCredits(supabase:any,businessId:string,referenceId:string){
  try{
    await supabase.rpc('refund_ai_credits',{
      p_business_id:businessId,
      p_kind:'menu_magic',
      p_reference_id:referenceId,
      p_refund_kind:'menu_magic_refund'
    });
  }catch{}
}

function cleanJson(raw:string){
  const s=String(raw||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  return a>=0&&b>a?s.slice(a,b+1):s;
}
function color(v:any){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:undefined}
function enumValue<T extends string>(v:any,values:readonly T[]){return values.includes(v as T)?v as T:undefined}
function finite(v:any,min:number,max:number){const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):undefined}
function bool(v:any){return typeof v==='boolean'?v:undefined}
function text(v:any,max=500){return typeof v==='string'?v.slice(0,max):undefined}

const themeFields={
  primary_color:(v:any)=>color(v),secondary_color:(v:any)=>color(v),background_color:(v:any)=>color(v),text_color:(v:any)=>color(v),
  background_mode:(v:any)=>enumValue(v,['solid','gradient'] as const),background_gradient:(v:any)=>text(v,240),
  heading_font:(v:any)=>enumValue(v,['Plus Jakarta Sans','Inter','Poppins','Montserrat','Playfair Display','DM Serif Display'] as const),
  body_font:(v:any)=>enumValue(v,['Plus Jakarta Sans','Inter','Poppins','Montserrat'] as const),
  border_radius:(v:any)=>enumValue(v,['8px','12px','16px','18px','22px','26px','30px'] as const),
  card_style:(v:any)=>enumValue(v,['clean','soft','premium'] as const),button_style:(v:any)=>enumValue(v,['square','rounded','pill'] as const),
  layout_style:(v:any)=>enumValue(v,['list','compact','cards','grid','showcase'] as const),logo_shape:(v:any)=>enumValue(v,['circle','rounded','square'] as const),
  show_business_name:(v:any)=>bool(v),show_logo:(v:any)=>bool(v),show_prices:(v:any)=>bool(v),header_alignment:(v:any)=>enumValue(v,['left','center','right'] as const),
  background_image_overlay:(v:any)=>finite(v,0,.8),background_image_blur:(v:any)=>finite(v,0,30),cover_overlay:(v:any)=>finite(v,0,.9),
  heading_bold:(v:any)=>bool(v),heading_italic:(v:any)=>bool(v),heading_underline:(v:any)=>bool(v),heading_case:(v:any)=>enumValue(v,['normal','uppercase','lowercase','capitalize'] as const),
  body_bold:(v:any)=>bool(v),body_italic:(v:any)=>bool(v),body_underline:(v:any)=>bool(v),body_case:(v:any)=>enumValue(v,['normal','uppercase','lowercase','capitalize'] as const)
} as const;

function sanitizeObject(input:any,validators:Record<string,(v:any)=>any>){
  const out:Record<string,any>={};
  if(!input||typeof input!=='object')return out;
  for(const [k,fn] of Object.entries(validators))if(k in input){const v=fn(input[k]);if(v!==undefined)out[k]=v}
  return out;
}

function sanitizePlan(raw:any,allowedButtonIds:Set<string>,referenceImageUrl:string){
  const theme=sanitizeObject(raw?.catalog_theme,themeFields as any);
  const hub=sanitizeObject(raw?.hub,{
    button_style:(v:any)=>enumValue<ButtonStyle>(v,['solid','gradient','glossy','metallic'] as const),
    button_color:(v:any)=>color(v),button_color_2:(v:any)=>color(v),button_text_color:(v:any)=>color(v),
    button_radius:(v:any)=>enumValue(v,['12px','18px','26px','999px'] as const),
    background_color:(v:any)=>color(v),background_mode:(v:any)=>enumValue(v,['solid','gradient','image'] as const),
    background_gradient:(v:any)=>text(v,240),background_overlay:(v:any)=>finite(v,0,.8)
  });
  const buttons=Array.isArray(raw?.buttons)?raw.buttons.flatMap((b:any)=>{
    const id=String(b?.id||'');if(!allowedButtonIds.has(id))return [];
    const patch=sanitizeObject(b,{
      button_style:(v:any)=>enumValue<ButtonStyle>(v,['solid','gradient','glossy','metallic'] as const),button_color:(v:any)=>color(v),button_color_2:(v:any)=>color(v),button_text_color:(v:any)=>color(v)
    });
    return Object.keys(patch).length?[{id,...patch}]:[];
  }):[];
  const referenceTarget=enumValue(raw?.reference_target,['none','menu_background','hub_background','hub_cover','hub_logo'] as const)||'none';
  if(referenceImageUrl){
    if(referenceTarget==='menu_background')theme.background_image_url=referenceImageUrl;
    if(referenceTarget==='hub_background'){hub.background_image_url=referenceImageUrl;hub.background_mode='image'}
    if(referenceTarget==='hub_cover')hub.cover_url=referenceImageUrl;
    if(referenceTarget==='hub_logo')hub.logo_url=referenceImageUrl;
  }
  return {summary:text(raw?.summary,700)||'Modifications visuelles appliquées.',catalog_theme:theme,hub,buttons,reference_target:referenceTarget};
}

function cleanSettingsSnapshot(row:any){
  if(!row||typeof row!=='object')return{};
  const {id,catalog_id,created_at,updated_at,...rest}=row;
  return rest;
}
function cleanButtonsSnapshot(rows:any[]){
  return (rows||[]).map((b:any)=>({id:b.id,button_style:b.button_style,button_color:b.button_color,button_color_2:b.button_color_2,button_text_color:b.button_text_color}));
}

async function saveSnapshot(supabase:any,{catalog,business,user,prompt,summary,referenceImageUrl,theme,hub,links,eventType}:{catalog:any;business:any;user:any;prompt:string;summary:string;referenceImageUrl:string;theme:any;hub:any;links:any[];eventType:'before_apply'|'before_rollback'}){
  const {data,error}=await supabase.from('catalog_design_history').insert({
    catalog_id:catalog.id,
    business_id:business.id,
    actor_user_id:user.id,
    prompt:prompt||null,
    summary:summary||null,
    reference_image_url:referenceImageUrl||null,
    theme_snapshot:cleanSettingsSnapshot(theme),
    hub_snapshot:cleanSettingsSnapshot(hub),
    buttons_snapshot:cleanButtonsSnapshot(links),
    event_type:eventType
  }).select('id').single();
  if(error)throw error;
  return data?.id||'';
}

async function applyVisualPlan(supabase:any,catalog:any,plan:any){
  const jobs:PromiseLike<any>[]=[];
  if(Object.keys(plan.catalog_theme||{}).length)jobs.push(supabase.from('catalog_theme_settings').upsert({...plan.catalog_theme,catalog_id:catalog.id,updated_at:new Date().toISOString()},{onConflict:'catalog_id'}).then((x:any)=>x));
  if(Object.keys(plan.hub||{}).length)jobs.push(supabase.from('catalog_hub_settings').upsert({...plan.hub,catalog_id:catalog.id,updated_at:new Date().toISOString()},{onConflict:'catalog_id'}).then((x:any)=>x));
  for(const b of plan.buttons||[]){const {id,...patch}=b;jobs.push(supabase.from('business_links').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).eq('catalog_id',catalog.id).then((x:any)=>x))}
  jobs.push(supabase.from('catalogs').update({is_active:true}).eq('id',catalog.id).then((x:any)=>x));
  jobs.push(supabase.from('businesses').update({published:true}).eq('id',catalog.business_id).then((x:any)=>x));
  const results=await Promise.all(jobs);const failed=results.find((x:any)=>x?.error);if(failed?.error)throw failed.error;
}

async function restoreSnapshot(supabase:any,catalog:any,history:any){
  const theme=history?.theme_snapshot||{};const hub=history?.hub_snapshot||{};const buttons=Array.isArray(history?.buttons_snapshot)?history.buttons_snapshot:[];
  const jobs:PromiseLike<any>[]=[];
  jobs.push(supabase.from('catalog_theme_settings').upsert({...theme,catalog_id:catalog.id,updated_at:new Date().toISOString()},{onConflict:'catalog_id'}).then((x:any)=>x));
  jobs.push(supabase.from('catalog_hub_settings').upsert({...hub,catalog_id:catalog.id,updated_at:new Date().toISOString()},{onConflict:'catalog_id'}).then((x:any)=>x));
  for(const b of buttons){const {id,...patch}=b;if(id)jobs.push(supabase.from('business_links').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).eq('catalog_id',catalog.id).then((x:any)=>x))}
  const results=await Promise.all(jobs);const failed=results.find((x:any)=>x?.error);if(failed?.error)throw failed.error;
}

export async function POST(req:NextRequest){
  let charged:{supabase:any,businessId:string,referenceId:string}|null=null;
  try{
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const body=await req.json();const catalogId=String(body?.catalog_id||'');const prompt=String(body?.prompt||'').trim();const referenceImageUrl=String(body?.reference_image_url||'');const apply=Boolean(body?.apply);const execute=Boolean(body?.execute);const action=String(body?.action||'');
    if(!catalogId)return NextResponse.json({error:'catalog_id required'},{status:400});
    const {data:catalog,error:catalogError}=await supabase.from('catalogs').select('id,business_id,title,public_slug,hub_public_slug,catalog_type').eq('id',catalogId).maybeSingle();
    if(catalogError||!catalog)return NextResponse.json({error:'Catalogue introuvable ou non autorisé.'},{status:404});
    const [{data:theme},{data:hub},{data:links},{data:business}]=await Promise.all([
      supabase.from('catalog_theme_settings').select('*').eq('catalog_id',catalogId).maybeSingle(),
      supabase.from('catalog_hub_settings').select('*').eq('catalog_id',catalogId).maybeSingle(),
      supabase.from('business_links').select('id,kind,label,url,button_style,button_color,button_color_2,button_text_color').eq('business_id',catalog.business_id).eq('catalog_id',catalogId).order('sort_order'),
      supabase.from('businesses').select('id,name,business_type,logo_url,cover_url').eq('id',catalog.business_id).maybeSingle()
    ]);
    if(!business)return NextResponse.json({error:'Entreprise introuvable.'},{status:404});
    const allowedButtonIds=new Set((links||[]).map((l:any)=>String(l.id)));
    const menuUrl=`https://qatalink.com/c/${catalog.public_slug}`;const hubUrl=`https://qatalink.com/h/${catalog.hub_public_slug}`;

    if(action==='history'){
      const {data:history,error}=await supabase.from('catalog_design_history').select('id,prompt,summary,event_type,created_at').eq('catalog_id',catalogId).order('created_at',{ascending:false}).limit(30);
      if(error)return NextResponse.json({error:error.message},{status:400});
      return NextResponse.json({success:true,history:history||[],menu_url:menuUrl,hub_url:hubUrl});
    }

    if(action==='rollback'){
      const historyId=String(body?.history_id||'');if(!historyId)return NextResponse.json({error:'history_id required'},{status:400});
      const {data:target,error:historyError}=await supabase.from('catalog_design_history').select('*').eq('id',historyId).eq('catalog_id',catalogId).maybeSingle();
      if(historyError||!target)return NextResponse.json({error:'Version de design introuvable.'},{status:404});
      await saveSnapshot(supabase,{catalog,business,user,prompt:'Retour vers une ancienne version',summary:'Version enregistrée avant restauration',referenceImageUrl:'',theme,hub,links:links||[],eventType:'before_rollback'});
      await restoreSnapshot(supabase,catalog,target);
      return NextResponse.json({success:true,message:'Ancien design restauré.',menu_url:menuUrl,hub_url:hubUrl});
    }

    if(apply){
      const plan=sanitizePlan(body?.plan,allowedButtonIds,referenceImageUrl);
      await saveSnapshot(supabase,{catalog,business,user,prompt,summary:plan.summary,referenceImageUrl,theme,hub,links:links||[],eventType:'before_apply'});
      await applyVisualPlan(supabase,catalog,plan);
      return NextResponse.json({success:true,applied:true,plan,menu_url:menuUrl,hub_url:hubUrl});
    }

    if(!prompt)return NextResponse.json({error:'Décrivez les modifications souhaitées.'},{status:400});
    const falKey=process.env.FAL_KEY;if(!falKey)return NextResponse.json({error:'Service Menu magique indisponible.'},{status:503});

    const creditReference=`menu-magic:${catalogId}:${randomUUID()}`;
    const {data:balanceAfter,error:creditError}=await supabase.rpc('consume_ai_credits',{p_business_id:catalog.business_id,p_kind:'menu_magic',p_reference_id:creditReference,p_cost:MENU_MAGIC_CREDIT_COST,p_metadata:{feature:'menu_magique',catalog_id:catalogId}});
    if(creditError){
      const msg=String(creditError.message||'');
      if(msg.includes('INSUFFICIENT_CREDITS')){
        const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',catalog.business_id).maybeSingle();
        return NextResponse.json({error:'INSUFFICIENT_CREDITS',message:`Menu magique utilise ${MENU_MAGIC_CREDIT_COST} crédits par demande.`,balance:Number(wallet?.balance||0),required:MENU_MAGIC_CREDIT_COST},{status:402});
      }
      throw creditError;
    }
    charged={supabase,businessId:String(catalog.business_id),referenceId:creditReference};

    const current={catalog:{id:catalog.id,title:catalog.title,type:catalog.catalog_type},business,theme:theme||{},hub:hub||{},buttons:links||[]};
    const instruction=`You are the visual design copilot inside Qatalink. Execute the user's natural-language request as a SAFE VISUAL PATCH for the selected catalogue and its central page. Never change prices, product names, product descriptions, URLs, stock, orders, customer flow, subscription, or business identity. Only modify visual design settings and styling of existing central-page buttons. Respect mobile readability and strong color contrast. Interpret common design language naturally: for example "bouton gradient doré métallique avec texte noir" should use metallic/gradient gold tones and black text; "assombris la bannière" should increase cover_overlay; font requests should map heading_font and body_font. If a reference image is attached, use it as visual inspiration unless the user explicitly asks to use the actual image as the menu background, central-page background, banner, or logo. Do not invent button IDs: only use IDs present in CURRENT_STATE.\n\nCURRENT_STATE:\n${JSON.stringify(current)}\n\nUSER_REQUEST:\n${prompt}\n\nReturn ONLY valid JSON with this exact structure:\n{"summary":"short French summary of what will change","reference_target":"none|menu_background|hub_background|hub_cover|hub_logo","catalog_theme":{},"hub":{},"buttons":[{"id":"existing-id","button_style":"solid|gradient|glossy|metallic","button_color":"#RRGGBB","button_color_2":"#RRGGBB","button_text_color":"#RRGGBB"}]}\n\nAllowed catalog_theme keys: primary_color, secondary_color, background_color, background_mode(solid|gradient), background_gradient, text_color, heading_font, body_font, border_radius, card_style(clean|soft|premium), button_style(square|rounded|pill), layout_style(list|compact|cards|grid|showcase), logo_shape(circle|rounded|square), show_business_name, show_logo, show_prices, header_alignment(left|center|right), background_image_overlay(0..0.8), background_image_blur(0..30), cover_overlay(0..0.9), heading_bold, heading_italic, heading_underline, heading_case, body_bold, body_italic, body_underline, body_case.\nAllowed hub keys: button_style(solid|gradient|glossy|metallic), button_color, button_color_2, button_text_color, button_radius(12px|18px|26px|999px), background_color, background_mode(solid|gradient|image), background_gradient, background_overlay.\nOnly include fields that should change. For platform buttons, preserve recognizable brand identity unless the user explicitly asks otherwise.`;
    const payload:any={prompt:instruction,system_prompt:'Return valid JSON only. No markdown. No explanation outside JSON.',model:'google/gemini-2.5-flash',temperature:.18,max_tokens:1800};
    if(referenceImageUrl)payload.image_urls=[referenceImageUrl];
    const r=await fetch('https://fal.run/openrouter/router/vision',{method:'POST',headers:{Authorization:`Key ${falKey}`,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
    const d:any=await r.json().catch(()=>null);
    if(!r.ok){await refundMenuMagicCredits(supabase,String(catalog.business_id),creditReference);charged=null;return NextResponse.json({error:d?.error||'Menu magique n’a pas répondu.'},{status:r.status});}
    let rawPlan:any;try{rawPlan=JSON.parse(cleanJson(d?.output||''))}catch{await refundMenuMagicCredits(supabase,String(catalog.business_id),creditReference);charged=null;return NextResponse.json({error:'Menu magique a renvoyé une proposition illisible.'},{status:422})}
    const plan=sanitizePlan(rawPlan,allowedButtonIds,referenceImageUrl);

    if(execute){
      await saveSnapshot(supabase,{catalog,business,user,prompt,summary:plan.summary,referenceImageUrl,theme,hub,links:links||[],eventType:'before_apply'});
      await applyVisualPlan(supabase,catalog,plan);
      charged=null;
      return NextResponse.json({success:true,applied:true,plan,credit_cost:MENU_MAGIC_CREDIT_COST,balance:Number(balanceAfter),menu_url:menuUrl,hub_url:hubUrl});
    }

    charged=null;
    return NextResponse.json({success:true,applied:false,plan,credit_cost:MENU_MAGIC_CREDIT_COST,balance:Number(balanceAfter),menu_url:menuUrl,hub_url:hubUrl});
  }catch(e:any){
    if(charged){await refundMenuMagicCredits(charged.supabase,charged.businessId,charged.referenceId)}
    return NextResponse.json({error:e?.message||'Menu magique indisponible'},{status:500})
  }
}
