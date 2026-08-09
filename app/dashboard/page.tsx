'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Boxes, CreditCard, LayoutDashboard, LockKeyhole, Palette, Plus, QrCode, Settings, Upload, WandSparkles } from 'lucide-react';
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

export default function Dashboard(){
  const [imported,setImported]=useState<any>(null);
  const [sub,setSub]=useState<Sub>(null);
  const [ready,setReady]=useState(false);
  const [gate,setGate]=useState(false);
  const [section,setSection]=useState<SectionKey>('overview');
  const [paymentState,setPaymentState]=useState<'idle'|'pending'|'success'|'error'>('idle');
  const [paymentMessage,setPaymentMessage]=useState('');
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
      await refreshSubscription();
      if(active)setReady(true);

      const params=new URLSearchParams(window.location.search);
      const requested=params.get('tab') as SectionKey|null;
      if(requested && requested in sectionTitles)setSection(requested);

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

  const hasPlan=!!sub;
  const planLabel=sub?.plan_code==='static'?'Basic':sub?.plan_code==='interactive'?'Interactif':sub?.plan_code==='linkhub'?'Vitrine':'Gratuit';
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

  function protectedAction(path?:string){if(!hasPlan){setGate(true);return;}if(path)window.location.href=path;}
  function goSection(key:SectionKey){setSection(key);window.history.replaceState({},'',`/dashboard?tab=${key}`);}

  return <div className="dashboard-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link>
      <nav className="side-nav">{navItems.map(item=><button key={item.key} className={'side-item '+(section===item.key?'active':'')} onClick={()=>goSection(item.key)}>{item.icon}{item.label}</button>)}</nav>
    </aside>

    <main className="dash-main">
      <div className="dash-top"><div><div style={{color:'var(--muted)',fontSize:12,fontWeight:800}}>{sectionTitles[section].eyebrow}</div><h1 style={{margin:'3px 0'}}>{sectionTitles[section].title}</h1><div className={'account-badge '+(hasPlan?'active':'free')}>{ready?(hasPlan?`${planLabel} actif`:'Compte gratuit'):'Chargement…'}</div></div><div className="actions"><ThemeToggle/><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Nouveau catalogue</button></div></div>

      <div className="mobile-dashboard-nav">{navItems.map(item=><button key={item.key} className={'mobile-dashboard-tab '+(section===item.key?'active':'')} onClick={()=>goSection(item.key)}>{item.icon}<span>{item.label}</span></button>)}</div>

      {paymentState!=='idle'&&<div className={`payment-banner ${paymentState}`}><b>{paymentState==='pending'?'Paiement en cours':paymentState==='success'?'Paiement confirmé':'Vérification du paiement'}</b><span>{paymentMessage}</span></div>}
      {!hasPlan&&ready&&paymentState!=='pending'&&section!=='subscription'&&<div className="free-banner"><div><b>Mode aperçu gratuit.</b><span>Vous pouvez parcourir tout le dashboard. La création, la modification et la publication se débloquent au moment de choisir une formule.</span></div><button className="btn btn-primary" onClick={()=>setGate(true)}>Voir les offres</button></div>}

      {section==='overview'&&<Overview hasPlan={hasPlan} imported={imported} protectedAction={protectedAction} planLabel={planLabel}/>} 
      {section==='catalogs'&&<Catalogs hasPlan={hasPlan} protectedAction={protectedAction}/>} 
      {section==='items'&&<Items hasPlan={hasPlan} protectedAction={protectedAction}/>} 
      {section==='appearance'&&<Appearance hasPlan={hasPlan} protectedAction={protectedAction}/>} 
      {section==='qr'&&<QrShare hasPlan={hasPlan} protectedAction={protectedAction}/>} 
      {section==='stats'&&<Stats/>} 
      {section==='subscription'&&<Subscription hasPlan={hasPlan} planLabel={planLabel} openPlans={()=>setGate(true)}/>} 
      {section==='settings'&&<SettingsPanel hasPlan={hasPlan} protectedAction={protectedAction}/>} 
    </main>

    <PricingGate open={gate} onClose={()=>setGate(false)} title={hasPlan?'Changer de formule':'Débloquez la création de votre Qatalink'}/>
  </div>
}

function PreviewNotice(){return <div className="preview-notice"><LockKeyhole size={16}/><span>Cette section reste consultable avec un compte gratuit. Les actions qui modifient ou publient votre Qatalink demandent une formule active.</span></div>}

