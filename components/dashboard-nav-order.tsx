'use client';

import {useEffect} from 'react';

const ORDER=[
  'Vue d’ensemble',
  'Catalogues',
  'Articles',
  'Stock',
  'Prévisions',
  'Studio avancé',
  'Vitrine & médias',
  'Parcours client',
  'Apparence',
  'QR & partage',
  'Statistiques',
  'Abonnement',
  'Administration',
];

function clean(value:string){return value.replace(/\s+/g,' ').trim()}
function labelOf(node:Element){
  const button=node.matches('button')?node:node.querySelector('button');
  return clean(button?.textContent||node.textContent||'');
}

function reorder(container:Element|null){
  if(!container)return;

  Array.from(container.children).forEach(child=>{
    const label=labelOf(child);
    if(label==='Paramètre'||label==='Paramètres')child.remove();
  });

  const children=Array.from(container.children);
  const rank=(node:Element)=>{
    const label=labelOf(node);
    const exact=ORDER.indexOf(label);
    if(exact>=0)return exact;
    if(label.startsWith('Vue d’ensemble'))return 0;
    if(label.startsWith('Catalogues'))return 1;
    if(label.startsWith('Articles'))return 2;
    if(label.startsWith('Stock'))return 3;
    if(label.startsWith('Prévisions'))return 4;
    if(label.startsWith('Studio avancé'))return 5;
    if(label.startsWith('Vitrine & médias'))return 6;
    if(label.startsWith('Parcours client'))return 7;
    if(label.startsWith('Apparence'))return 8;
    if(label.startsWith('QR & partage'))return 9;
    if(label.startsWith('Statistiques'))return 10;
    if(label.startsWith('Abonnement'))return 11;
    if(label.startsWith('Administration'))return 12;
    return 50;
  };
  const sorted=[...children].sort((a,b)=>rank(a)-rank(b));
  const changed=sorted.some((node,index)=>node!==children[index]);
  if(!changed)return;
  const fragment=document.createDocumentFragment();
  sorted.forEach(node=>fragment.appendChild(node));
  container.appendChild(fragment);
}

export function DashboardNavOrder(){
  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let scheduled:ReturnType<typeof setTimeout>|null=null;
    const apply=()=>{
      reorder(document.querySelector('.dash-v3-nav'));
      reorder(document.querySelector('.dash-v3-mobile-tabs'));
    };
    const schedule=()=>{
      if(scheduled)clearTimeout(scheduled);
      scheduled=setTimeout(apply,30);
    };
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
