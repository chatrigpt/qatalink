'use client';

import {useEffect} from 'react';

const STYLE=`
.q-identity-cta-refined{
  background:#d20f2f!important;
  color:#fff!important;
  border-color:#d20f2f!important;
  box-shadow:0 8px 22px rgba(210,15,47,.2)!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:9px!important;
  font-weight:800!important;
}
.q-identity-cta-refined:hover{background:#b80d29!important;border-color:#b80d29!important;color:#fff!important}
.q-identity-cta-refined .q-identity-chevron{display:inline-flex;align-items:center;justify-content:center;transition:transform .18s ease}
.q-identity-cta-refined[aria-expanded="true"] .q-identity-chevron{transform:rotate(180deg)}
.q-identity-cta-refined .q-identity-chevron svg{width:17px;height:17px;stroke:currentColor;stroke-width:2.4;fill:none}
`;

function normalize(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}

export function IdentityCtaRefinement(){
  useEffect(()=>{
    if(location.pathname!=='/dashboard')return;
    const style=document.createElement('style');style.id='qatalink-identity-cta-style';style.textContent=STYLE;document.head.appendChild(style);
    const refine=()=>{
      const nodes=Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="button"]'));
      for(const el of nodes){
        const label=normalize(el.textContent||'');
        if(!label.includes('ajouter mon identite'))continue;
        if(el.dataset.qatalinkIdentityRefined==='1')continue;
        el.dataset.qatalinkIdentityRefined='1';
        el.classList.add('q-identity-cta-refined');
        el.textContent='Ajouter mon logo et mes informations';
        const icon=document.createElement('span');icon.className='q-identity-chevron';icon.setAttribute('aria-hidden','true');
        icon.innerHTML='<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        el.appendChild(icon);
      }
    };
    refine();const observer=new MutationObserver(refine);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',refine,true);
    return()=>{observer.disconnect();document.removeEventListener('click',refine,true);style.remove()}
  },[]);
  return null;
}
