'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Check,Eye,MousePointer2,QrCode,Rocket,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const ONBOARDING_VERSION=4;

type StepEvent='click';
type TourStep={key:string;title:string;body:string;action:string;event:StepEvent;find:()=>HTMLElement|null};

function visible<T extends HTMLElement>(nodes:T[]){return nodes.filter(n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'})}
function byText(text:string){const wanted=text.replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');const nodes=visible(Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"]')));return nodes.find(n=>(n.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('fr')===wanted)||nodes.find(n=>(n.textContent||'').toLocaleLowerCase('fr').includes(wanted))||null}

function makeSteps():TourStep[]{return[
  {key:'articles-nav',title:'1. Vérifiez ce que Qatalink a créé',body:'Votre catalogue n’est jamais figé. Les noms, prix, descriptions, disponibilités et catégories restent modifiables.',action:'Touchez « Articles » pour voir votre contenu.',event:'click',find:()=>byText('Articles')},
  {key:'qr-nav',title:'2. Passez directement à la mise en ligne',body:'Vous pourrez personnaliser le design plus tard. Le plus important maintenant est de mettre votre catalogue entre les mains d’un vrai client.',action:'Touchez « QR & partage ».',event:'click',find:()=>byText('QR & partage')},
  {key:'publish',title:'3. Mettez votre catalogue en ligne',body:'Le QR restera le même lorsque vous modifierez vos prix, photos, textes ou catégories. Vous n’aurez rien à réimprimer.',action:'Touchez « Publier ».',event:'click',find:()=>byText('Publier')},
  {key:'preview',title:'4. Regardez-le comme un client',body:'Ouvrez le rendu public. Ensuite, scannez votre QR avec votre téléphone ou partagez-le à une personne pour obtenir votre première vraie visite.',action:'Touchez « Aperçu ».',event:'click',find:()=>byText('Aperçu')}
]}

