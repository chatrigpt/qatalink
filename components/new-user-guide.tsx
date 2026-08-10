'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,BookOpen,ImagePlus,Palette,QrCode,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const tutorialVideo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/qatalink-comment-%C3%A7a-marche.mp4';

export function NewUserGuide(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);
  const [key,setKey]=useState('');

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session)return;
    const created=new Date(session.user.created_at).getTime();
    const age=Date.now()-created;
    const storageKey=`qatalink_welcome_seen_${session.user.id}`;
    setKey(storageKey);
    if(age<=48*60*60*1000&&!localStorage.getItem(storageKey))setOpen(true);
  })()},[supabase]);

  function close(){if(key)localStorage.setItem(key,'1');setOpen(false)}
  if(!open)return null;

  return <div className="welcome-guide-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenue sur Qatalink">
    <section className="welcome-guide">
      <button className="welcome-guide-close" onClick={close} aria-label="Fermer"><X/></button>
      <div className="welcome-guide-copy"><span className="eyebrow">BIENVENUE SUR QATALINK</span><h2>Votre premier catalogue en quelques minutes</h2><p>Voici le parcours le plus simple pour démarrer sans vous perdre dans les réglages.</p></div>
      <div className="welcome-guide-video"><video src={tutorialVideo} controls muted playsInline preload="metadata"/></div>
      <div className="welcome-guide-steps">
        <div><ImagePlus/><span><b>1. Créez</b><small>Importez une image, un texte ou partez de zéro.</small></span></div>
        <div><BookOpen/><span><b>2. Vérifiez</b><small>Corrigez les catégories, articles, prix et descriptions.</small></span></div>
        <div><Palette/><span><b>3. Personnalisez</b><small>Ajoutez votre identité, vos couleurs, vos images et votre disposition.</small></span></div>
        <div><QrCode/><span><b>4. Partagez</b><small>Utilisez votre lien public ou votre QR permanent.</small></span></div>
      </div>
      <div className="welcome-guide-actions"><button className="btn btn-ghost" onClick={close}>Je regarderai plus tard</button><button className="btn btn-primary" onClick={()=>{close();window.location.href='/create'}}>Créer mon catalogue <ArrowRight size={16}/></button></div>
    </section>
  </div>;
}
