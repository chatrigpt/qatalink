import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const FAL_OPENAI_URL='https://fal.run/openrouter/router/openai/v1/chat/completions';

function parseJson(value:string){const cleaned=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();try{return JSON.parse(cleaned)}catch{}const a=cleaned.indexOf('{'),b=cleaned.lastIndexOf('}');if(a>=0&&b>a)return JSON.parse(cleaned.slice(a,b+1));throw new Error('INVALID_MODEL_JSON')}
function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function dayKey(d:Date){return d.toISOString().slice(0,10)}
function addDays(date:Date,days:number){const d=new Date(date);d.setUTCDate(d.getUTCDate()+days);return d}

async function authed(req:NextRequest){
  const auth=req.headers.get('authorization')||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';if(!token)throw new Error('UNAUTHORIZED');
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user},error}=await supabase.auth.getUser(token);if(error||!user)throw new Error('UNAUTHORIZED');return {supabase,user,token};
}

async function weatherFor(profile:any,horizon:number){
  const lat=Number(profile?.latitude),lng=Number(profile?.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return {available:false,daily:[]};
  const url=new URL('https://api.open-meteo.com/v1/forecast');url.searchParams.set('latitude',String(lat));url.searchParams.set('longitude',String(lng));url.searchParams.set('daily','temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max');url.searchParams.set('forecast_days',String(clamp(horizon,1,16)));url.searchParams.set('timezone','auto');
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return {available:false,daily:[]};const j=await r.json();const rows=(j?.daily?.time||[]).map((date:string,i:number)=>({date,temp_max:Number(j.daily.temperature_2m_max?.[i]||0),temp_min:Number(j.daily.temperature_2m_min?.[i]||0),rain_mm:Number(j.daily.precipitation_sum?.[i]||0),rain_probability:Number(j.daily.precipitation_probability_max?.[i]||0)}));return {available:true,timezone:j.timezone,daily:rows}}
  catch{return {available:false,daily:[]}}
}

