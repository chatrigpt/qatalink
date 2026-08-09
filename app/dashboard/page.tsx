'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Boxes, Clock3, CreditCard, LayoutDashboard, LockKeyhole, Palette, Plus, QrCode, Settings, Upload, WandSparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { PricingGate } from '@/components/pricing-gate';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const demoItems=[['Poulet braisé','3 500 F'],['Poisson braisé','5 000 F'],['Jus de bissap','1 000 F']];
type Sub = { plan_code:string; status:string; current_period_end:string|null } | null;
type SectionKey='overview'|'catalogs'|'items'|'appearance'|'qr'|'stats'|'subscription'|'settings';

const sectionTitles:Record<SectionKey,{eyebrow:string;title:string}>={
  overview:{eyebrow:'BONJOUR 👋',title:'Votre espace Qatalink'},
  catalogs:{eyebrow:'CONTENU',title:'Catalogues'},
  items:{eyebrow:'CONTENU',title:'Articles & catégories'},
  appearance:{eyebrow:'DESIGN',title:'Apparence'},
  qr:{eyebrow:'DIFFUSION',title:'QR & partage'},
  stats:{eyebrow:'PERFORMANCE',title:'Statistiques'},
  subscription:{eyebrow:'FACTURATION',title:'Abonnement'},
  settings:{eyebrow:'COMPTE',title:'Paramètres'}
};

function formatRemaining(ms:number){
  if(ms<=0)return '00 h 00 min 00 s';
  const total=Math.floor(ms/1000);
  const h=Math.floor(total/3600);
  const m=Math.floor((total%3600)/60);
  const s=total%60;
  return `${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')} min ${String(s).padStart(2,'0')} s`;
}

