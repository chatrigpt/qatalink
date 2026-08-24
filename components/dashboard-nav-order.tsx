'use client';

import {useEffect} from 'react';

const ORDER=[
  'Vue d’ensemble',
  'Articles',
  'Stock',
  'Prévisions',
  'Point de vente',
  'Catalogues',
  'Studio avancé',
  'Vitrine & médias',
  'Parcours client',
  'Apparence',
  'QR & partage',
  'Statistiques',
  'Abonnement',
  'Paramètres',
  'Administration',
];

function clean(value:string){return value.replace(/BETA/ig,'').replace(/\s+/g,' ').trim()}
function labelOf(node:Element){const button=node.matches('button')?node:node.querySelector('button');return clean(button?.textContent||node.textContent||'')}
function rankLabel(label:string){const exact=ORDER.indexOf(label);if(exact>=0)return exact;const lowered=label.toLowerCase();const found=ORDER.findIndex(x=>lowered.startsWith(x.toLowerCase()));return found>=0?found:50}

function reorder(container:Element|null){
  if(!container)return;
  const children=Array.from(container.children);
  for(const node of children){const label=labelOf(node);if(label.toLowerCase().startsWith('administration'))(node as HTMLElement).style.display='none';else (node as HTMLElement).style.removeProperty('display')}
  const sorted=[...children].sort((a,b)=>rankLabel(labelOf(a))-rankLabel(labelOf(b)));
  const changed=sorted.some((node,index)=>node!==children[index]);
  if(!changed)return;
  const fragment=document.createDocumentFragment();sorted.forEach(node=>fragment.appendChild(node));container.appendChild(fragment);
}

export function DashboardNavOrder(){
  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let scheduled:ReturnType<typeof setTimeout>|null=null;
    const apply=()=>{reorder(document.querySelector('.dash-v3-nav'));reorder(document.querySelector('.dash-v3-mobile-tabs'))};
    const schedule=()=>{if(scheduled)clearTimeout(scheduled);scheduled=setTimeout(apply,30)};
    apply();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});window.addEventListener('popstate',schedule);document.addEventListener('click',schedule,true);
    return()=>{if(scheduled)clearTimeout(scheduled);observer.disconnect();window.removeEventListener('popstate',schedule);document.removeEventListener('click',schedule,true)};
  },[]);
  return null;
}
