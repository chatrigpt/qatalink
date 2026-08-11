'use client';

import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,BarChart3,QrCode,Sparkles,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type State={businessId:string;businessName:string;views:number;whatsapp:number;scans:number;catalogs:number;hoursLeft:number};

export function TrialConversionCoach(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [data,setData]=useState<State|null>(null);const [hidden,setHidden]=useState(false);
  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();if(!session)return;
    const params=new URLSearchParams(location.search);const cid=params.get('catalog');let business:any=null;
    if(cid){const {data:c}=await supabase.from('catalogs').select('business_id').eq('id',cid).maybeSingle();if(c?.business_id){const {data:b}=await supabase.from('businesses').select('id,name').eq('id',c.business_id).maybeSingle();business=b}}
    if(!business){const {data:bs}=await supabase.from('businesses').select('id,name').order('created_at',{ascending:true}).limit(1);business=bs?.[0]||null}
    if(!business)return;
    const {data:ss}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',business.id).order('created_at',{ascending:false}).limit(1);const sub=ss?.[0];if(!sub||sub.plan_code!=='trial'||sub.status!=='trialing'||!sub.current_period_end)return;const end=new Date(sub.current_period_end).getTime();if(end<=Date.now())return;
    const {data:cs}=await supabase.from('catalogs').select('id').eq('business_id',business.id);const ids=(cs||[]).map((c:any)=>c.id);let views=0,whatsapp=0,scans=0;
    if(ids.length){const [v,w,q]=await Promise.all([
      supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','catalog_view'),
      supabase.from('catalog_behavior_events').select('*',{count:'exact',head:true}).in('catalog_id',ids).eq('event_type','whatsapp_click'),
      supabase.from('catalog_scan_events').select('*',{count:'exact',head:true}).in('catalog_id',ids)
    ]);views=v.count||0;whatsapp=w.count||0;scans=q.count||0}
    setData({businessId:business.id,businessName:business.name||'Votre entreprise',views,whatsapp,scans,catalogs:ids.length,hoursLeft:Math.max(0,(end-Date.now())/36e5)});
  })()},[supabase]);
  if(!data||hidden)return null;
  let title='Faites vivre votre catalogue';let body='Votre catalogue est prêt. Partagez votre lien ou votre QR pour obtenir vos premières visites.';let cta='Partager maintenant';let tab='qr';let icon=<QrCode size={18}/>;
  if(data.hoursLeft<=6){title='Votre essai se termine bientôt';body=data.views>0?`${data.views} visite${data.views>1?'s':''} ont déjà été enregistrées. Activez une formule pour garder votre catalogue accessible.`:'Activez une formule pour garder votre catalogue accessible après la fin de l’essai.';cta='Garder mon catalogue actif';tab='subscription';icon=<Sparkles size={18}/>}
  else if(data.whatsapp>0){title='Votre catalogue génère déjà des contacts';body=`${data.whatsapp} ouverture${data.whatsapp>1?'s':''} WhatsApp enregistrée${data.whatsapp>1?'s':''}. Gardez cette continuité après l’essai.`;cta='Voir les formules';tab='subscription';icon=<Sparkles size={18}/>}
  else if(data.views>0){title='Des clients regardent déjà votre catalogue';body=`${data.views} visite${data.views>1?'s':''} enregistrée${data.views>1?'s':''}${data.scans?` · ${data.scans} scan${data.scans>1?'s':''} QR`:''}. Continuez à le partager pour générer des contacts.`;cta='Voir mes résultats';tab='stats';icon=<BarChart3 size={18}/>}
  return <aside className="trial-conversion-coach"><button className="trial-conversion-close" onClick={()=>setHidden(true)} aria-label="Fermer"><X size={14}/></button><div className="trial-conversion-icon">{icon}</div><div><span className="eyebrow">PENDANT VOTRE ESSAI</span><h3>{title}</h3><p>{body}</p><button onClick={()=>window.location.href=`/dashboard?tab=${tab}`}><span>{cta}</span><ArrowRight size={14}/></button></div></aside>;
}
