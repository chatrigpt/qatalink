import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime='nodejs';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const MAX_EDGE=1400;const WEBP_QUALITY=78;

export async function POST(req:NextRequest){
  try{
    const form=await req.formData();
    const accessKey=String(form.get('access_key')||'').trim();const pin=String(form.get('pin')||'');const itemId=String(form.get('item_id')||'').trim();const file=form.get('file');
    if(!accessKey||!pin||!itemId||!(file instanceof File))return NextResponse.json({success:false,error:'INVALID_REQUEST'},{status:400});
    if(file.size>12*1024*1024)return NextResponse.json({success:false,error:'FILE_TOO_LARGE'},{status:413});
    if(!String(file.type||'').startsWith('image/'))return NextResponse.json({success:false,error:'IMAGE_REQUIRED'},{status:400});
    const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data:token,error:tokenError}=await supabase.rpc('issue_catalog_team_storage_token',{p_access_key:accessKey,p_pin:pin,p_purpose:'photo'});
    if(tokenError||!token)return NextResponse.json({success:false,error:tokenError?.message||'ACCESS_DENIED'},{status:403});
    const source=Buffer.from(await file.arrayBuffer());const optimized=await sharp(source,{failOn:'none'}).rotate().resize({width:MAX_EDGE,height:MAX_EDGE,fit:'inside',withoutEnlargement:true}).webp({quality:WEBP_QUALITY,effort:4,smartSubsample:true}).toBuffer();
    const storagePath=`team/${token}/${itemId}/${Date.now()}.webp`;
    const upload=await supabase.storage.from('catalog-assets').upload(storagePath,optimized,{contentType:'image/webp',upsert:false,cacheControl:'31536000'});
    if(upload.error)return NextResponse.json({success:false,error:'UPLOAD_FAILED',detail:upload.error.message},{status:500});
    const {data:pub}=supabase.storage.from('catalog-assets').getPublicUrl(storagePath);const imageUrl=pub.publicUrl;
    const {error:finalError}=await supabase.rpc('complete_catalog_team_item_image',{p_access_key:accessKey,p_pin:pin,p_item_id:itemId,p_image_url:imageUrl,p_storage_path:storagePath,p_source:'team-upload'});
    if(finalError)return NextResponse.json({success:false,error:finalError.message||'FINALIZE_FAILED'},{status:403});
    return NextResponse.json({success:true,image_url:imageUrl,source_bytes:source.length,stored_bytes:optimized.length,reduction_percent:source.length?Math.round((1-optimized.length/source.length)*100):0});
  }catch(error){console.error('[Qatalink:OpsPhotoUpload]',error);return NextResponse.json({success:false,error:'UPLOAD_FAILED'},{status:500})}
}
