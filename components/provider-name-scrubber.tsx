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

function findAccessToken(value:unknown):string|null{
  if(!value||typeof value!=='object')return null;
  if('access_token' in value&&typeof (value as any).access_token==='string')return (value as any).access_token;
  for(const child of Object.values(value as Record<string,unknown>)){
    const token=findAccessToken(child);
    if(token)return token;
  }
  return null;
}

function currentStoredAccessToken(){
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!key.startsWith('sb-')||!key.endsWith('-auth-token'))continue;
      const raw=localStorage.getItem(key);
      if(!raw)continue;
      const token=findAccessToken(JSON.parse(raw));
      if(token)return token;
    }
  }catch{}
  return null;
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

    const originalFetch=window.fetch.bind(window);
    window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      const isOwnApi=url.startsWith('/api/')||url.startsWith(`${window.location.origin}/api/`);
      if(!isOwnApi)return originalFetch(input,init);
      const freshToken=currentStoredAccessToken();
      if(!freshToken)return originalFetch(input,init);
      const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
      if(headers.has('Authorization'))headers.set('Authorization',`Bearer ${freshToken}`);
      return originalFetch(input,{...init,headers});
    };

    return()=>{observer.disconnect();window.fetch=originalFetch};
  },[]);
  return null;
}
