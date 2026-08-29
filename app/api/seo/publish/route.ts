import {NextRequest,NextResponse} from 'next/server';
import {generateAndPublishSeoArticle} from '@/lib/seo-blog-generator';

export const runtime='nodejs';
export const maxDuration=60;

function scheduledWindow(){const d=new Date();const day=d.getUTCDay();return [1,3,5].includes(day)&&d.getUTCHours()===6&&d.getUTCMinutes()>=28&&d.getUTCMinutes()<=38}

export async function GET(req:NextRequest){
  const bootstrap=req.nextUrl.searchParams.get('bootstrap')==='1';
  const secret=process.env.CRON_SECRET||'';const auth=req.headers.get('authorization')||'';
  if(!bootstrap){
    if(secret){if(auth!==`Bearer ${secret}`)return NextResponse.json({success:false,error:'Unauthorized'},{status:401})}
    else if(!scheduledWindow())return NextResponse.json({success:false,error:'OUTSIDE_CRON_WINDOW'},{status:401});
  }
  try{const result=await generateAndPublishSeoArticle({bootstrap});return NextResponse.json({success:true,...result},{headers:{'Cache-Control':'no-store'}})}
  catch(e:any){console.error('[Qatalink:SEO]',e);return NextResponse.json({success:false,error:String(e?.message||e)},{status:500,headers:{'Cache-Control':'no-store'}})}
}