export default function Dashboard(){
  const [imported,setImported]=useState<any>(null);
  const [sub,setSub]=useState<Sub>(null);
  const [ready,setReady]=useState(false);
  const [gate,setGate]=useState(false);
  const [section,setSection]=useState<SectionKey>('overview');
  const [paymentState,setPaymentState]=useState<'idle'|'pending'|'success'|'error'>('idle');
  const [paymentMessage,setPaymentMessage]=useState('');
  const [now,setNow]=useState(Date.now());
  const supabase=createSupabaseBrowserClient();

  async function refreshSubscription(){
    const {data}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
    const candidate=data?.[0]||null;
    const valid=candidate && (!candidate.current_period_end || new Date(candidate.current_period_end).getTime()>Date.now()) ? candidate : null;
    setSub(valid as Sub);
    return !!valid;
  }

  useEffect(()=>{
    let active=true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){window.location.href='/login';return;}
      try{const v=localStorage.getItem('qatalink_import_preview');if(v&&active)setImported(JSON.parse(v));}catch{}
      const valid=await refreshSubscription();
      if(active)setReady(true);

      const params=new URLSearchParams(window.location.search);
      const requested=params.get('tab') as SectionKey|null;
      if(requested && requested in sectionTitles)setSection(requested);

      const reminder=localStorage.getItem('qatalink_trial_reminder_on_arrival');
      if(valid&&reminder){
        const {data:trialRows}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('plan_code','trial').eq('status','trialing').order('created_at',{ascending:false}).limit(1);
        const trial=trialRows?.[0];
        if(trial&&trial.current_period_end&&new Date(trial.current_period_end).getTime()>Date.now()){
          localStorage.removeItem('qatalink_trial_reminder_on_arrival');
          setGate(true);
        }
      }

      const cartId=localStorage.getItem('qatalink_maketou_cart_id');
      if(params.get('payment')==='pending'&&cartId){
        setPaymentState('pending');setPaymentMessage('Validation de votre paiement Maketou…');
        let tries=0;
        const poll=async()=>{
          tries++;
          try{
            const r=await fetch('/api/payment/maketou/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({cart_id:cartId})});
            const data=await r.json();
            if(data.status==='completed'){
              localStorage.removeItem('qatalink_maketou_cart_id');
              await refreshSubscription();
              setPaymentState('success');setPaymentMessage('Paiement confirmé. Votre formule Qatalink est active.');
              window.history.replaceState({},'', '/dashboard');
              return;
            }
            if(tries<36){timer=setTimeout(poll,5000);}else{setPaymentState('error');setPaymentMessage('Le paiement prend plus de temps que prévu. Rechargez la page dans quelques instants.');}
          }catch{
            if(tries<36){timer=setTimeout(poll,5000);}else{setPaymentState('error');setPaymentMessage('Impossible de vérifier le paiement pour le moment.');}
          }
        };
        poll();
      }
    })();
    return()=>{active=false;if(timer)clearTimeout(timer)};
  },[]);

  const trialActive=!!sub&&sub.plan_code==='trial'&&sub.status==='trialing'&&!!sub.current_period_end&&new Date(sub.current_period_end).getTime()>now;
  const trialExpiresAt=trialActive?sub?.current_period_end||null:null;
  const hasAccess=!!sub&&(sub.status==='active'||trialActive);
  const paidPlan=!!sub&&sub.plan_code!=='trial'&&sub.status==='active';
  const remainingMs=trialExpiresAt?Math.max(0,new Date(trialExpiresAt).getTime()-now):0;
  const planLabel=trialActive?'Essai gratuit 24 h':sub?.plan_code==='static'?'Basic':sub?.plan_code==='interactive'?'Interactif':sub?.plan_code==='linkhub'?'Vitrine':'Gratuit';

  useEffect(()=>{
    if(!trialActive)return;
    const interval=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(interval);
  },[trialActive]);

  useEffect(()=>{
    if(sub?.plan_code==='trial'&&sub.current_period_end&&new Date(sub.current_period_end).getTime()<=now){setSub(null);setGate(true);}
  },[now,sub]);

  const navItems=[
    {key:'overview' as SectionKey,label:'Vue d’ensemble',icon:<LayoutDashboard size={17}/>},
    {key:'catalogs' as SectionKey,label:'Catalogues',icon:<BookOpen size={17}/>},
    {key:'items' as SectionKey,label:'Articles & catégories',icon:<Boxes size={17}/>},
    {key:'appearance' as SectionKey,label:'Apparence',icon:<Palette size={17}/>},
    {key:'qr' as SectionKey,label:'QR & partage',icon:<QrCode size={17}/>},
    {key:'stats' as SectionKey,label:'Statistiques',icon:<BarChart3 size={17}/>},
    {key:'subscription' as SectionKey,label:'Abonnement',icon:<CreditCard size={17}/>},
    {key:'settings' as SectionKey,label:'Paramètres',icon:<Settings size={17}/>}
  ];

  function protectedAction(path?:string){
    if(!hasAccess){setGate(true);return;}
    if(trialActive){
      if(path){localStorage.setItem('qatalink_trial_reminder_on_arrival','1');window.location.href=path;return;}
      setGate(true);return;
    }
    if(path)window.location.href=path;
  }
  function goSection(key:SectionKey){setSection(key);window.history.replaceState({},'',`/dashboard?tab=${key}`);}

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
      <nav className="side-nav">{navItems.map(item=><button key={item.key} className={'side-item '+(section===item.key?'active':'')} onClick={()=>goSection(item.key)}>{item.icon}{item.label}</button>)}</nav>
    </aside>

    <main className="dash-main">
      <div className="dash-top"><div><div style={{color:'var(--muted)',fontSize:12,fontWeight:800}}>{sectionTitles[section].eyebrow}</div><h1 style={{margin:'3px 0'}}>{sectionTitles[section].title}</h1><div className={'account-badge '+(paidPlan?'active':'free')}>{ready?planLabel:'Chargement…'}</div></div><div className="actions"><ThemeToggle/><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Nouveau catalogue</button></div></div>

      <div className="mobile-dashboard-nav">{navItems.map(item=><button key={item.key} className={'mobile-dashboard-tab '+(section===item.key?'active':'')} onClick={()=>goSection(item.key)}>{item.icon}<span>{item.label}</span></button>)}</div>

      {trialActive&&<div className="trial-strip"><div className="trial-strip-icon"><Clock3 size={20}/></div><div><b>Essai complet en cours</b><span>Votre catalogue sera mis hors ligne à la fin de l’essai si aucune formule n’est activée.</span></div><strong>{formatRemaining(remainingMs)}</strong><button className="btn btn-primary" onClick={()=>setGate(true)}>S’abonner</button></div>}
      {paymentState!=='idle'&&<div className={`payment-banner ${paymentState}`}><b>{paymentState==='pending'?'Paiement en cours':paymentState==='success'?'Paiement confirmé':'Vérification du paiement'}</b><span>{paymentMessage}</span></div>}
      {!hasAccess&&ready&&paymentState!=='pending'&&section!=='subscription'&&<div className="free-banner"><div><b>Votre essai est terminé.</b><span>Votre dashboard reste accessible, mais les actions et la publication sont suspendues jusqu’à l’activation d’une formule.</span></div><button className="btn btn-primary" onClick={()=>setGate(true)}>Voir les offres</button></div>}

      {section==='overview'&&<Overview hasPlan={hasAccess} imported={imported} protectedAction={protectedAction} planLabel={planLabel}/>} 
      {section==='catalogs'&&<Catalogs hasPlan={hasAccess} protectedAction={protectedAction}/>} 
      {section==='items'&&<Items hasPlan={hasAccess} protectedAction={protectedAction}/>} 
      {section==='appearance'&&<Appearance hasPlan={hasAccess} protectedAction={protectedAction}/>} 
      {section==='qr'&&<QrShare hasPlan={hasAccess} protectedAction={protectedAction}/>} 
      {section==='stats'&&<Stats/>} 
      {section==='subscription'&&<Subscription hasPlan={paidPlan} planLabel={planLabel} trialActive={trialActive} remaining={formatRemaining(remainingMs)} openPlans={()=>setGate(true)}/>} 
      {section==='settings'&&<SettingsPanel hasPlan={hasAccess} protectedAction={protectedAction}/>} 
    </main>

    <PricingGate open={gate} onClose={()=>setGate(false)} title={trialActive?'Ne laissez pas votre catalogue expirer':'Choisissez une formule pour continuer'} trialActive={trialActive} trialExpiresAt={trialExpiresAt}/>
  </div>
}

