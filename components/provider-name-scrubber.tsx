'use client';

import { useEffect } from 'react';

const replacements:[RegExp,string][]=[
  [/Recharger avec Maketou/gi,'Recharger maintenant'],
  [/avec Maketou/gi,'par paiement sécurisé'],
  [/Maketou n’a pas renvoyé de lien de paiement\./gi,'Le service de paiement n’a pas renvoyé de lien.'],
  [/Les scans QR sont enregistrés dans Supabase au passage par \/q\/ avant la redirection\./gi,'Les scans QR sont enregistrés automatiquement avant l’ouverture du catalogue.'],
  [/Supabase/gi,'Qatalink'],
  [/Maketou/gi,'paiement sécurisé'],
  [/Vercel/gi,'Qatalink'],
];

function cleanText(value:string){
  let next=value;
  for(const [pattern,replacement] of replacements)next=next.replace(pattern,replacement);
  return next;
}

function scrub(root:Node){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];
  let node:Node|null;
  while((node=walker.nextNode()))nodes.push(node as Text);
  for(const textNode of nodes){
    const current=textNode.nodeValue||'';
    const next=cleanText(current);
    if(next!==current)textNode.nodeValue=next;
  }
  if(root instanceof HTMLElement){
    for(const attr of ['title','aria-label','placeholder']){
      const current=root.getAttribute(attr);
      if(current){const next=cleanText(current);if(next!==current)root.setAttribute(attr,next)}
    }
  }
}

export function ProviderNameScrubber(){
  useEffect(()=>{
    scrub(document.body);
    const observer=new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const added of Array.from(mutation.addedNodes))scrub(added);
        if(mutation.type==='characterData'&&mutation.target.parentNode)scrub(mutation.target.parentNode);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
