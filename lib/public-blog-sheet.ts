const SHEET_URL='https://docs.google.com/spreadsheets/d/1H4zioLlQUbqDwx1En3ueJFCd05P1EgF6zKPaHjLsGcQ/gviz/tq?tqx=out:json&gid=0';

export type PublicBlogSheetPost={
  slug:string;
  title:string;
  content_markdown:string;
  excerpt:string;
  cover_image:string;
  link:string;
  meta_title:string;
  meta_description:string;
  keywords:string[];
  faq:any[];
  city:string|null;
  country:string|null;
  published_at:string|null;
  updated_at:string|null;
  source_provider:'google_sheets_live';
  generation_context:{source:string;cover_image:string;link:string};
};

function cell(row:any,index:number){
  const c=row?.c?.[index];
  return String(c?.v??c?.f??'').trim();
}

export async function getPublicBlogSheetPosts():Promise<PublicBlogSheetPost[]>{
  const response=await fetch(`${SHEET_URL}&_=${Date.now()}`,{
    cache:'no-store',
    headers:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'},
  });
  if(!response.ok)throw new Error(`GOOGLE_SHEET_FETCH_${response.status}`);
  const raw=await response.text();
  const start=raw.indexOf('{');
  const end=raw.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('GOOGLE_SHEET_INVALID_RESPONSE');
  const doc=JSON.parse(raw.slice(start,end+1));
  const rows=Array.isArray(doc?.table?.rows)?doc.table.rows:[];
  if(!rows.length)return [];
  const firstTitle=cell(rows[0],0).toLowerCase();
  const firstSlug=cell(rows[0],1).toLowerCase();
  const offset=firstTitle==='title'||firstSlug==='slug'?1:0;
  const posts:PublicBlogSheetPost[]=[];
  for(let i=offset;i<rows.length;i++){
    const title=cell(rows[i],0);
    const slug=cell(rows[i],1).toLowerCase();
    const content=cell(rows[i],2);
    const excerpt=cell(rows[i],3);
    const cover=cell(rows[i],4);
    const link=cell(rows[i],5);
    if(!title||!content||!slug||!/^[a-z0-9-]+$/.test(slug))continue;
    posts.push({
      slug,title,content_markdown:content,excerpt,
      cover_image:cover,link,
      meta_title:title.slice(0,62),
      meta_description:(excerpt||title).slice(0,170),
      keywords:[],faq:[],city:null,country:null,published_at:null,updated_at:null,
      source_provider:'google_sheets_live',
      generation_context:{source:'google_sheets_live',cover_image:cover,link},
    });
  }
  return posts;
}

export async function getPublicBlogSheetPost(slug:string){
  const posts=await getPublicBlogSheetPosts();
  return posts.find(post=>post.slug===slug)||null;
}
