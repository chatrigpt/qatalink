'use client';

import {useEffect,useMemo,useState} from 'react';
import {Route,Save,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Business={id:string;name:string;business_type:string};
type Catalog={id:string;title:string;business_id:string;customer_flow_settings:any;business:Business};
type Mode={id:string;label:string;hint:string};
type FieldDef={id:string;label:string;hint:string};

const ALL_MODES:Mode[]=[
  {id:'dine_in',label:'Sur place',hint:'Demande un numéro de table.'},
  {id:'takeaway',label:'À emporter',hint:'Retrait de la commande sur place.'},
  {id:'pickup',label:'Retrait sur place',hint:'Retrait en boutique ou point de vente.'},
  {id:'delivery',label:'Livraison',hint:'Demande le nom, le numéro de téléphone et l’adresse de livraison.'},
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
  table:{id:'table',label:'Numéro de table',hint:'Obligatoire pour une commande sur place.'},
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
function lockedRequired(mode:string,key:string){return(mode==='dine_in'&&key==='table')||(mode==='delivery'&&['name','phone','address'].includes(key))}
function legacyRequired(mode:string,type:string,key:string){if(lockedRequired(mode,key))return true;if(type==='hotel'&&(mode==='availability'||mode==='reservation')&&['arrival','departure','guests'].includes(key))return true;if((mode==='appointment'||mode==='visit')&&['date','time'].includes(key))return true;return false}
function defaultRequirements(type:string,modes:string[]){return Object.fromEntries(modes.map(mode=>[mode,Object.fromEntries(fieldsForMode(mode,type).map(key=>[key,legacyRequired(mode,type,key)]))]))}
function defaults(type:string){const modes=suggested[type]||suggested.other;return {enabled:true,modes,mode_labels:Object.fromEntries(modes.map(id=>[id,BY_ID[id]?.label||id])),deposit_percent:10,field_requirements:defaultRequirements(type,modes)}}
function normalizeSettings(c:Catalog){const type=c.business?.business_type||'other';const base=defaults(type);const saved=c.customer_flow_settings||{};const merged={...base,...saved,mode_labels:{...base.mode_labels,...(saved.mode_labels||{})},field_requirements:{...base.field_requirements,...(saved.field_requirements||{})}};for(const mode of Object.keys(merged.field_requirements||{})){for(const key of Object.keys(merged.field_requirements?.[mode]||{})){if(lockedRequired(mode,key))merged.field_requirements[mode][key]=true}}return merged}

export function DashboardCustomerFlow(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [catalogs,setCatalogs]=useState<Catalog[]>([]);const [catalogId,setCatalogId]=useState('');const [settings,setSettings]=useState<any>({});const [notice,setNotice]=useState('');
  const selected=catalogs.find(c=>c.id===catalogId)||null;const businessType=selected?.business?.business_type||'other';const recommended=new Set(suggested[businessType]||suggested.other);

  useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener('qatalink:customer-flow-open',handler as EventListener);(async()=>{
    const [{data:businessRows},{data:catalogRows}]=await Promise.all([
      supabase.from('businesses').select('id,name,business_type').order('created_at',{ascending:true}),
      supabase.from('catalogs').select('id,title,business_id,customer_flow_settings').order('created_at',{ascending:true})
    ]);
    const businessMap=new Map(((businessRows||[]) as Business[]).map(b=>[b.id,b]));
    const list=((catalogRows||[]) as any[]).map(c=>({...c,business:businessMap.get(c.business_id)||{id:c.business_id,name:'Entreprise',business_type:'other'}})) as Catalog[];
    setCatalogs(list);if(list[0]){setCatalogId(list[0].id);setSettings(normalizeSettings(list[0]))}
  })();return()=>window.removeEventListener('qatalink:customer-flow-open',handler as EventListener)},[supabase]);

  function choose(id:string){setCatalogId(id);setNotice('');const c=catalogs.find(x=>x.id===id);if(c)setSettings(normalizeSettings(c))}
  function toggleMode(id:string){if(!selected)return;const modes=Array.isArray(settings.modes)?settings.modes:[];const adding=!modes.includes(id);const next=adding?[...modes,id]:modes.filter((x:string)=>x!==id);setSettings({...settings,modes:next,mode_labels:{...(settings.mode_labels||{}),[id]:settings.mode_labels?.[id]||BY_ID[id]?.label||id},field_requirements:{...(settings.field_requirements||{}),...(adding?{[id]:Object.fromEntries(fieldsForMode(id,businessType).map(key=>[key,legacyRequired(id,businessType,key)]))}:{})}})}
  function rename(id:string,value:string){setSettings({...settings,mode_labels:{...(settings.mode_labels||{}),[id]:value}})}
  function requirement(mode:string,key:string){if(lockedRequired(mode,key))return true;const saved=settings.field_requirements?.[mode]?.[key];return typeof saved==='boolean'?saved:legacyRequired(mode,businessType,key)}
  function setRequirement(mode:string,key:string,required:boolean){if(lockedRequired(mode,key))return;setSettings({...settings,field_requirements:{...(settings.field_requirements||{}),[mode]:{...(settings.field_requirements?.[mode]||{}),[key]:required}}})}
  async function save(){if(!selected)return;const modes=(settings.modes||[]).filter((id:string)=>BY_ID[id]);const clean={...settings,enabled:true,modes,mode_labels:Object.fromEntries(modes.map((id:string)=>[id,String(settings.mode_labels?.[id]||BY_ID[id]?.label||id).trim()])),field_requirements:Object.fromEntries(modes.map((mode:string)=>[mode,Object.fromEntries(fieldsForMode(mode,businessType).map(key=>[key,requirement(mode,key)]))]))};const {error}=await supabase.from('catalogs').update({customer_flow_settings:clean}).eq('id',selected.id);if(error)return setNotice('Impossible d’enregistrer pour le moment.');setCatalogs(x=>x.map(c=>c.id===selected.id?{...c,customer_flow_settings:clean}:c));setSettings(clean);setNotice('Parcours client enregistré pour ce catalogue.')}
  if(!open)return null;

  return <div className="flow-admin-backdrop"><section className="flow-admin-panel"><header><div><span className="eyebrow">PARCOURS CLIENT</span><h2>Configurez le parcours de chaque catalogue</h2><p>Chaque catalogue possède maintenant son propre parcours client. Il démarre avec les réglages recommandés pour le type d’entreprise, puis peut être personnalisé indépendamment.</p></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></header><div className="flow-admin-body">
    <div className="field"><label>Catalogue</label><select className="input" value={catalogId} onChange={e=>choose(e.target.value)}>{catalogs.map(c=><option key={c.id} value={c.id}>{c.title} · {c.business?.name||'Entreprise'}</option>)}</select><small className="field-help">Les modifications ci-dessous ne concernent que ce catalogue.</small></div>
    <section className="flow-admin-card"><Route size={22}/><div><h3>Actions proposées au client</h3><p>Activez ce dont ce catalogue a besoin. Le parcours d’un autre catalogue de la même entreprise peut être complètement différent.</p></div></section>
    <div className="flow-mode-list">{ALL_MODES.map(mode=>{const on=(settings.modes||[]).includes(mode.id);return <div className={'flow-mode flow-mode-edit '+(on?'active':'')} key={mode.id}><label><input type="checkbox" checked={on} onChange={()=>toggleMode(mode.id)}/><span><b>{recommended.has(mode.id)?'Suggéré · ':''}{mode.label}</b><small>{mode.hint}</small></span></label>{on&&<input className="input" value={settings.mode_labels?.[mode.id]||mode.label} onChange={e=>rename(mode.id,e.target.value)} aria-label={`Libellé ${mode.label}`}/>}</div>})}</div>
    {!!selected&&(settings.modes||[]).length>0&&<section style={{display:'grid',gap:14}}><div><h3 style={{margin:'8px 0 4px'}}>Champs obligatoires ou facultatifs</h3><p style={{margin:0,opacity:.72}}>Le numéro de table reste toujours obligatoire pour « Sur place ». Pour « Livraison », le nom, le téléphone et l’adresse restent toujours obligatoires.</p></div>{(settings.modes||[]).map((mode:string)=><div key={mode} style={{border:'1px solid rgba(120,120,140,.22)',borderRadius:16,padding:14,display:'grid',gap:10}}><b>{settings.mode_labels?.[mode]||BY_ID[mode]?.label||mode}</b>{fieldsForMode(mode,businessType).map(key=>{const field=FIELDS[key];const locked=lockedRequired(mode,key);return <div key={key} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(130px,180px)',gap:12,alignItems:'center'}}><div><strong style={{display:'block',fontSize:14}}>{field.label}</strong><small style={{opacity:.65}}>{field.hint}</small></div><select className="input" value={requirement(mode,key)?'required':'optional'} disabled={locked} onChange={e=>setRequirement(mode,key,e.target.value==='required')} aria-label={`${field.label} pour ${mode}`}><option value="required">Obligatoire</option><option value="optional">Facultatif</option></select></div>})}</div>)}</section>}
    {(settings.modes||[]).includes('deposit')&&<div className="field"><label>Acompte indicatif</label><div className="flow-percent"><input className="input" type="number" min="1" max="100" value={Number(settings.deposit_percent||10)} onChange={e=>setSettings({...settings,deposit_percent:Math.max(1,Math.min(100,Number(e.target.value)||10))})}/><span>% du prix affiché</span></div><small className="field-help">Le montant est inclus dans la demande envoyée au professionnel.</small></div>}
    {notice&&<div className="advanced-notice">{notice}</div>}<button className="btn btn-primary" onClick={save}><Save size={15}/>Enregistrer pour ce catalogue</button>
  </div></section></div>;
}
