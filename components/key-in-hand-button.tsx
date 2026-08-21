'use client';

import {useMemo,useState} from 'react';
import {ArrowLeft,Check,Clock3,PackageCheck,X} from 'lucide-react';

const WEBHOOK='https://digitaladn225.app.n8n.cloud/webhook/qrcodedigital';
const OPTIONS=[
  'Création complète de mon menu / catalogue digital',
  'Génération d’images professionnelles',
  'Descriptions appétissantes et commerciales',
  'QR code prêt à utiliser',
  'Cartes / chevalets QR physiques',
  'Configuration des commandes et de la caisse Qatalink',
  'Imprimante thermique compatible ESC/POS',
  'Configuration de WhatsApp',
  'Page centrale avec réseaux, site, Google Maps et lien d’avis',
  'Gestion du stock et déductions automatiques',
  'Accès caisse / cuisine / gérant',
  'Installation, tests et prise en main de l’équipe',
];

const SECTORS=['Restaurant / maquis','Fast-food','Bar / lounge','Hôtel','Beauté / bien-être','Boutique / commerce','Services','Autre'];
const DEADLINES=['Le plus tôt possible','Sous 7 jours','Sous 2 semaines','Ce mois-ci','Je me renseigne'];
const ASSETS=['Oui, logo, photos et tarifs sont prêts','J’ai une partie des éléments','Je pars de zéro'];
const BUDGETS=['Moins de 25 000 F','25 000 à 50 000 F','50 000 à 100 000 F','100 000 F et plus','À définir selon la solution'];

type Step='options'|'contact'|'sent';

