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
function safeDate(value:any){const d=new Date(String(value||''));return Number.isNaN(d.getTime())?null:d}

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

async function gdeltArticles(profile:any){
  const location=String(profile?.location_label||'').trim();if(!location)return [];
  const sector=String(profile?.business_context?.sector||'').trim();const audiences=Array.isArray(profile?.audience_tags)?profile.audience_tags.slice(0,4).join(' '):'';const terms=[`"${location.replace(/"/g,'')}"`,sector,audiences].filter(Boolean).join(' ');
  const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');url.searchParams.set('query',terms);url.searchParams.set('mode','ArtList');url.searchParams.set('maxrecords','30');url.searchParams.set('format','json');url.searchParams.set('sort','HybridRel');url.searchParams.set('timespan','7d');
  try{const r=await fetch(url,{headers:{'User-Agent':'QatalinkForecast/1.0'},cache:'no-store'});if(!r.ok)return [];const j=await r.json();return (Array.isArray(j?.articles)?j.articles:[]).slice(0,30).map((a:any)=>({title:String(a?.title||''),url:String(a?.url||''),domain:String(a?.domain||''),language:String(a?.language||''),sourcecountry:String(a?.sourcecountry||''),seendate:String(a?.seendate||''),socialimage:String(a?.socialimage||'')})).filter((a:any)=>a.title&&a.url)}catch{return []}
}

async function rankExternalFactors(profile:any,articles:any[]){
  if(!articles.length)return [];const falKey=process.env.FAL_KEY;if(!falKey)return [];
  const today=new Date().toISOString().slice(0,10);const context={today,location:profile?.location_label||'',service_radius_km:profile?.service_radius_km||5,audiences:profile?.audience_tags||[],sector:profile?.business_context?.sector||'',locality_notes:profile?.locality_notes||'',delivery_heavy:!!profile?.business_context?.delivery_heavy};
  const instruction=`Return ONLY valid JSON {"factors":[{"factor_type":"event|transport|economic|social|weather_context|news","title":"","starts_on":"YYYY-MM-DD","ends_on":"YYYY-MM-DD","direction":"up|down|neutral|unknown","impact_pct":0,"relevance_score":0.0,"confidence":0.0,"rationale":"","source_name":"","source_url":"","source_published_at":"ISO date or empty","expires_at":"ISO date"}]}. You are ranking CURRENT external factors that could materially influence demand for this specific local business. Use ONLY facts supported by the supplied article metadata. Ignore generic politics, distant news, unrelated national stories, crime reports and opinion pieces unless they plausibly affect customer traffic or purchasing. Prefer nearby events, transport/access disruptions, large concerts/sports/events, major local closures, exceptional commercial periods and other factors with a direct demand mechanism. Relevance and confidence are 0..1. Keep impact_pct conservative, normally 0..12. Do not invent an event date: if an article does not establish a future/recent actionable period, omit it. Return at most 8 factors and it is valid to return none.`;
  const provider=await fetch(FAL_OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},body:JSON.stringify({model:'google/gemini-2.5-flash',temperature:.05,messages:[{role:'system',content:instruction},{role:'user',content:`BUSINESS CONTEXT:\n${JSON.stringify(context)}\n\nSOURCE ARTICLES:\n${JSON.stringify(articles)}`}]})});const pj=await provider.json().catch(()=>null);if(!provider.ok)return [];const parsed=parseJson(String(pj?.choices?.[0]?.message?.content||''));const sourceUrls=new Set<string>(articles.map((a:any)=>String(a.url)));return (Array.isArray(parsed?.factors)?parsed.factors:[]).filter((f:any)=>sourceUrls.has(String(f?.source_url||''))&&Number(f?.relevance_score||0)>=.45).slice(0,8).map((f:any)=>({...f,impact_pct:clamp(Math.abs(Number(f.impact_pct||0)),0,12),relevance_score:clamp(Number(f.relevance_score||0),0,1),confidence:clamp(Number(f.confidence||0),0,1)}))
}

