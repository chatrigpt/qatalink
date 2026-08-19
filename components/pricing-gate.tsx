'use client';

import { Check, Clock3, CreditCard, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { PaymentTrustBadge } from '@/components/payment-trust-badge';

type Props = {open:boolean;onClose?:()=>void;title?:string;trialExpiresAt?:string|null;trialActive?:boolean};
type Plan = {id:'starter'|'pro'|'business';name:string;monthlyPrice:number;annualPrice:number;description:string;features:string[];featured:boolean};
type Proof={views:number;scans:number;whatsapp:number}|null;
type TrialContext={isTrial:boolean;active:boolean;end:string|null;grace:boolean}|null;

const plans:Plan[]=[
  {id:'starter',name:'Starter',monthlyPrice:9900,annualPrice:108900,description:'Pour vendre simplement depuis un catalogue interactif et recevoir les commandes directement sur WhatsApp.',features:['1 catalogue/menu interactif','Sélection d’articles et quantités','Commande directe vers WhatsApp','QR permanent et personnalisable','Prix, photos et catégories modifiables','50 crédits image à chaque activation/renouvellement'],featured:false},
  {id:'pro',name:'Pro',monthlyPrice:24900,annualPrice:273900,description:'Pour centraliser les commandes, organiser l’équipe et imprimer les additions depuis Qatalink.',features:['Jusqu’à 5 catalogues/menus','Boîte de commandes privée Qatalink','WhatsApp activable ou désactivable par catalogue','Accès équipe avec permissions','Fusion de commandes et tickets 58 mm','Impression système + ESC/POS directe compatible','150 crédits image à chaque activation/renouvellement'],featured:true},
  {id:'business',name:'Business',monthlyPrice:49900,annualPrice:548900,description:'Pour les restaurants et entreprises qui veulent relier commandes, équipe et stock dans un même système.',features:['Jusqu’à 15 catalogues/menus','Tout Pro','Gestion de stock par ingrédient, bouteille ou produit','Liaisons plats/boissons → stock','Déduction automatique quand une commande est terminée','Alertes de stock bas et historique des mouvements','250 crédits image à chaque activation/renouvellement'],featured:false},
];

function formatXof(value:number){return new Intl.NumberFormat('fr-FR').format(value).replace(/\u202f/g,' ')+' F'}
function formatRemaining(ms:number){if(ms<=0)return'00 h 00 min 00 s';const total=Math.floor(ms/1000);const d=Math.floor(total/86400);const h=Math.floor((total%86400)/3600);const m=Math.floor((total%3600)/60);return d>0?`${d} j ${h} h ${m} min`:`${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')} min`}

export function PricingGate({open,onClose,title='Choisissez votre formule pour continuer',trialExpiresAt=null,trialActive=false}:Props){
  const [loading,setLoading]=useState<string|null>(null);const [error,setError]=useState('');const [billingPeriod,setBillingPeriod]=useState<'monthly'|'annual'>('monthly');const [now,setNow]=useState(Date.now());
  const [forcedOpen,setForcedOpen]=useState(false);const [explicitIntentAt,setExplicitIntentAt]=useState(0);const [proof,setProof]=useState<Proof>(null);const [trialContext,setTrialContext]=useState<TrialContext>(null);

  useEffect(()=>{
    const sync=()=>setForcedOpen(new URLSearchParams(window.location.search).get('paywall')==='1');
    sync();window.addEventListener('popstate',sync);window.addEventListener('qatalink:pricing-open',sync as EventListener);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('qatalink:pricing-open',sync as EventListener)};
  },[]);

  useEffect(()=>{
    const mark=(event:MouseEvent)=>{
      const el=(event.target as Element|null)?.closest('button,a');if(!el)return;
      const text=(el.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');
      if(/s[’']?abonner|voir les formules|payer mon abonnement|abonnement supérieur|garder|conserver mon qatalink|choisir starter|choisir pro|choisir business/.test(text))setExplicitIntentAt(Date.now());
    };
    document.addEventListener('click',mark,true);return()=>document.removeEventListener('click',mark,true);
  },[]);

  const intentional=Date.now()-explicitIntentAt<2200;
  const visible=forcedOpen||(open&&(!trialActive||intentional));

  useEffect(()=>{if(!visible)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[visible]);

  useEffect(()=>{
    if(!visible){setProof(null);setTrialContext(null);return}
    let alive=true;(async()=>{
      const supabase=createSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session)return;
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);const businessId=businesses?.[0]?.id;if(!businessId)return;
      const [{data:catalogs},{data:subs}]=await Promise.all([
        supabase.from('catalogs').select('id').eq('business_id',businessId),
        supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',businessId).order('created_at',{ascending:false}).limit(1)
      ]);
      const latest=subs?.[0]||null;const end=latest?.current_period_end?new Date(latest.current_period_end).getTime():null;const nowMs=Date.now();
      if(alive)setTrialContext(latest?.plan_code==='trial'?{isTrial:true,active:latest.status==='trialing'&&!!end&&end>nowMs,end:latest.current_period_end||null,grace:!!end&&end<=nowMs&&end+48*36e5>nowMs}:{isTrial:false,active:false,end:null,grace:false});
      const ids=(catalogs||[]).map((c:any)=>c.id);if(!ids.length){if(alive)setProof({views:0,scans:0,whatsapp:0});return}
      const [v,s,w]=await Promise.all([
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','catalog_view'),
        supabase.from('catalog_scan_events').select('*',{count:'exact',head:true}).in('catalog_id',ids),
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','whatsapp_click')
      ]);
      if(alive)setProof({views:v.count||0,scans:s.count||0,whatsapp:w.count||0});
    })();return()=>{alive=false}
  },[visible]);

  if(!visible)return null;

  function close(){
    if(forcedOpen){const url=new URL(window.location.href);url.searchParams.delete('paywall');window.history.replaceState({},'',url.toString());setForcedOpen(false)}
    onClose?.();
  }

  async function checkout(plan:'starter'|'pro'|'business'){
    setLoading(plan);setError('');
    try{
      const supabase=createSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session){window.location.href='/login';return}
      const user=session.user;const fullName=String(user.user_metadata?.full_name||'').trim();const parts=fullName.split(/\s+/).filter(Boolean);const firstName=parts[0]||'Client';const lastName=parts.slice(1).join(' ')||'Qatalink';
      const r=await fetch('/api/checkout/maketou',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({plan,firstName,lastName,billingPeriod})});const data=await r.json();if(!r.ok)throw new Error(data?.message||'Impossible de lancer le paiement. Réessayez.');const redirectUrl=data.redirectUrl||data.redirectURL;const cartId=data.cart?.id||data.id;if(cartId)localStorage.setItem('qatalink_maketou_cart_id',cartId);if(!redirectUrl)throw new Error('Impossible d’ouvrir le paiement. Réessayez.');window.location.href=redirectUrl;
    }catch(err:any){setError(err?.message||'Le paiement n’a pas pu être lancé. Réessayez.');setLoading(null)}
  }

  const hasProof=!!proof&&(proof.views+proof.scans+proof.whatsapp)>0;
  const effectiveEnd=trialExpiresAt||trialContext?.end||null;
  const effectiveTrialActive=trialActive||!!trialContext?.active;
  const remaining=effectiveEnd?Math.max(0,new Date(effectiveEnd).getTime()-now):0;
  const effectiveTitle=proof?.whatsapp? 'Votre catalogue génère déjà des contacts.' : hasProof? 'Votre catalogue est déjà utilisé.' : trialContext?.grace?'Votre essai est terminé. Gardez votre Qatalink actif.':title;
  const recommendedId:'pro'='pro';

  return <div className="paywall-backdrop" role="dialog" aria-modal="true"><div className="paywall-modal"><button className="paywall-close" onClick={close} aria-label="Fermer"><X size={20}/></button><div className="paywall-head"><div className="eyebrow">ABONNEMENT QATALINK</div><h2>{effectiveTitle}</h2>{(effectiveTrialActive||trialContext?.grace)&&effectiveEnd?<><div className="trial-danger"><Clock3 size={20}/><div><b>{trialContext?.grace?'Période de grâce avant suspension':'Votre essai se termine dans'}</b><strong>{trialContext?.grace?formatRemaining(Math.max(0,new Date(effectiveEnd).getTime()+48*36e5-now)):formatRemaining(remaining)}</strong></div></div>{hasProof&&<div className="paywall-proof"><div><b>{proof!.views}</b><span>visites</span></div><div><b>{proof!.scans}</b><span>scans QR</span></div><div><b>{proof!.whatsapp}</b><span>ouvertures WhatsApp</span></div></div>}<p>{hasProof?'Vous avez déjà commencé à créer de la valeur avec Qatalink. Activez une formule pour conserver cette continuité sans perdre votre lien public.':trialContext?.grace?'Votre travail est conservé et votre lien reste encore temporairement accessible. Activez une formule pour éviter sa suspension.':'Vos 7 jours sont entièrement ouverts. Testez, publiez et partagez ; vous pouvez vous abonner dès que la valeur est évidente.'}</p></>:<p>Choisissez la façon dont vous voulez recevoir et organiser les commandes de vos clients.</p>}<div className="billing-toggle" role="tablist" aria-label="Période de facturation"><button className={billingPeriod==='monthly'?'active':''} onClick={()=>setBillingPeriod('monthly')}>Mensuel</button><button className={billingPeriod==='annual'?'active':''} onClick={()=>setBillingPeriod('annual')}>Annuel <span className="annual-badge">1 mois offert</span></button></div><PaymentTrustBadge compact/></div><div className="paywall-plans">{plans.map(plan=>{const amount=billingPeriod==='annual'?plan.annualPrice:plan.monthlyPrice;const featured=plan.id===recommendedId;return <article className={`price-card ${featured?'featured':''}`} key={plan.id}>{featured&&<span className="popular">RECOMMANDÉ POUR LA PLUPART</span>}{billingPeriod==='annual'&&<span className="annual-card-badge">1 MOIS OFFERT</span>}<h3>{plan.name}</h3><div className="price">{formatXof(amount)}<small>{billingPeriod==='annual'?'/ an':'/ mois'}</small></div>{billingPeriod==='annual'&&<div className="annual-equivalent"><s>{formatXof(plan.monthlyPrice*12)}</s> · vous économisez {formatXof(plan.monthlyPrice)}</div>}<div className="plan-payment-method"><CreditCard size={14}/>Mobile Money ou carte bancaire</div><p>{plan.description}</p><div className="features">{plan.features.map(feature=><div className="feature" key={feature}><Check size={16}/>{feature}</div>)}</div><button className="btn btn-primary" style={{width:'100%'}} disabled={loading!==null} onClick={()=>checkout(plan.id)}>{loading===plan.id?'Ouverture du paiement sécurisé…':`Choisir ${plan.name}`}</button></article>})}</div>{effectiveTrialActive&&<button className="trial-continue" onClick={close}>Continuer mon essai sans interruption</button>}{error&&<div className="error" style={{textAlign:'center',marginTop:14}}>{error}</div>}</div></div>
}
