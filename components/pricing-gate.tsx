'use client';

import { Check, Clock3, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

type Props = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  trialExpiresAt?: string | null;
  trialActive?: boolean;
};

type Plan = {
  id: 'basic' | 'interactive' | 'vitrine';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  featured: boolean;
};

const plans: Plan[] = [
  {id:'basic',name:'Basic',monthlyPrice:3500,annualPrice:38500,description:'Catalogue ou menu responsive en consultation.',features:['QR code permanent','Menu/catalogue modifiable','Thèmes au choix','Bouton WhatsApp général'],featured:false},
  {id:'interactive',name:'Interactif',monthlyPrice:5000,annualPrice:55000,description:'La formule idéale pour recevoir des commandes détaillées.',features:['Tout Basic','Sélection multi-articles','Quantités et catégories','Commande détaillée vers WhatsApp'],featured:true},
  {id:'vitrine',name:'Vitrine',monthlyPrice:7500,annualPrice:82500,description:'Votre mini-site complet avec catalogue en premier bouton.',features:['Tout Interactif','Page type Linktree','Réseaux sociaux','Adresse / Google Maps'],featured:false},
];

function formatXof(value:number){return new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f/g,' ')+' F';}
function formatRemaining(ms:number){
  if(ms<=0)return '00 h 00 min 00 s';
  const total=Math.floor(ms/1000);
  const h=Math.floor(total/3600);
  const m=Math.floor((total%3600)/60);
  const s=total%60;
  return `${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')} min ${String(s).padStart(2,'0')} s`;
}

export function PricingGate({ open, onClose, title = 'Choisissez votre formule pour continuer', trialExpiresAt=null, trialActive=false }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [billingPeriod,setBillingPeriod]=useState<'monthly'|'annual'>('monthly');
  const [now,setNow]=useState(Date.now());

  useEffect(()=>{
    if(!open || !trialExpiresAt)return;
    setNow(Date.now());
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(timer);
  },[open,trialExpiresAt]);

  const remaining=useMemo(()=>trialExpiresAt?Math.max(0,new Date(trialExpiresAt).getTime()-now):0,[trialExpiresAt,now]);
  if (!open) return null;

  async function checkout(plan: 'basic' | 'interactive' | 'vitrine') {
    setLoading(plan);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const user = session.user;
      const fullName = String(user.user_metadata?.full_name || '').trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || 'Client';
      const lastName = parts.slice(1).join(' ') || 'Qatalink';
      const r = await fetch('/api/checkout/maketou', {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({ plan, firstName, lastName, billingPeriod })});
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || 'Impossible de lancer le paiement.');
      const redirectUrl = data.redirectUrl || data.redirectURL;
      const cartId = data.cart?.id || data.id;
      if (cartId) localStorage.setItem('qatalink_maketou_cart_id', cartId);
      if (!redirectUrl) throw new Error('Maketou n’a pas renvoyé de lien de paiement.');
      window.location.href = redirectUrl;
    } catch (e: any) {
      setError(e.message || 'Erreur de paiement.');
      setLoading(null);
    }
  }

  return <div className="paywall-backdrop" role="dialog" aria-modal="true"><div className="paywall-modal">
    {onClose && <button className="paywall-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>}
    <div className="paywall-head">
      <div className="eyebrow">ABONNEMENT QATALINK</div>
      <h2>{title}</h2>
      {trialActive && trialExpiresAt ? <>
        <div className="trial-danger"><Clock3 size={20}/><div><b>Votre catalogue sera mis hors ligne dans</b><strong>{formatRemaining(remaining)}</strong></div></div>
        <p>Votre essai donne accès à toutes les fonctionnalités pendant 24 h. Sans abonnement actif avant la fin du compteur, votre catalogue public deviendra indisponible jusqu’à l’activation d’une formule.</p>
      </> : <p>Choisissez une formule pour conserver votre catalogue en ligne et continuer à utiliser les fonctions Qatalink.</p>}
      <div className="billing-toggle" role="tablist" aria-label="Période de facturation">
        <button className={billingPeriod==='monthly'?'active':''} onClick={()=>setBillingPeriod('monthly')}>Mensuel</button>
        <button className={billingPeriod==='annual'?'active':''} onClick={()=>setBillingPeriod('annual')}>Annuel <span className="annual-badge">1 mois offert</span></button>
      </div>
    </div>
    <div className="paywall-plans">
      {plans.map((plan) => {
        const amount=billingPeriod==='annual'?plan.annualPrice:plan.monthlyPrice;
        return <article className={`price-card ${plan.featured ? 'featured' : ''}`} key={plan.id}>
          {plan.featured && <span className="popular">POPULAIRE</span>}
          {billingPeriod==='annual'&&<span className="annual-card-badge">1 MOIS OFFERT</span>}
          <h3>{plan.name}</h3>
          <div className="price">{formatXof(amount)}<small>{billingPeriod==='annual'?'/ an':'/ mois'}</small></div>
          {billingPeriod==='annual'&&<div className="annual-equivalent"><s>{formatXof(plan.monthlyPrice*12)}</s> · vous économisez {formatXof(plan.monthlyPrice)}</div>}
          <p>{plan.description}</p>
          <div className="features">{plan.features.map((feature) => <div className="feature" key={feature}><Check size={16} />{feature}</div>)}</div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading !== null} onClick={() => checkout(plan.id)}>{loading === plan.id ? 'Redirection…' : `Choisir ${plan.name}`}</button>
        </article>
      })}
    </div>
    {trialActive&&onClose&&<button className="trial-continue" onClick={onClose}>Continuer mon essai</button>}
    {error && <div className="error" style={{ textAlign: 'center', marginTop: 14 }}>{error}</div>}
  </div></div>;
}
