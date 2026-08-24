'use client';

import {useEffect} from 'react';

function decorateForecast(){
  document.querySelectorAll<HTMLButtonElement>('.qforecast-runbar button').forEach(btn=>{
    if(btn.dataset.aiCreditDecorated==='1')return;
    const text=(btn.textContent||'').trim();
    if(!/Actualiser les prévisions|Calcul/.test(text))return;
    btn.dataset.aiCreditDecorated='1';
    btn.title='Chaque calcul de prévision Business utilise 15 crédits IA.';
    if(text.includes('Actualiser les prévisions'))btn.innerHTML=btn.innerHTML.replace('Actualiser les prévisions','Actualiser les prévisions · 15 crédits');
  });
  const lock=document.querySelector<HTMLElement>('.qforecast-lock');
  if(lock&&!lock.querySelector('[data-qforecast-credit-note]')){
    const p=document.createElement('p');p.dataset.qforecastCreditNote='1';p.textContent='Business uniquement · 15 crédits IA par calcul de prévision.';lock.appendChild(p);
  }
}

function normalizeCreditLabels(){
  document.querySelectorAll<HTMLElement>('body *').forEach(el=>{
    if(el.children.length)return;
    const value=(el.textContent||'').trim();
    if(value==='Crédits image')el.textContent='Crédits IA';
    if(value==='crédits image')el.textContent='crédits IA';
  });
}

export function AiCreditExperience(){
  useEffect(()=>{
    let timer:any;
    const apply=()=>{normalizeCreditLabels();decorateForecast()};
    apply();
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,60)});
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>{observer.disconnect();clearTimeout(timer)};
  },[]);
  return null;
}
