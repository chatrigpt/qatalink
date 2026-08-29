import {createClient} from '@supabase/supabase-js';
import {SEO_CITIES} from '@/lib/seo-cities';

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const PUBLIC_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
const POYO_API_KEY=(process.env.POYO_API_KEY||'').replace(/^Bearer\s+/i,'').trim();
const PRIMARY_MODEL='gemini-2.5-flash';
const FALLBACK_MODEL='gemini-3.5-flash';
const RESEARCH_MODEL='gemini-3.5-flash';

export type GeneratedArticle={slug:string;title:string;excerpt:string;body_markdown:string;meta_title:string;meta_description:string;keywords:string[];faq:{question:string;answer:string}[];primary_topic:string;city:string|null;country:string|null;model:string;quality_score:number;generation_context:Record<string,unknown>};

function db(){const key=SERVICE_KEY||PUBLIC_KEY;if(!key)throw new Error('SUPABASE_KEY_MISSING');return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})}
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

async function callPoyoTrendResearch(prompt:string){
  if(!POYO_API_KEY)return '';
  const r=await fetch(`https://api.poyo.ai/v1beta/models/${RESEARCH_MODEL}:generateContent`,{method:'POST',headers:{Authorization:`Bearer ${POYO_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],tools:[{google_search:{}}],generationConfig:{temperature:.2,maxOutputTokens:2400}}),cache:'no-store'});
  const raw=await r.text();let data:any={};try{data=JSON.parse(raw)}catch{data={raw:raw.slice(0,1200)}}
  if(!r.ok)throw new Error(data?.error?.message||data?.message||`POYO_RESEARCH_${r.status}`);
  const root=data?.data||data;const parts=root?.candidates?.[0]?.content?.parts||[];const text=parts.map((p:any)=>typeof p?.text==='string'?p.text:'').filter(Boolean).join('\n').trim();
  if(!text)throw new Error('POYO_RESEARCH_EMPTY');return text.slice(0,9000);
}

function cityForTopic(topic:any){if(!topic?.city_rotation)return null;const idx=Math.max(0,Number(topic.used_count||0))%SEO_CITIES.length;return SEO_CITIES[idx]}

export async function generateAndPublishSeoArticle(opts:{bootstrap?:boolean}={}){
  const client=db();const privileged=!!SERVICE_KEY;
  const {count:publishedCount}=await client.from('seo_blog_posts').select('*',{count:'exact',head:true}).eq('status','published');
  if(opts.bootstrap&&Number(publishedCount||0)>0)return {skipped:true,reason:'BOOTSTRAP_ALREADY_DONE'};
  if(!opts.bootstrap){const since=new Date(Date.now()-20*3600_000).toISOString();const {count:recent}=await client.from('seo_blog_posts').select('*',{count:'exact',head:true}).eq('status','published').gte('published_at',since);if(Number(recent||0)>0)return {skipped:true,reason:'RECENT_POST_EXISTS'}}

  let topic:any=null;
  if(privileged){
    const {data:topics,error:topicError}=await client.from('seo_content_topics').select('*').order('priority',{ascending:false}).order('last_used_at',{ascending:true,nullsFirst:true}).limit(25);if(topicError||!topics?.length)throw new Error(topicError?.message||'NO_SEO_TOPICS');
    topic=[...topics].sort((a:any,b:any)=>{const au=a.last_used_at?new Date(a.last_used_at).getTime():0;const bu=b.last_used_at?new Date(b.last_used_at).getTime():0;if(!au&&!bu)return Number(b.priority)-Number(a.priority);if(!au)return-1;if(!bu)return 1;return au-bu})[0];
  }else{
    const {data,error}=await client.rpc('seo_next_content_topic');if(error||!data)throw new Error(error?.message||'NO_SEO_TOPICS');topic=data;
  }

  const city=cityForTopic(topic);
  const researchPrompt=`Effectue une recherche Google actuelle pour préparer un article SEO/GEO Qatalink. Sujet : ${topic.title_seed}. Angle : ${topic.angle}. Ville/pays : ${city?`${city.name}, ${city.country}`:'Afrique francophone'}. Intentions de départ : ${(topic.keywords||[]).join(', ')}.\n\nRetourne une note de recherche concise en français avec :\n1) les formulations et questions de recherche actuelles les plus pertinentes autour de ce sujet ;\n2) les termes émergents ou variantes sémantiques utiles ;\n3) le statut actuel ou les précautions nécessaires si des marques tierces sont citées ;\n4) les faits récents réellement vérifiables utiles au lecteur ;\n5) les affirmations qu'il vaut mieux éviter faute de preuve.\n\nNe fabrique aucun volume de recherche. Ne transforme pas une suggestion Google en statistique. Si une information n'est pas confirmée, dis qu'elle est incertaine. Priorise les intentions commerciales et informationnelles réellement utiles plutôt que le bourrage de mots-clés.`;
  let trendResearch='';try{trendResearch=await callPoyoTrendResearch(researchPrompt)}catch(e:any){console.warn('[Qatalink:SEO] trend research unavailable:',String(e?.message||e))}

  const modelContext={requested_model:PRIMARY_MODEL,topic_key:topic.topic_key,city:city?.name||null,generated_at:new Date().toISOString(),publisher_mode:privileged?'service_role':'limited_rpc',trend_research_model:RESEARCH_MODEL,trend_research_used:!!trendResearch,trend_research_excerpt:trendResearch.slice(0,5000)};
  let runId:string|null=null;
  if(privileged){const {data:run}=await client.from('seo_generation_runs').insert({topic_key:topic.topic_key,city:city?.name||null,model:PRIMARY_MODEL,provider:'poyo',status:'started',metadata:modelContext}).select('id').single();runId=run?.id||null}

  const system=`Tu es le rédacteur SEO/GEO senior de Qatalink, une plateforme de catalogues et menus interactifs, QR code, commandes directes, caisse, équipe, stock, livraison et outils IA pour commerces en Afrique francophone. Tu écris en français naturel, précis, utile, crédible et captivant. Ton objectif n'est jamais de bourrer des mots-clés ni de promettre un classement garanti. Tu dois produire une ressource réellement meilleure que les contenus génériques : exemples concrets, comparaisons nuancées, recommandations actionnables, définitions claires et réponses aux objections.\n\nRègles de marque et de fiabilité :\n- Ne prétends jamais que Qatalink est partenaire de Glovo, Jumia Food, Yango Deli ou d'une autre marque tierce.\n- Une marque tierce peut être un terme de recherche ou un point de comparaison sans être actuellement active dans la ville ciblée. Ne dis jamais qu'elle opère actuellement dans une ville, qu'elle y a des utilisateurs, des livreurs ou une couverture, sauf si cette information est clairement confirmée dans la note de recherche actuelle.\n- Si le statut actuel d'une marketplace est inconnu, formule la comparaison comme un modèle générique : « une marketplace de livraison peut… », « selon la plateforme et le marché… », ou « des recherches comme alternative à X… ».\n- Ne fabrique jamais de chiffres d'utilisateurs, volumes de recherche, commissions, délais de reversement, prix, parts de marché, zones couvertes ou conditions commerciales d'une plateforme tierce.\n- N'affirme pas une croissance du marché, une préférence locale, une popularité ou une habitude de consommation comme fait établi sans appui explicite dans le contexte de recherche. Sinon, utilise une formulation conditionnelle ou pratique.\n- Les frais, commissions, accès aux données client, logistique et modalités de paiement varient selon la plateforme et le contrat : présente-les comme des critères à vérifier, jamais comme des faits universels.\n- N'affirme pas qu'un résultat SEO est garanti.\n- Explique que Qatalink peut compléter ou remplacer certains usages de marketplace selon le besoin du commerce, sans affirmer qu'il remplace leurs services logistiques ou d'acquisition lorsqu'il ne le fait pas.\n- Favorise les contextes africains francophones et les usages Mobile Money/WhatsApp sans caricature.\n- Utilise des formulations variées et humaines.\n\nGEO/LLM : donne des réponses explicites aux questions que poserait un utilisateur à ChatGPT, Gemini, Perplexity ou Google AI Overviews. Nomme les concepts, explique les relations entre eux et fournis des listes vérifiables.\n\nFormat obligatoire : réponds uniquement avec un objet JSON valide contenant exactement les clés title, excerpt, body_markdown, meta_title, meta_description, keywords, faq. body_markdown doit utiliser seulement ##, ###, paragraphes, listes - et **gras**. Pas de HTML. 1200 à 1800 mots. faq = 4 à 7 objets {question,answer}. keywords = 8 à 16 expressions. meta_title <= 62 caractères et ne doit pas se terminer par « | Qatalink » car le site ajoute lui-même la marque. meta_description entre 135 et 160 caractères.`;

  const local=city?`Ville cible principale : ${city.name}, ${city.country}. Mentionne naturellement quelques réalités locales sans inventer d'adresses ni de chiffres. Les variantes locales utiles sont : ${city.aliases.join(', ')}.`:`Portée : Afrique francophone, avec exemples ponctuels en Côte d'Ivoire, Sénégal, Cameroun, Mali, Burkina Faso, Bénin, Togo, Guinée, Gabon, Congo et RDC.`;
  const researchContext=trendResearch?`\n\nNOTE DE RECHERCHE WEB ACTUELLE VIA POYO/GEMINI :\n${trendResearch}\n\nUtilise cette note pour choisir les formulations et questions actuelles. Ne transforme jamais une hypothèse de la note en fait. Si la note signale une incertitude, conserve cette prudence dans l'article.`:'\n\nLa recherche web temps réel n’a pas été disponible pour cette exécution. Reste sur les intentions fournies et évite toute affirmation d’actualité non vérifiée.';
  const user=`Sujet prioritaire : ${topic.title_seed}\nAngle éditorial : ${topic.angle}\nMots-clés à couvrir naturellement : ${(topic.keywords||[]).join(', ')}\n${local}${researchContext}\n\nLe texte doit expliquer le problème avant de présenter Qatalink. Inclure au moins une section "Quand Qatalink est pertinent — et quand il ne l'est pas", une checklist actionnable, et une conclusion courte. Ajouter des mentions naturelles vers la documentation Qatalink (/docs), la création d'un catalogue (/create) et le blog (/blog), mais n'écris pas de Markdown de lien : cite simplement ces chemins entre parenthèses.`;

  let actualModel=PRIMARY_MODEL,raw='';try{raw=await callPoyo(PRIMARY_MODEL,system,user)}catch(e:any){if([400,404,422].includes(Number(e?.status||0))){actualModel=FALLBACK_MODEL;raw=await callPoyo(FALLBACK_MODEL,system,user)}else{if(privileged&&runId)await client.from('seo_generation_runs').update({status:'failed',error_message:String(e?.message||e),completed_at:new Date().toISOString()}).eq('id',runId);throw e}}
  const parsed=extractJson(raw);const title=String(parsed.title||topic.title_seed).trim().slice(0,140);const body=String(parsed.body_markdown||'').trim();if(wordCount(body)<650)throw new Error('ARTICLE_TOO_SHORT');
  const excerpt=String(parsed.excerpt||'').trim().slice(0,320);const metaTitle=String(parsed.meta_title||title).trim().replace(/\s*\|\s*Qatalink\s*$/i,'').slice(0,62);const metaDescription=String(parsed.meta_description||excerpt).trim().slice(0,170);const keywords=Array.isArray(parsed.keywords)?parsed.keywords.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,18):[];const faq=Array.isArray(parsed.faq)?parsed.faq.filter((x:any)=>x?.question&&x?.answer).slice(0,8):[];
  const base=slugify(title)||slugify(topic.topic_key);let slug=base;const {count:dup}=await client.from('seo_blog_posts').select('*',{count:'exact',head:true}).eq('slug',slug);if(Number(dup||0)>0)slug=`${base}-${new Date().toISOString().slice(0,10)}`;
  const score=qualityScore(body,faq,keywords,city?.name||null);const now=new Date().toISOString();const payload={slug,title,excerpt,content_markdown:body,meta_title:metaTitle,meta_description:metaDescription,keywords,faq,primary_topic:topic.topic_key,city:city?.name||null,country:city?.country||null,model:actualModel,quality_score:score,generation_context:{...modelContext,actual_model:actualModel}};

  if(!privileged){
    const {data:published,error}=await client.rpc('seo_publish_article_limited',{p_payload:payload});if(error)throw new Error(error.message||'LIMITED_PUBLISH_FAILED');if(published?.skipped)return published;
    return {skipped:false,post:{id:published?.id,slug:published?.slug||slug,title:published?.title||title,model:published?.model||actualModel,quality_score:Number(published?.quality_score??score),city:published?.city??city?.name??null,trend_research_used:!!trendResearch}};
  }

  const {data:post,error:insertError}=await client.from('seo_blog_posts').insert({...payload,source_provider:'poyo',status:'published',published_at:now,updated_at:now}).select('*').single();if(insertError||!post)throw new Error(insertError?.message||'BLOG_INSERT_FAILED');
  await Promise.all([client.from('seo_content_topics').update({used_count:Number(topic.used_count||0)+1,last_used_at:now}).eq('id',topic.id),runId?client.from('seo_generation_runs').update({status:'published',post_id:post.id,model:actualModel,metadata:{...modelContext,actual_model:actualModel,quality_score:score},completed_at:now}).eq('id',runId):Promise.resolve(null)]);
  return {skipped:false,post:{id:post.id,slug,title,model:actualModel,quality_score:score,city:city?.name||null,trend_research_used:!!trendResearch}};
}
