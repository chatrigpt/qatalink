'use client';

import {useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Check,Clock3,PackageCheck,Printer,QrCode,Sparkles,X} from 'lucide-react';

const WHATSAPP='2250779019255';
const OPTIONS=[
  ['menu','Création complète de mon menu / catalogue digital'],
  ['images','Génération d’images professionnelles pour mes produits / plats'],
  ['descriptions','Descriptions appétissantes et commerciales'],
  ['qr','QR code prêt à utiliser'],
  ['cards','Cartes / chevalets QR physiques à scanner'],
  ['orders','Configuration des commandes et de la caisse Qatalink'],
  ['printer','Imprimante thermique compatible ESC/POS'],
  ['whatsapp','Configuration de WhatsApp pour les commandes'],
  ['hub','Page centrale avec menus, réseaux sociaux, site, Google Maps et lien d’avis'],
  ['stock','Configuration du stock et des déductions automatiques'],
  ['team','Accès caisse / cuisine / gérant avec permissions'],
  ['training','Installation, tests et prise en main de l’équipe'],
] as const;

type Key=typeof OPTIONS[number][0];

function ConfiguratorModal({open,onClose,source}:{open:boolean;onClose:()=>void;source:string}){
  const [selected,setSelected]=useState<Key[]>(['menu','qr']);
  const [business,setBusiness]=useState('');
  const [city,setCity]=useState('Abidjan');
  const [note,setNote]=useState('');
  if(!open)return null;
  function toggle(key:Key){setSelected(current=>current.includes(key)?current.filter(value=>value!==key):[...current,key])}
  function send(){
    const chosen=OPTIONS.filter(([key])=>selected.includes(key)).map(([,label])=>`• ${label}`).join('\n');
    const message=`Bonjour Digital ADN, je souhaite bénéficier de la solution Qatalink clé-en-main.\n\nEntreprise / activité : ${business.trim()||'À préciser'}\nVille / zone : ${city.trim()||'À préciser'}\nSource : ${source}\n\nFonctionnalités qui m’intéressent :\n${chosen||'• Je souhaite être conseillé sur la configuration'}${note.trim()?`\n\nPrécisions : ${note.trim()}`:''}\n\nJe souhaite être recontacté(e) pour organiser la mise en place.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
  }
  return <div className="turnkey-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="turnkey-modal"><header><div><span className="eyebrow">SOLUTION QATALINK CLÉ-EN-MAIN</span><h2>Que voulez-vous que notre équipe prépare pour vous ?</h2><p>Cochez vos besoins. Nous préparons ensuite un message clair à envoyer directement à Digital ADN sur WhatsApp.</p></div><button onClick={onClose} aria-label="Fermer"><X/></button></header><div className="turnkey-fields"><label>Entreprise / activité<input value={business} onChange={e=>setBusiness(e.target.value)} placeholder="Ex : Restaurant La Terrasse"/></label><label>Ville / zone<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ex : Cocody, Abidjan"/></label></div><div className="turnkey-options">{OPTIONS.map(([key,label])=><button type="button" key={key} className={selected.includes(key)?'selected':''} onClick={()=>toggle(key)}><span className="turnkey-check">{selected.includes(key)&&<Check size={14}/>}</span><span>{label}</span></button>)}</div><label className="turnkey-note">Autre précision<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : 2 points de vente, imprimante déjà disponible, besoin de 10 cartes QR…"/></label><div className="turnkey-timing"><span><Clock3 size={16}/><b>Menu digital + QR :</b> objectif 24h après réception des éléments nécessaires.</span><span><PackageCheck size={16}/><b>Cartes QR / imprimante :</b> environ 3 jours ouvrables selon disponibilité et zone de livraison.</span></div><button className="turnkey-send" onClick={send}>Envoyer ma demande sur WhatsApp</button></section></div>
}

export function KeyInHandCallout({source='Landing principale'}:{source?:string}){
  const [open,setOpen]=useState(false);
  return <><section className="turnkey-callout"><div className="turnkey-callout-copy"><span className="eyebrow">VOUS PRÉFÉREZ QU’ON S’OCCUPE DE TOUT ?</span><h2>Vous n’avez pas le temps de paramétrer votre menu / catalogue vous-même ?</h2><p>Vous souhaitez recevoir votre QR prêt, vos cartes à scanner, votre espace de commandes configuré ou même une imprimante thermique compatible ? Digital ADN peut prendre en charge la mise en place complète.</p><div className="turnkey-questions"><span><Check/>Vous voulez votre menu digital + QR rapidement ?</span><span><Check/>Vous souhaitez des visuels et descriptions plus professionnels ?</span><span><Check/>Vous voulez les cartes QR ou l’imprimante directement livrées ?</span></div><button className="btn btn-primary turnkey-primary" onClick={()=>setOpen(true)}>Bénéficier d’une solution complète clé-en-main</button></div><div className="turnkey-stack"><div><QrCode/><b>QR & menu / catalogue</b><span>Préparés pour votre activité</span></div><div><Sparkles/><b>Contenu plus vendeur</b><span>Images et descriptions professionnelles</span></div><div><Printer/><b>Caisse & impression</b><span>Configuration des tickets et matériel compatible</span></div></div></section><ConfiguratorModal open={open} onClose={()=>setOpen(false)} source={source}/></>
}

export function DashboardKeyInHandPrompt(){
  const pathname=usePathname();
  const [visible,setVisible]=useState(false);const [open,setOpen]=useState(false);
  const storageKey=useMemo(()=>`qatalink_turnkey_prompt_${new Date().toISOString().slice(0,10)}`,[]);
  useEffect(()=>{
    if(pathname!=='/dashboard')return;
    try{if(sessionStorage.getItem(storageKey)==='dismissed')return}catch{}
    const timer=setTimeout(()=>setVisible(true),2200);return()=>clearTimeout(timer);
  },[pathname,storageKey]);
  if(pathname!=='/dashboard')return null;
  function dismiss(){setVisible(false);try{sessionStorage.setItem(storageKey,'dismissed')}catch{}}
  return <>{visible&&<aside className="turnkey-dashboard-prompt"><button className="turnkey-dashboard-close" onClick={dismiss} aria-label="Fermer"><X size={16}/></button><span className="eyebrow">OPTION CLÉ-EN-MAIN</span><h3>Pas le temps de tout paramétrer ?</h3><p>Digital ADN peut préparer votre menu/catalogue, QR, cartes à scanner, commandes et imprimante thermique pour vous.</p><button onClick={()=>{setOpen(true);setVisible(false)}}>Voir la solution clé-en-main</button></aside>}<ConfiguratorModal open={open} onClose={()=>setOpen(false)} source="Dashboard Qatalink"/></>
}
