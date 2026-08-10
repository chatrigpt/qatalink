'use client';

import {useEffect,useMemo,useState} from 'react';
import {Route,Save,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Business={id:string;name:string;business_type:string;customer_flow_settings:any};

type Mode={id:string;label:string;hint:string};

const PRESETS:Record<string,{title:string;description:string;modes:Mode[]}>= {
  restaurant:{title:'Options de commande',description:'Choisissez les parcours proposés au client avant l’envoi de sa commande.',modes:[
    {id:'dine_in',label:'Sur place',hint:'Le client précise son numéro de table.'},
    {id:'takeaway',label:'À emporter',hint:'Le client indique que la commande sera récupérée sur place.'},
    {id:'delivery',label:'Livraison',hint:'Le client renseigne son adresse de livraison.'}
  ]},
  retail:{title:'Retrait ou livraison',description:'Adaptez la commande aux habitudes de votre boutique.',modes:[
    {id:'pickup',label:'Retrait sur place',hint:'Le client récupère sa commande dans votre point de vente.'},
    {id:'delivery',label:'Livraison',hint:'Le client renseigne son adresse de livraison.'}
  ]},
  hotel:{title:'Séjour & réservation',description:'Permettez au client de vérifier ou de réserver selon ses dates.',modes:[
    {id:'availability',label:'Vérifier la disponibilité',hint:'Dates d’arrivée et de départ + nombre de personnes.'},
    {id:'reservation',label:'Demander une réservation',hint:'Dates d’arrivée et de départ + nombre de personnes.'}
  ]},
  spa_beauty:{title:'Rendez-vous',description:'Proposez une prise de rendez-vous ou une simple demande d’information.',modes:[
    {id:'appointment',label:'Prendre rendez-vous',hint:'Date et heure souhaitées.'},
    {id:'information',label:'Demander des informations',hint:'Le client peut envoyer sa demande sans créneau.'}
  ]},
  real_estate:{title:'Parcours immobilier',description:'Choisissez les actions proposées aux visiteurs de vos biens.',modes:[
    {id:'availability',label:'Vérifier la disponibilité',hint:'Demande rapide sur le bien.'},
    {id:'visit',label:'Demander une visite',hint:'Date et heure souhaitées.'},
    {id:'reservation',label:'Réserver le bien',hint:'Demande de réservation transmise au commercial.'},
    {id:'deposit',label:'Réserver avec acompte',hint:'Un acompte indicatif est calculé et inclus dans la demande.'}
  ]},
  other:{title:'Prise de contact',description:'Choisissez le parcours proposé à vos visiteurs.',modes:[
    {id:'contact',label:'Contacter l’entreprise',hint:'Demande générale.'}
  ]}
};

function defaults(type:string){
  if(type==='restaurant')return {enabled:true,modes:['dine_in','takeaway','delivery'],require_table_number:true,require_delivery_address:true};
  if(type==='retail')return {enabled:true,modes:['pickup','delivery'],require_delivery_address:true};
  if(type==='hotel')return {enabled:true,modes:['availability','reservation'],require_dates:true,require_guests:true};
  if(type==='spa_beauty')return {enabled:true,modes:['appointment','information'],require_preferred_slot:true};
  if(type==='real_estate')return {enabled:true,modes:['availability','visit','reservation','deposit'],require_preferred_slot:true,deposit_percent:10};
  return {enabled:true,modes:['contact']};
}

export function DashboardCustomerFlow(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [businessId,setBusinessId]=useState('');
  const [settings,setSettings]=useState<any>({});
  const [notice,setNotice]=useState('');
  const selected=businesses.find(b=>b.id===businessId)||null;
  const preset=PRESETS[selected?.business_type||'other']||PRESETS.other;

  useEffect(()=>{
    const handler=()=>setOpen(true);
    window.addEventListener('qatalink:customer-flow-open',handler as EventListener);
    (async()=>{
      const {data}=await supabase.from('businesses').select('id,name,business_type,customer_flow_settings').order('created_at',{ascending:true});
      const list=(data||[]) as Business[];
      setBusinesses(list);
      if(list[0]){
        setBusinessId(list[0].id);
        setSettings({...defaults(list[0].business_type),...(list[0].customer_flow_settings||{})});
      }
    })();
    return()=>window.removeEventListener('qatalink:customer-flow-open',handler as EventListener);
  },[supabase]);

  function choose(id:string){
    setBusinessId(id);setNotice('');
    const b=businesses.find(x=>x.id===id);
    if(b)setSettings({...defaults(b.business_type),...(b.customer_flow_settings||{})});
  }
  function toggleMode(id:string){
    const modes=Array.isArray(settings.modes)?settings.modes:[];
    setSettings({...settings,modes:modes.includes(id)?modes.filter((x:string)=>x!==id):[...modes,id]});
  }
  async function save(){
    if(!selected)return;
    const clean={...settings,enabled:true};
    const {error}=await supabase.from('businesses').update({customer_flow_settings:clean}).eq('id',selected.id);
    if(error)return setNotice('Impossible d’enregistrer pour le moment.');
    setBusinesses(x=>x.map(b=>b.id===selected.id?{...b,customer_flow_settings:clean}:b));
    setNotice('Parcours client enregistré.');
  }

  if(!open)return null;
  return <div className="flow-admin-backdrop"><section className="flow-admin-panel">
    <header><div><span className="eyebrow">PARCOURS CLIENT</span><h2>Options proposées aux visiteurs</h2></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></header>
    <div className="flow-admin-body">
      <div className="field"><label>Entreprise</label><select className="input" value={businessId} onChange={e=>choose(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <section className="flow-admin-card"><Route size={22}/><div><h3>{preset.title}</h3><p>{preset.description}</p></div></section>
      <div className="flow-mode-list">{preset.modes.map(mode=>{const on=(settings.modes||[]).includes(mode.id);return <label className={'flow-mode '+(on?'active':'')} key={mode.id}><input type="checkbox" checked={on} onChange={()=>toggleMode(mode.id)}/><span><b>{mode.label}</b><small>{mode.hint}</small></span></label>})}</div>
      {selected?.business_type==='real_estate'&&(settings.modes||[]).includes('deposit')&&<div className="field"><label>Acompte indicatif</label><div className="flow-percent"><input className="input" type="number" min="1" max="100" value={Number(settings.deposit_percent||10)} onChange={e=>setSettings({...settings,deposit_percent:Math.max(1,Math.min(100,Number(e.target.value)||10))})}/><span>% du prix affiché</span></div><small className="field-help">Ce montant est calculé dans la demande. Le règlement est ensuite confirmé avec l’entreprise.</small></div>}
      {notice&&<div className="advanced-notice">{notice}</div>}
      <button className="btn btn-primary" onClick={save}><Save size={15}/>Enregistrer</button>
    </div>
  </section></div>;
}
