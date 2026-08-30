import {NextRequest,NextResponse} from 'next/server';

export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  const countryCode=String(
    req.headers.get('x-vercel-ip-country')||
    req.headers.get('cf-ipcountry')||
    req.headers.get('x-country-code')||
    ''
  ).trim().toUpperCase();

  return NextResponse.json(
    {country_code:countryCode||null},
    {headers:{'Cache-Control':'private, no-store'}}
  );
}