function buildForecast(context:any,horizon:number,weather:any){
  const sales=Array.isArray(context?.sales)?context.sales:[];const items=Array.isArray(context?.items)?context.items:[];const events=Array.isArray(context?.events)?context.events:[];const profile=context?.profile||{};const today=new Date();today.setUTCHours(0,0,0,0);
  const itemById=new Map(items.map((x:any)=>[String(x.id),x]));const grouped=new Map<string,any[]>();
  for(const row of sales){const key=String(row.item_id||row.item_name||'').trim();if(!key)continue;const arr=grouped.get(key)||[];arr.push(row);grouped.set(key,arr)}
  const results:any[]=[];
  for(const [key,rows] of grouped){
    const item=itemById.get(String(rows[0]?.item_id||''));const itemName=String(item?.name||rows[0]?.item_name||'Article');
    const daily=new Map<string,number>();let minDate:Date|null=null,maxDate:Date|null=null;
    for(const r of rows){const d=new Date(`${r.sold_on}T00:00:00Z`);if(Number.isNaN(d.getTime()))continue;daily.set(dayKey(d),(daily.get(dayKey(d))||0)+Number(r.quantity||0));if(!minDate||d<minDate)minDate=d;if(!maxDate||d>maxDate)maxDate=d}
    if(!minDate||!maxDate)continue;
    const span=Math.max(1,Math.floor((today.getTime()-minDate.getTime())/86400000)+1);
    const avgWindow=(from:number,to:number)=>{let total=0,days=0;for(let i=from;i<to;i++){const d=addDays(today,-i-1);total+=daily.get(dayKey(d))||0;days++}return days?total/days:0};
    const recent=avgWindow(0,28),previous=avgWindow(28,56),long=avgWindow(0,Math.min(84,span));let baseline=recent*.65+previous*.25+long*.10;if(baseline<=0)baseline=Math.max(recent,long);
    const trendRatio=previous>0?clamp(recent/previous,.6,1.6):1;const weekdayTotals=Array(7).fill(0),weekdayCounts=Array(7).fill(0);
    for(let i=0;i<Math.min(span,112);i++){const d=addDays(today,-i-1);const w=d.getUTCDay();weekdayTotals[w]+=daily.get(dayKey(d))||0;weekdayCounts[w]++}
    const weekdayAvg=weekdayTotals.map((v,i)=>weekdayCounts[i]?v/weekdayCounts[i]:baseline);const overall=weekdayAvg.reduce((a,b)=>a+b,0)/7||baseline||1;
    let forecast=0,seasonSum=0,weatherSum=0,eventSum=0;const explanations:string[]=[];
    for(let i=0;i<horizon;i++){
      const d=addDays(today,i);const sf=clamp((weekdayAvg[d.getUTCDay()]||overall)/overall,.55,1.65);seasonSum+=sf;
      const progress=horizon>1?i/(horizon-1):0;const trendFactor=1+(trendRatio-1)*(.45+progress*.55);
      let wf=1;const wr=weather?.daily?.find((x:any)=>x.date===dayKey(d));if(wr){const sensitivity=String(profile?.weather_sensitivity||'medium');const strength=sensitivity==='high'?.05:sensitivity==='medium'?.025:0;const deliveryHeavy=!!profile?.business_context?.delivery_heavy;if((wr.rain_probability>=70||wr.rain_mm>=8)&&strength){wf*=deliveryHeavy?1+strength:1-strength}}
      weatherSum+=wf;
      let ef=1;for(const ev of events){const start=new Date(ev.starts_at),end=new Date(ev.ends_at||ev.starts_at);if(d>=new Date(start.toISOString().slice(0,10)+'T00:00:00Z')&&d<=new Date(end.toISOString().slice(0,10)+'T23:59:59Z')){if(ev.item_id&&item?.id&&String(ev.item_id)!==String(item.id))continue;if(ev.catalog_id&&item?.catalog_id&&String(ev.catalog_id)!==String(item.catalog_id))continue;const pct=Math.abs(Number(ev.expected_impact_pct||0))/100;if(ev.expected_direction==='up')ef*=1+pct;else if(ev.expected_direction==='down')ef*=Math.max(.1,1-pct)}}eventSum+=ef;
      forecast+=baseline*sf*trendFactor*wf*ef;
    }
    const obs=rows.length;const confidence=clamp(.42+Math.min(span,180)/360+Math.min(obs,90)/300,0.45,0.94);const price=Number(item?.promo_price_minor??item?.price_minor??0);const qty=Math.max(0,forecast);
    if(trendRatio>1.08)explanations.push(`tendance récente +${Math.round((trendRatio-1)*100)} %`);if(trendRatio<.92)explanations.push(`tendance récente ${Math.round((trendRatio-1)*100)} %`);if(events.length)explanations.push('événements commerciaux pris en compte');if(weather?.available)explanations.push('météo locale intégrée');
    results.push({catalog_id:item?.catalog_id||rows[0]?.catalog_id||null,category_id:item?.category_id||null,item_id:item?.id||rows[0]?.item_id||null,item_name:itemName,forecast_quantity:Number(qty.toFixed(2)),forecast_revenue_minor:price?Math.round(qty*price):null,baseline_quantity:Number((baseline*horizon).toFixed(2)),confidence:Number(confidence.toFixed(3)),model_name:'Saisonnalité hebdo + tendance pondérée',trend_pct:Number(((trendRatio-1)*100).toFixed(2)),seasonality_factor:Number((seasonSum/horizon).toFixed(4)),weather_factor:Number((weatherSum/horizon).toFixed(4)),event_factor:Number((eventSum/horizon).toFixed(4)),explanation:explanations.length?explanations.join(' · '):'Historique et saisonnalité hebdomadaire'});
  }
  const byItem=new Map(results.map(x=>[String(x.item_id||''),x]));const recipes=Array.isArray(context?.recipes)?context.recipes:[];const stocks=Array.isArray(context?.stock)?context.stock:[];const stockById=new Map(stocks.map((x:any)=>[String(x.id),x]));const needs=new Map<string,number>();
  for(const r of recipes){const f=byItem.get(String(r.item_id||''));if(!f)continue;const sid=String(r.stock_item_id||'');needs.set(sid,(needs.get(sid)||0)+Number(f.forecast_quantity||0)*Number(r.quantity_per_item||0))}
  const safetyDays=clamp(Number(profile?.safety_stock_days||2),0,30);const recommendations:any[]=[];
  for(const [sid,need] of needs){const s=stockById.get(sid);if(!s)continue;const current=Number(s.quantity||0),daily=horizon?need/horizon:0,safety=daily*safetyDays,recommended=Math.max(0,need+safety-current),coverage=daily>0?current/daily:999;let risk='ok';if(current<=0||coverage<1)risk='critical';else if(coverage<safetyDays)risk='high';else if(recommended>0)risk='low';recommendations.push({stock_item_id:sid,stock_item_name:s.name,current_quantity:Number(current.toFixed(3)),projected_need:Number(need.toFixed(3)),safety_quantity:Number(safety.toFixed(3)),recommended_quantity:Number(recommended.toFixed(3)),coverage_days:Number(coverage.toFixed(2)),risk_level:risk,reason:recommended>0?`Besoin prévisionnel ${need.toFixed(1)} ${s.unit||''} + ${safetyDays} j de sécurité`:'Couverture suffisante sur l’horizon'});}
  return {results,recommendations};
}

