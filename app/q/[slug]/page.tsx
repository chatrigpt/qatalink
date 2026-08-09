import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import ScanSplash from './scan-splash';

export const dynamic='force-dynamic';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_5A_EpEK4Jrwh-3-NT43RxA_0iIP9Tdl';

export default async function ScanPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const h=await headers();
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
  await supabase.rpc('record_catalog_scan',{
    p_slug:slug,
    p_user_agent:h.get('user-agent')||null,
    p_referrer:h.get('referer')||null
  });
  return <ScanSplash slug={slug}/>;
}
