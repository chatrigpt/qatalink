import { createClient } from '@supabase/supabase-js';
import { PublicCatalogV2 } from '@/components/public-catalog-v2';
import { PublicAnalyticsTracker } from '@/components/public-analytics-tracker';

export const dynamic='force-dynamic';
export const revalidate=0;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

export default async function PublicCatalogPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  const {data,error}=await supabase.rpc('get_public_catalog',{p_slug:slug});
  if(error||!data)return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>Catalogue indisponible</h1><p>Ce catalogue n’est pas publié ou son accès a expiré.</p></div></main>;
  return <><PublicCatalogV2 data={data}/><PublicAnalyticsTracker/></>;
}
