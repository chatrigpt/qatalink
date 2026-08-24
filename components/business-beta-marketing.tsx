'use client';

import {useEffect} from 'react';

const SECTION=`<section class="business-beta-section" data-business-beta-section="1"><div class="container"><div class="business-beta-head"><div><span class="business-beta-eyebrow">BUSINESS <b>BETA</b></span><h2>Anticipez la demande avant les ruptures, les pertes et le gaspillage.</h2><p>Qatalink Business relie ventes, stock et contexte réel pour vous aider à préparer les bonnes quantités : suffisamment pour servir la demande, sans acheter ou produire inutilement trop. Puis il accompagne aussi vos livraisons jusqu’au client.</p></div></div><div class="business-beta-grid"><article><span class="business-beta-icon">↗</span><div><h3>Prévisions de demande <em>BETA</em></h3><p>Historique Qatalink, imports texte/OCR, saisonnalité, météo locale et actions commerciales alimentent une prévision à 7, 14 ou 30 jours.</p></div></article><article><span class="business-beta-icon">▦</span><div><h3>Moins de ruptures, moins de surplus</h3><p>Qatalink transforme les ventes prévues en besoins de stock, tient compte de votre couverture de sécurité et aide à éviter à la fois les ruptures, les achats excessifs, les pertes et le gaspillage.</p></div></article><article><span class="business-beta-icon">⌖</span><div><h3>Suivi GPS des livraisons</h3><p>Pour une commande en livraison, le client suit les étapes puis voit la position du livreur en temps réel lorsqu’il est en route.</p></div></article></div></div></section>`;

function injectSection(){
  if(document.querySelector('[data-business-beta-section]'))return;
  const path=location.pathname;if(path!=='/'&&path!=='/cle-en-main')return;
  const anchor=path==='/'?document.querySelector('#pricing'):document.querySelector('footer, .footer');
  if(!anchor)return;anchor.insertAdjacentHTML('beforebegin',SECTION);
}

function enhancePricing(){
  if(location.pathname!=='/')return;
  const cards=Array.from(document.querySelectorAll<HTMLElement>('.price-card'));
  const card=cards.find(c=>/Business/i.test(c.textContent||''));if(!card)return;
  const features=card.querySelector<HTMLElement>('.features');if(!features)return;
  const add=(key:string,html:string)=>{if(features.querySelector(`[data-business-feature="${key}"]`))return;const div=document.createElement('div');div.className='feature business-premium-feature';div.dataset.businessFeature=key;div.innerHTML=html;features.appendChild(div)};
  add('forecast','<span>✓</span><span><b>Prévisions & réapprovisionnement</b> <em>BETA</em><small>Anticipez la demande pour limiter ruptures, surplus, pertes et gaspillage.</small></span>');
  add('delivery','<span>✓</span><span><b>Suivi GPS des livraisons</b><small>Étapes de commande + position du livreur en direct.</small></span>');
}

export function BusinessBetaMarketing(){
  useEffect(()=>{
    if(location.pathname!=='/'&&location.pathname!=='/cle-en-main')return;let timer:any;
    const apply=()=>{injectSection();enhancePricing()};apply();const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,60)});observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();clearTimeout(timer)};
  },[]);
  return null;
}
