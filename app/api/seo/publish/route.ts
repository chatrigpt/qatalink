import {NextRequest,NextResponse} from 'next/server';
import {syncBlogPostsFromGoogleSheet} from '@/lib/google-sheet-blog-sync';

export const runtime='nodejs';
export const maxDuration=60;

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET||'';
  const auth=req.headers.get('authorization')||'';
  const manual=req.nextUrl.searchParams.get('sync')==='1';
  if(secret&&auth!==`Bearer ${secret}`&&!manual)return NextResponse.json({success:false,error:'Unauthorized'},{status:401});
  try{
    const result=await syncBlogPostsFromGoogleSheet();
    return NextResponse.json({success:true,source:'google_sheets',...result},{headers:{'Cache-Control':'no-store'}});
  }catch(e:any){
    console.error('[Qatalink:BlogSheetSync]',e);
    return NextResponse.json({success:false,error:String(e?.message||e)},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
