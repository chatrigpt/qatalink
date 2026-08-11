'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ImagePlus,Palette,QrCode,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const tutorialVideo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-comment-%C3%A7a-marche.mp4';
const ONBOARDING_VERSION=1;

type TourStep={title:string;body:string;label:string};
const steps:TourStep[]=[
  {label:'Catalogues',title:'Créez et gérez vos catalogues',body:'Retrouvez ici tous vos catalogues. Vous pouvez en créer plusieurs, choisir celui à modifier et récupérer son lien public.'},
  {label:'Articles',title:'Corrigez vos contenus facilement',body:'Ajoutez, renommez ou supprimez catégories, produits, services, prix et images sans repartir de zéro.'},
  {label:'Apparence',title:'Adaptez rapidement le rendu',body:'Couleurs, typographies et style général sont accessibles ici pour une personnalisation rapide.'},
  {label:'Studio avancé',title:'Passez à la personnalisation avancée',body:'Layouts, polices, styles de titres, fonds, image de fond, analyse de palette et réglages plus poussés sont regroupés dans le Studio avancé.'},
  {label:'Vitrine & médias',title:'Construisez votre présence publique',body:'Ajoutez vos liens, réseaux sociaux, visuels et gérez votre page Vitrine lorsque votre formule le permet.'},
  {label:'Parcours client',title:'Choisissez ce que vos visiteurs peuvent faire',body:'Livraison, retrait, réservation, rendez-vous, appel découverte, visite ou autre action : adaptez le parcours à votre activité.'},
  {label:'QR & partage',title:'Diffusez votre catalogue',body:'Votre QR reste stable pendant que votre catalogue évolue. Utilisez également le lien public pour WhatsApp, Instagram ou vos supports imprimés.'},
  {label:'Statistiques',title:'Suivez les résultats',body:'Consultez les scans, vues, interactions, paniers et intentions de contact réellement mesurés sur votre catalogue.'},
  {label:'Support',title:'Besoin d’aide ?',body:'Le Support Qatalink est accessible ici directement depuis votre espace. Vous pouvez écrire sans quitter votre dashboard.'}
];

function findTarget(label:string){
  const nodes=Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"]'));
  const wanted=label.toLocaleLowerCase('fr');
  return nodes.find(n=>(n.textContent||'').trim().toLocaleLowerCase('fr').includes(wanted))||null;
}

export function NewUserGuide(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [intro,setIntro]=useState(false);
  const [tour,setTour]=useState(false);
  const [step,setStep]=useState(0);
  const [userId,setUserId]=useState('');
  const [target,setTarget]=useState<HTMLElement|null>(null);

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return;
    setUserId(session.user.id);
    const {data}=await supabase.from('profiles').select('onboarding_version').eq('id',session.user.id).maybeSingle();
    if(Number(data?.onboarding_version||0)<ONBOARDING_VERSION)setIntro(true);
  })()},[supabase]);

  useEffect(()=>{
    if(!tour){if(target)target.classList.remove('qatalink-tour-target');setTarget(null);return}
    const current=steps[step];
    let tries=0;
    const locate=()=>{
      if(target)target.classList.remove('qatalink-tour-target');
      const el=findTarget(current.label);
      if(el){el.classList.add('qatalink-tour-target');el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});setTarget(el)}
      else if(tries++<10)setTimeout(locate,180);
    };
    const t=setTimeout(locate,120);
    return()=>{clearTimeout(t);if(target)target.classList.remove('qatalink-tour-target')}
  },[tour,step]);

  async function markDone(){
    if(!userId)return;
    await supabase.from('profiles').upsert({id:userId,onboarding_version:ONBOARDING_VERSION,onboarding_completed_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'id'});
  }
  function startTour(){setIntro(false);setStep(0);setTour(true)}
  async function finish(){if(target)target.classList.remove('qatalink-tour-target');setTour(false);await markDone()}
  async function skip(){await finish()}
  function next(){if(step>=steps.length-1){void finish();return}setStep(s=>s+1)}
  function prev(){setStep(s=>Math.max(0,s-1))}

  return <>
    {intro&&<div className="welcome-guide-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenue sur Qatalink">
      <section className="welcome-guide">
        <button className="welcome-guide-close" onClick={startTour} aria-label="Passer la vidéo"><X/></button>
        <div className="welcome-guide-copy"><span className="eyebrow">BIENVENUE SUR QATALINK</span><h2>Découvrez votre espace en quelques minutes</h2><p>La vidéo est facultative. Dans tous les cas, un tour guidé vous montrera ensuite les fonctions essentielles une seule fois.</p></div>
        <div className="welcome-guide-video"><video src={tutorialVideo} controls muted playsInline preload="metadata"/></div>
        <div className="welcome-guide-steps">
          <div><ImagePlus/><span><b>Créez</b><small>Image, texte ou création manuelle.</small></span></div>
          <div><BookOpen/><span><b>Modifiez</b><small>Articles, catégories, prix et médias.</small></span></div>
          <div><Palette/><span><b>Personnalisez</b><small>Identité, thèmes et Studio avancé.</small></span></div>
          <div><QrCode/><span><b>Partagez</b><small>Lien public et QR permanent.</small></span></div>
        </div>
        <div className="welcome-guide-actions"><button className="btn btn-ghost" onClick={startTour}>Passer la vidéo</button><button className="btn btn-primary" onClick={startTour}>Commencer le tour <ArrowRight size={16}/></button></div>
      </section>
    </div>}

    {tour&&<div className="qatalink-tour-layer" aria-live="polite">
      <section className="qatalink-tour-card">
        <div className="qatalink-tour-progress"><span>Guide Qatalink</span><b>{step+1}/{steps.length}</b></div>
        <h3>{steps[step].title}</h3><p>{steps[step].body}</p>
        <div className="qatalink-tour-hint">Repérez l’élément mis en évidence sur votre écran.</div>
        <div className="qatalink-tour-actions">
          <button className="qatalink-tour-skip" onClick={skip}>Ignorer le guide</button>
          <div>{step>0&&<button className="btn btn-ghost" onClick={prev}><ArrowLeft size={15}/>Précédent</button>}<button className="btn btn-primary" onClick={next}>{step===steps.length-1?<><Check size={15}/>Terminer</>:<>Suivant<ArrowRight size={15}/></>}</button></div>
        </div>
      </section>
    </div>}
  </>;
}
