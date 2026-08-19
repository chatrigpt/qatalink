'use client';

import {useEffect} from 'react';

function findCard(root:ParentNode,name:string){
  return Array.from(root.querySelectorAll<HTMLElement>('.price-card')).find(card=>(card.querySelector('h3')?.textContent||'').trim()===name)||null;
}

function ensureFeature(card:HTMLElement|null,text:string,className:string){
  if(!card||card.querySelector(`.${className}`))return;
  const features=card.querySelector<HTMLElement>('.features');
  if(!features)return;
  const row=document.createElement('div');
  row.className=`feature ${className}`;
  row.innerHTML=`<span aria-hidden="true" style="font-weight:900;color:#c7192f">✓</span>${text}`;
  const creditRow=Array.from(features.children).find(el=>(el.textContent||'').toLowerCase().includes('crédits'));
  if(creditRow)features.insertBefore(row,creditRow);else features.appendChild(row);
}

export function PlanCopyAlignment(){
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|null=null;
    const apply=()=>{
      if(location.pathname==='/'){
        const pricingCopy=document.querySelector<HTMLElement>('#pricing .section-head p');
        if(pricingCopy)pricingCopy.textContent='Tous les catalogues sont interactifs. Starter envoie la commande sur WhatsApp ; Pro centralise les commandes et ajoute une page centrale type Linktree pour regrouper jusqu’à 5 menus/catalogues ; Business étend cette organisation jusqu’à 15 catalogues et ajoute la gestion de stock.';
        ensureFeature(findCard(document,'Pro'),'Page centrale type Linktree pour regrouper jusqu’à 5 menus/catalogues','q-pro-hub-feature');
        document.querySelectorAll<HTMLDetailsElement>('#faq details').forEach(detail=>{
          const summary=detail.querySelector<HTMLElement>('summary');
          const answer=detail.querySelector<HTMLElement>('p');
          if((summary?.textContent||'').trim()==='À quoi sert la page centrale Business ?'){
            summary!.textContent='À quoi sert la page centrale ?';
            if(answer)answer.textContent='Avec Pro et Business, vous pouvez utiliser une page centrale de type Linktree comme porte d’entrée avant les catalogues. Le client choisit ensuite le menu ou catalogue qu’il veut ouvrir. Pro peut y regrouper jusqu’à 5 catalogues et Business jusqu’à 15, avec vos liens sociaux, WhatsApp, votre localisation et d’autres liens utiles.';
          }
        });
      }
      const modal=document.querySelector<HTMLElement>('.paywall-plans');
      if(modal)ensureFeature(findCard(modal,'Pro'),'Page centrale type Linktree pour regrouper jusqu’à 5 menus/catalogues','q-pro-hub-paywall-feature');
    };
    const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(apply,30)};
    apply();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{if(timer)clearTimeout(timer);observer.disconnect()};
  },[]);
  return null;
}
