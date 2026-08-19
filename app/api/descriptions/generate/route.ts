import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const FAL_OPENAI_URL='https://fal.run/openrouter/router/openai/v1/chat/completions';

function clean(value:unknown,max=1200){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}

export async function POST(req:NextRequest){
  try{
    const falKey=String(process.env.FAL_KEY||'').trim();
    if(!falKey)return NextResponse.json({success:false,error:'DESCRIPTION_GENERATION_UNAVAILABLE'},{status:503});

    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const body=await req.json().catch(()=>({}));
    const itemId=clean(body?.item_id,80);
    if(!itemId)return NextResponse.json({success:false,error:'ITEM_REQUIRED'},{status:400});

    const {data:item,error:itemError}=await supabase.from('items')
      .select('id,name,description,short_description,catalog_id,category_id')
      .eq('id',itemId).maybeSingle();
    if(itemError||!item)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:404});

    const {data:catalog}=await supabase.from('catalogs').select('id,title,business_id').eq('id',item.catalog_id).maybeSingle();
    if(!catalog)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:404});
    const {data:business}=await supabase.from('businesses').select('id,name,business_type,country_code').eq('id',catalog.business_id).maybeSingle();
    if(!business)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:404});
    const {data:category}=item.category_id?await supabase.from('categories').select('name').eq('id',item.category_id).maybeSingle():{data:null as any};

    const {data:subRows}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',business.id).order('created_at',{ascending:false}).limit(1);
    const sub=subRows?.[0];
    const valid=!!sub&&['active','trialing'].includes(String(sub.status))&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!valid)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const name=clean(item.name,180);
    const existing=clean(item.description||item.short_description,700);
    const sector=clean(business.business_type||'commerce',80);
    const categoryName=clean(category?.name||'',120);
    const prompt=`Rédige UNE description commerciale courte en français pour un article de catalogue Qatalink.\n\nArticle : ${name}\nDescription actuelle : ${existing||'aucune'}\nCatégorie : ${categoryName||'non précisée'}\nSecteur : ${sector}\nMarché principal : Côte d’Ivoire.\n\nRègles obligatoires :\n- Retourne uniquement la description finale, sans titre, sans guillemets, sans puces.\n- 1 à 2 phrases, environ 15 à 32 mots.\n- Si c’est un plat ou une boisson, rends le texte appétissant, sensoriel et naturel.\n- Si c’est un produit ou un service, rends le texte désirable, clair et concret.\n- Améliore une description basique si elle existe.\n- Si seul le nom est connu, n’invente pas d’ingrédients précis, de grammage, d’origine, de marque, de garantie, de bénéfice médical ou de caractéristique non fournie.\n- Pas d’emoji, pas de prix, pas de hashtag, pas de promesse exagérée.\n- Conserve fidèlement tous les faits déjà présents dans la description actuelle.`;

    const provider=await fetch(FAL_OPENAI_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},
      body:JSON.stringify({
        model:'google/gemini-2.5-flash',
        temperature:0.55,
        max_tokens:140,
        messages:[
          {role:'system',content:'Tu es un copywriter catalogue précis. Tu rends les offres plus désirables sans jamais inventer de faits.'},
          {role:'user',content:prompt}
        ]
      }),
      cache:'no-store'
    });
    const providerData:any=await provider.json().catch(()=>null);
    if(!provider.ok)return NextResponse.json({success:false,error:'DESCRIPTION_GENERATION_FAILED'},{status:502});
    let description=clean(providerData?.choices?.[0]?.message?.content,600);
    description=description.replace(/^```(?:text)?\s*/i,'').replace(/\s*```$/,'').replace(/^['“”"]|['“”"]$/g,'').trim();
    if(!description)return NextResponse.json({success:false,error:'EMPTY_DESCRIPTION'},{status:502});

    const {error:updateError}=await supabase.from('items').update({description,short_description:description,updated_at:new Date().toISOString()}).eq('id',item.id);
    if(updateError)return NextResponse.json({success:false,error:'DESCRIPTION_SAVE_FAILED'},{status:500});

    return NextResponse.json({success:true,item_id:item.id,description});
  }catch(error){
    console.error('[Qatalink:DescriptionGenerate]',error);
    return NextResponse.json({success:false,error:'DESCRIPTION_GENERATION_FAILED'},{status:500});
  }
}
