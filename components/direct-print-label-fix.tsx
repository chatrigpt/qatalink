'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export function DirectPrintLabelFix(){
  const pathname=usePathname();
  useEffect(()=>{
    if(pathname!=='/dashboard'&&!pathname.startsWith('/ops/'))return;
    const apply=()=>{
      document.querySelectorAll<HTMLButtonElement>('button').forEach(button=>{
        const text=(button.textContent||'').trim();
        if(text!=='Direct')return;
        const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
        let node:Node|null=walker.nextNode();
        while(node){if((node.textContent||'').trim()==='Direct'){node.textContent=(node.textContent||'').replace('Direct','Impression directe');break}node=walker.nextNode()}
      });
    };
    let timer:ReturnType<typeof setTimeout>|null=null;const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(apply,20)};
    apply();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    return()=>{if(timer)clearTimeout(timer);observer.disconnect()};
  },[pathname]);
  return null;
}
