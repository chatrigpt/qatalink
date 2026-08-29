import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
export const maxDuration=60;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const AUTO_COST=30;
const CUSTOM_COST=40;
const PUBLIC_ORIGIN='https://qatalink.com';

function clean(v:unknown,max=2400){return String(v??'').replace(/\s+/g,' ').trim().slice(0,max)}
function normalizeKey(value:string|undefined){let key=(value||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();return key.replace(/^Bearer\s+/i,'').trim()}
function fallbackBio(type:string){if(type==='restaurant')return 'Découvrez notre carte, nos spécialités et nos offres du moment.';if(type==='hotel')return 'Découvrez nos chambres, services et expériences.';if(type==='spa_beauty')return 'Découvrez nos prestations, nos tarifs et notre univers.';if(type==='real_estate')return 'Découvrez nos biens et opportunités disponibles.';return 'Découvrez notre sélection, nos services et nos offres.'}

async function submitModel(key:string,prompt:string,imageUrls:string[]){
  const model=imageUrls.length?'gpt-image-2-edit':'gpt-image-2';
  let last:any={ok:false,status:0,data:null,taskId:null,model};
  for(const size of ['16:9','4:3','1:1']){
    const input:any={prompt,size,resolution:'1K',quality:'low'};if(imageUrls.length)input.image_urls=imageUrls;
    const r=await fetch('https://api.poyo.ai/api/generate/submit',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,input}),cache:'no-store'});
    const data:any=await r.json().catch(()=>null);last={ok:r.ok&&!!data?.data?.task_id,status:r.status,data,taskId:data?.data?.task_id,model,size};
    if(last.ok||r.status===401||r.status===403)return last;
  }
  return last;
}

function ctaFor(type:string){if(type==='restaurant')return 'Scannez, découvrez la carte et commandez.';if(type==='hotel')return 'Scannez pour découvrir les chambres et services.';if(type==='spa_beauty')return 'Scannez pour découvrir les prestations et tarifs.';if(type==='real_estate')return 'Scannez pour découvrir les biens disponibles.';return 'Scannez pour découvrir nos offres.'}

