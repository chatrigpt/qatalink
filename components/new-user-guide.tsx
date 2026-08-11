'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Check,ImagePlus,MousePointer2,Palette,QrCode,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const tutorialVideo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-comment-%C3%A7a-marche.mp4';
const ONBOARDING_VERSION=3;

type StepEvent='click'|'focus'|'change';
type TourStep={key:string;title:string;body:string;action:string;event:StepEvent;find:()=>HTMLElement|null;after?:()=>void};

function visible<T extends HTMLElement>(nodes:T[]){return nodes.filter(n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'})}
function byText(text:string){const wanted=text.replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');const nodes=visible(Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"]')));return nodes.find(n=>(n.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('fr')===wanted)||nodes.find(n=>(n.textContent||'').toLocaleLowerCase('fr').includes(wanted))||null}
function layoutSelect(){const cards=visible(Array.from(document.querySelectorAll<HTMLElement>('.advanced-card')));const card=cards.find(c=>(c.querySelector('h3')?.textContent||'').trim()==='Layout');return card?.querySelector<HTMLSelectElement>('select')||null}
function vitrineUrlField(){return visible(Array.from(document.querySelectorAll<HTMLInputElement>('.vm-panel input'))).find(i=>(i.placeholder||'').includes('https://'))||null}
function firstItemField(){return document.querySelector<HTMLElement>('.item-v2-card input.input')||document.querySelector<HTMLElement>('.dash-section input.input')||null}
function closeAdvanced(){setTimeout(()=>document.querySelector<HTMLButtonElement>('.advanced-studio header>button')?.click(),500)}
function closeVitrine(){setTimeout(()=>document.querySelector<HTMLButtonElement>('.vm-panel header>button')?.click(),650)}
function closeFlow(){setTimeout(()=>document.querySelector<HTMLButtonElement>('.flow-admin-panel header>button')?.click(),500)}

function makeSteps():TourStep[]{return[
  {key:'catalogs-nav',title:'Choisissez le catalogue à travailler',body:'Commencez par ouvrir la liste de vos catalogues. Le guide va ensuite vous faire manipuler un vrai catalogue.',action:'Touchez « Catalogues ».',event:'click',find:()=>byText('Catalogues')},
  {key:'catalog-select',title:'Sélectionnez un catalogue',body:'Touchez une carte de catalogue. Qatalink chargera alors ses articles, son apparence, son QR et ses réglages.',action:'Touchez un catalogue dans la liste.',event:'click',find:()=>document.querySelector<HTMLElement>('.catalog-v2-card')},
  {key:'articles-nav',title:'Passez à l’édition',body:'Vous allez voir que le contenu généré n’est jamais figé : tout peut être corrigé directement.',action:'Touchez « Articles ».',event:'click',find:()=>byText('Articles')},
  {key:'article-edit',title:'Testez l’édition d’un article',body:'Touchez le nom d’un article. Vous pouvez modifier noms, prix, descriptions, catégories ou disponibilité sans recréer le catalogue.',action:'Touchez le champ du nom d’un article.',event:'focus',find:firstItemField},
  {key:'appearance-nav',title:'Ouvrez la personnalisation rapide',body:'Ici vous pouvez changer rapidement couleurs, typographies et identité visuelle.',action:'Touchez « Apparence ».',event:'click',find:()=>byText('Apparence')},
  {key:'theme-test',title:'Essayez réellement un thème',body:'Choisissez un thème qui vous plaît. Vous verrez immédiatement le rendu changer.',action:'Touchez un thème pour l’appliquer.',event:'click',find:()=>document.querySelector<HTMLElement>('.theme-v3-swatch')},
  {key:'studio-open',title:'Ouvrez le Studio avancé',body:'Le Studio avancé permet d’aller beaucoup plus loin que les réglages rapides.',action:'Touchez « Studio avancé ».',event:'click',find:()=>byText('Studio avancé')},
  {key:'studio-layout',title:'Testez un layout différent',body:'Voici une fonction spéciale : vous pouvez transformer la présentation en liste, cartes, grille ou showcase.',action:'Ouvrez le choix « Layout » et sélectionnez une autre disposition.',event:'change',find:layoutSelect},
  {key:'studio-save',title:'Publiez votre personnalisation',body:'Les changements du Studio peuvent être enregistrés directement sur le lien public.',action:'Touchez « Enregistrer & publier ».',event:'click',find:()=>document.querySelector<HTMLElement>('.advanced-save'),after:closeAdvanced},
  {key:'vitrine-open',title:'Découvrez Vitrine & médias',body:'Cette zone regroupe vos réseaux sociaux, liens externes et illustrations.',action:'Touchez « Vitrine & médias ».',event:'click',find:()=>byText('Vitrine & médias')},
  {key:'vitrine-link',title:'Repérez où ajouter vos liens',body:'Instagram, Facebook, TikTok, site, Maps ou autre lien : c’est ici que vous les ajoutez à votre Vitrine.',action:'Touchez le champ URL « https://… ».',event:'focus',find:vitrineUrlField,after:closeVitrine},
  {key:'flow-open',title:'Personnalisez le parcours client',body:'Vous pouvez décider ce que vos visiteurs feront : livraison, retrait, réservation, visite, rendez-vous ou appel découverte.',action:'Touchez « Parcours client ».',event:'click',find:()=>byText('Parcours client')},
  {key:'flow-option',title:'Testez une option client',body:'Les suggestions métier ne sont pas bloquées. Activez ou désactivez une option pour voir que le parcours est personnalisable.',action:'Touchez une option de parcours.',event:'change',find:()=>document.querySelector<HTMLElement>('.flow-mode input[type="checkbox"]')},
  {key:'flow-save',title:'Enregistrez ce parcours',body:'Les options choisies seront celles proposées sur le catalogue public.',action:'Touchez « Enregistrer mes options ».',event:'click',find:()=>byText('Enregistrer mes options'),after:closeFlow},
  {key:'qr-nav',title:'Passez au partage',body:'Votre QR reste stable pendant que le contenu du catalogue évolue.',action:'Touchez « QR & partage ».',event:'click',find:()=>byText('QR & partage')},
  {key:'qr-preview',title:'Testez votre lien public',body:'Ouvrez l’aperçu pour voir exactement ce que verra un client sans compte Qatalink.',action:'Touchez « Aperçu ».',event:'click',find:()=>byText('Aperçu')},
  {key:'stats-nav',title:'Terminez par les résultats',body:'Les statistiques vous permettent de suivre les vues, scans, interactions et intentions générées par votre catalogue.',action:'Touchez « Statistiques » pour terminer.',event:'click',find:()=>byText('Statistiques')}
]}

