'use client';

import {useEffect} from 'react';

const NAV_SELECTOR=[
  'a[href]',
  '.dash-v3-nav button',
  '.dash-v3-mobile-tabs button',
  '.q-ops-bottom-nav button',
  '.q-ops-shortcuts button',
  '.ops-tabs button',
  '[data-nav]',
  '[data-route]'
].join(',');

const POPUP_SELECTOR=[
  'dialog[open]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '.q-sheet-backdrop',
  '.modal-backdrop',
  '.modal-overlay',
  '.drawer-overlay',
  '.bottom-sheet-backdrop',
  '.popup-overlay'
].join(',');

function isVisible(el:Element){
  const node=el as HTMLElement;
  const s=getComputedStyle(node);
  return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&node.getClientRects().length>0;
}

function closePopupElement(el:Element){
  if(el instanceof HTMLDialogElement){try{el.close();return}catch{}}
  const root=el as HTMLElement;
  const candidates=Array.from(root.querySelectorAll<HTMLButtonElement>(
    'button[aria-label*="fermer" i],button[aria-label*="close" i],button[title*="fermer" i],button[title*="close" i],button[data-close],button.close,.close-button,.modal-close,.sheet-close'
  ));
  const explicit=candidates.find(isVisible);
  if(explicit){explicit.click();return}
  const buttons=Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter(isVisible);
  const x=buttons.find(b=>['×','✕','✖','x'].includes((b.textContent||'').trim().toLowerCase()));
  if(x){x.click();return}
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
}

function closeVisiblePopups(){
  Array.from(document.querySelectorAll(POPUP_SELECTOR)).filter(isVisible).forEach(closePopupElement);
}

function syncInlineTools(){
  const qpos=document.querySelector<HTMLElement>('.qpos-backdrop');
  const dashMain=document.querySelector<HTMLElement>('.dash-v3-main');
  if(qpos&&dashMain){
    if(qpos.parentElement!==dashMain)dashMain.appendChild(qpos);
    document.body.classList.add('qpos-inline-active');
  }else{
    document.body.classList.remove('qpos-inline-active');
  }
}

function closeDashboardPos(){
  const qpos=document.querySelector<HTMLElement>('.qpos-backdrop');
  if(!qpos)return;
  const close=qpos.querySelector<HTMLButtonElement>('.qpos-modal>header button');
  close?.click();
  document.body.classList.remove('qpos-inline-active');
}

function closeOpsPos(){
  if(!document.body.classList.contains('ops-pos-active'))return;
  const close=document.querySelector<HTMLButtonElement>('.ops-pos-head-actions button[aria-label="Fermer"]');
  close?.click();
}

export function GlobalPopupNavigationCloser(){
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|null=null;
    const observer=new MutationObserver(()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(syncInlineTools,20);
    });
    observer.observe(document.body,{childList:true,subtree:true});
    syncInlineTools();

    const onClick=(event:MouseEvent)=>{
      const target=event.target as Element|null;if(!target)return;
      const nav=target.closest(NAV_SELECTOR);if(!nav)return;

      // Point de vente du dashboard est désormais une vue normale. Toute autre navigation
      // la quitte automatiquement, sans imposer un bouton Fermer à l'utilisateur.
      if(document.body.classList.contains('qpos-inline-active')&&!target.closest('.qpos-modal')&&!target.closest('.qpos-nav')){
        closeDashboardPos();
      }

      // Prise de commande dans /ops suit exactement la logique des autres onglets.
      // Cliquer Commandes ou Catalogue désactive immédiatement la caisse.
      if(document.body.classList.contains('ops-pos-active')){
        const opsTab=target.closest('.ops-tabs button');
        if(opsTab&&!opsTab.classList.contains('ops-pos-tab'))closeOpsPos();
      }

      const insidePopup=target.closest(POPUP_SELECTOR);
      if(insidePopup&&nav.closest(POPUP_SELECTOR)===insidePopup)return;
      closeVisiblePopups();
    };
    document.addEventListener('click',onClick,true);

    const originalPush=history.pushState.bind(history);
    const originalReplace=history.replaceState.bind(history);
    history.pushState=((...args:Parameters<History['pushState']>)=>{closeDashboardPos();closeOpsPos();closeVisiblePopups();return originalPush(...args)}) as History['pushState'];
    history.replaceState=((...args:Parameters<History['replaceState']>)=>{closeDashboardPos();closeOpsPos();closeVisiblePopups();return originalReplace(...args)}) as History['replaceState'];
    const onPop=()=>{closeDashboardPos();closeOpsPos();closeVisiblePopups()};
    window.addEventListener('popstate',onPop);
    return()=>{
      observer.disconnect();if(timer)clearTimeout(timer);
      document.body.classList.remove('qpos-inline-active');
      document.removeEventListener('click',onClick,true);
      history.pushState=originalPush;
      history.replaceState=originalReplace;
      window.removeEventListener('popstate',onPop);
    };
  },[]);
  return null;
}
