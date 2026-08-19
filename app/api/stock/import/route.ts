import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const FAL_OPENAI_URL='https://fal.run/openrouter/router/openai/v1/chat/completions';
const ALLOWED_UNITS=['unité','portion','bouteille','canette','pack','kg','g','L','cl','ml'];

function clean(value:unknown,max=20000){return String(value??'').trim().slice(0,max)}
function parseJson(value:string){const s=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();try{return JSON.parse(s)}catch{}const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));throw new Error('INVALID_AI_JSON')}
function normalizeUnit(value:unknown){const raw=String(value??'').trim().toLowerCase();const aliases:Record<string,string>={'unit':'unité','unite':'unité','unites':'unité','unités':'unité','piece':'unité','pièce':'unité','pieces':'unité','pièces':'unité','portions':'portion','bottles':'bouteille','bouteilles':'bouteille','canettes':'canette','packs':'pack','kilogramme':'kg','kilogrammes':'kg','gramme':'g','grammes':'g','litre':'L','litres':'L','l':'L','centilitre':'cl','centilitres':'cl','millilitre':'ml','millilitres':'ml'};const mapped=aliases[raw]||raw;return ALLOWED_UNITS.includes(mapped)?mapped:'unité'}

export async function POST(req:NextRequest){
  try{
    const falKey=String(process.env.FAL_KEY||'').trim();
    if(!falKey)return NextResponse.json({success:false,error:'STOCK_IMPORT_UNAVAILABLE'},{status:503});
    const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const body=await req.json().catch(()=>({}));
    const businessId=clean(body?.business_id,80);if(!businessId)return NextResponse.json({success:false,error:'BUSINESS_REQUIRED'},{status:400});
    const {data:business}=await supabase.from('businesses').select('id,name').eq('id',businessId).maybeSingle();if(!business)return NextResponse.json({success:false,error:'BUSINESS_UNAVAILABLE'},{status:404});
    const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).order('created_at',{ascending:false}).limit(1);
    const sub=subs?.[0];const valid=!!sub&&['active','trialing'].includes(String(sub.status))&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!valid||!['linkhub','trial'].includes(String(sub?.plan_code||'')))return NextResponse.json({success:false,error:'BUSINESS_PLAN_REQUIRED'},{status:403});

    const inputType=body?.input_type==='image'?'image':'text';
    const schema=`Retourne UNIQUEMENT un JSON valide de cette forme : {"items":[{"name":"","quantity":0,"unit":"unité","low_stock_threshold":0,"note":""}],"warnings":[]}.
Règles :
- Extrais uniquement les lignes de stock réellement présentes dans la source. N’invente aucun produit.
- quantity et low_stock_threshold sont des nombres >= 0. Si le seuil n’est pas indiqué, mets 0.
- Unités autorisées : unité, portion, bouteille, canette, pack, kg, g, L, cl, ml. Normalise vers l’une de ces valeurs.
- Si la source donne une quantité mais aucune unité, utilise unité.
- Conserve un nom court et fidèle. Ne transforme pas un ingrédient en plat.
- Si une lecture est incertaine, ajoute un warning au lieu d’inventer.`;

    let userContent:any;
    if(inputType==='image'){
      const imageUrl=clean(body?.image_url,120000);if(!imageUrl)return NextResponse.json({success:false,error:'IMAGE_REQUIRED'},{status:400});
      userContent=[{type:'text',text:`Analyse cette photo/capture de fiche de stock et transforme-la en lignes importables dans Qatalink. ${schema}`},{type:'image_url',image_url:imageUrl}];
    }else{
      const text=clean(body?.text,30000);if(!text)return NextResponse.json({success:false,error:'TEXT_REQUIRED'},{status:400});
      userContent=`Structure ce texte de stock pour Qatalink.\n\nSOURCE :\n${text}\n\n${schema}`;
    }

    const provider=await fetch(FAL_OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},body:JSON.stringify({model:'google/gemini-2.5-flash',temperature:0.05,max_tokens:1800,messages:[{role:'system',content:'Tu es un moteur OCR et de structuration de stock. Tu privilégies la fidélité absolue à la source et tu n’inventes jamais de ligne.'},{role:'user',content:userContent}]}),cache:'no-store'});
    const providerData:any=await provider.json().catch(()=>null);if(!provider.ok)return NextResponse.json({success:false,error:'STOCK_PARSE_FAILED'},{status:502});
    const parsed=parseJson(String(providerData?.choices?.[0]?.message?.content||''));
    const rows=Array.isArray(parsed?.items)?parsed.items.slice(0,500).map((row:any)=>({name:clean(row?.name,180),quantity:Math.max(0,Number(row?.quantity)||0),unit:normalizeUnit(row?.unit),low_stock_threshold:Math.max(0,Number(row?.low_stock_threshold)||0),note:clean(row?.note,300)})).filter((row:any)=>row.name):[];
    if(!rows.length)return NextResponse.json({success:false,error:'NO_STOCK_ROWS_FOUND',warnings:parsed?.warnings||[]},{status:422});
    return NextResponse.json({success:true,items:rows,warnings:Array.isArray(parsed?.warnings)?parsed.warnings:[]});
  }catch(error){console.error('[Qatalink:StockImport]',error);return NextResponse.json({success:false,error:'STOCK_IMPORT_FAILED'},{status:500})}
}
