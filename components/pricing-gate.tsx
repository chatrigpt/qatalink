'use client';

import { Check, Clock3, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

type Props = {open:boolean;onClose?:()=>void;title?:string;trialExpiresAt?:string|null;trialActive?:boolean};
type Plan = {id:'basic'|'interactive'|'vitrine';name:string;monthlyPrice:number;annualPrice:number;description:string;features:string[];featured:boolean};
type Proof={views:number;scans:number;whatsapp:number}|null;

const plans:Plan[]=[
  {id:'basic',name:'Basic',monthlyPrice:3500,annualPrice:38500,description:'L’essentiel pour publier un catalogue clair et toujours à jour.',features:['QR code permanent','Menu/catalogue modifiable','Thèmes au choix','Bouton WhatsApp général','50 crédits image à chaque activation/renouvellement'],featured:false},
  {id:'interactive',name:'Interactif',monthlyPrice:5000,annualPrice:55000,description:'Pour transformer le catalogue en véritable outil de commande.',features:['Tout Basic','Sélection multi-articles','Quantités et catégories','Commande détaillée vers WhatsApp','150 crédits image à chaque activation/renouvellement','Studio avancé'],featured:false},
  {id:'vitrine',name:'Vitrine',monthlyPrice:7500,annualPrice:82500,description:'Votre présence digitale complète avec catalogue, liens et identité de marque.',features:['Tout Interactif','Page Vitrine personnalisée','Réseaux sociaux et liens externes','Adresse / Google Maps','250 crédits image à chaque activation/renouvellement','Catalogue en bouton principal'],featured:true},
];

function formatXof(value:number){return new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f/g,' ')+' F'}
function formatRemaining(ms:number){if(ms<=0)return'00 h 00 min 00 s';const total=Math.floor(ms/1000);const h=Math.floor(total/3600);const m=Math.floor((total%3600)/60);const s=total%60;return`${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')} min ${String(s).padStart(2,'0')} s`}

