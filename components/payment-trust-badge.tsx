'use client';

import {ShieldCheck} from 'lucide-react';

const LIGHT_BADGE='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/mobile-money-badge.png';
const DARK_BADGE='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/mobile-money-dark-badge.jpg';

export function PaymentTrustBadge({compact=false}:{compact?:boolean}){
  return <div className={`payment-trust-badge${compact?' compact':''}`} aria-label="Moyens de paiement acceptés">
    <div className="payment-trust-copy">
      <span className="payment-trust-icon"><ShieldCheck size={19}/></span>
      <div><b>Paiement accepté depuis l’Afrique et partout dans le monde</b><span>Réglez votre abonnement ou vos crédits par Mobile Money ou carte bancaire.</span></div>
    </div>
    <div className="payment-trust-art" aria-hidden="true">
      <img className="payment-trust-image payment-trust-light" src={LIGHT_BADGE} alt="" loading="lazy" decoding="async"/>
      <img className="payment-trust-image payment-trust-dark" src={DARK_BADGE} alt="" loading="lazy" decoding="async"/>
    </div>
  </div>;
}