export async function POST(req:NextRequest){
  try{
    const {supabase}=await authed(req);const body=await req.json();const action=String(body?.action||'workspace');const businessId=String(body?.business_id||'');if(!businessId)return NextResponse.json({success:false,error:'BUSINESS_REQUIRED'},{status:400});
    if(action==='workspace'){const {data,error}=await supabase.rpc('qatalink_forecast_workspace',{p_business_id:businessId});if(error)throw error;return NextResponse.json({success:true,...data})}
    if(action==='profile'){const {data,error}=await supabase.rpc('qatalink_save_forecast_profile',{p_business_id:businessId,p_payload:body?.profile||{}});if(error)throw error;return NextResponse.json({success:true,profile:data})}
    if(action==='event'){const {data,error}=await supabase.rpc('qatalink_add_forecast_event',{p_business_id:businessId,p_payload:body?.event||{}});if(error)throw error;return NextResponse.json({success:true,event:data})}
    if(action==='commit_import'){const {data,error}=await supabase.rpc('qatalink_import_forecast_rows',{p_business_id:businessId,p_source_type:String(body?.source_type||'text'),p_label:String(body?.label||''),p_rows:Array.isArray(body?.rows)?body.rows:[],p_metadata:body?.metadata||{}});if(error)throw error;return NextResponse.json({success:true,...data})}
    if(action==='preview_import'){
      const falKey=process.env.FAL_KEY;if(!falKey)return NextResponse.json({success:false,error:'VISION_UNAVAILABLE'},{status:503});const sourceType=String(body?.source_type||'text');const text=String(body?.text||'').trim();const imageData=String(body?.image_data_url||'').trim();if(!text&&!imageData)return NextResponse.json({success:false,error:'SOURCE_REQUIRED'},{status:400});
      const schema=`Return ONLY JSON {"rows":[{"sold_on":"YYYY-MM-DD","item_name":"","quantity":0,"revenue_minor":null,"currency_code":"XOF","source_channel":"","context_flags":{}}],"warnings":[],"confidence":0}. Extract sales history faithfully. Never invent dates, quantities, products or revenue. If revenue is shown in FCFA/CFA use integer XOF amount. Preserve separate dates and products. Put uncertain readings in warnings.`;
      const content=imageData?[{type:'text',text:`Analyse cet historique de ventes et structure-le. ${schema}`},{type:'image_url',image_url:imageData}]:`Structure cet historique brut de ventes. ${schema}\n\nSOURCE:\n${text}`;
      const provider=await fetch(FAL_OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},body:JSON.stringify({model:'google/gemini-2.5-flash',temperature:.05,messages:[{role:'system',content:'Tu es un moteur OCR/comptable précis pour historiques de ventes. Aucune invention.'},{role:'user',content}]})});const pj=await provider.json().catch(()=>null);if(!provider.ok)throw new Error(pj?.error?.message||'IMPORT_PARSE_FAILED');const parsed=parseJson(String(pj?.choices?.[0]?.message?.content||''));return NextResponse.json({success:true,source_type:sourceType,rows:Array.isArray(parsed?.rows)?parsed.rows:[],warnings:parsed?.warnings||[],confidence:parsed?.confidence??null});
    }
    if(action==='run'){
      const horizon=clamp(Number(body?.horizon_days||7),1,30);const {data:context,error}=await supabase.rpc('qatalink_forecast_context',{p_business_id:businessId,p_days:730});if(error)throw error;const weather=await weatherFor(context?.profile,horizon);const built=buildForecast(context,horizon,weather);const snapshot={event_count:Array.isArray(context?.events)?context.events.length:0,sales_rows:Array.isArray(context?.sales)?context.sales.length:0,generated_at:new Date().toISOString()};const {data:runId,error:saveError}=await supabase.rpc('qatalink_save_forecast_run',{p_business_id:businessId,p_horizon_days:horizon,p_weather:weather,p_context:snapshot,p_results:built.results,p_recommendations:built.recommendations});if(saveError)throw saveError;return NextResponse.json({success:true,run_id:runId,weather,results:built.results,recommendations:built.recommendations});
    }
    return NextResponse.json({success:false,error:'INVALID_ACTION'},{status:400});
  }catch(e:any){const msg=String(e?.message||e?.details||'FORECAST_FAILED');const status=msg.includes('BUSINESS_PLAN_REQUIRED')?403:msg.includes('UNAUTHORIZED')?401:500;return NextResponse.json({success:false,error:msg},{status})}
}
