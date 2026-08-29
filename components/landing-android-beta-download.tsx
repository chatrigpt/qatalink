'use client';

import {Download,ShieldCheck,Smartphone} from 'lucide-react';
import {useEffect,useState} from 'react';

const APK_URL='/api/android-beta/download?src=landing';

export function LandingAndroidBetaDownload(){
  const [show,setShow]=useState(false);
  const [count,setCount]=useState<number|null>(null);
  useEffect(()=>{setShow(location.pathname==='/');fetch('/api/android-beta/stats',{cache:'no-store'}).then(r=>r.json()).then(d=>setCount(Number(d?.count||0))).catch(()=>{})},[]);
  if(!show)return null;
  return <section className="android-beta-download" aria-label="Application Android Qatalink bêta">
    <div className="android-beta-inner">
      <div className="android-beta-icon"><img src="/qatalink-icon.svg" alt="Icône Qatalink"/></div>
      <div className="android-beta-copy"><span>APPLICATION ANDROID · BÊTA</span><h2>Emportez votre caisse et vos commandes avec vous.</h2><p>Téléchargez l’APK bêta officiel Qatalink pour Android. Il est compilé automatiquement depuis le dépôt officiel Qatalink, sans installateur tiers. L’application utilise les mêmes comptes et espaces que le site.</p><div className="android-beta-points"><b><ShieldCheck/>APK officiel Qatalink</b><b><Smartphone/>Pensé pour Android</b><b><ShieldCheck/>Connexion sécurisée à qatalink.com</b>{count!==null&&<b><Download/>{new Intl.NumberFormat('fr-FR').format(count)} téléchargement{count>1?'s':''}</b>}</div><small>Android peut afficher un avertissement lors de l’installation parce que cette version bêta est distribuée directement, en dehors du Play Store. Vérifiez que le fichier téléchargé s’appelle bien « qatalink-android-beta.apk ».</small></div>
      <a className="android-beta-button" href={APK_URL}><Download/>Télécharger l’APK bêta{count!==null&&<small>{new Intl.NumberFormat('fr-FR').format(count)} déjà</small>}</a>
    </div>
    <style jsx>{`
      .android-beta-download{padding:28px 18px 44px;background:var(--bg);color:var(--text)}
      .android-beta-inner{width:min(1180px,100%);margin:auto;border:1px solid color-mix(in srgb,var(--red) 32%,var(--line));border-radius:28px;background:linear-gradient(135deg,color-mix(in srgb,var(--red) 8%,var(--surface)),var(--surface));padding:26px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:22px;align-items:center;box-shadow:0 20px 60px rgba(0,0,0,.08)}
      .android-beta-icon{width:74px;height:74px;border-radius:22px;background:#fff;display:grid;place-items:center;border:1px solid rgba(0,0,0,.08)}.android-beta-icon img{width:58px;height:58px}
      .android-beta-copy span{font-size:12px;font-weight:900;letter-spacing:.12em;color:var(--red)}.android-beta-copy h2{margin:5px 0 8px;font-size:clamp(1.45rem,3vw,2rem);letter-spacing:-.035em}.android-beta-copy p{margin:0;color:var(--muted);line-height:1.55;max-width:780px}.android-beta-copy small{display:block;margin-top:11px;color:var(--muted);line-height:1.45}.android-beta-points{display:flex;flex-wrap:wrap;gap:9px 16px;margin-top:13px}.android-beta-points b{display:flex;align-items:center;gap:6px;font-size:12px}.android-beta-points svg{width:15px;height:15px;color:var(--red)}
      .android-beta-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;background:var(--red);color:#fff;font-weight:900;border-radius:16px;padding:15px 18px;white-space:nowrap}.android-beta-button svg{width:18px}.android-beta-button small{font-size:10px;opacity:.8;font-weight:800}
      @media(max-width:820px){.android-beta-inner{grid-template-columns:auto 1fr}.android-beta-button{grid-column:1/-1;width:100%}}
      @media(max-width:520px){.android-beta-inner{grid-template-columns:1fr;padding:20px}.android-beta-icon{width:62px;height:62px}.android-beta-icon img{width:48px;height:48px}.android-beta-copy h2{font-size:1.45rem}}
    `}</style>
  </section>
}
