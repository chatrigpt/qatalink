'use client';

import {useEffect} from 'react';

const DEFAULTS:Record<string,string>={dine_in:'Sur place',takeaway:'À emporter',pickup:'Retrait sur place',delivery:'Livraison',availability:'Vérifier la disponibilité',reservation:'Réserver',visit:'Demander une visite',deposit:'Réserver avec acompte',appointment:'Prendre rendez-vous',information:'Demander des informations',contact:'Contacter l’entreprise'};

export function PublicFlowCustomizer({settings}:{settings:any}){
  useEffect(()=>{
    const modes=Array.isArray(settings?.modes)?settings.modes:[];
    const labels=settings?.mode_labels||{};
    const apply=()=>{
      const buttons=[...document.querySelectorAll<HTMLButtonElement>('.public-v2-flow-modes button')];
      buttons.forEach((button,index)=>{const id=modes[index];if(!id)return;const next=String(labels[id]||DEFAULTS[id]||id);if(button.textContent!==next)button.textContent=next});
      const activeIndex=buttons.findIndex(b=>b.classList.contains('active'));
      const activeId=modes[Math.max(0,activeIndex)];
      const custom=activeId?String(labels[activeId]||DEFAULTS[activeId]||activeId):'';
      const base=activeId?DEFAULTS[activeId]||activeId:'';
      if(custom&&base&&custom!==base){
        document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"],a[href*="api.whatsapp.com"]').forEach(a=>{
          try{const u=new URL(a.href);const text=u.searchParams.get('text');if(text&&text.includes(`Option : ${base}`)){u.searchParams.set('text',text.replace(`Option : ${base}`,`Option : ${custom}`));const next=u.toString();if(a.href!==next)a.href=next}}catch{}
        });
      }
    };
    apply();const mo=new MutationObserver(apply);mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','href']});return()=>mo.disconnect();
  },[settings]);
  return null;
}
