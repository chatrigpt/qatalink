import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';
const FAL_OPENAI_URL='https://fal.run/openrouter/router/openai/v1/chat/completions';
const MAX_SOURCE_IMAGES=8;

const schemaInstruction=`Return ONLY valid JSON. No markdown, no code fences, no commentary.
Use exactly this structure:
{
  "schema":"qatalink_catalog_v2",
  "source_type":"image|text",
  "business":{"name":"","description":"","phone_whatsapp":"","address":"","maps_url":"","currency_code":"XOF","country_code":"CI","language":"fr"},
  "catalog":{"title":"Menu principal","type":"menu|catalog","cover_image_url":"","notes":""},
  "categories":[{"name":"","description":"","sort_order":1,"items":[{"name":"","description":"","price":0,"currency_code":"XOF","image_url":"","image_prompt":"","sku":"","available":true,"sort_order":1}]}],
  "uncategorized_items":[],
  "raw_text":"",
  "warnings":[],
  "confidence":0.0
}
Rules:
- Preserve every readable item and price; never silently omit an item.
- When several images are provided, they are pages or complementary views of the SAME menu/catalogue. Combine all unique information into one coherent catalogue.
- Deduplicate only obvious exact repetitions caused by overlapping pages. Never merge distinct sizes, variants, formulas or products just because their names are similar.
- Prices must be numbers only, without currency symbols or separators.
- If the source uses FCFA/CFA, use XOF.
- Keep descriptions empty when not present instead of inventing facts.
- Group items into the source categories; only infer categories when necessary.
- Generate one concise image_prompt for every item. It must describe a clean premium commercial illustration/photo of that exact item, square 1:1, no text, no watermark, adapted to the detected sector and catalogue style.
- Put uncertain OCR readings in warnings and lower confidence.
- For non-food catalogues, adapt image_prompt to the real product/service/property rather than food photography.`;

function parseModelJson(value:string){
  const cleaned=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(cleaned)}catch{}
  const start=cleaned.indexOf('{');
  const end=cleaned.lastIndexOf('}');
  if(start>=0&&end>start)return JSON.parse(cleaned.slice(start,end+1));
  throw new Error('Le modèle n’a pas renvoyé un JSON exploitable.');
}

export async function POST(req:NextRequest){
  try{
    const falKey=process.env.FAL_KEY;
    if(!falKey)return NextResponse.json({success:false,error:'FAL_KEY missing'},{status:503});

    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const {data:owned}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);
    const businessId=owned?.[0]?.id||null;
    const {data:subRows,error:subError}=businessId
      ? await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).order('created_at',{ascending:false}).limit(1)
      : {data:[],error:null as any};
    if(subError)return NextResponse.json({success:false,error:'Subscription check failed'},{status:500});
    const sub=subRows?.[0]||null;
    const valid=!!sub&&(sub.status==='active'||sub.status==='trialing')&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    let pretrial=!sub;
    if(pretrial&&businessId){
      const {count}=await supabase.from('catalogs').select('*',{count:'exact',head:true}).eq('business_id',businessId);
      pretrial=(count||0)===0;
    }
    if(!valid&&!pretrial)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const body=await req.json();
    const inputType=body?.input_type==='text'?'text':'image';
    const context=body?.business_context||{};
    const preset=body?.preset||{};
    const completionMode=body?.completion_mode===true;
    const presetContext=`Selected Qatalink preset: ${preset?.label||preset?.id||'none'}. Preferred category vocabulary when appropriate: ${Array.isArray(preset?.categories)?preset.categories.join(', '):'none'}. Treat this as business-sector context, but never discard explicit source categories or invent products/services that are not in the source.`;
    const completionContext=completionMode?'This source is a SUPPLEMENT to an existing catalogue. Extract only what is actually present in this supplement, keeping enough category context to merge it later. Do not invent missing older items.':'';
    let userContent:any;

    if(inputType==='image'){
      const candidates=Array.isArray(body?.source?.image_urls)?body.source.image_urls:[body?.source?.image_url||body?.image_url];
      const imageUrls:string[]=Array.from(new Set<string>(candidates.map((value:any)=>String(value||'').trim()).filter((value:string)=>value.length>0))).slice(0,MAX_SOURCE_IMAGES);
      if(!imageUrls.length)return NextResponse.json({success:false,error:'image_url or image_urls required'},{status:400});
      const sourceLabel=imageUrls.length===1?'cette image':`ces ${imageUrls.length} images/pages`;
      userContent=[
        {type:'text',text:`Analyse ${sourceLabel} de menu/catalogue et transforme tout le contenu lisible dans le schéma Qatalink. Les images fournies appartiennent au même catalogue et doivent être réunies dans un résultat unique, sans doublons évidents entre pages. Contexte entreprise: ${JSON.stringify(context)}. ${presetContext} ${completionContext} ${schemaInstruction}`},
        ...imageUrls.map(imageUrl=>({type:'image_url',image_url:imageUrl}))
      ];
    }else{
      const text=String(body?.source?.text||body?.text||'').trim();
      if(!text)return NextResponse.json({success:false,error:'text required'},{status:400});
      userContent=`Structure ce texte massif de menu/catalogue dans le schéma Qatalink. Contexte entreprise: ${JSON.stringify(context)}. ${presetContext} ${completionContext}\n\nSOURCE:\n${text}\n\n${schemaInstruction}`;
    }

    const provider=await fetch(FAL_OPENAI_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},
      body:JSON.stringify({
        model:'google/gemini-2.5-flash',
        temperature:0.15,
        messages:[
          {role:'system',content:`You are a precise OCR and catalogue structuring engine. Respect the selected business-sector preset while preserving the source faithfully. ${schemaInstruction}`},
          {role:'user',content:userContent}
        ]
      }),
      cache:'no-store'
    });

    const providerData=await provider.json().catch(()=>null);
    if(!provider.ok)return NextResponse.json({success:false,error:providerData?.error?.message||providerData?.error||'Fal vision request failed',provider:providerData},{status:provider.status});
    const raw=providerData?.choices?.[0]?.message?.content;
    if(!raw)return NextResponse.json({success:false,error:'Fal returned an empty response',provider:providerData},{status:502});

    const catalog=parseModelJson(String(raw));
    catalog.schema='qatalink_catalog_v2';
    catalog.source_type=inputType;

    return NextResponse.json({success:true,catalog,usage:providerData?.usage||null,pretrial,image_count:inputType==='image'?(Array.isArray(body?.source?.image_urls)?Math.min(body.source.image_urls.length,MAX_SOURCE_IMAGES):1):0});
  }catch(e:any){
    return NextResponse.json({success:false,error:e?.message||'OCR failed'},{status:500});
  }
}
