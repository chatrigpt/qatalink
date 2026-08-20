import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'crypto';
import sharp from 'sharp';

export const runtime='nodejs';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const MAX_SOURCE_BYTES=12*1024*1024;
const MAX_EDGE=1600;

export async function POST(req:NextRequest){
  try{
    const auth=req.headers.get('authorization')||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});

    const form=await req.formData();
    const itemId=String(form.get('item_id')||'').trim();
    const file=form.get('file');
    if(!itemId||!(file instanceof File))return NextResponse.json({success:false,error:'REFERENCE_REQUIRED'},{status:400});
    if(!String(file.type||'').startsWith('image/'))return NextResponse.json({success:false,error:'INVALID_IMAGE',message:'Choisissez un fichier image.'},{status:400});
    if(file.size>MAX_SOURCE_BYTES)return NextResponse.json({success:false,error:'IMAGE_TOO_LARGE',message:'L’image de référence doit faire moins de 12 Mo.'},{status:413});

    const {data:item}=await supabase.from('items').select('id,catalog_id').eq('id',itemId).maybeSingle();
    if(!item)return NextResponse.json({success:false,error:'ITEM_UNAVAILABLE'},{status:403});

    const source=Buffer.from(await file.arrayBuffer());
    let bytes:Buffer;
    try{
      bytes=await sharp(source,{failOn:'none'})
        .rotate()
        .resize({width:MAX_EDGE,height:MAX_EDGE,fit:'inside',withoutEnlargement:true})
        .webp({quality:82,effort:4,smartSubsample:true})
        .toBuffer();
    }catch{
      return NextResponse.json({success:false,error:'INVALID_IMAGE',message:'Cette image ne peut pas être lue. Essayez un autre fichier.'},{status:400});
    }

    const storagePath=`${user.id}/references/${itemId}/${Date.now()}-${randomUUID()}.webp`;
    const {error:uploadError}=await supabase.storage.from('generated-assets').upload(storagePath,bytes,{contentType:'image/webp',upsert:false,cacheControl:'3600'});
    if(uploadError)return NextResponse.json({success:false,error:'UPLOAD_FAILED',message:'Impossible d’envoyer l’image de référence.'},{status:500});

    const {data:publicData}=supabase.storage.from('generated-assets').getPublicUrl(storagePath);
    return NextResponse.json({success:true,reference_image_url:publicData.publicUrl,reference_storage_path:storagePath,stored_bytes:bytes.length});
  }catch(error){
    console.error('[Qatalink:ReferenceUpload]',error);
    return NextResponse.json({success:false,error:'UPLOAD_FAILED',message:'Impossible d’envoyer l’image de référence.'},{status:500});
  }
}
