import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function cleanJson(raw:string){
  const s=String(raw||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  return a>=0&&b>a?s.slice(a,b+1):s;
}

export async function POST(req:NextRequest){
  try{
    const falKey=process.env.FAL_KEY;
    if(!falKey)return NextResponse.json({error:'FAL_KEY missing'},{status:503});
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({error:'Unauthorized'},{status:401});
    const body=await req.json();
    const imageUrl=String(body?.image_url||'');
    const businessType=String(body?.business_type||'other');
    if(!imageUrl)return NextResponse.json({error:'image_url required'},{status:400});

    const prompt=`Analyze this brand-reference image (it can be a logo, packaging, flyer, storefront, interior or other visual reference) and design an accessible Qatalink menu/catalogue visual theme for sector "${businessType}". Identify the dominant and accent colors, then construct a harmonious palette. Preserve the visual spirit of the image while prioritizing excellent text/background contrast and mobile readability. Never choose text and background colors that are too similar. Choose whether a solid or subtle gradient works best. Suggest fonts and layout appropriate to the sector. Return ONLY JSON. JSON schema exactly:\n{"primary_color":"#RRGGBB","secondary_color":"#RRGGBB","background_color":"#RRGGBB","background_mode":"solid|gradient","background_gradient":"linear-gradient(135deg,#RRGGBB,#RRGGBB)","text_color":"#RRGGBB","heading_font":"Plus Jakarta Sans|Inter|Poppins|Montserrat|Playfair Display|DM Serif Display","body_font":"Plus Jakarta Sans|Inter|Poppins|Montserrat","border_radius":"8px|16px|22px|30px","card_style":"clean|soft|premium","button_style":"square|rounded|pill","layout_style":"list|compact|cards|grid|showcase","logo_shape":"circle|rounded|square","reason":"short explanation"}`;

    const r=await fetch('https://fal.run/openrouter/router/vision',{
      method:'POST',
      headers:{Authorization:`Key ${falKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({image_urls:[imageUrl],prompt,system_prompt:'Only return valid JSON. No markdown, no prefix, no suffix.',model:'google/gemini-2.5-flash',temperature:0.15,max_tokens:900}),
      cache:'no-store'
    });
    const d:any=await r.json().catch(()=>null);
    if(!r.ok)return NextResponse.json({error:d?.error||'Fal vision failed',provider:d},{status:r.status});
    let theme:any;
    try{theme=JSON.parse(cleanJson(d?.output||''));}catch{return NextResponse.json({error:'Fal returned invalid theme JSON',raw:d?.output},{status:422});}
    return NextResponse.json({success:true,theme,usage:d?.usage||null});
  }catch(e:any){return NextResponse.json({error:e?.message||'Theme analysis failed'},{status:500})}
}
