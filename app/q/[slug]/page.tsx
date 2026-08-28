import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import ScanSplash from './scan-splash';
export const dynamic='force-dynamic';
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
export default async function ScanPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const h=await headers();const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);const {data:gate}=await supabase.rpc('qatalink_public_scan_gate',{p_slug:slug});if(gate?.allowed===false&&gate?.plan_code==='free')redirect(`/free-limit?type=scan&slug=${encodeURIComponent(slug)}`);await supabase.rpc('record_catalog_scan',{p_slug:slug,p_user_agent:h.get('user-agent')||null,p_referrer:h.get('referer')||null});const {data:entry}=await supabase.rpc('resolve_public_qatalink_entry',{p_catalog_slug:slug});const target=entry?.target||`/c/${encodeURIComponent(slug)}`;return <ScanSplash target={target} isVitrine={String(target).startsWith('/v/')}/>}