function PreviewNotice(){return <div className="preview-notice"><LockKeyhole size={16}/><span>Votre essai est terminé. Cette section reste consultable, mais les actions demandent maintenant une formule active.</span></div>}

function Overview({hasPlan,imported,protectedAction,planLabel}:{hasPlan:boolean;imported:any;protectedAction:(path?:string)=>void;planLabel:string}){return <>
  <div className="metric-grid"><Metric value="0" label="Vues aujourd’hui"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ouvertures WhatsApp"/><Metric value={hasPlan?'3':'0'} label="Articles actifs"/></div>
  <div className="panel-grid"><section className="card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div className="eyebrow">Éditeur</div><h3 style={{margin:'5px 0'}}>{hasPlan?'Menu principal':'Votre premier catalogue'}</h3></div><span className="tag">{hasPlan?'Brouillon':'Suspendu'}</span></div>{imported&&<div style={{margin:'12px 0',padding:12,borderRadius:12,background:'var(--surface-2)',fontSize:12}}>Import OCR reçu : <b>{imported.status||imported.message||'réponse disponible'}</b></div>}{hasPlan?demoItems.map((it,i)=><div className="list-row" key={i}><div className="thumb"/><div><b>{it[0]}</b><div style={{fontSize:12,color:'var(--muted)'}}>Plats · disponible</div></div><b>{it[1]}</b></div>):<div className="empty-state"><BookOpen size={30}/><b>Fonctions suspendues</b><span>Activez une formule pour reprendre la création et la publication.</span></div>}<button className="btn btn-ghost" style={{marginTop:16}} onClick={()=>protectedAction()}><WandSparkles size={17}/>Illustrer les articles un par un</button></section>
  <section className="card"><div className="eyebrow">Aperçu mobile</div><div className="mobile-preview"><div className="preview-cover"/><b>{hasPlan?'Chez Awa':'Votre entreprise'}</b><p style={{fontSize:11,color:'#777'}}>Votre catalogue apparaîtra ici</p><div className="preview-cat"><span className="tag">Catégorie 1</span><span className="tag">Catégorie 2</span></div>{(hasPlan?demoItems:[['Votre article','0 F']]).map((it:any,i)=><div className="preview-item" key={i}><div className="preview-img"/><div><b style={{fontSize:12}}>{it[0]}</b><div style={{fontSize:11,color:'#777'}}>Description du produit</div><strong style={{fontSize:12,color:'#b21427'}}>{it[1]}</strong></div></div>)}<button className="btn btn-primary" style={{width:'100%',marginTop:10}} onClick={()=>protectedAction()}>Commander sur WhatsApp</button></div></section></div>
  <div className="panel-grid"><section className="card"><div className="eyebrow">Import intelligent</div><h3>Créez à partir d’une image ou d’un texte</h3><div className="upload"><Upload size={28}/><p>Déposez une photo de votre menu ou décrivez vos articles.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Commencer</button></div></section><section className="card"><div className="eyebrow">Abonnement</div><h3>{planLabel}</h3><p style={{color:'var(--muted)'}}>{hasPlan?'Vous pouvez utiliser les fonctions actuellement débloquées.':'Votre essai est terminé. Un abonnement réactive votre catalogue et vos fonctions.'}</p></section></div>
</>}

