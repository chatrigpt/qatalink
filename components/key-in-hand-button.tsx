'use client';

import {useState} from 'react';
import {Check,Clock3,PackageCheck,X} from 'lucide-react';

const WHATSAPP='2250779019255';
const OPTIONS=[
  'Création complète de mon menu / catalogue digital',
  'Génération d’images professionnelles',
  'Descriptions appétissantes et commerciales',
  'QR code prêt à utiliser',
  'Cartes / chevalets QR physiques',
  'Configuration des commandes et de la caisse Qatalink',
  'Imprimante thermique compatible ESC/POS',
  'Configuration de WhatsApp',
  'Page centrale avec réseaux, site, Google Maps et lien d’avis',
  'Gestion du stock et déductions automatiques',
  'Accès caisse / cuisine / gérant',
  'Installation, tests et prise en main de l’équipe',
];

export function KeyInHandButton({source,label='Bénéficier d’une solution clé-en-main',className='btn btn-primary'}:{source:string;label?:string;className?:string}){
  const [open,setOpen]=useState(false);const [selected,setSelected]=useState<number[]>([0,3]);const [business,setBusiness]=useState('');const [city,setCity]=useState('Abidjan');const [note,setNote]=useState('');
  function toggle(index:number){setSelected(current=>current.includes(index)?current.filter(value=>value!==index):[...current,index])}
  function send(){const chosen=selected.map(index=>`• ${OPTIONS[index]}`).join('\n');const message=`Bonjour Digital ADN, je souhaite bénéficier de la solution Qatalink clé-en-main.\n\nEntreprise / activité : ${business.trim()||'À préciser'}\nVille / zone : ${city.trim()||'À préciser'}\nSource : ${source}\n\nFonctionnalités qui m’intéressent :\n${chosen||'• Je souhaite être conseillé sur la configuration'}${note.trim()?`\n\nPrécisions : ${note.trim()}`:''}\n\nJe souhaite être recontacté(e) pour organiser la mise en place.`;window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')}
  return <><button className={className} onClick={()=>setOpen(true)}>{label}</button>{open&&<div className="turnkey-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}><section className="turnkey-modal"><header><div><span className="eyebrow">SOLUTION QATALINK CLÉ-EN-MAIN</span><h2>Choisissez ce que vous voulez recevoir.</h2><p>Nous préremplissons votre demande puis vous l’envoyez à Digital ADN sur WhatsApp.</p></div><button onClick={()=>setOpen(false)}><X/></button></header><div className="turnkey-fields"><label>Entreprise / activité<input value={business} onChange={e=>setBusiness(e.target.value)} placeholder="Ex : Restaurant La Terrasse"/></label><label>Ville / zone<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ex : Cocody, Abidjan"/></label></div><div className="turnkey-options">{OPTIONS.map((option,index)=><button type="button" key={option} className={selected.includes(index)?'selected':''} onClick={()=>toggle(index)}><span className="turnkey-check">{selected.includes(index)&&<Check size={14}/>}</span><span>{option}</span></button>)}</div><label className="turnkey-note">Autre précision<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex : 2 points de vente, 10 cartes QR, imprimante déjà disponible…"/></label><div className="turnkey-timing"><span><Clock3 size={16}/><b>Menu digital + QR :</b> objectif 24h après réception des éléments.</span><span><PackageCheck size={16}/><b>Cartes QR / imprimante :</b> environ 3 jours ouvrables selon disponibilité et zone.</span></div><button className="turnkey-send" onClick={send}>Envoyer ma demande sur WhatsApp</button></section></div>}</>
}
