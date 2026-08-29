'use client';

import {useEffect} from 'react';

const ORDER=[
  'Vue d’ensemble',
  'Catalogues',
  'Articles',
  'Apparence',
  'QR & partage',
  'Statistiques',
  'Point de vente',
  'Stock',
  'Prévisions',
  'Vitrine & médias',
  'Parcours client',
  'Studio avancé',
  'Abonnement',
  'Paramètres',
  'Administration',
];

function clean(value:string){return value.replace(/BETA/ig,'').replace(/\s+/g,' ').trim()}
function labelOf(node:Element){const button=node.matches('button')?node:node.querySelector('button');return clean(button?.textContent||node.textContent||'')}
function rankLabel(label:string){const exact=ORDER.indexOf(label);if(exact>=0)return exact;const lowered=label.toLowerCase();const found=ORDER.findIndex(x=>lowered.startsWith(x.toLowerCase()));return found>=0?found:50}

function applyOrder(container:Element|null){
  if(!container)return;
  for(const node of Array.from(container.children)){
    const label=labelOf(node);
    const el=node as HTMLElement;
    if(label.toLowerCase().startsWith('administration')){
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
      continue;
    }
    el.style.removeProperty('display');
    el.removeAttribute('aria-hidden');
    el.style.order=String(rankLabel(label));
  }
}

export function DashboardNavOrder(){
  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let scheduled:ReturnType<typeof setTimeout>|null=null;
    const apply=()=>{
      applyOrder(document.querySelector('.dash-v3-nav'));
      applyOrder(document.querySelector('.dash-v3-mobile-tabs'));
    };
    const schedule=()=>{if(scheduled)clearTimeout(scheduled);scheduled=setTimeout(apply,30)};
    apply();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('popstate',schedule);
    document.addEventListener('click',schedule,true);
    return()=>{
      if(scheduled)clearTimeout(scheduled);
      observer.disconnect();
      window.removeEventListener('popstate',schedule);
      document.removeEventListener('click',schedule,true);
    };
  },[]);
  return null;
}