function Overview({hasPlan,imported,protectedAction,planLabel}:{hasPlan:boolean;imported:any;protectedAction:(path?:string)=>void;planLabel:string}){return <>
  <div className="metric-grid"><Metric value="0" label="Vues aujourd’hui"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ouvertures WhatsApp"/><Metric value={hasPlan?'3':'0'} label="Articles actifs"/></div>
  <div className="panel-grid"><section className="card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div className="eyebrow">Éditeur</div><h3 style={{margin:'5px 0'}}>{hasPlan?'Menu principal':'Votre premier catalogue'}</h3></div><span className="tag">{hasPlan?'Brouillon':'À créer'}</span></div>{imported&&<div style={{margin:'12px 0',padding:12,borderRadius:12,background:'var(--surface-2)',fontSize:12}}>Import OCR reçu : <b>{imported.status||imported.message||'réponse disponible'}</b></div>}{hasPlan?demoItems.map((it,i)=><div className="list-row" key={i}><div className="thumb"/><div><b>{it[0]}</b><div style={{fontSize:12,color:'var(--muted)'}}>Plats · disponible</div></div><b>{it[1]}</b></div>):<div className="empty-state"><BookOpen size={30}/><b>Aucun catalogue pour le moment</b><span>Créez-en un à partir d’une photo ou d’un texte.</span></div>}<button className="btn btn-ghost" style={{marginTop:16}} onClick={()=>protectedAction()}><WandSparkles size={17}/>Illustrer les articles un par un</button></section>
  <section className="card"><div className="eyebrow">Aperçu mobile</div><div className="mobile-preview"><div className="preview-cover"/><b>{hasPlan?'Chez Awa':'Votre entreprise'}</b><p style={{fontSize:11,color:'#777'}}>Votre catalogue apparaîtra ici</p><div className="preview-cat"><span className="tag">Catégorie 1</span><span className="tag">Catégorie 2</span></div>{(hasPlan?demoItems:[['Votre article','0 F']]).map((it:any,i)=><div className="preview-item" key={i}><div className="preview-img"/><div><b style={{fontSize:12}}>{it[0]}</b><div style={{fontSize:11,color:'#777'}}>Description du produit</div><strong style={{fontSize:12,color:'#b21427'}}>{it[1]}</strong></div></div>)}<button className="btn btn-primary" style={{width:'100%',marginTop:10}} onClick={()=>protectedAction()}>Commander sur WhatsApp</button></div></section></div>
  <div className="panel-grid"><section className="card"><div className="eyebrow">Import intelligent</div><h3>Créez à partir d’une image ou d’un texte</h3><div className="upload"><Upload size={28}/><p>Déposez une photo de votre menu ou décrivez vos articles.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Commencer</button></div></section><section className="card"><div className="eyebrow">Abonnement</div><h3>{hasPlan?`${planLabel} actif`:'Compte gratuit'}</h3><p style={{color:'var(--muted)'}}>{hasPlan?'Votre formule est active. Vous pouvez créer et modifier vos catalogues.':'Le dashboard est gratuit. Un abonnement débloque la création, la publication et les fonctions de votre formule.'}</p></section></div>
</>}

