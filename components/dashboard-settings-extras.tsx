'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {BarChart3,Lock,PackageCheck,ShieldCheck,TrendingUp} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function DashboardSettingsExtras(){
  const [settingsHost,setSettingsHost]=useState<Element|null>(null);const [forecastHost,setForecastHost]=useState<Element|null>(null);const [isAdmin,setIsAdmin]=useState(false);
  useEffect(()=>{const supabase=createSupabaseBrowserClient();supabase.auth.getSession().then(({data})=>setIsAdmin(data.session?.user?.email?.toLowerCase()==='kouameismael@gmail.com'));},[]);
  useEffect(()=>{
    if(location.pathname!='/dashboard')return;let timer:ReturnType<typeof setTimeout>|null=null;
    const resolve=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{
      const settingsTitle=Array.from(document.querySelectorAll('.dash-card h3')).find(x=>(x.textContent||'').trim()==='Identité de l’entreprise');setSettingsHost(settingsTitle?.closest('.dash-section')||null);
      setForecastHost(document.querySelector('.qforecast-lock'));
    },20)};
    resolve();const observer=new MutationObserver(resolve);observer.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>{if(timer)clearTimeout(timer);observer.disconnect()};
  },[]);
  return <>
    {settingsHost&&isAdmin&&createPortal(<section className="dash-card settings-admin-card"><h3>Administration</h3><p>Les outils d’administration sont réservés au compte administrateur et sont volontairement rangés derrière Paramètres.</p><a className="btn btn-ghost" href="/admin"><ShieldCheck size={16}/>Ouvrir l’administration</a></section>,settingsHost)}
    {forecastHost&&createPortal(<div className="qforecast-lock-preview"><div className="qforecast-lock-preview-grid"><article><TrendingUp/><b>Anticiper la demande</b><p>Prévisions à 7, 14 ou 30 jours à partir des ventes, de la saisonnalité et du contexte.</p></article><article><PackageCheck/><b>Préparer les achats</b><p>Transforme la demande prévue en besoins d’approvisionnement à partir du stock et des recettes.</p></article><article><BarChart3/><b>Comprendre les facteurs</b><p>Météo, promotions, habitudes locales et événements peuvent être pris en compte et expliqués.</p></article></div><div className="qforecast-locked-actions"><button disabled><Lock size={14}/>Actualiser les prévisions</button><button disabled><Lock size={14}/>Importer un historique</button><button disabled><Lock size={14}/>Scanner les facteurs externes</button></div><p><b>Business uniquement.</b> Passez à l’abonnement Business pour activer les calculs et enregistrer les recommandations.</p></div>,forecastHost)}
  </>;
}
