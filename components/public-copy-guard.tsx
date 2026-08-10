'use client';

import {useEffect} from 'react';

const exactReplacements:[RegExp,string][]=[
  [/Analyse de l’image avec fal…/gi,'Analyse de l’image…'],
  [/Structuration du texte avec fal…/gi,'Structuration du texte…'],
  [/Fal n’a pas pu structurer le catalogue\.?/gi,'Impossible de structurer le catalogue.'],
  [/Upload Supabase\s*:\s*/gi,'Import impossible : '],
  [/Les visuels sont générés via PoYo puis rapatriés automatiquement dans Supabase\. Les prompts tiennent maintenant compte du contexte Côte d’Ivoire \/ Abidjan\./gi,'Les illustrations sont ajoutées automatiquement à votre catalogue et adaptées à votre activité.'],
  [/Les visuels générés sont sauvegardés dans votre stockage Qatalink\./gi,'Les illustrations restent disponibles dans votre catalogue.'],
  [/La date d’expiration est enregistrée côté serveur, pas seulement dans votre navigateur\./gi,'Votre essai reste valable pendant 24 h à compter de son activation.'],
  [/Les images générées sont sauvegardées dans le stockage Qatalink afin de ne pas dépendre d’un lien temporaire du fournisseur\./gi,'Les images générées restent disponibles dans votre catalogue.'],
  [/Les photos importées et les illustrations générées sont enregistrées dans le stockage associé à votre Qatalink\. Le lien public utilise ces fichiers persistants plutôt que les liens temporaires des fournisseurs de génération\./gi,'Les photos importées et les illustrations générées restent disponibles dans votre catalogue.'],
  [/L’installation Qatalink en PWA ou l’ajout à l’écran d’accueil est optionnel/gi,'L’ajout de Qatalink à l’écran d’accueil est optionnel'],
];

const termReplacements:[RegExp,string][]=[
  [/\bSupabase\b/gi,'Qatalink'],[/\bPoYo\b/gi,'Qatalink'],[/\bfal(?:\.ai)?\b/gi,'Qatalink'],[/\bOpenRouter\b/gi,'Qatalink'],[/\bGemini\b/gi,'Qatalink'],[/\bn8n\b/gi,'Qatalink'],[/\bMaketou\b/gi,'paiement'],[/\bwebhook\b/gi,'connexion'],[/\bendpoint\b/gi,'service'],[/\bbackend\b/gi,'système'],[/\bAPI\b/g,'service'],[/\bPWA\b/g,'application'],[/\breal_estate\b/g,'Immobilier'],[/\bspa_beauty\b/g,'Beauté & bien-être'],[/\bretail\b/g,'Boutique'],[/\blinkhub\b/gi,'Vitrine'],
];

const technicalLeak=/(supabase|poyo|fal\.ai|openrouter|gemini|n8n|maketou|api\.poyo|supabase\.co|service_role|publishable_key|webhook|endpoint|stack trace|postgres|sqlstate|jwt|bearer token|schema cache|row-level security|permission denied|duplicate key|violates unique|invalid input syntax|relation ["']|column ["']|pgrst\d+|sql error|database error|foreign key|constraint ["'])/i;
function cleanText(value:string){let out=value;for(const [rx,replacement] of exactReplacements)out=out.replace(rx,replacement);for(const [rx,replacement] of termReplacements)out=out.replace(rx,replacement);return technicalLeak.test(out)?'Une erreur est survenue. Réessayez.':out}
function cleanNode(node:Node){if(node.nodeType===Node.TEXT_NODE&&node.nodeValue){const next=cleanText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;return}if(node instanceof HTMLElement){for(const attr of ['title','aria-label','placeholder']){const value=node.getAttribute(attr);if(value){const next=cleanText(value);if(next!==value)node.setAttribute(attr,next)}}}node.childNodes.forEach(cleanNode)}
function applyHeroStyle(){const h1=document.querySelector('.hero h1');if(!h1||h1.querySelector('.hero-simple-word'))return;const walker=document.createTreeWalker(h1,NodeFilter.SHOW_TEXT);let node:Text|null=null;while((node=walker.nextNode() as Text|null)){const value=node.nodeValue||'';const idx=value.toLowerCase().indexOf('simple');if(idx>=0){const before=value.slice(0,idx),word=value.slice(idx,idx+6),after=value.slice(idx+6);const frag=document.createDocumentFragment();if(before)frag.append(before);const span=document.createElement('span');span.className='hero-simple-word';span.textContent=word;frag.append(span);if(after)frag.append(after);node.parentNode?.replaceChild(frag,node);break}}}
export function PublicCopyGuard(){useEffect(()=>{cleanNode(document.body);applyHeroStyle();const observer=new MutationObserver(mutations=>{for(const mutation of mutations){mutation.addedNodes.forEach(cleanNode);if(mutation.type==='characterData')cleanNode(mutation.target)}applyHeroStyle()});observer.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>observer.disconnect()},[]);return null}
