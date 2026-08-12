'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {CreditCard,ShieldCheck} from 'lucide-react';
import {PaymentTrustBadge} from '@/components/payment-trust-badge';

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
    <section className="mobile-money-subscription-banner" aria-label="Moyens de paiement Qatalink">
      <div className="mobile-money-subscription-icon"><CreditCard size={25}/></div>
      <div className="mobile-money-subscription-copy">
        <div className="mobile-money-subscription-title"><b>Mobile Money ou carte bancaire</b><span><ShieldCheck size={14}/> Paiement sécurisé</span></div>
        <p>Payez votre abonnement Qatalink ou rechargez vos crédits depuis <strong>l’Afrique ou partout dans le monde</strong>, par Mobile Money ou carte bancaire.</p>
        <div className="mobile-money-subscription-tags"><span>Mobile Money</span><span>Carte bancaire</span><span>Abonnements & crédits</span></div>
        <PaymentTrustBadge compact/>
      </div>
    </section>,
    host
  );
}
