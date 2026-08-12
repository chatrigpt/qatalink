'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {ShieldCheck,Smartphone} from 'lucide-react';

export function MobileMoneyPaymentInfo(){
  const [host,setHost]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    let currentHost:HTMLElement|null=null;
    const resolve=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(title!=='Abonnement & crédits'){
        if(currentHost?.isConnected)currentHost.remove();
        currentHost=null;
        setHost(null);
        return;
      }
      const main=document.querySelector('.dash-v3-main');
      const section=main?.querySelector(':scope > .dash-section') as HTMLElement|null;
      if(!section)return;
      let node=section.querySelector(':scope > .mobile-money-portal-host') as HTMLElement|null;
      if(!node){
        node=document.createElement('div');
        node.className='mobile-money-portal-host';
        section.prepend(node);
      }
      currentHost=node;
      setHost(node);
    };

    resolve();
    const observer=new MutationObserver(resolve);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    const onClick=()=>setTimeout(resolve,20);
    document.addEventListener('click',onClick,true);
    window.addEventListener('popstate',resolve);

    return()=>{
      observer.disconnect();
      document.removeEventListener('click',onClick,true);
      window.removeEventListener('popstate',resolve);
      if(currentHost?.isConnected)currentHost.remove();
    };
  },[]);

  if(!host)return null;

  return createPortal(
    <section className="mobile-money-subscription-banner" aria-label="Paiement Mobile Money">
      <div className="mobile-money-subscription-icon"><Smartphone size={25}/></div>
      <div className="mobile-money-subscription-copy">
        <div className="mobile-money-subscription-title"><b>Paiement par Mobile Money</b><span><ShieldCheck size={14}/> Paiement sécurisé</span></div>
        <p>Tous les abonnements Qatalink — mensuels ou annuels — ainsi que les recharges de crédits se règlent par <strong>Mobile Money</strong>.</p>
        <div className="mobile-money-subscription-tags"><span>Abonnements mensuels</span><span>Abonnements annuels</span><span>Recharges de crédits</span></div>
      </div>
    </section>,
    host
  );
}
