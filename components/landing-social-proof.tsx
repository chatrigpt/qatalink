'use client';
import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Quote,Users} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const feedback=[
  'Je peux modifier mes prix et mes produits sans refaire mon QR à chaque changement.',
  'Les commandes arrivent de façon beaucoup plus claire, je perds moins de temps à relire les messages.',
  'Je vois enfin ce qui reste en stock et ce qui doit être réapprovisionné avant de manquer.',
  'Mon équipe peut suivre les commandes sans que tout repose sur une seule personne.',
  'Le catalogue donne une image plus professionnelle de mon activité dès le premier scan.',
  'Je peux regrouper menu, WhatsApp, réseaux et localisation dans un seul point d’entrée.'
];

export function LandingSocialProof(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [count,setCount]=useState<number|null>(null);
  useEffect(()=>{
    if(location.pathname!=='/')return;
    let mount=document.getElementById('qatalink-social-proof-mount') as HTMLElement|null;
    const place=()=>{
      const pricing=document.getElementById('pricing');
      if(!pricing)return;
      if(!mount){mount=document.createElement('div');mount.id='qatalink-social-proof-mount';pricing.parentElement?.insertBefore(mount,pricing)}
      setHost(mount);
    };
    place();const timer=setInterval(place,600);
    void supabase.rpc('public_registered_user_count').then(({data})=>{const n=Number(data||0);if(Number.isFinite(n))setCount(n)});
    return()=>{clearInterval(timer);mount?.remove()};
  },[supabase]);
  if(!host)return null;
  const rows=[...feedback,...feedback];
  return createPortal(<section className="q-social-proof"><div className="container q-social-inner"><div className="q-social-head"><div><div className="eyebrow">RETours D’USAGE</div><h2>Moins de dispersion. Plus de contrôle sur l’activité.</h2><p>Des situations concrètes que Qatalink est conçu pour simplifier au quotidien.</p></div><div className="q-social-count"><Users size={20}/><div><strong>{count===null?'—':new Intl.NumberFormat('fr-FR').format(count)}</strong><span>utilisateurs inscrits sur Qatalink</span></div></div></div><div className="q-feedback-window"><div className="q-feedback-track">{rows.map((text,i)=><article key={`${i}-${text}`}><Quote size={18}/><p>« {text} »</p></article>)}</div></div><small className="q-feedback-disclaimer">Illustrations de retours types basées sur les usages et fonctionnalités du produit ; elles ne sont pas présentées comme des témoignages nominatifs vérifiés.</small></div><style jsx>{`.q-social-proof{padding:72px 0;background:linear-gradient(180deg,#fff 0%,#fff7f8 100%);overflow:hidden}.q-social-inner{display:grid;gap:28px}.q-social-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end}.q-social-head h2{font-size:clamp(30px,4vw,48px);line-height:1.03;margin:8px 0 10px;max-width:760px}.q-social-head p{margin:0;color:#6f6870;max-width:680px}.q-social-count{display:flex;gap:12px;align-items:center;border:1px solid rgba(181,18,43,.18);background:#fff;padding:15px 18px;border-radius:18px;box-shadow:0 12px 35px rgba(71,20,30,.07)}.q-social-count>div{display:grid}.q-social-count strong{font-size:26px;line-height:1}.q-social-count span{font-size:12px;color:#706a70;margin-top:5px}.q-feedback-window{overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)}.q-feedback-track{display:flex;gap:14px;width:max-content;animation:qFeedbackMove 52s linear infinite}.q-feedback-track article{width:min(360px,82vw);min-height:150px;background:#fff;border:1px solid #eee2e5;border-radius:20px;padding:20px;box-shadow:0 12px 28px rgba(44,18,24,.06);display:grid;align-content:start;gap:10px}.q-feedback-track article p{margin:0;font-size:15px;line-height:1.55;color:#282326}.q-feedback-disclaimer{color:#8a8388;line-height:1.45}@keyframes qFeedbackMove{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 7px))}}@media(max-width:760px){.q-social-proof{padding:52px 0}.q-social-head{grid-template-columns:1fr;align-items:start}.q-social-count{width:100%;box-sizing:border-box}.q-feedback-track{animation-duration:44s}.q-feedback-track article{width:78vw;min-height:140px}}@media(prefers-reduced-motion:reduce){.q-feedback-track{animation:none}}`}</style></section>,host);
}
