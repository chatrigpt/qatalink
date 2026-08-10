import {NextRequest} from 'next/server';

export const dynamic='force-dynamic';

const BRANDS:Record<string,{name:string;tag:string;mono:string;bg:string;fg:string;accent:string;soft:string}>={
  'maison-ivoire':{name:'MAISON IVOIRE',tag:"CUISINE IVOIRIENNE D’EXCEPTION",mono:'MI',bg:'#12392A',fg:'#F8F0DF',accent:'#C56B32',soft:'#D7B477'},
  'lagune-suites':{name:'LAGUNE SUITES',tag:'LUXE · SÉRÉNITÉ · HOSPITALITÉ',mono:'LS',bg:'#073646',fg:'#F8FAFA',accent:'#C89B4B',soft:'#1A7482'},
  'eclat-spa':{name:'ÉCLAT SPA',tag:'SOINS · BIEN-ÊTRE · BEAUTÉ',mono:'ÉS',bg:'#F6F0E5',fg:'#52684E',accent:'#C9A25A',soft:'#E7C8BA'},
  'atelier-naya':{name:'ATELIER NAYA',tag:'SALON DE BEAUTÉ',mono:'AN',bg:'#4A1730',fg:'#FFF7F2',accent:'#E49A9F',soft:'#8B5269'},
  'abidjan-signature':{name:'ABIDJAN SIGNATURE',tag:"L’IMMOBILIER D’EXCEPTION",mono:'AS',bg:'#071A34',fg:'#F8F8F4',accent:'#D2A04A',soft:'#234366'},
  'atelier-kora':{name:'ATELIER KORA',tag:'MODE AFRO-CONTEMPORAINE',mono:'AK',bg:'#F4EBDD',fg:'#172144',accent:'#B9683A',soft:'#D7B991'}
};

function esc(v:string){return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function svgLogo(b:(typeof BRANDS)[string]){return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" rx="64" fill="${b.bg}"/><circle cx="400" cy="325" r="205" fill="none" stroke="${b.accent}" stroke-width="7"/><path d="M205 486 C285 426 338 458 400 407 C470 350 531 389 594 333" fill="none" stroke="${b.soft}" stroke-width="10" stroke-linecap="round"/><text x="400" y="370" text-anchor="middle" font-family="Georgia,serif" font-size="190" font-weight="700" fill="${b.fg}">${esc(b.mono)}</text><text x="400" y="610" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="700" letter-spacing="8" fill="${b.fg}">${esc(b.name)}</text><text x="400" y="668" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" letter-spacing="4" fill="${b.accent}">${esc(b.tag)}</text></svg>`}
function svgCover(b:(typeof BRANDS)[string]){return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700" viewBox="0 0 1600 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.bg}"/><stop offset="1" stop-color="${b.soft}"/></linearGradient><radialGradient id="r"><stop offset="0" stop-color="${b.accent}" stop-opacity=".44"/><stop offset="1" stop-color="${b.accent}" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="700" fill="url(#g)"/><circle cx="1340" cy="140" r="420" fill="url(#r)"/><circle cx="1460" cy="650" r="500" fill="none" stroke="${b.accent}" stroke-opacity=".35" stroke-width="2"/><circle cx="1460" cy="650" r="360" fill="none" stroke="${b.accent}" stroke-opacity=".24" stroke-width="2"/><path d="M860 630 C1050 390 1220 520 1600 250 L1600 700 L820 700 Z" fill="${b.accent}" opacity=".13"/><circle cx="235" cy="210" r="105" fill="none" stroke="${b.accent}" stroke-width="5"/><text x="235" y="248" text-anchor="middle" font-family="Georgia,serif" font-size="108" font-weight="700" fill="${b.fg}">${esc(b.mono)}</text><text x="130" y="420" font-family="Georgia,serif" font-size="82" font-weight="700" fill="${b.fg}">${esc(b.name)}</text><rect x="132" y="452" width="280" height="5" rx="3" fill="${b.accent}"/><text x="132" y="520" font-family="Arial,sans-serif" font-size="29" letter-spacing="6" fill="${b.fg}" opacity=".94">${esc(b.tag)}</text><text x="132" y="590" font-family="Arial,sans-serif" font-size="23" letter-spacing="4" fill="${b.fg}" opacity=".76">ABIDJAN · CÔTE D’IVOIRE</text></svg>`}

export async function GET(req:NextRequest,{params}:{params:Promise<{key:string}>}){
  const {key}=await params;const b=BRANDS[key];if(!b)return new Response('Not found',{status:404});
  const kind=req.nextUrl.searchParams.get('kind')==='cover'?'cover':'logo';
  return new Response(kind==='cover'?svgCover(b):svgLogo(b),{headers:{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=86400, s-maxage=604800'}});
}
