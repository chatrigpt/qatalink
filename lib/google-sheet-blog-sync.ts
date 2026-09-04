import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const PUBLIC_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

export async function syncBlogPostsFromGoogleSheet(){
  if(!PUBLIC_KEY)throw new Error('SUPABASE_PUBLIC_KEY_MISSING');
  const client=createClient(SUPABASE_URL,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.rpc('seo_sync_google_sheet_blog');
  if(error)throw new Error(error.message||'GOOGLE_SHEET_SYNC_FAILED');
  return data||{sheet_rows:0,inserted:0,updated:0,skipped:0};
}
