import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'crypto';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const FAL_OPENAI_URL='https://fal.run/openrouter/router/openai/v1/chat/completions';
const DESCRIPTION_CREDIT_COST=1.5;

function clean(value:unknown,max=1200){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}

export async function POST(req:NextRequest){
  let charged:{supabase:any,businessId:string,referenceId:string}|null=null;
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
      .select('id,name,description,short_description,description_generation_hint,catalog_id,category_id')
      .eq('id',itemId).maybeSingle();
    if(itemError||!item)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:404});

    const {data:catalog}=await supabase.from('catalogs').select('id,title,business_id').eq('id',item.catalog_id).maybeSingle();
    if(!catalog)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:404});
    const {data:business}=await supabase.from('businesses').select('id,name,business_type,country_code').eq('id',catalog.business_id).maybeSingle();
    if(!business)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:404});

    const {data:subRows}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',business.id).order('created_at',{ascending:false}).limit(1);
    const sub=subRows?.[0];
    const valid=!!sub&&['active','trialing'].includes(String(sub.status))&&(!sub.current_period_end||new Date(sub.current_period_end).getTime()>Date.now());
    if(!valid)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const referenceId=`description:${item.id}:${randomUUID()}`;
    const {data:balanceAfter,error:creditError}=await supabase.rpc('consume_ai_credits',{p_business_id:business.id,p_kind:'description_generation',p_reference_id:referenceId,p_cost:DESCRIPTION_CREDIT_COST,p_metadata:{feature:'description',item_id:item.id}});
    if(creditError){
      const msg=String(creditError.message||'');
      if(msg.includes('INSUFFICIENT_CREDITS')){
        const {data:wallet}=await supabase.from('credit_wallets').select('balance').eq('business_id',business.id).maybeSingle();
        return NextResponse.json({success:false,error:'INSUFFICIENT_CREDITS',message:`Il faut ${DESCRIPTION_CREDIT_COST} crédit pour générer une description.`,balance:Number(wallet?.balance||0),required:DESCRIPTION_CREDIT_COST},{status:402});
      }
      throw creditError;
    }
    charged={supabase,businessId:business.id,referenceId};

    const name=clean(item.name,180);
    const dbExisting=clean(item.description||item.short_description,700);
    const currentDescription=clean(body?.current_description,700)||dbExisting;
    const brief=clean(body?.brief,700)||clean(item.description_generation_hint,700);
    const sector=clean(business.business_type||'commerce',80);

    if(brief!==clean(item.description_generation_hint,700)){
      await supabase.from('items').update({description_generation_hint:brief||null,updated_at:new Date().toISOString()}).eq('id',item.id);
    }

    const prompt=`Tu dois rédiger UNE description commerciale courte pour un article Qatalink, en français.\n\nNOM EXACT DE L’ARTICLE — CONTRAINTE PRINCIPALE : ${name}\nDESCRIPTION ACTUELLE : ${currentDescription||'aucune'}\nBRIEF FACTUEL FOURNI PAR LE CLIENT : ${brief||'aucun'}\nSECTEUR : ${sector}\n\nRÈGLE DE FIDÉLITÉ ABSOLUE :\n- Le NOM EXACT est la source de vérité principale.\n- Si la description actuelle semble parler d’un autre produit, plat ou service que le nom, IGNORE les éléments contradictoires au lieu de les répéter.\n- Tu peux utiliser uniquement les faits explicitement présents dans le nom, la description actuelle cohérente avec le nom et le brief client.\n- N’invente JAMAIS d’ingrédient, accompagnement, sauce, épice, cuisson, origine, quantité, marque, matière, bénéfice, garantie ou caractéristique non fournie.\n- Exemple critique : si le nom est “Cailles Braisées” et qu’aucune source ne mentionne du riz, le mot “riz” ne doit jamais apparaître.\n- Tu peux ajouter seulement des qualificatifs sensoriels génériques compatibles avec le nom, comme appétissant, savoureux, généreux, tendre, croustillant, rafraîchissant, élégant, pratique, sans transformer ces adjectifs en faits précis.\n\nSTYLE :\n- Retourne uniquement la description finale, sans titre, sans guillemets, sans puces.\n- 1 à 2 phrases, environ 14 à 30 mots.\n- Pour un plat/boisson : appétissant mais crédible.\n- Pour un produit/service : désirable, concret et clair.\n- Pas d’emoji, pas de prix, pas de hashtag, pas de promesse exagérée.`;

    const provider=await fetch(FAL_OPENAI_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Key ${falKey}`},
      body:JSON.stringify({
        model:'google/gemini-2.5-flash',
        temperature:0.18,
        max_tokens:130,
        messages:[
          {role:'system',content:'Tu es un copywriter catalogue extrêmement fidèle aux faits. Le nom de l’article est une contrainte dure. Si une ancienne description semble décrire un autre article, tu l’ignores. Tu n’inventes aucun ingrédient ni détail.'},
          {role:'user',content:prompt}
        ]
      }),
      cache:'no-store'
    });
    const providerData:any=await provider.json().catch(()=>null);
    if(!provider.ok){await supabase.rpc('refund_ai_credits',{p_business_id:business.id,p_kind:'description_generation',p_reference_id:referenceId,p_refund_kind:'description_generation_refund'}).catch(()=>null);charged=null;return NextResponse.json({success:false,error:'DESCRIPTION_GENERATION_FAILED'},{status:502});}
    let description=clean(providerData?.choices?.[0]?.message?.content,600);
    description=description.replace(/^```(?:text)?\s*/i,'').replace(/\s*```$/,'').replace(/^['“”"]|['“”"]$/g,'').trim();
    if(!description){await supabase.rpc('refund_ai_credits',{p_business_id:business.id,p_kind:'description_generation',p_reference_id:referenceId,p_refund_kind:'description_generation_refund'}).catch(()=>null);charged=null;return NextResponse.json({success:false,error:'EMPTY_DESCRIPTION'},{status:502});}

    const {error:updateError}=await supabase.from('items').update({description,short_description:description,description_generation_hint:brief||null,updated_at:new Date().toISOString()}).eq('id',item.id);
    if(updateError){await supabase.rpc('refund_ai_credits',{p_business_id:business.id,p_kind:'description_generation',p_reference_id:referenceId,p_refund_kind:'description_generation_refund'}).catch(()=>null);charged=null;return NextResponse.json({success:false,error:'DESCRIPTION_SAVE_FAILED'},{status:500});}

    charged=null;
    return NextResponse.json({success:true,item_id:item.id,description,brief,credit_cost:DESCRIPTION_CREDIT_COST,balance:Number(balanceAfter)});
  }catch(error){
    if(charged){await charged.supabase.rpc('refund_ai_credits',{p_business_id:charged.businessId,p_kind:'description_generation',p_reference_id:charged.referenceId,p_refund_kind:'description_generation_refund'}).catch(()=>null)}
    console.error('[Qatalink:DescriptionGenerate]',error);
    return NextResponse.json({success:false,error:'DESCRIPTION_GENERATION_FAILED'},{status:500});
  }
}