function Catalogs({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="section-toolbar"><div><h3>Vos menus et catalogues</h3><p>Centralisez ici tous les Qatalinks de votre entreprise.</p></div><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Créer un catalogue</button></div><div className="catalog-grid">{hasPlan?<><div className="catalog-card"><div className="catalog-cover"/><div><span className="tag">Brouillon</span><h3>Menu principal</h3><p>3 catégories · 12 articles</p></div></div><div className="catalog-card add-card" onClick={()=>protectedAction('/create')}><Plus size={28}/><b>Nouveau catalogue</b></div></>:<div className="card empty-wide"><BookOpen size={36}/><h3>Votre bibliothèque est vide</h3><p>Vous pouvez explorer cette section avant de vous abonner. La création commencera après le choix d’une formule.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Créer mon premier catalogue</button></div>}</div></div>}

function Items({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="section-toolbar"><div><h3>Articles & catégories</h3><p>Organisez les produits, prestations, chambres ou biens de votre catalogue.</p></div><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Ajouter</button></div><section className="card"><div className="category-pills"><span className="tag active-tag">Tous</span><span className="tag">Entrées</span><span className="tag">Plats</span><span className="tag">Boissons</span></div>{hasPlan?demoItems.map((it,i)=><div className="list-row" key={i}><div className="thumb"/><div><b>{it[0]}</b><div style={{fontSize:12,color:'var(--muted)'}}>Catégorie exemple · disponible</div></div><b>{it[1]}</b></div>):<div className="empty-state"><Boxes size={30}/><b>Les articles apparaîtront ici</b><span>Vous pourrez les déplacer, modifier les prix et générer leurs illustrations une par une.</span><button className="btn btn-ghost" onClick={()=>protectedAction('/create')}>Préparer mon catalogue</button></div>}</section></div>}

function Appearance({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="section-toolbar"><div><h3>Personnalisez votre vitrine</h3><p>Prévisualisez les styles avant de débloquer l’édition.</p></div><button className="btn btn-primary" onClick={()=>protectedAction()}>Enregistrer le design</button></div><div className="theme-grid"><ThemeCard name="Épuré" variant="clean"/><ThemeCard name="Gourmet" variant="warm"/><ThemeCard name="Premium" variant="dark"/></div><section className="card settings-grid"><div className="field"><label>Couleur principale</label><div className="color-preview"><span className="color-dot red"/>Rouge Qatalink</div></div><div className="field"><label>Typographie</label><div className="input">Plus Jakarta Sans</div></div><div className="field"><label>Style des cartes</label><div className="input">Arrondi moderne</div></div><div className="field"><label>Disposition</label><div className="input">Grille mobile</div></div></section></div>}

function ThemeCard({name,variant}:{name:string;variant:string}){return <div className={'theme-card '+variant}><div className="theme-phone"><div/><span/><span/><span/></div><b>{name}</b><small>Prévisualiser le thème</small></div>}

function QrShare({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<div className="panel-grid"><section className="card qr-card"><div className="eyebrow">QR PERMANENT</div><div className="qr-placeholder"><QrCode size={120}/></div><h3>Votre QR Qatalink</h3><p>Le QR garde le même lien même lorsque vous changez les prix, images ou produits.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Générer mon QR</button></section><section className="card"><div className="eyebrow">PARTAGE</div><h3>Un seul lien pour votre activité</h3><div className="share-link">qatalink.app/votre-entreprise</div><div className="share-option"><b>WhatsApp</b><span>Partage direct aux clients</span></div><div className="share-option"><b>Instagram / bio</b><span>À partir de la formule Vitrine</span></div><div className="share-option"><b>Google Maps</b><span>À partir de la formule Vitrine</span></div><button className="btn btn-ghost" onClick={()=>protectedAction()}>Configurer le partage</button></section></div></div>}

function Stats(){return <div className="section-stack"><div className="metric-grid"><Metric value="0" label="Visites"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ajouts au panier"/><Metric value="0" label="Ouvertures WhatsApp"/></div><section className="card"><div className="eyebrow">30 DERNIERS JOURS</div><h3>Activité de votre Qatalink</h3><div className="chart-placeholder"><span/><span/><span/><span/><span/><span/><span/><span/></div><p style={{color:'var(--muted)'}}>Les statistiques commenceront à se remplir dès la publication de votre premier catalogue.</p></section></div>}

function Subscription({hasPlan,planLabel,openPlans}:{hasPlan:boolean;planLabel:string;openPlans:()=>void}){return <div className="section-stack"><section className="subscription-hero card"><div><div className="eyebrow">FORMULE ACTUELLE</div><h2>{hasPlan?planLabel:'Compte gratuit'}</h2><p>{hasPlan?'Votre abonnement Qatalink est actif.':'Aucun prélèvement. Choisissez votre formule uniquement lorsque vous êtes prêt à créer et publier.'}</p></div><button className="btn btn-primary" onClick={openPlans}>{hasPlan?'Changer de formule':'Voir les 3 formules'}</button></section><div className="metric-grid"><Metric value="3 500 F" label="Basic / mois"/><Metric value="5 000 F" label="Interactif / mois"/><Metric value="7 500 F" label="Vitrine / mois"/><Metric value="XOF" label="Devise de facturation"/></div></div>}

function SettingsPanel({hasPlan,protectedAction}:{hasPlan:boolean;protectedAction:(path?:string)=>void}){return <div className="section-stack">{!hasPlan&&<PreviewNotice/>}<section className="card"><div className="section-toolbar"><div><h3>Informations de l’entreprise</h3><p>Ces informations seront utilisées sur votre catalogue public.</p></div><button className="btn btn-primary" onClick={()=>protectedAction()}>Enregistrer</button></div><div className="settings-grid"><div className="field"><label>Nom de l’entreprise</label><input className="input" placeholder="Votre entreprise"/></div><div className="field"><label>WhatsApp</label><input className="input" placeholder="+225..."/></div><div className="field"><label>Type d’activité</label><select className="input" defaultValue="restaurant"><option value="restaurant">Restaurant</option><option value="hotel">Hôtel</option><option value="spa">Spa / beauté</option><option value="real_estate">Immobilier</option><option value="retail">Boutique</option><option value="other">Autre</option></select></div><div className="field"><label>Devise</label><select className="input" defaultValue="XOF"><option>XOF</option><option>EUR</option><option>USD</option></select></div></div></section></div>}

function Metric({value,label}:{value:string;label:string}){return <div className="metric"><b>{value}</b><span>{label}</span></div>}
