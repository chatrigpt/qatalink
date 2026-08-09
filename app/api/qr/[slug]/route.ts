import { NextRequest, NextResponse } from 'next/server';

export const runtime='nodejs';

export async function GET(req:NextRequest,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const configured=(process.env.NEXT_PUBLIC_APP_URL||'').replace(/\/$/,'');
  const origin=configured||req.nextUrl.origin;
  const target=`${origin}/q/${encodeURIComponent(slug)}`;
  const remote=`https://api.qrserver.com/v1/create-qr-code/?size=900x900&format=png&margin=18&data=${encodeURIComponent(target)}&color=111111&bgcolor=ffffff`;
  const r=await fetch(remote,{cache:'no-store'});
  if(!r.ok)return NextResponse.json({error:'QR generation failed'},{status:502});
  const bytes=await r.arrayBuffer();
  const download=req.nextUrl.searchParams.get('download')==='1';
  return new NextResponse(bytes,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=300',...(download?{'Content-Disposition':`attachment; filename="qatalink-${slug}.png"`}:{})}});
}