export function NewUserGuide(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const steps=useMemo(()=>makeSteps(),[]);
  const [intro,setIntro]=useState(false);const [tour,setTour]=useState(false);const [step,setStep]=useState(0);const [userId,setUserId]=useState('');const [targetFound,setTargetFound]=useState(false);const [done,setDone]=useState(false);
  const [bubble,setBubble]=useState<{top?:number;left?:number;width?:number;mobile:boolean;placement:'top'|'bottom'|'side'}>({mobile:false,placement:'side'});
  const activeRef=useRef<HTMLElement|null>(null);

  useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)return;setUserId(session.user.id);const {data}=await supabase.from('profiles').select('onboarding_version').eq('id',session.user.id).maybeSingle();if(Number(data?.onboarding_version||0)<ONBOARDING_VERSION)setIntro(true)})()},[supabase]);

  useEffect(()=>{
    if(!tour)return;
    let alive=true;let retry:number|undefined;let current:HTMLElement|null=null;let handler:((e:Event)=>void)|null=null;let eventName:StepEvent|null=null;
    const s=steps[step];
    const clear=()=>{if(current){current.classList.remove('qatalink-tour-target');current.removeAttribute('data-qatalink-tour-active');if(handler&&eventName)current.removeEventListener(eventName,handler)}current=null;handler=null;eventName=null;activeRef.current=null;setTargetFound(false)};
    const position=(el:HTMLElement)=>{
      const r=el.getBoundingClientRect();const mobile=window.innerWidth<=700;
      if(mobile){const putTop=r.top>window.innerHeight*.48;setBubble({mobile:true,placement:putTop?'top':'bottom'});return}
      const width=Math.min(330,window.innerWidth-32);let left=r.right+16;if(left+width>window.innerWidth-16)left=Math.max(16,r.left-width-16);const top=Math.max(12,Math.min(r.top,window.innerHeight-245));setBubble({mobile:false,placement:'side',top,left,width});
    };
    const advance=()=>{if(!alive)return;const finished=step>=steps.length-1;if(s.after)s.after();clear();if(finished){void finish(true)}else setStep(v=>v+1)};
    const bind=(el:HTMLElement)=>{clear();if(!alive)return;current=el;activeRef.current=el;setTargetFound(true);el.classList.add('qatalink-tour-target');el.setAttribute('data-qatalink-tour-active','true');el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});setTimeout(()=>alive&&position(el),260);eventName=s.event;handler=()=>setTimeout(advance,260);el.addEventListener(s.event,handler,{once:true})};
    const locate=()=>{if(!alive)return;const el=s.find();if(el){bind(el);return}retry=window.setTimeout(locate,260)};
    locate();
    const observer=new MutationObserver(()=>{if(!current||!document.body.contains(current)){if(retry)clearTimeout(retry);retry=window.setTimeout(locate,150)}else position(current)});observer.observe(document.body,{childList:true,subtree:true});
    const reposition=()=>current&&position(current);window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
    return()=>{alive=false;if(retry)clearTimeout(retry);observer.disconnect();window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);clear()}
  },[tour,step,steps]);

  async function markDone(){if(!userId)return;await supabase.from('profiles').upsert({id:userId,onboarding_version:ONBOARDING_VERSION,onboarding_completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'})}
  function startTour(){setIntro(false);setDone(false);setStep(0);setTour(true)}
  async function finish(showDone=false){setTour(false);await markDone();if(showDone){setDone(true);setTimeout(()=>setDone(false),4200)}}
  async function skip(){await finish(false)}
  function pointAgain(){const el=steps[step]?.find();if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});el.animate([{transform:'scale(1)'},{transform:'scale(1.045)'},{transform:'scale(1)'}],{duration:620,easing:'ease-out'})}

  const mobileClass=bubble.mobile?(bubble.placement==='top'?'is-mobile mobile-top':'is-mobile mobile-bottom'):'';
  const style=bubble.mobile?undefined:{top:bubble.top,left:bubble.left,width:bubble.width};

  return <>
    {intro&&<div className="welcome-guide-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenue sur Qatalink"><section className="welcome-guide"><button className="welcome-guide-close" onClick={startTour} aria-label="Passer la vidéo"><X/></button><div className="welcome-guide-copy"><span className="eyebrow">BIENVENUE SUR QATALINK</span><h2>Apprenez en utilisant vraiment l’application</h2><p>La vidéo est facultative. Le guide pratique vous fera ensuite toucher, tester et enregistrer plusieurs fonctions directement dans votre dashboard.</p></div><div className="welcome-guide-video"><video src={tutorialVideo} controls muted playsInline preload="metadata"/></div><div className="welcome-guide-steps"><div><ImagePlus/><span><b>Sélectionnez</b><small>Un vrai catalogue à modifier.</small></span></div><div><BookOpen/><span><b>Testez</b><small>Édition et personnalisation.</small></span></div><div><Palette/><span><b>Explorez</b><small>Studio avancé et parcours client.</small></span></div><div><QrCode/><span><b>Vérifiez</b><small>Aperçu public et résultats.</small></span></div></div><div className="welcome-guide-actions"><button className="btn btn-ghost" onClick={startTour}>Passer la vidéo</button><button className="btn btn-primary" onClick={startTour}>Lancer le guide pratique <ArrowRight size={16}/></button></div></section></div>}

    {tour&&<section className={'qatalink-tour-card '+mobileClass} style={style} role="dialog" aria-live="polite"><div className="qatalink-tour-progress"><span>Guide pratique</span><b>{step+1}/{steps.length}</b></div><div className="qatalink-tour-action-icon"><MousePointer2 size={18}/></div><h3>{steps[step].title}</h3><p>{steps[step].body}</p><div className="qatalink-tour-instruction">{steps[step].action}</div>{!targetFound&&<div className="qatalink-tour-searching">Je place le repère sur la bonne fonction…</div>}<div className="qatalink-tour-actions"><button className="qatalink-tour-skip" onClick={skip}>Ignorer le guide</button><button className="btn btn-primary" onClick={pointAgain} disabled={!targetFound}><MousePointer2 size={15}/>Me montrer</button></div></section>}

    {done&&<div className="notice-v2 qatalink-tour-complete"><Check size={16}/>Guide terminé — vous avez testé les fonctions essentielles.</div>}
  </>;
}
