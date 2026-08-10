import {NextResponse} from 'next/server';

export const revalidate=3600;

function csvLine(line:string){
  const out:string[]=[];let cur='';let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cur+='"';i++;}
      else quoted=!quoted;
    }else if(ch===','&&!quoted){out.push(cur);cur='';}
    else cur+=ch;
  }
  out.push(cur);return out;
}

export async function GET(){
  const xofPerEur=655.957;
  try{
    const url='https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata';
    const r=await fetch(url,{next:{revalidate:3600},headers:{Accept:'text/csv'}});
    if(!r.ok)throw new Error('rate unavailable');
    const csv=await r.text();
    const lines=csv.trim().split(/\r?\n/).filter(Boolean);
    if(lines.length<2)throw new Error('empty rate');
    const headers=csvLine(lines[0]).map(x=>x.trim());
    const idx=headers.indexOf('OBS_VALUE');
    const row=csvLine(lines[lines.length-1]);
    const usdPerEur=Number(idx>=0?row[idx]:NaN);
    if(!Number.isFinite(usdPerEur)||usdPerEur<=0)throw new Error('invalid rate');
    return NextResponse.json({xof_per_eur:xofPerEur,usd_per_eur:usdPerEur},{headers:{'Cache-Control':'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'}});
  }catch{
    return NextResponse.json({error:'RATE_UNAVAILABLE',xof_per_eur:xofPerEur},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