export function NewUserGuide(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const steps=useMemo(()=>makeSteps(),[]);
  const [intro,setIntro]=useState(false);const [tour,setTour]=useState(false);const [step,setStep]=useState(0);const [userId,setUserId]=useState('');const [targetFound,setTargetFound]=useState(false);const [done,setDone]=useState(false);
  const [bubble,setBubble]=useState<{top?:number;left?:number;width?:number;mobile:boolean;placement:'top'|'bottom'|'side'}>({mobile:false,placement:'side'});
  const activeRef=useRef<HTMLElement|null>(null);

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();if(!session)return;setUserId(session.user.id);
    const [{data:profile},{data:businesses}]=await Promise.all([
      supabase.from('profiles').select('onboarding_version').eq('id',session.user.id).maybeSingle(),
      supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1)
    ]);
    const businessId=businesses?.[0]?.id;if(!businessId)return;
    const {count}=await supabase.from('catalogs').select('*',{count:'exact',head:true}).eq('business_id',businessId);
    if((count||0)>0&&Number(profile?.onboarding_version||0)<ONBOARDING_VERSION)setIntro(true);
  })()},[supabase]);

  useEffect(()=>{
    if(!tour)return;
    let alive=true;let retry:number|undefined;let current:HTMLElement|null=null;let handler:((e:Event)=>void)|null=null;
    const s=steps[step];
    const clear=()=>{if(current){current.classList.remove('qatalink-tour-target');current.removeAttribute('data-qatalink-tour-active');if(handler)current.removeEventListener('click',handler)}current=null;handler=null;activeRef.current=null;setTargetFound(false)};
    const position=(el:HTMLElement)=>{const r=el.getBoundingClientRect();const mobile=window.innerWidth<=700;if(mobile){const putTop=r.top>window.innerHeight*.48;setBubble({mobile:true,placement:putTop?'top':'bottom'});return}const width=Math.min(330,window.innerWidth-32);let left=r.right+16;if(left+width>window.innerWidth-16)left=Math.max(16,r.left-width-16);const top=Math.max(12,Math.min(r.top,window.innerHeight-245));setBubble({mobile:false,placement:'side',top,left,width})};
    const advance=()=>{if(!alive)return;const finished=step>=steps.length-1;clear();if(finished){void finish(true)}else setStep(v=>v+1)};
    const bind=(el:HTMLElement)=>{clear();if(!alive)return;current=el;activeRef.current=el;setTargetFound(true);el.classList.add('qatalink-tour-target');el.setAttribute('data-qatalink-tour-active','true');el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});setTimeout(()=>alive&&position(el),260);handler=()=>setTimeout(advance,260);el.addEventListener('click',handler,{once:true})};
    const locate=()=>{if(!alive)return;const el=s.find();if(el){bind(el);return}retry=window.setTimeout(locate,260)};
    locate();
    const observer=new MutationObserver(()=>{if(!current||!document.body.contains(current)){if(retry)clearTimeout(retry);retry=window.setTimeout(locate,150)}else position(current)});observer.observe(document.body,{childList:true,subtree:true});
    const reposition=()=>current&&position(current);window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
    return()=>{alive=false;if(retry)clearTimeout(retry);observer.disconnect();window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);clear()}
  },[tour,step,steps]);

  async function markDone(){if(!userId)return;await supabase.from('profiles').upsert({id:userId,onboarding_version:ONBOARDING_VERSION,onboarding_completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'})}
  function startTour(){setIntro(false);setDone(false);setStep(0);setTour(true)}
  async function finish(showDone=false){setTour(false);await markDone();if(showDone){setDone(true);setTimeout(()=>setDone(false),5200)}}
  async function skip(){setIntro(false);await finish(false)}
  function pointAgain(){const el=steps[step]?.find();if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});el.animate([{transform:'scale(1)'},{transform:'scale(1.045)'},{transform:'scale(1)'}],{duration:620,easing:'ease-out'})}

  const mobileClass=bubble.mobile?(bubble.placement==='top'?'is-mobile mobile-top':'is-mobile mobile-bottom'):'';
  const style=bubble.mobile?undefined:{top:bubble.top,left:bubble.left,width:bubble.width};

  return <>
    {intro&&<div className="welcome-guide-backdrop" role="dialog" aria-modal="true" aria-label="Premier objectif Qatalink"><section className="welcome-guide activation-welcome-guide"><button className="welcome-guide-close" onClick={skip} aria-label="Ignorer le guide"><X/></button><div className="welcome-guide-copy"><span className="eyebrow">VOTRE PREMIER OBJECTIF</span><h2>Mettre votre catalogue entre les mains d’un client</h2><p>Pas de visite interminable de l’application. En quatre actions, vous allez vérifier votre catalogue, le publier et l’ouvrir comme un client. Comptez environ une minute.</p></div><div className="welcome-guide-steps activation-guide-steps"><div><BookOpen/><span><b>Vérifier</b><small>Regardez ce qui a été créé.</small></span></div><div><QrCode/><span><b>Partager</b><small>Accédez au QR permanent.</small></span></div><div><Rocket/><span><b>Publier</b><small>Mettez votre catalogue en ligne.</small></span></div><div><Eye/><span><b>Tester</b><small>Ouvrez-le comme un client.</small></span></div></div><div className="welcome-guide-actions"><button className="btn btn-ghost" onClick={skip}>Plus tard</button><button className="btn btn-primary" onClick={startTour}>Mettre mon catalogue en ligne <ArrowRight size={16}/></button></div></section></div>}

    {tour&&<section className={'qatalink-tour-card '+mobileClass} style={style} role="dialog" aria-live="polite"><div className="qatalink-tour-progress"><span>Activation Qatalink</span><b>{step+1}/{steps.length}</b></div><div className="qatalink-tour-action-icon"><MousePointer2 size={18}/></div><h3>{steps[step].title}</h3><p>{steps[step].body}</p><div className="qatalink-tour-instruction">{steps[step].action}</div>{!targetFound&&<div className="qatalink-tour-searching">Je place le repère sur la bonne action…</div>}<div className="qatalink-tour-actions"><button className="qatalink-tour-skip" onClick={skip}>Ignorer</button><button className="btn btn-primary" onClick={pointAgain} disabled={!targetFound}><MousePointer2 size={15}/>Me montrer</button></div></section>}

    {done&&<div className="notice-v2 qatalink-tour-complete"><Check size={16}/>Votre catalogue est en ligne. Scannez maintenant votre QR avec votre téléphone ou partagez-le pour obtenir votre première vraie visite.</div>}
  </>;
}
