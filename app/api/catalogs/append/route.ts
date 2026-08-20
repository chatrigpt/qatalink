import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function normalizeKey(value:any){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function slugify(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'article';
}
function normalizePrice(v:any){
  const n=Number(String(v??0).replace(/[^0-9.-]/g,''));
  return Number.isFinite(n)?Math.max(0,Math.round(n)):0;
}

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const body=await req.json();
    const catalogId=String(body?.catalog_id||'').trim();
    const payload=body?.catalog||{};
    if(!catalogId)return NextResponse.json({success:false,error:'catalog_id required'},{status:400});

    const {data:catalog,error:catalogError}=await supabase.from('catalogs').select('id,business_id').eq('id',catalogId).maybeSingle();
    if(catalogError||!catalog)return NextResponse.json({success:false,error:'Catalogue introuvable.'},{status:404});
    const {data:business}=await supabase.from('businesses').select('id,owner_user_id,currency_code').eq('id',catalog.business_id).maybeSingle();
    if(!business||business.owner_user_id!==user.id)return NextResponse.json({success:false,error:'Forbidden'},{status:403});
    const businessCurrency=String(business.currency_code||'XOF');

    const {data:subRows}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',business.id).order('created_at',{ascending:false}).limit(20);
    const now=Date.now();
    const validSub=(subRows||[]).find((s:any)=>(s.status==='active'||s.status==='trialing')&&(!s.current_period_end||new Date(s.current_period_end).getTime()>now));
    if(!validSub)return NextResponse.json({success:false,error:'SUBSCRIPTION_REQUIRED'},{status:402});

    const [{data:existingCategories,error:catsError},{data:existingItems,error:itemsError}]=await Promise.all([
      supabase.from('categories').select('id,name,description,sort_order').eq('catalog_id',catalogId).order('sort_order'),
      supabase.from('items').select('id,category_id,name,description,price_minor,currency_code,metadata,sort_order').eq('catalog_id',catalogId).order('sort_order')
    ]);
    if(catsError||itemsError)return NextResponse.json({success:false,error:catsError?.message||itemsError?.message||'Lecture du catalogue impossible.'},{status:500});

    const categoryByKey=new Map<string,any>();
    for(const category of existingCategories||[])categoryByKey.set(normalizeKey(category.name),category);
    const itemByCategoryAndName=new Map<string,any>();
    for(const item of existingItems||[])itemByCategoryAndName.set(`${item.category_id||'none'}::${normalizeKey(item.name)}`,item);

    let nextCategoryOrder=Math.max(0,...(existingCategories||[]).map((c:any)=>Number(c.sort_order||0)))+1;
    const nextItemOrderByCategory=new Map<string,number>();
    for(const item of existingItems||[]){const key=String(item.category_id||'none');nextItemOrderByCategory.set(key,Math.max(nextItemOrderByCategory.get(key)||0,Number(item.sort_order||0)))}

    let categoriesAdded=0;
    let itemsAdded=0;
    let itemsUpdated=0;
    const addedItemIds:string[]=[];
    const updatedItemIds:string[]=[];

    async function ensureCategory(raw:any){
      const name=String(raw?.name||'').trim()||'Autres';
      const key=normalizeKey(name);
      const known=categoryByKey.get(key);
      if(known)return known;
      const {data:created,error}=await supabase.from('categories').insert({catalog_id:catalogId,name,description:raw?.description||null,sort_order:nextCategoryOrder++,is_visible:true}).select('id,name,description,sort_order').single();
      if(error||!created)throw new Error(error?.message||'Impossible de créer une catégorie.');
      categoryByKey.set(key,created);categoriesAdded++;return created;
    }

    async function mergeItem(category:any,raw:any){
      const name=String(raw?.name||'').trim();
      if(!name)return;
      const itemKey=`${category.id}::${normalizeKey(name)}`;
      const known=itemByCategoryAndName.get(itemKey);
      const incomingDescription=String(raw?.description||'').trim();
      const incomingPrice=normalizePrice(raw?.price);
      const incomingPrompt=String(raw?.image_prompt||'').trim();
      if(known){
        const patch:any={};
        if(incomingDescription&&incomingDescription!==String(known.description||'').trim())patch.description=incomingDescription,patch.short_description=incomingDescription;
        if(incomingPrice>0&&incomingPrice!==Number(known.price_minor||0))patch.price_minor=incomingPrice;
        if(raw?.currency_code)patch.currency_code=raw.currency_code;
        if(raw?.available!==undefined)patch.is_available=raw.available!==false;
        const metadata={...(known.metadata||{})};
        if(incomingPrompt&&!metadata.image_prompt)metadata.image_prompt=incomingPrompt;
        if(raw?.sku&&!metadata.sku)metadata.sku=raw.sku;
        if(Object.keys(metadata).length)patch.metadata=metadata;
        if(Object.keys(patch).length){
          const {error}=await supabase.from('items').update(patch).eq('id',known.id);
          if(error)throw new Error(error.message);
          Object.assign(known,patch);itemsUpdated++;updatedItemIds.push(known.id);
        }
        return;
      }
      const currentOrder=nextItemOrderByCategory.get(category.id)||0;
      const metadata={image_prompt:incomingPrompt,sku:raw?.sku||'',source_warning:raw?.warning||null};
      const {data:created,error}=await supabase.from('items').insert({catalog_id:catalogId,category_id:category.id,name,slug:`${slugify(name)}-${crypto.randomUUID().slice(0,6)}`,item_type:'product',short_description:incomingDescription||null,description:incomingDescription||null,price_minor:incomingPrice,currency_code:raw?.currency_code||businessCurrency,is_available:raw?.available!==false,sort_order:currentOrder+1,metadata,raw_extracted_text:null}).select('id,category_id,name,description,price_minor,currency_code,metadata,sort_order').single();
      if(error||!created)throw new Error(error?.message||'Impossible d’ajouter un article.');
      nextItemOrderByCategory.set(category.id,currentOrder+1);itemByCategoryAndName.set(itemKey,created);itemsAdded++;addedItemIds.push(created.id);
    }

    const categories=Array.isArray(payload?.categories)?payload.categories:[];
    for(const rawCategory of categories){
      const category=await ensureCategory(rawCategory);
      const incomingItems=Array.isArray(rawCategory?.items)?rawCategory.items:[];
      for(const rawItem of incomingItems)await mergeItem(category,rawItem);
    }

    const uncategorized=Array.isArray(payload?.uncategorized_items)?payload.uncategorized_items:[];
    if(uncategorized.length){
      const category=await ensureCategory({name:'Autres'});
      for(const rawItem of uncategorized)await mergeItem(category,rawItem);
    }

    return NextResponse.json({success:true,catalog_id:catalogId,categories_added:categoriesAdded,items_added:itemsAdded,items_updated:itemsUpdated,item_ids_added:addedItemIds,item_ids_updated:updatedItemIds});
  }catch(e:any){
    return NextResponse.json({success:false,error:e?.message||'Catalog completion failed'},{status:500});
  }
}
