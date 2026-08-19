'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

export function LegalFooterLinks(){
  const pathname=usePathname();
  const [target,setTarget]=useState<Element|null>(null);

  useEffect(()=>{
    if(pathname!=='/'){setTarget(null);return}
    const resolve=()=>setTarget(document.querySelector('.footer .container'));
    resolve();
    const observer=new MutationObserver(resolve);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[pathname]);

  if(!target)return null;
  return createPortal(<div className="site-legal-links"><Link href="/cgu">CGU</Link><Link href="/confidentialite">Confidentialité</Link><span>Édité par Digital ADN</span></div>,target);
}
