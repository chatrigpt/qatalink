import {createClient} from '@supabase/supabase-js';

export const dynamic='force-dynamic';
export const revalidate=0;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export default async function HubAccessLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  const {data:gate}=await supabase.rpc('qatalink_public_hub_scan_gate',{p_slug:slug});
  if(!gate?.allowed){
    const limited=gate?.reason==='scan_limit';
    return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>{limited?'Limite de consultations atteinte':'Page centrale indisponible'}</h1><p>{limited?'Cette page a atteint la limite de scans incluse dans son abonnement pour aujourd’hui.':'Cette page n’est pas publiée ou son accès n’est plus disponible.'}</p></div></main>;
  }
  await supabase.rpc('record_catalog_hub_scan',{p_slug:slug,p_user_agent:null,p_referrer:null});
  return children;
}