export function KeyInHandButton({source,label='Bénéficier d’une solution clé-en-main',className='btn btn-primary'}:{source:string;label?:string;className?:string}){
  const [open,setOpen]=useState(false);
  const [step,setStep]=useState<Step>('options');
  const [selected,setSelected]=useState<number[]>([0,3]);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [form,setForm]=useState({name:'',phone:'',business:'',sector:'',deadline:'Le plus tôt possible',assets:'Oui, logo, photos et tarifs sont prêts',budget:'À définir selon la solution',problem:'',notes:''});

  const chosen=useMemo(()=>selected.map(index=>OPTIONS[index]).filter(Boolean),[selected]);
  function toggle(index:number){setSelected(current=>current.includes(index)?current.filter(value=>value!==index):[...current,index])}
  function close(){setOpen(false);setTimeout(()=>{setStep('options');setError('')},180)}
  function update(name:keyof typeof form,value:string){setForm(current=>({...current,[name]:value}))}

  async function submit(){
    if(!form.name.trim()||!form.phone.trim()){setError('Votre nom et votre numéro de téléphone sont nécessaires pour vous recontacter.');return}
    setSending(true);setError('');
    const params=new URLSearchParams(window.location.search);
    const body=new URLSearchParams({
      event:'qr_code_lead',
      lead_id:crypto.randomUUID(),
      status:'new',
      saved_at:new Date().toISOString(),
      name:form.name.trim(),
      phone:form.phone.trim(),
      business:form.business.trim(),
      sector:form.sector,
      offer:'Je souhaite commander une solution Qatalink clé-en-main',
      problem:form.problem.trim(),
      products:chosen.join(' | ')||'Je souhaite être conseillé sur la configuration',
      deadline:form.deadline,
      assets:form.assets,
      budget:form.budget,
      notes:[`Source : ${source}`,form.notes.trim()].filter(Boolean).join(' — '),
      page_url:window.location.href,
      referrer:document.referrer||'Accès direct',
      utm_source:params.get('utm_source')||'',
      utm_medium:params.get('utm_medium')||'',
      utm_campaign:params.get('utm_campaign')||'',
      user_agent:navigator.userAgent,
    });
    try{
      await fetch(WEBHOOK,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),keepalive:true});
      setStep('sent');
    }catch{
      setError('Impossible d’envoyer votre demande pour le moment. Vérifiez votre connexion puis réessayez.');
    }finally{setSending(false)}
  }

  return <>
    <button className={className} onClick={()=>{setOpen(true);setStep('options');setError('')}}>{label}</button>
    {open&&<div className="turnkey-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
      <section className="turnkey-modal">
        <header><div><span className="eyebrow">SOLUTION QATALINK CLÉ-EN-MAIN</span><h2>{step==='options'?'Choisissez ce dont vous avez besoin.':step==='contact'?'Parlez-nous de votre activité.':'Demande envoyée.'}</h2><p>{step==='options'?'Sélectionnez les éléments à mettre en place. Vous renseignerez ensuite vos coordonnées pour être recontacté par Digital ADN.':step==='contact'?'Ces informations nous permettent de préparer une configuration adaptée avant de vous rappeler.':'Digital ADN a reçu votre demande et pourra vous recontacter avec les options sélectionnées.'}</p></div><button onClick={close} aria-label="Fermer"><X/></button></header>

        {step==='options'&&<>
          <div className="turnkey-options">{OPTIONS.map((option,index)=><button type="button" key={option} className={selected.includes(index)?'selected':''} onClick={()=>toggle(index)}><span className="turnkey-check">{selected.includes(index)&&<Check size={14}/>}</span><span>{option}</span></button>)}</div>
          <div className="turnkey-timing"><span><Clock3 size={16}/><b>Menu digital + QR :</b> objectif 24h après réception des éléments.</span><span><PackageCheck size={16}/><b>Cartes QR / imprimante :</b> environ 3 jours ouvrables selon disponibilité et zone.</span></div>
          <button className="turnkey-send" onClick={()=>setStep('contact')}>Continuer avec mes coordonnées</button>
        </>}

        {step==='contact'&&<>
          <div className="turnkey-selection-summary"><b>{chosen.length||0} option(s) sélectionnée(s)</b><span>{chosen.length?chosen.join(' · '):'Je souhaite être conseillé sur la configuration.'}</span></div>
          <div className="turnkey-fields turnkey-contact-fields">
            <label>Nom et prénom *<input value={form.name} onChange={e=>update('name',e.target.value)} autoComplete="name" placeholder="Ex : Ismaël Kouamé"/></label>
            <label>Téléphone / WhatsApp *<input value={form.phone} onChange={e=>update('phone',e.target.value)} autoComplete="tel" inputMode="tel" placeholder="Ex : 07 00 00 00 00"/></label>
            <label>Entreprise / activité<input value={form.business} onChange={e=>update('business',e.target.value)} placeholder="Ex : Restaurant La Terrasse"/></label>
            <label>Secteur<select value={form.sector} onChange={e=>update('sector',e.target.value)}><option value="">Choisir</option>{SECTORS.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Délai souhaité<select value={form.deadline} onChange={e=>update('deadline',e.target.value)}>{DEADLINES.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Éléments déjà disponibles<select value={form.assets} onChange={e=>update('assets',e.target.value)}>{ASSETS.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Budget indicatif<select value={form.budget} onChange={e=>update('budget',e.target.value)}>{BUDGETS.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Principal besoin / problème<input value={form.problem} onChange={e=>update('problem',e.target.value)} placeholder="Ex : réduire les erreurs de commande"/></label>
          </div>
          <label className="turnkey-note">Précisions utiles<textarea value={form.notes} onChange={e=>update('notes',e.target.value)} placeholder="Ex : 2 points de vente, 10 cartes QR, imprimante déjà disponible…"/></label>
          {error&&<div className="turnkey-form-error">{error}</div>}
          <div className="turnkey-form-actions"><button type="button" className="turnkey-back" onClick={()=>setStep('options')}><ArrowLeft size={16}/>Modifier mes options</button><button className="turnkey-send" onClick={submit} disabled={sending}>{sending?'Envoi en cours…':'Envoyer ma demande'}</button></div>
        </>}

        {step==='sent'&&<div className="turnkey-success"><span><Check size={26}/></span><h3>Merci {form.name.trim()||''}.</h3><p>Votre demande a bien été transmise à Digital ADN. Les options choisies et vos coordonnées ont été enregistrées pour préparer la prise de contact.</p><button className="turnkey-send" onClick={close}>Fermer</button></div>}
      </section>
    </div>}
  </>;
}
