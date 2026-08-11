'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Check,ImagePlus,MousePointer2,Palette,QrCode,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const tutorialVideo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-comment-%C3%A7a-marche.mp4';
const ONBOARDING_VERSION=2;

type TourStep={
  label:string;
  title:string;
  body:string;
  action:string;
  after?:string;
};

const steps:TourStep[]=[
  {label:'Catalogues',title:'Commencez par vos catalogues',body:'Touchez « Catalogues ». C’est ici que vous retrouvez chaque catalogue, son état et son lien public.',action:'Touchez « Catalogues » pour continuer.'},
  {label:'Articles',title:'Modifiez réellement votre contenu',body:'Ouvrez « Articles ». Vous pourrez corriger les noms, prix, catégories, descriptions et visuels sans recréer votre catalogue.',action:'Touchez « Articles ».'},
  {label:'Apparence',title:'Personnalisez le rendu',body:'Ouvrez « Apparence » pour voir les réglages rapides de couleurs, typographies et identité visuelle.',action:'Touchez « Apparence ».'},
  {label:'Studio avancé',title:'Découvrez le Studio avancé',body:'Le Studio avancé va plus loin : layouts, styles de texte, fond personnalisé, palette, image de fond et réglages précis.',action:'Touchez « Studio avancé » pour l’ouvrir.'},
  {label:'Vitrine & médias',title:'Ajoutez votre présence de marque',body:'Cette section sert à ajouter vos liens, réseaux sociaux, médias et à gérer votre Vitrine lorsque votre formule le permet.',action:'Touchez « Vitrine & médias ».'},
  {label:'Parcours client',title:'Choisissez ce que le visiteur peut faire',body:'Vous pouvez adapter le parcours à votre activité : livraison, retrait, réservation, rendez-vous, appel découverte, visite, etc.',action:'Touchez « Parcours client ».'},
  {label:'QR & partage',title:'Diffusez votre catalogue',body:'Votre lien public et votre QR sont ici. Le QR reste stable même quand vous modifiez le catalogue.',action:'Touchez « QR & partage ».'},
  {label:'Statistiques',title:'Mesurez les résultats',body:'Consultez les scans, vues, interactions, paniers et intentions réellement mesurés.',action:'Touchez « Statistiques ».'},
  {label:'Support',title:'Vous savez où demander de l’aide',body:'Le Support Qatalink reste accessible depuis votre espace sans afficher de coordonnées personnelles.',action:'Touchez « Support » pour terminer le tour.'}
];

