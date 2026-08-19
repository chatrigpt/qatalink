import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
const PUBLIC_ORIGIN='https://qatalink.com';

export async function GET(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const target=`${PUBLIC_ORIGIN}/h/${encodeURIComponent(slug)}`;
  const remote=`https://api.qrserver.com/v1/create-qr-code/?size=900x900&format=png&margin=18&data=${encodeURIComponent(target)}&color=111111&bgcolor=ffffff`;
  const r=await fetch(remote,{cache:'no-store'});
  if(!r.ok)return NextResponse.json({error:'QR generation failed'},{status:502});
  const bytes=await r.arrayBuffer();
  const download=req.nextUrl.searchParams.get('download')==='1';
  return new NextResponse(bytes,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=300, must-revalidate',...(download?{'Content-Disposition':`attachment; filename="qatalink-page-centrale-${slug}.png"`}:{})}});
}
