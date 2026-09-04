import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const SHEET_ID=process.env.BLOG_GOOGLE_SHEET_ID||'1H4zioLlQUbqDwx1En3ueJFCd05P1EgF6zKPaHjLsGcQ';
const SHEET_GID=process.env.BLOG_GOOGLE_SHEET_GID||'0';

export type SheetBlogRow={title:string;slug:string;content:string;excerpt:string;cover_image:string;link:string};

function db(){if(!SERVICE_KEY)throw new Error('SUPABASE_SERVICE_KEY_MISSING');return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
function slugify(v:string){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,95)}
function safeUrl(v:string){const s=String(v||'').trim();if(!s)return '';if(s.startsWith('/'))return s;try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.toString():''}catch{return ''}}
function parseCsv(input:string){const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<input.length;i++){const ch=input[i];if(quoted){if(ch==='"'&&input[i+1]==='"'){cell+='"';i++;continue}if(ch==='"'){quoted=false;continue}cell+=ch;continue}if(ch==='"'){quoted=true;continue}if(ch===','){row.push(cell);cell='';continue}if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';continue}if(ch!=='\r')cell+=ch}row.push(cell);if(row.some(Boolean))rows.push(row);return rows}

async function fetchRows():Promise<SheetBlogRow[]>{
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/export?format=csv&gid=${encodeURIComponent(SHEET_GID)}`;
  const response=await fetch(url,{cache:'no-store',headers:{'User-Agent':'Qatalink-Blog-Sync/1.0'}});
  if(!response.ok)throw new Error(`GOOGLE_SHEET_FETCH_${response.status}`);
  const matrix=parseCsv(await response.text());if(!matrix.length)return [];
  const headers=matrix[0].map(x=>String(x).trim().toLowerCase());
  const required=['title','slug','content','excerpt','cover_image','link'];
  const missing=required.filter(x=>!headers.includes(x));if(missing.length)throw new Error(`GOOGLE_SHEET_MISSING_COLUMNS:${missing.join(',')}`);
  const ix=Object.fromEntries(required.map(x=>[x,headers.indexOf(x)]));
  return matrix.slice(1).map(r=>({title:String(r[ix.title]||'').trim(),slug:String(r[ix.slug]||'').trim(),content:String(r[ix.content]||'').trim(),excerpt:String(r[ix.excerpt]||'').trim(),cover_image:String(r[ix.cover_image]||'').trim(),link:String(r[ix.link]||'').trim()})).filter(r=>r.title&&r.content);
}

export async function syncBlogPostsFromGoogleSheet(){
  const client=db();const rows=await fetchRows();
  const {data:existing,error:existingError}=await client.from('seo_blog_posts').select('id,slug,source_provider,published_at,generation_context');
  if(existingError)throw new Error(existingError.message);
  const bySlug=new Map((existing||[]).map((p:any)=>[String(p.slug),p]));
  const seen=new Set<string>();let inserted=0,updated=0,skipped=0;const errors:{row:number;slug:string;error:string}[]=[];
  for(let i=0;i<rows.length;i++){
    const row=rows[i];const slug=slugify(row.slug||row.title);if(!slug||seen.has(slug)){skipped++;continue}seen.add(slug);
    const old:any=bySlug.get(slug);if(old&&old.source_provider!=='google_sheets'){skipped++;continue}
    const now=new Date().toISOString();const context={...(old?.generation_context||{}),source:'google_sheets',sheet_id:SHEET_ID,sheet_gid:SHEET_GID,sheet_row:i+2,cover_image:safeUrl(row.cover_image),link:safeUrl(row.link)};
    const payload={slug,title:row.title.slice(0,180),excerpt:row.excerpt.slice(0,500),content_markdown:row.content,meta_title:row.title.slice(0,62),meta_description:(row.excerpt||row.title).slice(0,170),keywords:[],faq:[],primary_topic:'editorial_sheet',city:null,country:null,model:'editorial',source_provider:'google_sheets',status:'published',quality_score:null,generation_context:context,published_at:old?.published_at||now,updated_at:now};
    const result=old?await client.from('seo_blog_posts').update(payload).eq('id',old.id):await client.from('seo_blog_posts').insert(payload);
    if(result.error){errors.push({row:i+2,slug,error:result.error.message});continue}if(old)updated++;else inserted++;
  }
  if(errors.length)throw new Error(`GOOGLE_SHEET_SYNC_PARTIAL:${JSON.stringify({inserted,updated,skipped,errors:errors.slice(0,5)})}`);
  return {sheet_rows:rows.length,inserted,updated,skipped,preserved_existing:(existing||[]).filter((p:any)=>p.source_provider!=='google_sheets').length};
}
