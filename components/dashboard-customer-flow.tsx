'use client';

import {useEffect,useMemo,useState} from 'react';
import {Route,Save,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Business={id:string;name:string;business_type:string;customer_flow_settings:any};
type Mode={id:string;label:string;hint:string};

const ALL_MODES:Mode[]=[
  {id:'dine_in',label:'Sur place',hint:'Demande un numéro de table.'},
  {id:'takeaway',label:'À emporter',hint:'Retrait de la commande sur place.'},
  {id:'pickup',label:'Retrait sur place',hint:'Retrait en boutique ou point de vente.'},
  {id:'delivery',label:'Livraison',hint:'Demande une adresse et une zone de livraison.'},
  {id:'availability',label:'Vérifier la disponibilité',hint:'Demande de disponibilité.'},
  {id:'reservation',label:'Réserver',hint:'Demande de réservation.'},
  {id:'visit',label:'Demander une visite',hint:'Demande une date et une heure.'},
  {id:'deposit',label:'Réserver avec acompte',hint:'Calcule un acompte indicatif à partir du prix.'},
  {id:'appointment',label:'Prendre rendez-vous',hint:'Demande une date et une heure. Idéal aussi pour un appel découverte.'},
  {id:'information',label:'Demander des informations',hint:'Demande libre sans créneau.'},
  {id:'contact',label:'Contacter l’entreprise',hint:'Prise de contact générale.'}
];
const BY_ID=Object.fromEntries(ALL_MODES.map(m=>[m.id,m]));
const suggested:Record<string,string[]>={restaurant:['dine_in','takeaway','delivery'],retail:['pickup','delivery'],hotel:['availability','reservation'],spa_beauty:['appointment','information'],real_estate:['availability','visit','reservation','deposit'],other:['appointment','information','contact']};
function defaults(type:string){const modes=suggested[type]||suggested.other;return {enabled:true,modes,mode_labels:Object.fromEntries(modes.map(id=>[id,BY_ID[id]?.label||id])),deposit_percent:10}}

export function DashboardCustomerFlow(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [businesses,setBusinesses]=useState<Business[]>([]);const [businessId,setBusinessId]=useState('');const [settings,setSettings]=useState<any>({});const [notice,setNotice]=useState('');
  const selected=businesses.find(b=>b.id===businessId)||null;const recommended=new Set(suggested[selected?.business_type||'other']||suggested.other);
  useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener('qatalink:customer-flow-open',handler as EventListener);(async()=>{const {data}=await supabase.from('businesses').select('id,name,business_type,customer_flow_settings').order('created_at',{ascending:true});const list=(data||[]) as Business[];setBusinesses(list);if(list[0]){setBusinessId(list[0].id);setSettings({...defaults(list[0].business_type),...(list[0].customer_flow_settings||{})})}})();return()=>window.removeEventListener('qatalink:customer-flow-open',handler as EventListener)},[supabase]);
  function choose(id:string){setBusinessId(id);setNotice('');const b=businesses.find(x=>x.id===id);if(b)setSettings({...defaults(b.business_type),...(b.customer_flow_settings||{})})}
  function toggleMode(id:string){const modes=Array.isArray(settings.modes)?settings.modes:[];const next=modes.includes(id)?modes.filter((x:string)=>x!==id):[...modes,id];setSettings({...settings,modes:next,mode_labels:{...(settings.mode_labels||{}),[id]:settings.mode_labels?.[id]||BY_ID[id]?.label||id}})}
  function rename(id:string,value:string){setSettings({...settings,mode_labels:{...(settings.mode_labels||{}),[id]:value}})}
  async function save(){if(!selected)return;const clean={...settings,enabled:true,modes:(settings.modes||[]).filter((id:string)=>BY_ID[id]),mode_labels:Object.fromEntries((settings.modes||[]).map((id:string)=>[id,String(settings.mode_labels?.[id]||BY_ID[id]?.label||id).trim()]))};const {error}=await supabase.from('businesses').update({customer_flow_settings:clean}).eq('id',selected.id);if(error)return setNotice('Impossible d’enregistrer pour le moment.');setBusinesses(x=>x.map(b=>b.id===selected.id?{...b,customer_flow_settings:clean}:b));setSettings(clean);setNotice('Parcours client enregistré.')}
  if(!open)return null;
  return <div className="flow-admin-backdrop"><section className="flow-admin-panel"><header><div><span className="eyebrow">PARCOURS CLIENT</span><h2>Choisissez et nommez vos actions</h2><p>Les suggestions dépendent de votre activité, mais vous restez libre d’activer et de renommer les options qui correspondent réellement à votre manière de vendre.</p></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></header><div className="flow-admin-body">
    <div className="field"><label>Entreprise</label><select className="input" value={businessId} onChange={e=>choose(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
    <section className="flow-admin-card"><Route size={22}/><div><h3>Actions proposées au client</h3><p>Activez ce dont vous avez besoin. Pour un service B2B, vous pouvez par exemple renommer « Prendre rendez-vous » en « Réserver un appel découverte ».</p></div></section>
    <div className="flow-mode-list">{ALL_MODES.map(mode=>{const on=(settings.modes||[]).includes(mode.id);return <div className={'flow-mode flow-mode-edit '+(on?'active':'')} key={mode.id}><label><input type="checkbox" checked={on} onChange={()=>toggleMode(mode.id)}/><span><b>{recommended.has(mode.id)?'Suggéré · ':''}{mode.label}</b><small>{mode.hint}</small></span></label>{on&&<input className="input" value={settings.mode_labels?.[mode.id]||mode.label} onChange={e=>rename(mode.id,e.target.value)} aria-label={`Libellé ${mode.label}`}/>}</div>})}</div>
    {(settings.modes||[]).includes('deposit')&&<div className="field"><label>Acompte indicatif</label><div className="flow-percent"><input className="input" type="number" min="1" max="100" value={Number(settings.deposit_percent||10)} onChange={e=>setSettings({...settings,deposit_percent:Math.max(1,Math.min(100,Number(e.target.value)||10))})}/><span>% du prix affiché</span></div><small className="field-help">Le montant est inclus dans la demande envoyée au professionnel.</small></div>}
    {notice&&<div className="advanced-notice">{notice}</div>}<button className="btn btn-primary" onClick={save}><Save size={15}/>Enregistrer mes options</button>
  </div></section></div>;
}
