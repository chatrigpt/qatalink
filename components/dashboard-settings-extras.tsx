'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {BarChart3,ImageOff,Lock,PackageCheck,ShieldCheck,TrendingUp} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function DashboardSettingsExtras(){
  const [settingsHost,setSettingsHost]=useState<Element|null>(null);const [forecastHost,setForecastHost]=useState<Element|null>(null);const [appearanceHost,setAppearanceHost]=useState<Element|null>(null);const [isAdmin,setIsAdmin]=useState(false);
  const [catalogId,setCatalogId]=useState('');const [showCover,setShowCover]=useState(true);const [coverBusy,setCoverBusy]=useState(false);const [coverNotice,setCoverNotice]=useState('');
  useEffect(()=>{const supabase=createSupabaseBrowserClient();supabase.auth.getSession().then(({data})=>setIsAdmin(data.session?.user?.email?.toLowerCase()==='kouameismael@gmail.com'));},[]);
  useEffect(()=>{
    if(location.pathname!='/dashboard')return;let timer:ReturnType<typeof setTimeout>|null=null;
    const resolve=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>{
      const settingsTitle=Array.from(document.querySelectorAll('.dash-card h3')).find(x=>(x.textContent||'').trim()==='Identité de l’entreprise');setSettingsHost(settingsTitle?.closest('.dash-section')||null);
      setForecastHost(document.querySelector('.qforecast-lock'));
      const appearanceTitle=Array.from(document.querySelectorAll('.dash-card h3')).find(x=>(x.textContent||'').trim()==='Typographie & identité');setAppearanceHost(appearanceTitle?.closest('.theme-v3-controls')||null);
      const nextCatalog=new URLSearchParams(location.search).get('catalog')||'';setCatalogId(x=>x===nextCatalog?x:nextCatalog);
    },20)};
    resolve();const observer=new MutationObserver(resolve);observer.observe(document.body,{childList:true,subtree:true,characterData:true});document.addEventListener('click',resolve,true);return()=>{if(timer)clearTimeout(timer);observer.disconnect();document.removeEventListener('click',resolve,true)};
  },[]);
  useEffect(()=>{if(!catalogId)return;const supabase=createSupabaseBrowserClient();supabase.from('catalog_theme_settings').select('show_cover').eq('catalog_id',catalogId).maybeSingle().then(({data})=>setShowCover(data?.show_cover!==false));},[catalogId]);
  async function saveCover(value:boolean){if(!catalogId)return;setCoverBusy(true);setCoverNotice('');const supabase=createSupabaseBrowserClient();const {error}=await supabase.from('catalog_theme_settings').upsert({catalog_id:catalogId,show_cover:value,updated_at:new Date().toISOString()},{onConflict:'catalog_id'});setCoverBusy(false);if(error){setCoverNotice(error.message);return}setShowCover(value);setCoverNotice('Bannière mise à jour pour ce catalogue uniquement.');}
  return <>
    {settingsHost&&isAdmin&&createPortal(<section className="dash-card settings-admin-card"><h3>Administration</h3><p>Les outils d’administration sont réservés au compte administrateur et sont volontairement rangés derrière Paramètres.</p><a className="btn btn-ghost" href="/admin"><ShieldCheck size={16}/>Ouvrir l’administration</a></section>,settingsHost)}
    {appearanceHost&&catalogId&&createPortal(<section className="dash-card catalog-header-visibility-card"><div className="dash-toolbar"><div><h3>En-tête de ce catalogue</h3><p>Le nom et le logo se règlent dans « Typographie & identité » juste au-dessus. Ces options sont déjà propres au catalogue sélectionné. La bannière peut maintenant l’être aussi.</p></div><ImageOff size={20}/></div><label className="qpos-check"><input type="checkbox" checked={showCover} disabled={coverBusy} onChange={e=>void saveCover(e.target.checked)}/>Afficher la bannière générale de l’entreprise dans ce catalogue</label>{coverNotice&&<p className="qpos-notice">{coverNotice}</p>}</section>,appearanceHost)}
    {forecastHost&&createPortal(<div className="qforecast-lock-preview"><div className="qforecast-lock-preview-grid"><article><TrendingUp/><b>Anticiper la demande</b><p>Prévisions à 7, 14 ou 30 jours à partir des ventes, de la saisonnalité et du contexte.</p></article><article><PackageCheck/><b>Préparer les achats</b><p>Transforme la demande prévue en besoins d’approvisionnement à partir du stock et des recettes.</p></article><article><BarChart3/><b>Comprendre les facteurs</b><p>Météo, promotions, habitudes locales et événements peuvent être pris en compte et expliqués.</p></article></div><div className="qforecast-locked-actions"><button disabled><Lock size={14}/>Actualiser les prévisions</button><button disabled><Lock size={14}/>Importer un historique</button><button disabled><Lock size={14}/>Scanner les facteurs externes</button></div><p><b>Business uniquement.</b> Passez à l’abonnement Business pour activer les calculs et enregistrer les recommandations.</p></div>,forecastHost)}
  </>;
}
