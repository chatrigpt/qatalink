'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,BarChart3,Clock3,MessageCircle,QrCode,Sparkles,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type State={businessId:string;businessName:string;views:number;whatsapp:number;scans:number;catalogs:number;hoursLeft:number;hoursSinceStart:number;graceHoursLeft:number;active:boolean};

export function TrialConversionCoach(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [data,setData]=useState<State|null>(null);const [hidden,setHidden]=useState(false);

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session)return;
      const params=new URLSearchParams(location.search);const cid=params.get('catalog');let business:any=null;
      if(cid){const {data:c}=await supabase.from('catalogs').select('business_id').eq('id',cid).maybeSingle();if(c?.business_id){const {data:b}=await supabase.from('businesses').select('id,name').eq('id',c.business_id).maybeSingle();business=b}}
      if(!business){const {data:bs}=await supabase.from('businesses').select('id,name').order('created_at',{ascending:true}).limit(1);business=bs?.[0]||null}
      if(!business)return;
      const {data:ss}=await supabase.from('subscriptions').select('plan_code,status,current_period_start,current_period_end').eq('business_id',business.id).order('created_at',{ascending:false}).limit(1);const sub=ss?.[0];
      if(!sub||sub.plan_code!=='trial'||!sub.current_period_end)return;
      const now=Date.now();const end=new Date(sub.current_period_end).getTime();const start=sub.current_period_start?new Date(sub.current_period_start).getTime():end-7*24*36e5;
      const active=end>now&&sub.status==='trialing';const graceHoursLeft=Math.max(0,(end+48*36e5-now)/36e5);
      if(!active&&graceHoursLeft<=0)return;
      const {data:cs}=await supabase.from('catalogs').select('id').eq('business_id',business.id);const ids=(cs||[]).map((c:any)=>c.id);let views=0,whatsapp=0,scans=0;
      if(ids.length){const [v,w,q]=await Promise.all([
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','catalog_view'),
        supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','whatsapp_click'),
        supabase.from('catalog_scan_events').select('*',{count:'exact',head:true}).in('catalog_id',ids)
      ]);views=v.count||0;whatsapp=w.count||0;scans=q.count||0}
      if(alive)setData({businessId:business.id,businessName:business.name||'Votre entreprise',views,whatsapp,scans,catalogs:ids.length,hoursLeft:Math.max(0,(end-now)/36e5),hoursSinceStart:Math.max(0,(now-start)/36e5),graceHoursLeft,active});
    };
    load();const id=window.setInterval(load,30000);return()=>{alive=false;clearInterval(id)};
  },[supabase]);

  if(!data||hidden)return null;
  const day=Math.max(1,Math.min(7,Math.floor(data.hoursSinceStart/24)+1));
  let title='Faites vivre votre catalogue';let body='Votre catalogue est prêt. Partagez votre lien ou votre QR pour obtenir vos premières visites.';let cta='Partager maintenant';let tab='qr';let icon=<QrCode size={18}/>;let eyebrow=`JOUR ${day} DE VOTRE ESSAI`;

  if(!data.active){
    eyebrow='48 H DE GRÂCE';title='Votre essai est terminé, votre lien respire encore';body=`Votre catalogue reste accessible environ ${Math.max(1,Math.ceil(data.graceHoursLeft))} h pour éviter une coupure brutale. Activez une formule pour conserver le lien au-delà de cette période.`;cta='Garder mon catalogue actif';tab='subscription';icon=<Clock3 size={18}/>;
  }else if(data.hoursLeft<=24){
    title='Dernières 24 h : gardez ce que vous avez construit';body=data.views>0?`${data.views} visite${data.views>1?'s':''}${data.whatsapp?` · ${data.whatsapp} ouverture${data.whatsapp>1?'s':''} WhatsApp`:''}. Votre catalogue a déjà commencé à travailler. Activez une formule pour éviter son interruption après la période de grâce.`:'Votre catalogue est prêt. Activez une formule maintenant pour le garder disponible après l’essai.';cta='Conserver mon Qatalink';tab='subscription';icon=<Sparkles size={18}/>;
  }else if(data.whatsapp>0){
    title='Votre catalogue génère déjà des contacts';body=`${data.whatsapp} ouverture${data.whatsapp>1?'s':''} WhatsApp enregistrée${data.whatsapp>1?'s':''}. Vous avez atteint le signal le plus fort : quelqu’un est passé de votre catalogue au contact.`;cta='Garder cette dynamique';tab='subscription';icon=<MessageCircle size={18}/>;
  }else if(data.hoursSinceStart>=72&&data.views>0){
    title='Votre catalogue commence déjà à travailler';body=`${data.views} visite${data.views>1?'s':''}${data.scans?` · ${data.scans} scan${data.scans>1?'s':''} QR`:''}. Vous pouvez déjà sécuriser votre formule, sans attendre la fin des 7 jours.`;cta='Voir les formules';tab='subscription';icon=<BarChart3 size={18}/>;
  }else if(data.views>0){
    title='Des clients regardent déjà votre catalogue';body=`${data.views} visite${data.views>1?'s':''} enregistrée${data.views>1?'s':''}${data.scans?` · ${data.scans} scan${data.scans>1?'s':''} QR`:''}. Continuez à le partager : l’objectif suivant est votre première ouverture WhatsApp.`;cta='Voir mes résultats';tab='stats';icon=<BarChart3 size={18}/>;
  }

  return <aside className="trial-conversion-coach"><button className="trial-conversion-close" onClick={()=>setHidden(true)} aria-label="Fermer"><X size={14}/></button><div className="trial-conversion-icon">{icon}</div><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{body}</p><button onClick={()=>window.location.href=`/dashboard?tab=${tab}`}><span>{cta}</span><ArrowRight size={14}/></button></div></aside>;
}
