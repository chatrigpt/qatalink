'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Boxes, CreditCard, LayoutDashboard, Palette, Plus, QrCode, Settings, Upload, WandSparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { PricingGate } from '@/components/pricing-gate';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const demoItems=[['Poulet braisé','3 500 F'],['Poisson braisé','5 000 F'],['Jus de bissap','1 000 F']];

type Sub = { plan_code:string; status:string; current_period_end:string|null } | null;

export default function Dashboard(){
  const [imported,setImported]=useState<any>(null);
  const [sub,setSub]=useState<Sub>(null);
  const [ready,setReady]=useState(false);
  const [gate,setGate]=useState(false);
  const supabase=createSupabaseBrowserClient();

  useEffect(()=>{
    let active=true;
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){window.location.href='/login';return;}
      try{
        const v=localStorage.getItem('qatalink_import_preview');if(v&&active)setImported(JSON.parse(v));
      }catch{}
      const {data}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
      const candidate=data?.[0]||null;
      const valid=candidate && (!candidate.current_period_end || new Date(candidate.current_period_end).getTime()>Date.now()) ? candidate : null;
      if(active){setSub(valid as Sub);setReady(true);}
    })();
    return()=>{active=false};
  },[]);

  const hasPlan=!!sub;
  const planLabel=sub?.plan_code==='static'?'Basic':sub?.plan_code==='interactive'?'Interactif':sub?.plan_code==='linkhub'?'Vitrine':'Gratuit';
  function protectedAction(path?:string){if(!hasPlan){setGate(true);return;}if(path)window.location.href=path;}

  return <div className="dashboard-shell">
    <aside className="sidebar"><Link className="brand" href="/"><Image src="/qatalink-logo.png" width={34} height={34} alt="Qatalink"/>qatalink</Link><nav className="side-nav"><div className="side-item active"><LayoutDashboard size={17}/>Vue d’ensemble</div><div className="side-item"><BookOpen size={17}/>Catalogues</div><div className="side-item"><Boxes size={17}/>Articles & catégories</div><div className="side-item"><Palette size={17}/>Apparence</div><div className="side-item"><QrCode size={17}/>QR & partage</div><div className="side-item"><BarChart3 size={17}/>Statistiques</div><div className="side-item" onClick={()=>setGate(!hasPlan)}><CreditCard size={17}/>Abonnement</div><div className="side-item"><Settings size={17}/>Paramètres</div></nav></aside>
    <main className="dash-main">
      <div className="dash-top"><div><div style={{color:'var(--muted)',fontSize:12,fontWeight:800}}>BONJOUR 👋</div><h1 style={{margin:'3px 0'}}>Votre espace Qatalink</h1><div className={'account-badge '+(hasPlan?'active':'free')}>{ready?(hasPlan?`${planLabel} actif`:'Compte gratuit'):'Chargement…'}</div></div><div className="actions"><ThemeToggle/><button className="btn btn-primary" onClick={()=>protectedAction('/create')}><Plus size={17}/>Nouveau catalogue</button></div></div>
      {!hasPlan&&ready&&<div className="free-banner"><div><b>Votre dashboard est prêt.</b><span>Explorez Qatalink gratuitement. Vous choisirez votre formule uniquement au moment de créer votre premier menu ou catalogue.</span></div><button className="btn btn-primary" onClick={()=>setGate(true)}>Voir les offres</button></div>}
      <div className="metric-grid"><Metric value="0" label="Vues aujourd’hui"/><Metric value="0" label="Scans QR"/><Metric value="0" label="Ouvertures WhatsApp"/><Metric value={hasPlan?'3':'0'} label="Articles actifs"/></div>
      <div className="panel-grid"><section className="card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div className="eyebrow">Éditeur</div><h3 style={{margin:'5px 0'}}>{hasPlan?'Menu principal':'Votre premier catalogue'}</h3></div><span className="tag">{hasPlan?'Brouillon':'À créer'}</span></div>{imported&&<div style={{margin:'12px 0',padding:12,borderRadius:12,background:'var(--surface-2)',fontSize:12}}>Import OCR reçu : <b>{imported.status||imported.message||'réponse disponible'}</b></div>}{hasPlan?demoItems.map((it,i)=><div className="list-row" key={i}><div className="thumb"/><div><b>{it[0]}</b><div style={{fontSize:12,color:'var(--muted)'}}>Plats · disponible</div></div><b>{it[1]}</b></div>):<div className="empty-state"><BookOpen size={30}/><b>Aucun catalogue pour le moment</b><span>Créez-en un à partir d’une photo ou d’un texte.</span></div>}<button className="btn btn-ghost" style={{marginTop:16}} onClick={()=>protectedAction()}><WandSparkles size={17}/>Illustrer les articles un par un</button></section>
      <section className="card"><div className="eyebrow">Aperçu mobile</div><div className="mobile-preview"><div className="preview-cover"/><b>{hasPlan?'Chez Awa':'Votre entreprise'}</b><p style={{fontSize:11,color:'#777'}}>Votre catalogue apparaîtra ici</p><div className="preview-cat"><span className="tag">Catégorie 1</span><span className="tag">Catégorie 2</span></div>{(hasPlan?demoItems:[['Votre article','0 F']]).map((it:any,i)=><div className="preview-item" key={i}><div className="preview-img"/><div><b style={{fontSize:12}}>{it[0]}</b><div style={{fontSize:11,color:'#777'}}>Description du produit</div><strong style={{fontSize:12,color:'#b21427'}}>{it[1]}</strong></div></div>)}<button className="btn btn-primary" style={{width:'100%',marginTop:10}} onClick={()=>protectedAction()}>Commander sur WhatsApp</button></div></section></div>
      <div className="panel-grid"><section className="card"><div className="eyebrow">Import intelligent</div><h3>Créez à partir d’une image ou d’un texte</h3><div className="upload"><Upload size={28}/><p>Déposez une photo de votre menu ou décrivez vos articles.</p><button className="btn btn-primary" onClick={()=>protectedAction('/create')}>Commencer</button></div></section><section className="card"><div className="eyebrow">Abonnement</div><h3>{hasPlan?`${planLabel} actif`:'Compte gratuit'}</h3><p style={{color:'var(--muted)'}}>{hasPlan?'Votre formule est active. Vous pouvez créer et modifier vos catalogues.':'Le dashboard est gratuit. Un abonnement débloque la création, la publication et les fonctions de votre formule.'}</p><button className="btn btn-ghost" onClick={()=>setGate(true)}>{hasPlan?'Voir les formules':'Choisir une formule'}</button></section></div>
    </main>
    <PricingGate open={gate} onClose={()=>setGate(false)} title={hasPlan?'Changer de formule':'Débloquez la création de votre Qatalink'}/>
  </div>
}
function Metric({value,label}:{value:string;label:string}){return <div className="metric"><b>{value}</b><span>{label}</span></div>}
