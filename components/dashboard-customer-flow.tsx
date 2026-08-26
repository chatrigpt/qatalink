'use client';

import {useEffect,useMemo,useState} from 'react';
import {Route,Save,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Business={id:string;name:string;business_type:string;customer_flow_settings:any};
type Mode={id:string;label:string;hint:string};
type FieldDef={id:string;label:string;hint:string};

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
const FIELDS:Record<string,FieldDef>={
  name:{id:'name',label:'Nom du client',hint:'Nom ou prénom du client.'},
  phone:{id:'phone',label:'Téléphone',hint:'Numéro pour joindre le client.'},
  note:{id:'note',label:'Précision / note',hint:'Commentaire libre du client.'},
  table:{id:'table',label:'Numéro de table',hint:'Pour une commande sur place.'},
  address:{id:'address',label:'Adresse de livraison',hint:'Adresse, repère ou position GPS.'},
  area:{id:'area',label:'Quartier / zone',hint:'Zone ou quartier de livraison.'},
  arrival:{id:'arrival',label:'Date d’arrivée',hint:'Pour les demandes hôtelières.'},
  departure:{id:'departure',label:'Date de départ',hint:'Pour les demandes hôtelières.'},
  guests:{id:'guests',label:'Nombre de personnes',hint:'Pour les demandes hôtelières.'},
  date:{id:'date',label:'Date souhaitée',hint:'Pour rendez-vous et visites.'},
  time:{id:'time',label:'Heure souhaitée',hint:'Pour rendez-vous et visites.'}
};
const suggested:Record<string,string[]>={restaurant:['dine_in','takeaway','delivery'],retail:['pickup','delivery'],hotel:['availability','reservation'],spa_beauty:['appointment','information'],real_estate:['availability','visit','reservation','deposit'],other:['appointment','information','contact']};
function fieldsForMode(mode:string,type:string){const keys=['name','phone','note'];if(mode==='dine_in')keys.push('table');if(mode==='delivery')keys.push('address','area');if(type==='hotel'&&(mode==='availability'||mode==='reservation'))keys.push('arrival','departure','guests');if(mode==='appointment'||mode==='visit')keys.push('date','time');return keys}
function legacyRequired(mode:string,type:string,key:string){if(mode==='delivery'&&(key==='phone'||key==='address'))return true;if(mode==='dine_in'&&key==='table')return true;if(type==='hotel'&&(mode==='availability'||mode==='reservation')&&['arrival','departure','guests'].includes(key))return true;if((mode==='appointment'||mode==='visit')&&['date','time'].includes(key))return true;return false}
function defaultRequirements(type:string,modes:string[]){return Object.fromEntries(modes.map(mode=>[mode,Object.fromEntries(fieldsForMode(mode,type).map(key=>[key,legacyRequired(mode,type,key)]))]))}
function defaults(type:string){const modes=suggested[type]||suggested.other;return {enabled:true,modes,mode_labels:Object.fromEntries(modes.map(id=>[id,BY_ID[id]?.label||id])),deposit_percent:10,field_requirements:defaultRequirements(type,modes)}}
function normalizeSettings(b:Business){const base=defaults(b.business_type);const saved=b.customer_flow_settings||{};return {...base,...saved,mode_labels:{...base.mode_labels,...(saved.mode_labels||{})},field_requirements:{...base.field_requirements,...(saved.field_requirements||{})}}}

export function DashboardCustomerFlow(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [businesses,setBusinesses]=useState<Business[]>([]);const [businessId,setBusinessId]=useState('');const [settings,setSettings]=useState<any>({});const [notice,setNotice]=useState('');
  const selected=businesses.find(b=>b.id===businessId)||null;const recommended=new Set(suggested[selected?.business_type||'other']||suggested.other);
  useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener('qatalink:customer-flow-open',handler as EventListener);(async()=>{const {data}=await supabase.from('businesses').select('id,name,business_type,customer_flow_settings').order('created_at',{ascending:true});const list=(data||[]) as Business[];setBusinesses(list);if(list[0]){setBusinessId(list[0].id);setSettings(normalizeSettings(list[0]))}})();return()=>window.removeEventListener('qatalink:customer-flow-open',handler as EventListener)},[supabase]);
  function choose(id:string){setBusinessId(id);setNotice('');const b=businesses.find(x=>x.id===id);if(b)setSettings(normalizeSettings(b))}
  function toggleMode(id:string){if(!selected)return;const modes=Array.isArray(settings.modes)?settings.modes:[];const adding=!modes.includes(id);const next=adding?[...modes,id]:modes.filter((x:string)=>x!==id);setSettings({...settings,modes:next,mode_labels:{...(settings.mode_labels||{}),[id]:settings.mode_labels?.[id]||BY_ID[id]?.label||id},field_requirements:{...(settings.field_requirements||{}),...(adding?{[id]:Object.fromEntries(fieldsForMode(id,selected.business_type).map(key=>[key,legacyRequired(id,selected.business_type,key)]))}:{})}})}
  function rename(id:string,value:string){setSettings({...settings,mode_labels:{...(settings.mode_labels||{}),[id]:value}})}
  function requirement(mode:string,key:string){if(!selected)return false;const saved=settings.field_requirements?.[mode]?.[key];return typeof saved==='boolean'?saved:legacyRequired(mode,selected.business_type,key)}
  function setRequirement(mode:string,key:string,required:boolean){setSettings({...settings,field_requirements:{...(settings.field_requirements||{}),[mode]:{...(settings.field_requirements?.[mode]||{}),[key]:required}}})}
  async function save(){if(!selected)return;const modes=(settings.modes||[]).filter((id:string)=>BY_ID[id]);const clean={...settings,enabled:true,modes,mode_labels:Object.fromEntries(modes.map((id:string)=>[id,String(settings.mode_labels?.[id]||BY_ID[id]?.label||id).trim()])),field_requirements:Object.fromEntries(modes.map((mode:string)=>[mode,Object.fromEntries(fieldsForMode(mode,selected.business_type).map(key=>[key,requirement(mode,key)]))]))};const {error}=await supabase.from('businesses').update({customer_flow_settings:clean}).eq('id',selected.id);if(error)return setNotice('Impossible d’enregistrer pour le moment.');setBusinesses(x=>x.map(b=>b.id===selected.id?{...b,customer_flow_settings:clean}:b));setSettings(clean);setNotice('Parcours client enregistré.')}
  if(!open)return null;
  return <div className="flow-admin-backdrop"><section className="flow-admin-panel"><header><div><span className="eyebrow">PARCOURS CLIENT</span><h2>Choisissez les actions et les champs demandés</h2><p>Activez vos parcours, renommez-les et décidez précisément quels champs le client doit obligatoirement remplir ou peut laisser vides.</p></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></header><div className="flow-admin-body">
    <div className="field"><label>Entreprise</label><select className="input" value={businessId} onChange={e=>choose(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
    <section className="flow-admin-card"><Route size={22}/><div><h3>Actions proposées au client</h3><p>Activez ce dont vous avez besoin. Pour un service B2B, vous pouvez par exemple renommer « Prendre rendez-vous » en « Réserver un appel découverte ».</p></div></section>
    <div className="flow-mode-list">{ALL_MODES.map(mode=>{const on=(settings.modes||[]).includes(mode.id);return <div className={'flow-mode flow-mode-edit '+(on?'active':'')} key={mode.id}><label><input type="checkbox" checked={on} onChange={()=>toggleMode(mode.id)}/><span><b>{recommended.has(mode.id)?'Suggéré · ':''}{mode.label}</b><small>{mode.hint}</small></span></label>{on&&<input className="input" value={settings.mode_labels?.[mode.id]||mode.label} onChange={e=>rename(mode.id,e.target.value)} aria-label={`Libellé ${mode.label}`}/>}</div>})}</div>
    {!!selected&&(settings.modes||[]).length>0&&<section style={{display:'grid',gap:14}}><div><h3 style={{margin:'8px 0 4px'}}>Champs obligatoires ou facultatifs</h3><p style={{margin:0,opacity:.72}}>Le réglage est indépendant pour chaque action. Un téléphone peut par exemple être obligatoire pour « Livraison » mais facultatif pour « Retrait sur place ».</p></div>{(settings.modes||[]).map((mode:string)=><div key={mode} style={{border:'1px solid rgba(120,120,140,.22)',borderRadius:16,padding:14,display:'grid',gap:10}}><b>{settings.mode_labels?.[mode]||BY_ID[mode]?.label||mode}</b>{fieldsForMode(mode,selected.business_type).map(key=>{const field=FIELDS[key];return <div key={key} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(130px,180px)',gap:12,alignItems:'center'}}><div><strong style={{display:'block',fontSize:14}}>{field.label}</strong><small style={{opacity:.65}}>{field.hint}</small></div><select className="input" value={requirement(mode,key)?'required':'optional'} onChange={e=>setRequirement(mode,key,e.target.value==='required')} aria-label={`${field.label} pour ${mode}`}><option value="required">Obligatoire</option><option value="optional">Facultatif</option></select></div>})}</div>)}</section>}
    {(settings.modes||[]).includes('deposit')&&<div className="field"><label>Acompte indicatif</label><div className="flow-percent"><input className="input" type="number" min="1" max="100" value={Number(settings.deposit_percent||10)} onChange={e=>setSettings({...settings,deposit_percent:Math.max(1,Math.min(100,Number(e.target.value)||10))})}/><span>% du prix affiché</span></div><small className="field-help">Le montant est inclus dans la demande envoyée au professionnel.</small></div>}
    {notice&&<div className="advanced-notice">{notice}</div>}<button className="btn btn-primary" onClick={save}><Save size={15}/>Enregistrer mes options</button>
  </div></section></div>;
}