export async function POST(req:NextRequest){
  try{
    const key=normalizeKey(process.env.POYO_API_KEY);if(!key)return NextResponse.json({success:false,error:'GENERATION_UNAVAILABLE'},{status:503});
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const body=await req.json();const catalogId=clean(body?.catalog_id,80);const assetType=body?.asset_type==='tent_card'?'tent_card':'flyer';const generationMode=body?.generation_mode==='custom'?'custom':'auto';const qrMode=['hub','catalog','both'].includes(body?.qr_mode)?body.qr_mode:'catalog';const customPrompt=generationMode==='custom'?clean(body?.custom_prompt,1800):'';const selectedIds=[...new Set((Array.isArray(body?.reference_item_ids)?body.reference_item_ids:[]).map((x:any)=>clean(x,80)).filter(Boolean))].slice(0,6);
    if(!catalogId)return NextResponse.json({success:false,error:'CATALOG_REQUIRED'},{status:400});if(generationMode==='custom'&&!customPrompt)return NextResponse.json({success:false,error:'CUSTOM_PROMPT_REQUIRED',message:'Décrivez le visuel souhaité.'},{status:400});

    const {data:catalog,error:catalogError}=await supabase.from('catalogs').select('id,business_id,title,public_slug,hub_public_slug,description,display_name,logo_url,catalog_type').eq('id',catalogId).maybeSingle();if(catalogError||!catalog)return NextResponse.json({success:false,error:'CATALOG_UNAVAILABLE'},{status:404});
    const businessId=String(catalog.business_id);
    const [{data:business},{data:wallet},{data:sub},{data:categories},{data:itemRows}]=await Promise.all([
      supabase.from('businesses').select('id,name,description,business_type,logo_url,cover_url,theme_preset').eq('id',businessId).maybeSingle(),
      supabase.from('credit_wallets').select('balance').eq('business_id',businessId).maybeSingle(),
      supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1).maybeSingle(),
      supabase.from('categories').select('id,name,sort_order').eq('catalog_id',catalogId).eq('is_visible',true).order('sort_order'),
      supabase.from('items').select('id,name,description,short_description,category_id,sort_order,is_available').eq('catalog_id',catalogId).eq('is_available',true).order('sort_order')
    ]);
    if(!business)return NextResponse.json({success:false,error:'BUSINESS_UNAVAILABLE'},{status:404});
    const validSub=!!sub&&['active','trialing'].includes(String(sub.status))&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());if(!validSub)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});
    const cost=generationMode==='custom'?CUSTOM_COST:AUTO_COST;const balance=Number(wallet?.balance||0);if(balance<cost)return NextResponse.json({success:false,error:'INSUFFICIENT_CREDITS',balance,required:cost,message:`Il faut ${cost} crédits pour générer ce support.`},{status:402});

    const items=(itemRows||[]) as any[];const itemIds=items.map(i=>i.id);const {data:imageRows}=itemIds.length?await supabase.from('item_images').select('item_id,image_url,is_primary,created_at').in('item_id',itemIds).order('is_primary',{ascending:false}).order('created_at',{ascending:false}):{data:[] as any[]};const imageByItem=new Map<string,string>();for(const row of imageRows||[])if(row?.image_url&&!imageByItem.has(String(row.item_id)))imageByItem.set(String(row.item_id),String(row.image_url));

    let chosen:any[]=[];
    if(generationMode==='custom'&&selectedIds.length){chosen=selectedIds.map(id=>items.find(i=>String(i.id)===id)).filter(Boolean).filter(i=>imageByItem.has(String(i.id)))}
    else if(generationMode==='auto'){
      const {data:ranked}=await supabase.rpc('get_catalog_marketing_top_items',{p_catalog_id:catalogId,p_limit:40});const score=new Map<string,number>((ranked||[]).map((r:any)=>[String(r.item_id),Number(r.score||0)]));const ordered=[...items].filter(i=>imageByItem.has(String(i.id))).sort((a,b)=>(score.get(String(b.id))||0)-(score.get(String(a.id))||0)||Number(a.sort_order||0)-Number(b.sort_order||0));const seenCategories=new Set<string>();for(const item of ordered){const cat=String(item.category_id||'none');if(seenCategories.has(cat))continue;chosen.push(item);seenCategories.add(cat);if(chosen.length>=6)break}if(chosen.length<6)for(const item of ordered){if(chosen.some(x=>x.id===item.id))continue;chosen.push(item);if(chosen.length>=6)break}
    }
    chosen=chosen.slice(0,6);

    const logo=String(catalog.logo_url||business.logo_url||'');const referenceUrls=[...(logo?[logo]:[]),...chosen.map(i=>imageByItem.get(String(i.id))).filter(Boolean)].slice(0,7) as string[];const catMap=new Map((categories||[]).map((c:any)=>[String(c.id),String(c.name)]));const bio=clean(catalog.description||business.description||fallbackBio(String(business.business_type||'')),600);const businessName=clean(catalog.display_name||business.name,120);const categoryNames=(categories||[]).slice(0,8).map((c:any)=>clean(c.name,70)).filter(Boolean);const featured=chosen.length?chosen.map(i=>`${clean(i.name,90)}${i.category_id&&catMap.get(String(i.category_id))?` (${catMap.get(String(i.category_id))})`:''}`):items.slice(0,8).map(i=>clean(i.name,90));const catalogUrl=`${PUBLIC_ORIGIN}/c/${catalog.public_slug}`;const hubUrl=catalog.hub_public_slug?`${PUBLIC_ORIGIN}/h/${catalog.hub_public_slug}`:'';if((qrMode==='hub'||qrMode==='both')&&!hubUrl)return NextResponse.json({success:false,error:'HUB_UNAVAILABLE',message:'La page centrale doit être activée avant de pouvoir utiliser son QR.'},{status:400});

    const exactDestinations=qrMode==='catalog'?`The real QR will encode exactly this active ${catalog.catalog_type||'catalogue'} URL: ${catalogUrl}`:qrMode==='hub'?`The real QR will encode exactly this active central-page URL: ${hubUrl}`:`Two real QR codes will be overlaid: direct URL ${catalogUrl} and central-page URL ${hubUrl}.`;
    const fallbackText=chosen.length?'':`No usable product photography is available. Build the visual identity from the business sector, these categories (${categoryNames.join(', ')||'non renseignées'}) and these offer names (${featured.join(', ')||'non renseignées'}).`;
    const prompt=`Create a premium LANDSCAPE commercial hero image for the upper visual area of a printable Qatalink scan card for a real business in Côte d’Ivoire. The generated artwork itself is NOT the final flyer: Qatalink will place it in the top 48% of a final portrait flyer or in the visual half of a tent-card face, then add typography, CTA and real QR code(s) below it.\n\nBusiness name: ${businessName}\nSector: ${business.business_type||'commerce'}\nCatalogue: ${clean(catalog.title,120)}\nBusiness positioning: ${bio}\nCategories: ${categoryNames.join(', ')||'Not provided'}\nFeatured offers: ${featured.join(', ')||'Not provided'}\n${exactDestinations}\n${fallbackText}\n${generationMode==='custom'?`User visual direction: ${customPrompt}`:'Automatic direction: use the supplied logo and product photographs as faithful visual references. Highlight a varied selection across categories and favor the strongest products without overcrowding the scene.'}\n\nMANDATORY VISUAL RULES:\n- LANDSCAPE advertising composition, optimized for a 16:9 output; 4:3 may be used only as provider fallback.\n- Keep all essential products, dishes, faces and distinctive details inside the CENTRAL 80% safe zone. Do not place important details against the top, bottom or extreme side edges, because Qatalink may make a small cover crop when fitting the final print layout.\n- Use supplied reference images faithfully. Never invent a different logo, packaging or product identity.\n- Strong visual hierarchy: one main hero subject with supporting items, premium editorial/commercial photography, realistic light and materials.\n- Do NOT reserve a fake white footer and do NOT attempt to design the final flyer yourself. Qatalink creates the clean CTA/QR panel separately.\n- Qatalink will generate the real scannable QR code(s) programmatically from the exact URL(s) above. Do NOT draw, fake, imitate or include any QR code yourself.\n- Do NOT render any barcode, URL, phone number, price, headline, logo text, CTA text, menu text or other readable typography in the generated image.\n- No watermark, no fake UI, no poster frame, no AI artifacts.\n- Visual tone should fit the business sector and feel locally credible for Abidjan / Côte d’Ivoire.`;

    const {data:job,error:jobError}=await supabase.from('marketing_asset_generation_jobs').insert({business_id:businessId,catalog_id:catalogId,user_id:user.id,asset_type:assetType,generation_mode:generationMode,qr_mode:qrMode,prompt,reference_urls:referenceUrls,credit_cost:cost,status:'pending',provider:'poyo'}).select('id').single();if(jobError||!job)return NextResponse.json({success:false,error:'JOB_CREATE_FAILED'},{status:500});
    const {data:newBalance,error:creditError}=await supabase.rpc('consume_ai_credits',{p_business_id:businessId,p_kind:'marketing_asset_generation',p_reference_id:String(job.id),p_cost:cost,p_metadata:{asset_type:assetType,generation_mode:generationMode,qr_mode:qrMode,catalog_id:catalogId,catalog_url:catalogUrl,hub_url:hubUrl||null}});if(creditError){await supabase.from('marketing_asset_generation_jobs').update({status:'failed',error_message:'CREDIT_ERROR',completed_at:new Date().toISOString()}).eq('id',job.id);return NextResponse.json({success:false,error:String(creditError.message||'CREDIT_ERROR')},{status:402})}

    const submitted=await submitModel(key,prompt,referenceUrls);if(!submitted.ok){await supabase.from('marketing_asset_generation_jobs').update({status:'failed',provider:`poyo:${submitted.model}`,provider_payload:submitted.data||{},error_message:'GENERATION_FAILED',completed_at:new Date().toISOString()}).eq('id',job.id);const {data:refunded}=await supabase.rpc('refund_ai_credits',{p_business_id:businessId,p_kind:'marketing_asset_generation',p_reference_id:String(job.id),p_refund_kind:'marketing_asset_generation_refund'});return NextResponse.json({success:false,error:'GENERATION_FAILED',refunded:true,balance:Number(refunded??newBalance)},{status:502})}
    await supabase.from('marketing_asset_generation_jobs').update({status:'processing',provider:`poyo:${submitted.model}`,provider_task_id:submitted.taskId,provider_payload:{...(submitted.data||{}),requested_size:submitted.size,catalog_url:catalogUrl,hub_url:hubUrl||null}}).eq('id',job.id);
    return NextResponse.json({success:true,job_id:job.id,status:'processing',credit_cost:cost,balance:Number(newBalance),catalog_url:catalogUrl,hub_url:hubUrl||null,business_name:businessName,bio,cta:ctaFor(String(business.business_type||'')),reference_count:referenceUrls.length,generated_ratio:submitted.size});
  }catch(error){console.error('[Qatalink:MarketingAssetGenerate]',error);return NextResponse.json({success:false,error:'GENERATION_FAILED'},{status:500})}
}