function Catalogs({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="section-toolbar"><div><h3>Vos menus et catalogues</h3><p>Centralisez ici tous les Qatalinks de votre entreprise.</p></div><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Créer un catalogue</button></div><div className="catalog-grid">{hasPlan?<><div className="catalog-card"><div className="catalog-cover"/><div><span className="tag">Brouillon</span><h3>Menu principal</h3><p>3 catégories · 12 articles</p></div></div><div className="catalog-card add-card" onClick={()=>protectedAction('/create')}><Plus size={28}/><b>Nouveau catalogue</b></div></>:<div className="card empty-wide"><BookOpen size={36}/><h3>Catalogue suspendu</h3><p>Votre contenu reste enregistré. Activez une formule pour le remettre en ligne et reprendre l’édition.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Réactiver mon catalogue</button></div>}</div></div>}

function Items({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="section-toolbar"><div><h3>Articles & catégories</h3><p>Organisez les produits, prestations, chambres ou biens de votre catalogue.</p></div><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Ajouter</button></div><section className="card"><div className="category-pills"><span className="tag active-tag">Tous</span><span className="tag">Entrées</span><span className="tag">Plats</span><span className="tag">Boissons</span></div>{hasPlan?demoItems.map((it,i)=><div className="list-row" key={i}><div className="thumb"/><div><b>{it[0]}</b><div style={{fontSize:12,color:'var(--muted)'}}>Catégorie exemple · disponible</div></div><b>{it[1]}</b></div>):<div className="empty-state"><Boxes size={30}/><b>Édition suspendue</b><span>Vos articles restent enregistrés et seront réactivés avec votre abonnement.</span><button className="btn btn-ghost" onClick={()=>protectedAction('/create')}>Voir les formules</button></div>}</section></div>}

function Appearance({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="section-toolbar"><div><h3>Personnalisez votre vitrine</h3><p>Couleurs, styles et mise en page de votre catalogue.</p></div><button className="btn btn-primary" onClick={()=>protectedAction()}>Enregistrer le design</button></div><div className="theme-grid"><ThemeCard name="Épuré" variant="clean"/><ThemeCard name="Gourmet" variant="warm"/><ThemeCard name="Premium" variant="dark"/></div><section className="card settings-grid"><div className="field"><label>Couleur principale</label><div className="color-preview"><span className="color-dot red"/>Rouge Qatalink</div></div><div className="field"><label>Typographie</label><div className="input">Plus Jakarta Sans</div></div><div className="field"><label>Style des cartes</label><div className="input">Arrondi moderne</div></div><div className="field"><label>Disposition</label><div className="input">Grille mobile</div></div></section></div>}

function ThemeCard({name,variant}:{name:string;variant:string}){return <div className={'theme-card '+variant}><div className="theme-phone"><div/><span/><span/><span/></div><b>{name}</b><small>Prévisualiser le thème</small></div>}

function QrShare({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="panel-grid"><section className="card qr-card"><div className="eyebrow">QR PERMANENT</div><div className="qr-placeholder"><QrCode size={120}/></div><h3>Votre QR Qatalink</h3><p>Le QR garde le même lien même lorsque vous changez les prix, images ou produits.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Générer mon QR</button></section><section className="card"><div className="eyebrow">PARTAGE</div><h3>Un seul lien pour votre activité</h3><div className="share-link">qatalink.app/votre-entreprise</div><div className="share-option"><b>WhatsApp</b><span>Partage direct aux clients</span></div><div className="share-option"><b>Instagram / bio</b><span>À partir de la formule Vitrine</span></div><div className="share-option"><b>Google Maps</b><span>À partir de la formule Vitrine</span></div><button className="btn btn-ghost" onClick={()=>protectedAction()}>Configurer le partage</button></section></div></div>}

function Stats(){return <div className="section-stack"><div className="metric-grid"><Metric value="0" label="Visites"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ajouts au panier"/><Metric value="0" label="Ouvertures WhatsApp"/></div><section className="card"><div className="eyebrow">30 DERNIERS JOURS</div><h3>Activité de votre Qatalink</h3><div className="chart-placeholder"><span/><span/><span/><span/><span/><span/><span/><span/></div><p style={{color:'var(--muted)'}}>Les statistiques commenceront à se remplir dès la publication de votre premier catalogue.</p></section></div>}

function Subscription({hasPlan,planLabel,trialActive,remaining,openPlans}:{hasPlan:boolean;planLabel:string;trialActive:boolean;remaining:string;openPlans:()=>void}){return <div className="section-stack"><section className="subscription-hero card"><div><div className="eyebrow">FORMULE ACTUELLE</div><h2>{planLabel}</h2><p>{trialActive?`Votre accès complet expire dans ${remaining}. Activez une formule avant la fin du compteur pour garder le catalogue en ligne.`:hasPlan?'Votre abonnement Qatalink est actif.':'Votre essai est terminé. Choisissez une formule pour remettre le catalogue en ligne.'}</p></div><button className="btn btn-primary" onClick={openPlans}>{hasPlan?'Changer de formule':trialActive?'S’abonner maintenant':'Voir les 3 formules'}</button></section><div className="metric-grid"><Metric value="3 500 F" label="Basic / mois"/><Metric value="5 000 F" label="Interactif / mois"/><Metric value="7 500 F" label="Vitrine / mois"/><Metric value="12 mois" label="Option annuelle"/></div></div>}

function SettingsPanel({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<section className="card"><div className="section-toolbar"><div><h3>Informations de l’entreprise</h3><p>Ces informations seront utilisées sur votre catalogue public.</p></div><button className="btn btn-primary" onClick={()=>protectedAction()}>Enregistrer</button></div><div className="settings-grid"><div className="field"><label>Nom de l’entreprise</label><input className="input" placeholder="Votre entreprise"/></div><div className="field"><label>WhatsApp</label><input className="input" placeholder="+225..."/></div><div className="field"><label>Type d’activité</label><select className="input" defaultValue="restaurant"><option value="restaurant">Restaurant</option><option value="hotel">Hôtel</option><option value="spa">Spa / beauté</option><option value="real_estate">Immobilier</option><option value="retail">Boutique</option><option value="other">Autre</option></select></div><div className="field"><label>Devise</label><select className="input" defaultValue="XOF"><option>XOF</option><option>EUR</option><option>USD</option></select></div></div></section></div>}

function Metric({value,label}:{value:string;label:string}){return <div className="metric"><b>{value}</b><span>{label}</span></div>}
