import { createClient } from '@supabase/supabase-js';
import { PublicCatalogV2 } from '@/components/public-catalog-v2';
import { PublicAnalyticsTracker } from '@/components/public-analytics-tracker';
import { PublicCatalogBoundary } from '@/components/public-catalog-boundary';

export const dynamic='force-dynamic';
export const revalidate=0;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

function safeCssUrl(value:string){return value.replace(/["'\\()\n\r]/g,'')}

export default async function PublicCatalogPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  try{
    const {data,error}=await supabase.rpc('get_public_catalog',{p_slug:slug});
    if(error||!data)return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>Catalogue indisponible</h1><p>Ce catalogue n’est pas publié ou son accès a expiré.</p></div></main>;

    const catalog=data?.catalog||{};
    const business=data?.business||{};
    const effectiveBusiness={
      ...business,
      name:catalog.display_name||business.name,
      description:catalog.description||business.description,
      whatsapp_number:catalog.whatsapp_number||business.whatsapp_number,
      logo_url:catalog.logo_url||business.logo_url,
      cover_url:catalog.cover_url||business.cover_url,
      customer_flow_settings:catalog.customer_flow_settings||business.customer_flow_settings
    };
    const effectiveData={...data,business:effectiveBusiness};
    const hideCover=data?.theme?.show_cover===false;
    const cover=String(effectiveBusiness.cover_url||'');
    const coverOverlay=Math.max(0,Math.min(.9,Number(data?.theme?.cover_overlay??.58)));
    const coverStyle=hideCover
      ?'.public-v2-hero{background-image:none!important}'
      :cover
        ?`.public-v2-hero{background-image:linear-gradient(180deg,rgba(0,0,0,${Math.max(0,coverOverlay*.22)}),rgba(0,0,0,${coverOverlay})),url("${safeCssUrl(cover)}")!important}`
        :'';

    return <><PublicCatalogBoundary>{coverStyle&&<style>{coverStyle}</style>}<PublicCatalogV2 data={effectiveData}/></PublicCatalogBoundary><PublicCatalogBoundary silent><PublicAnalyticsTracker/></PublicCatalogBoundary></>;
  }catch{
    return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>Catalogue temporairement indisponible</h1><p>Rechargez la page dans quelques instants.</p></div></main>;
  }
}
