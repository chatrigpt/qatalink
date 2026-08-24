'use client';

import {useEffect} from 'react';

export function ForecastCopyRefinement(){
  useEffect(()=>{
    if(location.pathname!=='/dashboard')return;let timer:any;
    const apply=()=>{
      const head=document.querySelector<HTMLElement>('.qforecast-head p');
      if(head)head.textContent='Anticipez la demande, les ruptures, les surplus et les besoins d’achat pour limiter les pertes et le gaspillage, à partir de vos ventes, du contexte local, de la météo et de facteurs externes qualifiés.';
      const lock=document.querySelector<HTMLElement>('.qforecast-lock p');
      if(lock)lock.textContent='Business anticipe la demande pour éviter les ruptures mais aussi les surplus, pertes et gaspillage, puis recommande les quantités à préparer ou réapprovisionner.';
      document.querySelectorAll<HTMLElement>('.qforecast-kpis article span').forEach(el=>{if(el.textContent?.trim()==='Risques de rupture')el.textContent='Risques stock'});
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};apply();const o=new MutationObserver(schedule);o.observe(document.body,{childList:true,subtree:true});return()=>{clearTimeout(timer);o.disconnect()};
  },[]);return null;
}
