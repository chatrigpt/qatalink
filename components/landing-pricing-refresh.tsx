'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check} from 'lucide-react';

const plans=[
  {name:'Starter',price:'9 900',annual:'108 900',oldAnnual:'118 800',description:'Le catalogue interactif simple qui transforme la sélection du client en commande WhatsApp.',features:['1 catalogue/menu interactif','Sélection + quantités + panier','Commande envoyée directement sur WhatsApp','QR permanent','Prix, photos et catégories modifiables','50 crédits image inclus'],featured:false},
  {name:'Pro',price:'24 900',annual:'273 900',oldAnnual:'298 800',description:'Pour centraliser les commandes et donner à votre équipe un vrai espace de travail.',features:['Jusqu’à 5 catalogues/menus','Commandes enregistrées dans Qatalink','WhatsApp activable/désactivable par catalogue','Accès équipe et permissions','Fusion de commandes + addition unique','Tickets 58 mm + impression ESC/POS compatible','150 crédits image inclus'],featured:true},
  {name:'Business',price:'49 900',annual:'548 900',oldAnnual:'598 800',description:'Pour relier commandes, stock et exploitation quotidienne dans une même interface.',features:['Jusqu’à 15 catalogues/menus','Tout Pro','Gestion de stock','Liaisons plats/boissons → stock','Déduction automatique des stocks à la commande terminée','Alertes stock bas + historique','250 crédits image inclus'],featured:false},
];

function setIfDifferent(node:Element|null,value:string){if(node&&(node.textContent||'').trim()!==value)node.textContent=value}

export function LandingPricingRefresh(){
  const [target,setTarget]=useState<Element|null>(null);

  useEffect(()=>{
    if(location.pathname!=='/')return;
    let scheduled:ReturnType<typeof setTimeout>|null=null;
    const refresh=()=>{
      const pricing=document.querySelector('#pricing .pricing');
      setTarget(current=>current===pricing?current:pricing);
      pricing?.classList.add('q-pricing-host');
      const section=document.querySelector('#pricing');
      setIfDifferent(section?.querySelector('.section-head h2')||null,'Trois formules selon la façon dont vous voulez gérer vos commandes.');
      setIfDifferent(section?.querySelector('.section-head p')||null,'Tous les catalogues sont interactifs. Starter envoie la commande sur WhatsApp ; Pro la centralise dans Qatalink ; Business ajoute le stock automatique. Annuel : 1 mois offert.');
      document.querySelectorAll('#faq details').forEach(detail=>{
        const q=detail.querySelector('summary')?.textContent?.trim();const answer=detail.querySelector('p');if(!answer)return;
        if(q==='Comment fonctionnent les illustrations ?')setIfDifferent(answer,'Une illustration coûte 5 crédits. Starter inclut 50 crédits, Pro 150 et Business 250. Les abonnés peuvent ajouter des packs de crédits à tout moment.');
        if(q==='Comment fonctionne la commande WhatsApp ?')setIfDifferent(answer,'Tous les catalogues permettent de sélectionner plusieurs articles et quantités. Starter transmet la commande directement à WhatsApp. Pro et Business peuvent d’abord enregistrer la commande dans l’espace privé Qatalink puis proposer WhatsApp en complément, avec possibilité de désactiver WhatsApp par catalogue.');
      });
    };
    const schedule=()=>{if(scheduled)clearTimeout(scheduled);scheduled=setTimeout(refresh,30)};
    refresh();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});return()=>{if(scheduled)clearTimeout(scheduled);observer.disconnect()};
  },[]);

  if(!target)return null;
  return createPortal(<>{plans.map(plan=><article className={`price-card q-new-plan ${plan.featured?'featured':''}`} key={plan.name}>{plan.featured&&<span className="popular">RECOMMANDÉ POUR LA PLUPART</span>}<h3>{plan.name}</h3><div className="price">{plan.price} F<small>/ mois</small></div><div className="q-plan-annual"><b>{plan.annual} F / an</b><span><s>{plan.oldAnnual} F</s> · 1 mois offert</span></div><p>{plan.description}</p><div className="features">{plan.features.map(feature=><div className="feature" key={feature}><Check size={16}/>{feature}</div>)}</div><a className="btn btn-primary q-plan-cta" href="/create">Essayer {plan.name}</a></article>)}</>,target);
}
