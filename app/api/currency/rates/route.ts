import {NextResponse} from 'next/server';

export const revalidate=3600;

export async function GET(){
  const xofPerEur=655.957;
  try{
    const url='https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata';
    const r=await fetch(url,{next:{revalidate:3600},headers:{Accept:'text/csv'}});
    if(!r.ok)throw new Error('rate unavailable');
    const csv=await r.text();
    const lines=csv.trim().split(/\r?\n/).filter(Boolean);
    if(lines.length<2)throw new Error('empty rate');
    const headers=lines[0].split(',');
    const idx=headers.findIndex(h=>h.replace(/^"|"$/g,'').trim()==='OBS_VALUE');
    const row=lines[lines.length-1].split(',');
    const usdPerEur=Number((idx>=0?row[idx]:row[row.length-1])?.replace(/"/g,''));
    if(!Number.isFinite(usdPerEur)||usdPerEur<=0)throw new Error('invalid rate');
    return NextResponse.json({xof_per_eur:xofPerEur,usd_per_eur:usdPerEur},{headers:{'Cache-Control':'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'}});
  }catch{
    return NextResponse.json({error:'RATE_UNAVAILABLE',xof_per_eur:xofPerEur},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