function buildForecast(context:any,horizon:number,weather:any){
  const sales:any[]=Array.isArray(context?.sales)?context.sales:[];const items:any[]=Array.isArray(context?.items)?context.items:[];const events:any[]=Array.isArray(context?.events)?context.events:[];const external:any[]=Array.isArray(context?.external_factors)?context.external_factors:[];const profile=context?.profile||{};const today=new Date();today.setUTCHours(0,0,0,0);
  const itemById=new Map<string,any>(items.map((x:any):[string,any]=>[String(x.id),x]));const grouped=new Map<string,any[]>();
  for(const row of sales){const key=String(row.item_id||row.item_name||'').trim();if(!key)continue;const arr=grouped.get(key)||[];arr.push(row);grouped.set(key,arr)}
  const results:any[]=[];
  for(const [,rows] of grouped){
    const item:any=itemById.get(String(rows[0]?.item_id||''));const itemName=String(item?.name||rows[0]?.item_name||'Article');
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
      let ef=1;for(const ev of events){const start=safeDate(ev.starts_at),end=safeDate(ev.ends_at||ev.starts_at);if(!start||!end)continue;if(d>=new Date(start.toISOString().slice(0,10)+'T00:00:00Z')&&d<=new Date(end.toISOString().slice(0,10)+'T23:59:59Z')){if(ev.item_id&&item?.id&&String(ev.item_id)!==String(item.id))continue;if(ev.catalog_id&&item?.catalog_id&&String(ev.catalog_id)!==String(item.catalog_id))continue;const pct=Math.abs(Number(ev.expected_impact_pct||0))/100;if(ev.expected_direction==='up')ef*=1+pct;else if(ev.expected_direction==='down')ef*=Math.max(.1,1-pct)}}
      for(const ext of external){const start=safeDate(ext.starts_on),end=safeDate(ext.ends_on||ext.starts_on);if(!start||!end)continue;if(d>=new Date(start.toISOString().slice(0,10)+'T00:00:00Z')&&d<=new Date(end.toISOString().slice(0,10)+'T23:59:59Z')){const weight=clamp(Number(ext.relevance_score||0),0,1)*clamp(Number(ext.confidence||0),0,1);const pct=Math.min(.12,Math.abs(Number(ext.impact_pct||0))/100)*weight;if(ext.direction==='up')ef*=1+pct;else if(ext.direction==='down')ef*=Math.max(.85,1-pct)}}eventSum+=ef;
      forecast+=baseline*sf*trendFactor*wf*ef;
    }
    const obs=rows.length;const confidence=clamp(.42+Math.min(span,180)/360+Math.min(obs,90)/300,0.45,0.94);const price=Number(item?.promo_price_minor??item?.price_minor??0);const qty=Math.max(0,forecast);
    if(trendRatio>1.08)explanations.push(`tendance récente +${Math.round((trendRatio-1)*100)} %`);if(trendRatio<.92)explanations.push(`tendance récente ${Math.round((trendRatio-1)*100)} %`);if(events.length)explanations.push('actions commerciales intégrées');if(external.length)explanations.push('facteurs externes qualifiés intégrés');if(weather?.available)explanations.push('météo locale intégrée');
    results.push({catalog_id:item?.catalog_id||rows[0]?.catalog_id||null,category_id:item?.category_id||null,item_id:item?.id||rows[0]?.item_id||null,item_name:itemName,forecast_quantity:Number(qty.toFixed(2)),forecast_revenue_minor:price?Math.round(qty*price):null,baseline_quantity:Number((baseline*horizon).toFixed(2)),confidence:Number(confidence.toFixed(3)),model_name:'Saisonnalité hebdo + tendance + contexte',trend_pct:Number(((trendRatio-1)*100).toFixed(2)),seasonality_factor:Number((seasonSum/horizon).toFixed(4)),weather_factor:Number((weatherSum/horizon).toFixed(4)),event_factor:Number((eventSum/horizon).toFixed(4)),explanation:explanations.length?explanations.join(' · '):'Historique et saisonnalité hebdomadaire'});
  }
  const byItem=new Map<string,any>(results.map((x:any):[string,any]=>[String(x.item_id||''),x]));const recipes:any[]=Array.isArray(context?.recipes)?context.recipes:[];const stocks:any[]=Array.isArray(context?.stock)?context.stock:[];const stockById=new Map<string,any>(stocks.map((x:any):[string,any]=>[String(x.id),x]));const needs=new Map<string,number>();
  for(const r of recipes){const f:any=byItem.get(String(r.item_id||''));if(!f)continue;const sid=String(r.stock_item_id||'');needs.set(sid,(needs.get(sid)||0)+Number(f.forecast_quantity||0)*Number(r.quantity_per_item||0))}
  const safetyDays=clamp(Number(profile?.safety_stock_days||2),0,30);const recommendations:any[]=[];
  for(const [sid,need] of needs){const s:any=stockById.get(sid);if(!s)continue;const current=Number(s.quantity||0),daily=horizon?need/horizon:0,safety=daily*safetyDays,recommended=Math.max(0,need+safety-current),coverage=daily>0?current/daily:999;let risk='ok';if(current<=0||coverage<1)risk='critical';else if(coverage<safetyDays)risk='high';else if(recommended>0)risk='low';recommendations.push({stock_item_id:sid,stock_item_name:s.name,current_quantity:Number(current.toFixed(3)),projected_need:Number(need.toFixed(3)),safety_quantity:Number(safety.toFixed(3)),recommended_quantity:Number(recommended.toFixed(3)),coverage_days:Number(coverage.toFixed(2)),risk_level:risk,reason:recommended>0?`Besoin prévisionnel ${need.toFixed(1)} ${s.unit||''} + ${safetyDays} j de sécurité`:'Couverture suffisante sur l’horizon'});}
  return {results,recommendations};
}