export function PricingGate({open,onClose,title='Choisissez votre formule pour continuer',trialExpiresAt=null,trialActive=false}:Props){
  const [loading,setLoading]=useState<string|null>(null);const [error,setError]=useState('');const [billingPeriod,setBillingPeriod]=useState<'monthly'|'annual'>('monthly');const [now,setNow]=useState(Date.now());
  const [forcedOpen,setForcedOpen]=useState(false);const [explicitIntentAt,setExplicitIntentAt]=useState(0);const [proof,setProof]=useState<Proof>(null);

  useEffect(()=>{
    const sync=()=>setForcedOpen(new URLSearchParams(window.location.search).get('paywall')==='1');
    sync();window.addEventListener('popstate',sync);window.addEventListener('qatalink:pricing-open',sync as EventListener);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('qatalink:pricing-open',sync as EventListener)};
  },[]);

  useEffect(()=>{
    const mark=(event:MouseEvent)=>{
      const el=(event.target as Element|null)?.closest('button,a');if(!el)return;
      const text=(el.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');
      if(/s[’']?abonner|voir les formules|payer mon abonnement|abonnement supérieur|choisir basic|choisir interactif|choisir vitrine/.test(text))setExplicitIntentAt(Date.now());
    };
    document.addEventListener('click',mark,true);return()=>document.removeEventListener('click',mark,true);
  },[]);

  const remaining=useMemo(()=>trialExpiresAt?Math.max(0,new Date(trialExpiresAt).getTime()-now):0,[trialExpiresAt,now]);
  const intentional=Date.now()-explicitIntentAt<1800;
  const visible=forcedOpen||(open&&(!trialActive||intentional));

  useEffect(()=>{if(!visible||!trialExpiresAt)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[visible,trialExpiresAt]);

  useEffect(()=>{
    if(!visible||!trialActive){setProof(null);return}
    let alive=true;(async()=>{
      const supabase=createSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session)return;
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);const businessId=businesses?.[0]?.id;if(!businessId)return;
      const {data:catalogs}=await supabase.from('catalogs').select('id').eq('business_id',businessId);const ids=(catalogs||[]).map((c:any)=>c.id);if(!ids.length)return;
      const [v,s,w]=await Promise.all([
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','catalog_view'),
        supabase.from('catalog_scan_events').select('*',{count:'exact',head:true}).in('catalog_id',ids),
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','whatsapp_click')
      ]);
      if(alive)setProof({views:v.count||0,scans:s.count||0,whatsapp:w.count||0});
    })();return()=>{alive=false}
  },[visible,trialActive]);

  if(!visible)return null;

  function close(){
    if(forcedOpen){const url=new URL(window.location.href);url.searchParams.delete('paywall');window.history.replaceState({},'',url.toString());setForcedOpen(false)}
    onClose?.();
  }

  async function checkout(plan:'basic'|'interactive'|'vitrine'){
    setLoading(plan);setError('');
    try{
      const supabase=createSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session){window.location.href='/login';return}
      const user=session.user;const fullName=String(user.user_metadata?.full_name||'').trim();const parts=fullName.split(/\s+/).filter(Boolean);const firstName=parts[0]||'Client';const lastName=parts.slice(1).join(' ')||'Qatalink';
      const r=await fetch('/api/checkout/maketou',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({plan,firstName,lastName,billingPeriod})});const data=await r.json();if(!r.ok)throw new Error('Impossible de lancer le paiement. Réessayez.');const redirectUrl=data.redirectUrl||data.redirectURL;const cartId=data.cart?.id||data.id;if(cartId)localStorage.setItem('qatalink_maketou_cart_id',cartId);if(!redirectUrl)throw new Error('Impossible d’ouvrir le paiement. Réessayez.');window.location.href=redirectUrl;
    }catch{setError('Le paiement n’a pas pu être lancé. Réessayez.');setLoading(null)}
  }

  const hasProof=!!proof&&(proof.views+proof.scans+proof.whatsapp)>0;
  const effectiveTitle=trialActive&&proof?.whatsapp? 'Votre catalogue génère déjà des contacts.' : trialActive&&hasProof? 'Votre catalogue est déjà utilisé.' : title;
  const recommendedId=trialActive&&proof?.whatsapp?'interactive':'vitrine';

  return <div className="paywall-backdrop" role="dialog" aria-modal="true"><div className="paywall-modal"><button className="paywall-close" onClick={close} aria-label="Fermer"><X size={20}/></button><div className="paywall-head"><div className="eyebrow">ABONNEMENT QATALINK</div><h2>{effectiveTitle}</h2>{trialActive&&trialExpiresAt?<><div className="trial-danger"><Clock3 size={20}/><div><b>Votre essai se termine dans</b><strong>{formatRemaining(remaining)}</strong></div></div>{hasProof&&<div className="paywall-proof"><div><b>{proof!.views}</b><span>visites pendant l’essai</span></div><div><b>{proof!.scans}</b><span>scans QR</span></div><div><b>{proof!.whatsapp}</b><span>ouvertures WhatsApp</span></div></div>}<p>{hasProof?'Vous avez déjà commencé à créer de la valeur avec Qatalink. Activez une formule pour conserver cette continuité après l’essai.':'Votre essai donne accès à toutes les fonctionnalités pendant 24 h. Testez, publiez et partagez d’abord votre catalogue ; choisissez une formule lorsque vous êtes prêt.'}</p></>:<p>Choisissez une formule pour conserver votre catalogue en ligne. Une illustration coûte 5 crédits.</p>}<div className="billing-toggle" role="tablist" aria-label="Période de facturation"><button className={billingPeriod==='monthly'?'active':''} onClick={()=>setBillingPeriod('monthly')}>Mensuel</button><button className={billingPeriod==='annual'?'active':''} onClick={()=>setBillingPeriod('annual')}>Annuel <span className="annual-badge">1 mois offert</span></button></div></div><div className="paywall-plans">{plans.map(plan=>{const amount=billingPeriod==='annual'?plan.annualPrice:plan.monthlyPrice;const featured=plan.id===recommendedId;return <article className={`price-card ${featured?'featured':''}`} key={plan.id}>{featured&&<span className="popular">{trialActive&&proof?.whatsapp&&plan.id==='interactive'?'ADAPTÉ À VOTRE USAGE':'RECOMMANDÉ'}</span>}{billingPeriod==='annual'&&<span className="annual-card-badge">1 MOIS OFFERT</span>}<h3>{plan.name}</h3><div className="price">{formatXof(amount)}<small>{billingPeriod==='annual'?'/ an':'/ mois'}</small></div>{billingPeriod==='annual'&&<div className="annual-equivalent"><s>{formatXof(plan.monthlyPrice*12)}</s> · vous économisez {formatXof(plan.monthlyPrice)}</div>}<p>{plan.description}</p><div className="features">{plan.features.map(feature=><div className="feature" key={feature}><Check size={16}/>{feature}</div>)}</div><button className="btn btn-primary" style={{width:'100%'}} disabled={loading!==null} onClick={()=>checkout(plan.id)}>{loading===plan.id?'Redirection…':`Choisir ${plan.name}`}</button></article>})}</div>{trialActive&&<button className="trial-continue" onClick={close}>Continuer mon essai sans interruption</button>}{error&&<div className="error" style={{textAlign:'center',marginTop:14}}>{error}</div>}</div></div>
}
