import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

function cleanJson(raw:string){
  const s=String(raw||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  return a>=0&&b>a?s.slice(a,b+1):s;
}

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({error:'Unauthorized'},{status:401});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({error:'Unauthorized'},{status:401});

    const body=await req.json();
    const catalogId=String(body?.catalog_id||'');
    const action=String(body?.action||'analyze');
    const images=Array.isArray(body?.images)?body.images.slice(0,12):[];
    if(!catalogId)return NextResponse.json({error:'catalog_id required'},{status:400});

    const {data:catalog,error:catalogError}=await supabase.from('catalogs').select('id,business_id,title').eq('id',catalogId).maybeSingle();
    if(catalogError||!catalog)return NextResponse.json({error:'Catalogue introuvable ou non autorisé.'},{status:404});
    const {data:items,error:itemError}=await supabase.from('items').select('id,name,short_description,description,category_id,sort_order').eq('catalog_id',catalogId).eq('is_available',true).order('sort_order');
    if(itemError)return NextResponse.json({error:itemError.message},{status:400});
    const allowed=new Set((items||[]).map((x:any)=>String(x.id)));

    if(action==='apply'){
      const assignments=Array.isArray(body?.assignments)?body.assignments:[];
      const replacePrimary=body?.replace_primary!==false;
      let applied=0;
      for(const a of assignments){
        const itemId=String(a?.item_id||'');
        const imageUrl=String(a?.image_url||'');
        if(!allowed.has(itemId)||!imageUrl)continue;
        const {data:existing}=await supabase.from('item_images').select('id,is_primary,sort_order').eq('item_id',itemId).order('sort_order');
        const already=(existing||[]).length;
        if(replacePrimary&&already){await supabase.from('item_images').update({is_primary:false}).eq('item_id',itemId).eq('is_primary',true)}
        const {error}=await supabase.from('item_images').insert({
          item_id:itemId,
          image_url:imageUrl,
          storage_path:a?.storage_path||null,
          alt_text:String(a?.alt_text||a?.item_name||'').slice(0,240)||null,
          is_primary:replacePrimary||already===0,
          sort_order:replacePrimary?0:already,
          source:'uploaded_auto_match',
          prompt_used:String(a?.reason||'Attribution automatique depuis une image envoyée.').slice(0,500)
        });
        if(!error)applied++;
      }
      return NextResponse.json({success:true,applied});
    }

    if(!images.length)return NextResponse.json({error:'Ajoutez au moins une image.'},{status:400});
    const falKey=process.env.FAL_KEY;
    if(!falKey)return NextResponse.json({error:'Service de reconnaissance visuelle indisponible.'},{status:503});
    const imageUrls=images.map((x:any)=>String(x?.url||'')).filter(Boolean);
    if(!imageUrls.length)return NextResponse.json({error:'Images invalides.'},{status:400});
    const compactItems=(items||[]).map((x:any)=>({id:x.id,name:x.name,description:x.short_description||x.description||''}));
    const instruction=`Tu es le moteur d'attribution d'illustrations de Qatalink. Tu reçois plusieurs images de plats, produits ou services, dans le même ordre que IMAGE_INDEX, et la liste EXACTE des articles d'un catalogue. Analyse visuellement chaque image et associe-la uniquement à l'article le plus plausible. Utilise le nom, la description, le packaging, les couleurs, le texte visible et l'apparence du produit. Ne force jamais une correspondance : si aucun article n'est suffisamment plausible, mets item_id à null. Une même image ne doit être attribuée qu'à un seul article, mais plusieurs images peuvent correspondre au même article si elles montrent réellement le même produit. Réponds en JSON valide uniquement.\n\nARTICLES:${JSON.stringify(compactItems)}\n\nReturn exactly: {"assignments":[{"image_index":0,"item_id":"uuid-ou-null","confidence":0.0,"reason":"raison courte en français","alt_text":"description courte de l'image"}]}. Confidence doit être entre 0 et 1.`;
    const r=await fetch('https://fal.run/openrouter/router/vision',{method:'POST',headers:{Authorization:`Key ${falKey}`,'Content-Type':'application/json'},body:JSON.stringify({prompt:instruction,system_prompt:'Réponds uniquement en JSON valide, sans markdown.',model:'google/gemini-2.5-flash',temperature:.08,max_tokens:2200,image_urls:imageUrls}),cache:'no-store'});
    const d:any=await r.json().catch(()=>null);
    if(!r.ok)return NextResponse.json({error:d?.error||'La reconnaissance visuelle n’a pas répondu.'},{status:r.status});
    let parsed:any;try{parsed=JSON.parse(cleanJson(d?.output||''))}catch{return NextResponse.json({error:'Réponse de reconnaissance illisible.'},{status:422})}
    const itemById=new Map((items||[]).map((x:any)=>[String(x.id),x]));
    const assignments=(Array.isArray(parsed?.assignments)?parsed.assignments:[]).flatMap((a:any)=>{
      const index=Number(a?.image_index);if(!Number.isInteger(index)||index<0||index>=images.length)return [];
      const id=String(a?.item_id||'');const item=itemById.get(id) as any;
      const confidence=Math.max(0,Math.min(1,Number(a?.confidence||0)));
      return [{image_index:index,item_id:item?String(item.id):'',item_name:item?.name||'',confidence,reason:String(a?.reason||''),alt_text:String(a?.alt_text||''),image_url:images[index]?.url||'',storage_path:images[index]?.storage_path||'',file_name:images[index]?.name||`Image ${index+1}`}];
    });
    const byIndex=new Map(assignments.map((a:any)=>[a.image_index,a]));
    const complete=images.map((img:any,index:number)=>byIndex.get(index)||{image_index:index,item_id:'',item_name:'',confidence:0,reason:'Aucune correspondance suffisamment fiable.',alt_text:'',image_url:img.url,storage_path:img.storage_path||'',file_name:img.name||`Image ${index+1}`});
    return NextResponse.json({success:true,items:compactItems,assignments:complete});
  }catch(e:any){return NextResponse.json({error:e?.message||'Attribution automatique impossible.'},{status:500})}
}