export async function POST(req:NextRequest){
  try{
    const {supabase}=await authed(req);const body=await req.json();const action=String(body?.action||'workspace');const businessId=String(body?.business_id||'');if(!businessId)return NextResponse.json({success:false,error:'BUSINESS_REQUIRED'},{status:400});
    if(action==='workspace'){const {data,error}=await supabase.rpc('qatalink_forecast_workspace',{p_business_id:businessId});if(error)throw error;return NextResponse.json({success:true,...data})}
    if(action==='profile'){const {data,error}=await supabase.rpc('qatalink_save_forecast_profile',{p_business_id:businessId,p_payload:body?.profile||{}});if(error)throw error;return NextResponse.json({success:true,profile:data})}
    if(action==='event'){const {data,error}=await supabase.rpc('qatalink_add_forecast_event',{p_business_id:businessId,p_payload:body?.event||{}});if(error)throw error;return NextResponse.json({success:true,event:data})}
    if(action==='commit_import'){const {data,error}=await supabase.rpc('qatalink_import_forecast_rows',{p_business_id:businessId,p_source_type:String(body?.source_type||'text'),p_label:String(body?.label||''),p_rows:Array.isArray(body?.rows)?body.rows:[],p_metadata:body?.metadata||{}});if(error)throw error;return NextResponse.json({success:true,...data})}
    if(action==='external_scan'){
      const {data:context,error}=await supabase.rpc('qatalink_forecast_context',{p_business_id:businessId,p_days:60});if(error)throw error;const profile=context?.profile||{};if(profile?.external_research_enabled===false)return NextResponse.json({success:false,error:'EXTERNAL_RESEARCH_DISABLED'},{status:409});if(!String(profile?.location_label||'').trim())return NextResponse.json({success:false,error:'LOCATION_REQUIRED'},{status:400});const articles=await gdeltArticles(profile);const factors=await rankExternalFactors(profile,articles);const {data:count,error:saveError}=await supabase.rpc('qatalink_replace_external_factors',{p_business_id:businessId,p_factors:factors});if(saveError)throw saveError;return NextResponse.json({success:true,articles_checked:articles.length,factors_saved:Number(count||0),factors});
    }
    if(action==='preview_import'){
      const falKey=process.env.FAL_KEY;if(!falKey)return NextResponse.json({success:false,error:'VISION_UNAVAILABLE'},{status:503});const sourceType=String(body?.source_type||'text');const text=String(body?.text||'').trim();const single=String(body?.image_data_url||'').trim();const imageDatas=Array.from(new Set<string>((Array.isArray(body?.image_data_urls)?body.image_data_urls:[single]).map((x:any)=>String(x||'').trim()).filter(Boolean))).slice(0,6);if(!text&&!imageDatas.length)return NextResponse.json({success:false,error:'SOURCE_REQUIRED'},{status:400});
      const schema=`Return ONLY JSON {"rows":[{"sold_on":"YYYY-MM-DD","item_name":"","quantity":0,"revenue_minor":null,"currency_code":"XOF","source_channel":"","context_flags":{}}],"warnings":[],"confidence":0}. Extract sales history faithfully. Never invent dates, quantities, products or revenue. If revenue is shown in FCFA/CFA use integer XOF amount. Preserve separate dates and products. Merge complementary pages but do not duplicate overlapping rows. Put uncertain readings in warnings.`;
      const content=imageDatas.length?[{type:'text',text:`Analyse ces ${imageDatas.length} image(s)/pages d’historique de ventes comme un seul ensemble et structure-les. ${text?`Contexte texte complémentaire : ${text}`:''} ${schema}`},...imageDatas.map(image_url=>({type:'image_url',image_url}))]:`Structure cet historique brut de ventes. ${schema}\n\nSOURCE:\n${text}`;
      const provider=await fetch(FAL_OPENAI_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},body:JSON.stringify({model:'google/gemini-2.5-flash',temperature:.05,messages:[{role:'system',content:'Tu es un moteur OCR/comptable précis pour historiques de ventes. Aucune invention.'},{role:'user',content}]})});const pj=await provider.json().catch(()=>null);if(!provider.ok)throw new Error(pj?.error?.message||'IMPORT_PARSE_FAILED');const parsed=parseJson(String(pj?.choices?.[0]?.message?.content||''));return NextResponse.json({success:true,source_type:sourceType,image_count:imageDatas.length,rows:Array.isArray(parsed?.rows)?parsed.rows:[],warnings:parsed?.warnings||[],confidence:parsed?.confidence??null});
    }
    if(action==='run'){
      const horizon=clamp(Number(body?.horizon_days||7),1,30);const {data:context,error}=await supabase.rpc('qatalink_forecast_context',{p_business_id:businessId,p_days:730});if(error)throw error;const weather=await weatherFor(context?.profile,horizon);const built=buildForecast(context,horizon,weather);const snapshot={event_count:Array.isArray(context?.events)?context.events.length:0,external_factor_count:Array.isArray(context?.external_factors)?context.external_factors.length:0,sales_rows:Array.isArray(context?.sales)?context.sales.length:0,generated_at:new Date().toISOString()};const {data:runId,error:saveError}=await supabase.rpc('qatalink_save_forecast_run',{p_business_id:businessId,p_horizon_days:horizon,p_weather:weather,p_context:snapshot,p_results:built.results,p_recommendations:built.recommendations});if(saveError)throw saveError;return NextResponse.json({success:true,run_id:runId,weather,results:built.results,recommendations:built.recommendations});
    }
    return NextResponse.json({success:false,error:'INVALID_ACTION'},{status:400});
  }catch(e:any){const msg=String(e?.message||e?.details||'FORECAST_FAILED');const status=msg.includes('BUSINESS_PLAN_REQUIRED')?403:msg.includes('UNAUTHORIZED')?401:500;return NextResponse.json({success:false,error:msg},{status})}
}
