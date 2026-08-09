'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

type Props = {
  open: boolean;
  onClose?: () => void;
  title?: string;
};

type Plan = {
  id: 'basic' | 'interactive' | 'vitrine';
  name: string;
  price: string;
  description: string;
  features: string[];
  featured: boolean;
};

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '3 500 F',
    description: 'Catalogue ou menu responsive en consultation.',
    features: ['QR code permanent', 'Menu/catalogue modifiable', 'Thèmes au choix', 'Bouton WhatsApp général'],
    featured: false,
  },
  {
    id: 'interactive',
    name: 'Interactif',
    price: '5 000 F',
    description: 'La formule idéale pour recevoir des commandes détaillées.',
    features: ['Tout Basic', 'Sélection multi-articles', 'Quantités et catégories', 'Commande détaillée vers WhatsApp'],
    featured: true,
  },
  {
    id: 'vitrine',
    name: 'Vitrine',
    price: '7 500 F',
    description: 'Votre mini-site complet avec catalogue en premier bouton.',
    features: ['Tout Interactif', 'Page type Linktree', 'Réseaux sociaux', 'Adresse / Google Maps'],
    featured: false,
  },
];

export function PricingGate({ open, onClose, title = 'Choisissez votre formule pour commencer' }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  async function checkout(plan: 'basic' | 'interactive' | 'vitrine') {
    setLoading(plan);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const user = session.user;
      const fullName = String(user.user_metadata?.full_name || '').trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || 'Client';
      const lastName = parts.slice(1).join(' ') || 'Qatalink';

      const r = await fetch('/api/checkout/maketou', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, firstName, lastName }),
      });
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

  return (
    <div className="paywall-backdrop" role="dialog" aria-modal="true">
      <div className="paywall-modal">
        {onClose && <button className="paywall-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>}
        <div className="paywall-head">
          <div className="eyebrow">ABONNEMENT QATALINK</div>
          <h2>{title}</h2>
          <p>Votre compte reste gratuit. L’abonnement est nécessaire uniquement pour créer et publier vos menus ou catalogues.</p>
        </div>
        <div className="paywall-plans">
          {plans.map((plan) => (
            <article className={`price-card ${plan.featured ? 'featured' : ''}`} key={plan.id}>
              {plan.featured && <span className="popular">POPULAIRE</span>}
              <h3>{plan.name}</h3>
              <div className="price">{plan.price}<small>/mois</small></div>
              <p>{plan.description}</p>
              <div className="features">
                {plan.features.map((feature) => <div className="feature" key={feature}><Check size={16} />{feature}</div>)}
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading !== null} onClick={() => checkout(plan.id)}>
                {loading === plan.id ? 'Redirection…' : `Choisir ${plan.name}`}
              </button>
            </article>
          ))}
        </div>
        {error && <div className="error" style={{ textAlign: 'center', marginTop: 14 }}>{error}</div>}
      </div>
    </div>
  );
}
