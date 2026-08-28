import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
export async function GET(req:NextRequest){
  const lat=Number(req.nextUrl.searchParams.get('lat')),lng=Number(req.nextUrl.searchParams.get('lng'));
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return NextResponse.json({area:''},{status:400});
  try{
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=fr`;
    const r=await fetch(url,{headers:{'User-Agent':'Qatalink/1.0 (https://qatalink.com)','Accept':'application/json'},cache:'no-store'});
    if(!r.ok)return NextResponse.json({area:''});
    const data=await r.json(),a=data?.address||{};
    const area=String(a.neighbourhood||a.quarter||a.suburb||a.city_district||a.village||a.town||a.city||'').trim();
    return NextResponse.json({area});
  }catch{return NextResponse.json({area:''})}
}
