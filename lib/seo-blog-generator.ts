import {createClient} from '@supabase/supabase-js';
import {SEO_CITIES} from '@/lib/seo-cities';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const POYO_API_KEY=(process.env.POYO_API_KEY||'').replace(/^Bearer\s+/i,'').trim();
const PRIMARY_MODEL='gemini-2.5-flash';
const FALLBACK_MODEL='gemini-3.5-flash';

export type GeneratedArticle={slug:string;title:string;excerpt:string;body_markdown:string;meta_title:string;meta_description:string;keywords:string[];faq:{question:string;answer:string}[];primary_topic:string;city:string|null;country:string|null;model:string;quality_score:number;generation_context:Record<string,unknown>};

function service(){if(!SERVICE_KEY)throw new Error('SUPABASE_SERVICE_KEY_MISSING');return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
function slugify(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,95)}
function extractJson(raw:string){const cleaned=raw.trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');if(start<0||end<=start)throw new Error('POYO_INVALID_JSON');return JSON.parse(cleaned.slice(start,end+1))}
function wordCount(v:string){return String(v||'').trim().split(/\s+/).filter(Boolean).length}
function qualityScore(body:string,faq:any[],keywords:string[],city:string|null){let score=55;const words=wordCount(body);if(words>=1200)score+=15;else if(words>=900)score+=10;else if(words>=650)score+=4;if((body.match(/^## /gm)||[]).length>=5)score+=8;if(Array.isArray(faq)&&faq.length>=4)score+=7;if(keywords.length>=6)score+=5;if(body.includes('/docs')||body.includes('Qatalink'))score+=5;if(city&&body.toLowerCase().includes(city.toLowerCase()))score+=5;return Math.min(100,score)}

async function callPoyo(model:string,system:string,user:string){
  if(!POYO_API_KEY)throw new Error('POYO_API_KEY_MISSING');
  const r=await fetch('https://api.poyo.ai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${POYO_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:.72,max_tokens:9000,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]}),cache:'no-store'});
  const text=await r.text();let data:any={};try{data=JSON.parse(text)}catch{data={raw:text.slice(0,1000)}}
  if(!r.ok)throw Object.assign(new Error(data?.error?.message||data?.message||`POYO_${r.status}`),{status:r.status,model});
  const content=data?.choices?.[0]?.message?.content;if(!content)throw new Error('POYO_EMPTY_RESPONSE');return String(content);
}

function cityForTopic(topic:any){if(!topic?.city_rotation)return null;const idx=Math.max(0,Number(topic.used_count||0))%SEO_CITIES.length;return SEO_CITIES[idx]}

export async function generateAndPublishSeoArticle(opts:{bootstrap?:boolean}={}){
  const db=service();
  const {count:publishedCount}=await db.from('seo_blog_posts').select('*',{count:'exact',head:true}).eq('status','published');
  if(opts.bootstrap&&Number(publishedCount||0)>0)return {skipped:true,reason:'BOOTSTRAP_ALREADY_DONE'};
  if(!opts.bootstrap){const since=new Date(Date.now()-20*3600_000).toISOString();const {count:recent}=await db.from('seo_blog_posts').select('*',{count:'exact',head:true}).eq('status','published').gte('published_at',since);if(Number(recent||0)>0)return {skipped:true,reason:'RECENT_POST_EXISTS'}}

  const {data:topics,error:topicError}=await db.from('seo_content_topics').select('*').order('priority',{ascending:false}).order('last_used_at',{ascending:true,nullsFirst:true}).limit(25);if(topicError||!topics?.length)throw new Error(topicError?.message||'NO_SEO_TOPICS');
  const topic=[...topics].sort((a:any,b:any)=>{const au=a.last_used_at?new Date(a.last_used_at).getTime():0;const bu=b.last_used_at?new Date(b.last_used_at).getTime():0;if(!au&&!bu)return Number(b.priority)-Number(a.priority);if(!au)return-1;if(!bu)return 1;return au-bu})[0];
  const city=cityForTopic(topic);
  const modelContext={requested_model:PRIMARY_MODEL,topic_key:topic.topic_key,city:city?.name||null,generated_at:new Date().toISOString()};
  const {data:run}=await db.from('seo_generation_runs').insert({topic_key:topic.topic_key,city:city?.name||null,model:PRIMARY_MODEL,provider:'poyo',status:'started',metadata:modelContext}).select('id').single();

  const system=`Tu es le rédacteur SEO/GEO senior de Qatalink, une plateforme de catalogues et menus interactifs, QR code, commandes directes, caisse, équipe, stock, livraison et outils IA pour commerces en Afrique francophone. Tu écris en français naturel, précis, utile, crédible et captivant. Ton objectif n'est jamais de bourrer des mots-clés ni de promettre un classement garanti. Tu dois produire une ressource réellement meilleure que les contenus génériques : exemples concrets, comparaisons nuancées, recommandations actionnables, définitions claires et réponses aux objections.\n\nRègles de marque et de fiabilité :\n- Ne prétends jamais que Qatalink est partenaire de Glovo, Jumia Food, Yango Deli ou d'une autre marque tierce.\n- Quand ces marques sont citées, présente-les comme points de comparaison connus et reste factuel.\n- Ne fabrique pas de statistiques, parts de marché, prix concurrents ou études.\n- N'affirme pas qu'un résultat SEO est garanti.\n- Explique que Qatalink peut compléter ou remplacer certains usages de marketplace selon le besoin du commerce.\n- Favorise les contextes africains francophones et les usages Mobile Money/WhatsApp sans caricature.\n- Utilise des formulations variées et humaines.\n\nGEO/LLM : donne des réponses explicites aux questions que poserait un utilisateur à ChatGPT, Gemini, Perplexity ou Google AI Overviews. Nomme les concepts, explique les relations entre eux et fournis des listes vérifiables.\n\nFormat obligatoire : réponds uniquement avec un objet JSON valide contenant exactement les clés title, excerpt, body_markdown, meta_title, meta_description, keywords, faq. body_markdown doit utiliser seulement ##, ###, paragraphes, listes - et **gras**. Pas de HTML. 1200 à 1800 mots. faq = 4 à 7 objets {question,answer}. keywords = 8 à 16 expressions. meta_title <= 62 caractères. meta_description entre 135 et 160 caractères.`;

  const local=city?`Ville cible principale : ${city.name}, ${city.country}. Mentionne naturellement quelques réalités locales sans inventer d'adresses ni de chiffres. Les variantes locales utiles sont : ${city.aliases.join(', ')}.`: `Portée : Afrique francophone, avec exemples ponctuels en Côte d'Ivoire, Sénégal, Cameroun, Mali, Burkina Faso, Bénin, Togo, Guinée, Gabon, Congo et RDC.`;
  const user=`Sujet prioritaire : ${topic.title_seed}\nAngle éditorial : ${topic.angle}\nMots-clés à couvrir naturellement : ${(topic.keywords||[]).join(', ')}\n${local}\n\nLe texte doit expliquer le problème avant de présenter Qatalink. Inclure au moins une section "Quand Qatalink est pertinent — et quand il ne l'est pas", une checklist actionnable, et une conclusion courte. Ajouter des mentions naturelles vers la documentation Qatalink (/docs), la création d'un catalogue (/create) et le blog (/blog), mais n'écris pas de Markdown de lien : cite simplement ces chemins entre parenthèses.`;

  let actualModel=PRIMARY_MODEL,raw='';try{raw=await callPoyo(PRIMARY_MODEL,system,user)}catch(e:any){if([400,404,422].includes(Number(e?.status||0))){actualModel=FALLBACK_MODEL;raw=await callPoyo(FALLBACK_MODEL,system,user)}else{await db.from('seo_generation_runs').update({status:'failed',error_message:String(e?.message||e),completed_at:new Date().toISOString()}).eq('id',run?.id);throw e}}
  const parsed=extractJson(raw);const title=String(parsed.title||topic.title_seed).trim().slice(0,140);const body=String(parsed.body_markdown||'').trim();if(wordCount(body)<650)throw new Error('ARTICLE_TOO_SHORT');
  const excerpt=String(parsed.excerpt||'').trim().slice(0,320);const metaTitle=String(parsed.meta_title||title).trim().slice(0,70);const metaDescription=String(parsed.meta_description||excerpt).trim().slice(0,170);const keywords=Array.isArray(parsed.keywords)?parsed.keywords.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,18):[];const faq=Array.isArray(parsed.faq)?parsed.faq.filter((x:any)=>x?.question&&x?.answer).slice(0,8):[];
  const base=slugify(title)||slugify(topic.topic_key);let slug=base;const {count:dup}=await db.from('seo_blog_posts').select('*',{count:'exact',head:true}).eq('slug',slug);if(Number(dup||0)>0)slug=`${base}-${new Date().toISOString().slice(0,10)}`;
  const score=qualityScore(body,faq,keywords,city?.name||null);const now=new Date().toISOString();
  const {data:post,error:insertError}=await db.from('seo_blog_posts').insert({slug,title,excerpt,content_markdown:body,meta_title:metaTitle,meta_description:metaDescription,keywords,faq,primary_topic:topic.topic_key,city:city?.name||null,country:city?.country||null,model:actualModel,source_provider:'poyo',status:'published',quality_score:score,generation_context:{...modelContext,actual_model:actualModel},published_at:now,updated_at:now}).select('*').single();if(insertError||!post)throw new Error(insertError?.message||'BLOG_INSERT_FAILED');
  await Promise.all([db.from('seo_content_topics').update({used_count:Number(topic.used_count||0)+1,last_used_at:now}).eq('id',topic.id),run?.id?db.from('seo_generation_runs').update({status:'published',post_id:post.id,model:actualModel,metadata:{...modelContext,actual_model:actualModel,quality_score:score},completed_at:now}).eq('id',run.id):Promise.resolve(null)]);
  return {skipped:false,post:{id:post.id,slug,title,model:actualModel,quality_score:score,city:city?.name||null}};
}