function normalize(v:string){return v.replace(/\s+/g,' ').trim().toLocaleLowerCase('fr')}
function findTarget(label:string){
  const wanted=normalize(label);
  const nodes=Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"]'));
  const visible=nodes.filter(n=>{const r=n.getBoundingClientRect();const s=getComputedStyle(n);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'});
  return visible.find(n=>normalize(n.textContent||'')===wanted)
    ||visible.find(n=>normalize(n.textContent||'').includes(wanted))
    ||null;
}

export function NewUserGuide(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [intro,setIntro]=useState(false);
  const [tour,setTour]=useState(false);
  const [step,setStep]=useState(0);
  const [userId,setUserId]=useState('');
  const [target,setTarget]=useState<HTMLElement|null>(null);
  const [targetFound,setTargetFound]=useState(false);
  const [bubble,setBubble]=useState<{top:number;left:number;width:number;mobile:boolean}>({top:0,left:0,width:360,mobile:false});
  const observerRef=useRef<MutationObserver|null>(null);

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return;
    setUserId(session.user.id);
    const {data}=await supabase.from('profiles').select('onboarding_version').eq('id',session.user.id).maybeSingle();
    if(Number(data?.onboarding_version||0)<ONBOARDING_VERSION)setIntro(true);
  })()},[supabase]);

  useEffect(()=>{
    if(!tour)return;
    let active=true;
    let current:HTMLElement|null=null;
    let retry:number|undefined;

    const clearTarget=()=>{
      if(current){current.classList.remove('qatalink-tour-target');current.removeAttribute('data-qatalink-tour-active')}
      current=null;
      setTarget(null);setTargetFound(false);
    };

    const position=(el:HTMLElement)=>{
      const rect=el.getBoundingClientRect();
      const mobile=window.innerWidth<=700;
      if(mobile){setBubble({top:window.innerHeight-250,left:10,width:Math.max(280,window.innerWidth-20),mobile:true});return}
      const width=Math.min(380,window.innerWidth-32);
      const gap=18;
      let left=rect.right+gap;
      if(left+width>window.innerWidth-16)left=Math.max(16,rect.left-width-gap);
      let top=Math.max(16,Math.min(rect.top,window.innerHeight-300));
      setBubble({top,left,width,mobile:false});
    };

    const bind=(el:HTMLElement)=>{
      clearTarget();
      if(!active)return;
      current=el;
      setTarget(el);setTargetFound(true);
      el.classList.add('qatalink-tour-target');
      el.setAttribute('data-qatalink-tour-active','true');
      el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
      setTimeout(()=>active&&position(el),320);
      const onClick=()=>{
        setTimeout(()=>{
          if(!active)return;
          clearTarget();
          if(step>=steps.length-1){void finish();}
          else setStep(s=>s+1);
        },220);
      };
      el.addEventListener('click',onClick,{once:true});
    };

    const locate=()=>{
      if(!active)return;
      const el=findTarget(steps[step].label);
      if(el){bind(el);return}
      setTargetFound(false);
      retry=window.setTimeout(locate,300);
    };

    locate();
    observerRef.current=new MutationObserver(()=>{
      if(!current||!document.body.contains(current))locate();
      else position(current);
    });
    observerRef.current.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    const onResize=()=>current&&position(current);
    window.addEventListener('resize',onResize);
    window.addEventListener('scroll',onResize,true);

    return()=>{
      active=false;
      if(retry)clearTimeout(retry);
      observerRef.current?.disconnect();observerRef.current=null;
      window.removeEventListener('resize',onResize);window.removeEventListener('scroll',onResize,true);
      clearTarget();
    };
  },[tour,step]);

  async function markDone(){
    if(!userId)return;
    await supabase.from('profiles').upsert({id:userId,onboarding_version:ONBOARDING_VERSION,onboarding_completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'});
  }
  function startTour(){setIntro(false);setStep(0);setTour(true)}
  async function finish(){setTour(false);await markDone()}
  async function skip(){await finish()}
  function pointAgain(){
    const el=findTarget(steps[step].label);
    if(!el)return;
    el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    el.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:650,easing:'ease-out'});
  }

  return <>
    {intro&&<div className="welcome-guide-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenue sur Qatalink">
      <section className="welcome-guide">
        <button className="welcome-guide-close" onClick={startTour} aria-label="Passer la vidéo"><X/></button>
        <div className="welcome-guide-copy"><span className="eyebrow">BIENVENUE SUR QATALINK</span><h2>On vous montre directement où toucher</h2><p>La vidéo est facultative. Ensuite, le guide vous fera réellement utiliser le dashboard : chaque étape avance uniquement après avoir touché l’élément indiqué.</p></div>
        <div className="welcome-guide-video"><video src={tutorialVideo} controls muted playsInline preload="metadata"/></div>
        <div className="welcome-guide-steps">
          <div><ImagePlus/><span><b>Créez</b><small>Retrouvez vos catalogues et outils.</small></span></div>
          <div><BookOpen/><span><b>Modifiez</b><small>Testez les sections de contenu.</small></span></div>
          <div><Palette/><span><b>Personnalisez</b><small>Ouvrez les réglages avancés.</small></span></div>
          <div><QrCode/><span><b>Partagez</b><small>Repérez lien, QR et statistiques.</small></span></div>
        </div>
        <div className="welcome-guide-actions"><button className="btn btn-ghost" onClick={startTour}>Passer la vidéo</button><button className="btn btn-primary" onClick={startTour}>Me guider dans l’app <ArrowRight size={16}/></button></div>
      </section>
    </div>}

    {tour&&<>
      <div className="qatalink-tour-scrim" aria-hidden="true"/>
      <section className={'qatalink-tour-card '+(bubble.mobile?'is-mobile':'')} style={bubble.mobile?undefined:{top:bubble.top,left:bubble.left,width:bubble.width}} role="dialog" aria-live="polite">
        <div className="qatalink-tour-progress"><span>Guide interactif</span><b>{step+1}/{steps.length}</b></div>
        <div className="qatalink-tour-action-icon"><MousePointer2 size={18}/></div>
        <h3>{steps[step].title}</h3>
        <p>{steps[step].body}</p>
        <div className="qatalink-tour-instruction">{steps[step].action}</div>
        {!targetFound&&<div className="qatalink-tour-searching">Recherche de l’élément…</div>}
        <div className="qatalink-tour-actions">
          <button className="qatalink-tour-skip" onClick={skip}>Ignorer le guide</button>
          <button className="btn btn-primary" onClick={pointAgain} disabled={!targetFound}><MousePointer2 size={15}/>Me montrer</button>
        </div>
      </section>
    </>}
  </>;
}
