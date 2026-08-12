'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,CheckCircle2,Circle,Eye,MessageCircle,QrCode,Rocket} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type ActivationData={
  businessId:string;
  catalogId:string;
  catalogTitle:string;
  items:number;
  published:boolean;
  views:number;
  scans:number;
  whatsapp:number;
  trial:boolean;
  trialEnd:string|null;
};

function remainingLabel(end:string|null){
  if(!end)return'';
  const ms=Math.max(0,new Date(end).getTime()-Date.now());
  const totalMinutes=Math.floor(ms/60000);
  const d=Math.floor(totalMinutes/1440);
  const h=Math.floor((totalMinutes%1440)/60);
  const m=totalMinutes%60;
  if(d>0)return`${d} j ${h} h restants`;
  if(h>0)return`${h} h ${m} min restantes`;
  return`${m} min restantes`;
}

export function DashboardActivationEngine(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);
  const [data,setData]=useState<ActivationData|null>(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const resolve=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(title!=='Votre espace Qatalink'){setHost(null);return}
      const main=document.querySelector('.dash-v3-main');
      const section=main?.querySelector(':scope > .dash-section');
      setHost(section||null);
    };
    resolve();const mo=new MutationObserver(resolve);mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    const click=()=>setTimeout(resolve,30);document.addEventListener('click',click,true);
    return()=>{mo.disconnect();document.removeEventListener('click',click,true)};
  },[]);

  useEffect(()=>{
    if(!host)return;
    let alive=true;let timer:number|undefined;
    const load=async()=>{
      if(!alive)return;setLoading(true);
      const {data:{session}}=await supabase.auth.getSession();if(!session){setLoading(false);return}
      const {data:businesses}=await supabase.from('businesses').select('id,published').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const business=businesses?.[0];if(!business){if(alive){setData(null);setLoading(false)}return}
      const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',business.id).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1);
      const sub=subs?.[0];const trial=!!sub&&sub.plan_code==='trial'&&sub.status==='trialing'&&!!sub.current_period_end&&new Date(sub.current_period_end).getTime()>Date.now();
      if(!trial){if(alive){setData(null);setLoading(false)}return}
      const params=new URLSearchParams(location.search);const preferred=params.get('catalog');
      const {data:catalogs}=await supabase.from('catalogs').select('id,title,is_active').eq('business_id',business.id).order('created_at',{ascending:false});
      const catalog=(catalogs||[]).find((c:any)=>c.id===preferred)||(catalogs||[])[0];if(!catalog){if(alive){setData({businessId:business.id,catalogId:'',catalogTitle:'',items:0,published:false,views:0,scans:0,whatsapp:0,trial:true,trialEnd:sub.current_period_end});setLoading(false)}return}
      const [itemsResult,viewsResult,scansResult,waResult]=await Promise.all([
        supabase.from('items').select('*',{count:'exact',head:true}).eq('catalog_id',catalog.id),
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).eq('catalog_id',catalog.id).eq('event_type','catalog_view'),
        supabase.from('catalog_scan_events').select('*',{count:'exact',head:true}).eq('catalog_id',catalog.id),
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).eq('catalog_id',catalog.id).eq('event_type','whatsapp_click')
      ]);
      if(alive)setData({businessId:business.id,catalogId:catalog.id,catalogTitle:catalog.title||'Votre catalogue',items:itemsResult.count||0,published:!!business.published&&catalog.is_active!==false,views:viewsResult.count||0,scans:scansResult.count||0,whatsapp:waResult.count||0,trial:true,trialEnd:sub.current_period_end||null});
      if(alive)setLoading(false);
    };
    load();timer=window.setInterval(load,12000);
    return()=>{alive=false;if(timer)clearInterval(timer)};
  },[host,supabase]);

  if(!host||!data)return null;
  const hasCatalog=!!data.catalogId;
  const hasContent=data.items>0;
  const published=data.published;
  const reached=data.views>0||data.scans>0;
  const steps=[hasCatalog,hasContent,published,reached];
  const completed=steps.filter(Boolean).length;

  let title='Créez votre premier catalogue';let body='Votre premier objectif n’est pas de découvrir toutes les fonctions : obtenez un catalogue réel et partageable.';let cta='Créer maintenant';let href='/create';let icon=<Rocket/>;
  if(hasCatalog&&!hasContent){title='Ajoutez votre première offre';body='Votre structure existe. Ajoutez ou importez quelques articles pour obtenir un catalogue que vous pouvez montrer.';cta='Ajouter mes articles';href=`/dashboard?tab=items&catalog=${data.catalogId}`;icon=<Rocket/>}
  else if(hasContent&&!published){title='Votre catalogue est prêt à sortir du dashboard';body='Il contient déjà vos offres. Publiez-le maintenant : vous pourrez continuer à le modifier après la mise en ligne.';cta='Publier mon catalogue';href=`/dashboard?tab=qr&catalog=${data.catalogId}`;icon=<QrCode/>}
  else if(published&&!reached){title='Obtenez votre première vraie visite';body='Votre catalogue est en ligne. Scannez votre QR avec votre téléphone ou partagez le lien à une personne : c’est le moment où Qatalink commence réellement à travailler.';cta='Voir mon QR et partager';href=`/dashboard?tab=qr&catalog=${data.catalogId}`;icon=<QrCode/>}
  else if(reached&&data.whatsapp===0){title='Votre Qatalink est déjà utilisé';body=`${data.views} visite${data.views>1?'s':''}${data.scans?` et ${data.scans} scan${data.scans>1?'s':''} QR`:''} enregistré${data.views+data.scans>1?'s':''}. Continuez à le diffuser pour provoquer votre première intention WhatsApp.`;cta='Voir mes résultats';href=`/dashboard?tab=stats&catalog=${data.catalogId}`;icon=<Eye/>}
  else if(data.whatsapp>0){title='Votre catalogue génère déjà des contacts';body=`${data.whatsapp} ouverture${data.whatsapp>1?'s':''} WhatsApp enregistrée${data.whatsapp>1?'s':''}. Vous avez atteint le signal d’activation le plus important : un client est passé du catalogue au contact.`;cta='Voir mes performances';href=`/dashboard?tab=stats&catalog=${data.catalogId}`;icon=<MessageCircle/>}

  return createPortal(<section className={`activation-engine ${data.whatsapp>0?'is-converted':''}`}>
    <div className="activation-engine-copy"><div className="activation-engine-top"><span className="eyebrow">OBJECTIF DE VOTRE ESSAI</span><span className="activation-time">{remainingLabel(data.trialEnd)}</span></div><div className="activation-engine-main"><div className="activation-engine-icon">{icon}</div><div><h2>{title}</h2><p>{body}</p></div></div><button className="btn btn-primary" onClick={()=>window.location.href=href}>{cta}<ArrowRight size={15}/></button></div>
    <div className="activation-engine-progress"><div className="activation-progress-head"><b>Activation {completed}/4</b><span>{loading?'Actualisation…':'Mise à jour automatique'}</span></div><div className="activation-progress-bar"><i style={{width:`${completed*25}%`}}/></div><div className="activation-checks"><div>{steps[0]?<CheckCircle2/>:<Circle/>}<span>Catalogue créé</span></div><div>{steps[1]?<CheckCircle2/>:<Circle/>}<span>Contenu prêt</span></div><div>{steps[2]?<CheckCircle2/>:<Circle/>}<span>Publié</span></div><div>{steps[3]?<CheckCircle2/>:<Circle/>}<span>Première visite</span></div></div><div className="activation-results"><div><Eye/><b>{data.views}</b><span>visites</span></div><div><QrCode/><b>{data.scans}</b><span>scans</span></div><div><MessageCircle/><b>{data.whatsapp}</b><span>WhatsApp</span></div></div></div>
  </section>,host);
}
