'use client';

import {useEffect,useMemo,useState} from 'react';
import {ShoppingCart,Copy,ExternalLink,Plus,Settings2,Trash2,Users,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const PERMISSIONS:[string,string][]=[
  ['can_view_revenue','Voir le chiffre d’affaires'],
  ['can_view_catalog_stats','Voir les statistiques du catalogue'],
  ['can_update_status','Changer le statut des commandes'],
  ['can_cancel_orders','Annuler des commandes'],
  ['can_print','Imprimer les tickets'],
  ['can_merge_orders','Fusionner des commandes'],
  ['can_edit_categories','Modifier les catégories'],
  ['can_edit_items','Modifier les articles'],
  ['can_edit_photos','Modifier les photos'],
  ['can_edit_prices','Modifier les prix'],
  ['can_generate_images','Générer des images'],
  ['can_use_whatsapp','Utiliser WhatsApp'],
];

export function DashboardPosCenter(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [catalogs,setCatalogs]=useState<any[]>([]);const [catalogId,setCatalogId]=useState('');const [workspace,setWorkspace]=useState<any>(null);const [busy,setBusy]=useState('');const [notice,setNotice]=useState('');
  const [newAccess,setNewAccess]=useState<any>({label:'Équipe caisse',pin:'',can_view_revenue:true,can_view_catalog_stats:false,can_update_status:true,can_cancel_orders:false,can_print:true,can_merge_orders:true,can_edit_categories:false,can_edit_items:false,can_edit_photos:false,can_edit_prices:false,can_generate_images:false,can_use_whatsapp:true});

  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let observer:MutationObserver|null=null;
    const mount=()=>{for(const selector of ['.dash-v3-nav','.dash-v3-mobile-tabs']){const host=document.querySelector(selector);if(!host||host.querySelector('[data-qpos]'))continue;const wrap=document.createElement('div');wrap.setAttribute('data-qpos','1');const btn=document.createElement('button');btn.type='button';btn.className='side-item qpos-nav';btn.innerHTML='<span aria-hidden="true">▣</span><span>Point de vente</span>';btn.onclick=()=>setOpen(true);wrap.appendChild(btn);host.appendChild(wrap)}};
    mount();observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer?.disconnect();document.querySelectorAll('[data-qpos]').forEach(x=>x.remove())};
  },[]);

  useEffect(()=>{if(open)void loadCatalogs()},[open]);
  useEffect(()=>{if(open&&catalogId)void loadWorkspace(catalogId)},[catalogId,open]);

  async function loadCatalogs(){setBusy('load');setNotice('');try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Session expirée');const {data:bs}=await supabase.from('businesses').select('id').eq('owner_user_id',user.id).order('created_at',{ascending:true}).limit(1);const bid=bs?.[0]?.id;if(!bid)throw new Error('Entreprise introuvable');const {data}=await supabase.from('catalogs').select('id,title').eq('business_id',bid).order('created_at',{ascending:false});const rows=data||[];setCatalogs(rows);const current=new URLSearchParams(location.search).get('catalog');setCatalogId(c=>c||((current&&rows.some(x=>x.id===current))?current:rows[0]?.id||''))}catch(e:any){setNotice(e.message)}finally{setBusy('')}}
  async function loadWorkspace(id:string){setBusy('workspace');const {data,error}=await supabase.rpc('qatalink_pos_workspace',{p_catalog_id:id});if(error){setNotice(error.message);setWorkspace(null)}else{setWorkspace(data);setNotice('')}setBusy('')}
  async function saveSettings(){if(!catalogId||!workspace?.catalog)return;setBusy('settings');const c=workspace.catalog;const {error}=await supabase.rpc('qatalink_save_pos_settings',{p_catalog_id:catalogId,p_payload:{receipt_title:c.receipt_title||'',receipt_footer:c.receipt_footer||'',order_capture_enabled:c.order_capture_enabled!==false,order_whatsapp_enabled:c.order_whatsapp_enabled!==false}});setBusy('');if(error)setNotice(error.message);else{setNotice('Paramètres du point de vente enregistrés.');await loadWorkspace(catalogId)}}
  async function createAccess(){if(!catalogId||newAccess.pin.length<4)return;setBusy('access');const args:any={p_catalog_id:catalogId,p_label:newAccess.label,p_pin:newAccess.pin};for(const [key] of PERMISSIONS)args[`p_${key}`]=!!newAccess[key];const {data,error}=await supabase.rpc('create_catalog_team_access',args);setBusy('');if(error)setNotice(error.message);else{setNotice(`Accès « ${data?.label||newAccess.label} » créé.`);setNewAccess((v:any)=>({...v,pin:''}));await loadWorkspace(catalogId)}}
  async function updateAccess(row:any,payload:any){setBusy(`access-${row.id}`);const {error}=await supabase.rpc('qatalink_update_team_access',{p_access_id:row.id,p_payload:payload});setBusy('');if(error)setNotice(error.message);else await loadWorkspace(catalogId)}
  async function toggleAccess(row:any){await updateAccess(row,{enabled:!row.enabled})}
  async function togglePermission(row:any,key:string){await updateAccess(row,{[key]:!row[key]})}
  async function deleteAccess(row:any){if(!confirm(`Supprimer l’accès « ${row.label} » ?`))return;const {error}=await supabase.rpc('qatalink_delete_team_access',{p_access_id:row.id});if(error)setNotice(error.message);else await loadWorkspace(catalogId)}
  function copy(text:string){navigator.clipboard?.writeText(text);setNotice('Lien copié.')}

  if(!open)return null;
  const c=workspace?.catalog;const locked=c&&!['interactive','linkhub','trial'].includes(String(c.plan_code||''));
  return <div className="qpos-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section className="qpos-modal">
    <header><div><span>EXPLOITATION</span><h2>Point de vente</h2><p>Centralisez les commandes, les tickets, les accès équipe et les paramètres de caisse depuis un seul espace.</p></div><button onClick={()=>setOpen(false)}><X/></button></header>
    <div className="qpos-toolbar"><label>Catalogue<select value={catalogId} onChange={e=>setCatalogId(e.target.value)}>{catalogs.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>{catalogId&&<a href={`/ops/${workspace?.accesses?.[0]?.access_key||''}`} target="_blank" className={!workspace?.accesses?.length?'disabled':''}><ExternalLink/>Ouvrir l’espace caisse</a>}</div>
    {busy==='load'||busy==='workspace'?<div className="qpos-loading">Chargement…</div>:locked?<div className="qpos-lock"><ShoppingCart/><h3>Point de vente disponible avec Pro et Business</h3><p>La configuration reste visible, mais la création des accès équipe et l’exploitation des commandes nécessitent une formule compatible.</p><a href="/#pricing">Voir les formules</a></div>:c&&<div className="qpos-body">
      <section className="qpos-card"><div className="qpos-card-title"><Settings2/><div><h3>Paramètres caisse & commandes</h3><p>Ces réglages s’appliquent au catalogue sélectionné.</p></div></div><div className="qpos-grid"><label>Titre du ticket<input value={c.receipt_title||''} onChange={e=>setWorkspace((w:any)=>({...w,catalog:{...w.catalog,receipt_title:e.target.value}}))} placeholder="Ex : Ticket de commande"/></label><label>Pied de ticket<input value={c.receipt_footer||''} onChange={e=>setWorkspace((w:any)=>({...w,catalog:{...w.catalog,receipt_footer:e.target.value}}))} placeholder="Ex : Merci et à bientôt"/></label></div><label className="qpos-check"><input type="checkbox" checked={c.order_capture_enabled!==false} onChange={e=>setWorkspace((w:any)=>({...w,catalog:{...w.catalog,order_capture_enabled:e.target.checked}}))}/>Enregistrer les commandes dans Qatalink</label><label className="qpos-check"><input type="checkbox" checked={c.order_whatsapp_enabled!==false} onChange={e=>setWorkspace((w:any)=>({...w,catalog:{...w.catalog,order_whatsapp_enabled:e.target.checked}}))}/>Proposer aussi WhatsApp</label><button className="qpos-primary" onClick={saveSettings} disabled={busy==='settings'}>{busy==='settings'?'Enregistrement…':'Enregistrer les paramètres'}</button></section>

      <section className="qpos-card"><div className="qpos-card-title"><Users/><div><h3>Accès équipe</h3><p>Créez un lien et un code PIN par poste, serveur, caisse ou responsable.</p></div></div><div className="qpos-grid"><label>Nom de l’accès<input value={newAccess.label} onChange={e=>setNewAccess({...newAccess,label:e.target.value})}/></label><label>Code PIN<input type="password" minLength={4} value={newAccess.pin} onChange={e=>setNewAccess({...newAccess,pin:e.target.value})} placeholder="4 caractères minimum"/></label></div><div className="qpos-permissions">{PERMISSIONS.map(([key,label])=><label key={key}><input type="checkbox" checked={!!newAccess[key]} onChange={e=>setNewAccess({...newAccess,[key]:e.target.checked})}/>{label}</label>)}</div><button className="qpos-primary" onClick={createAccess} disabled={busy==='access'||newAccess.pin.length<4}><Plus/>Créer l’accès</button>
      <div className="qpos-access-list">{(workspace.accesses||[]).map((row:any)=><article key={row.id}><div style={{minWidth:0,flex:1}}><b>{row.label}</b><small>{row.enabled?'Actif':'Désactivé'} · dernière utilisation {row.last_used_at?new Date(row.last_used_at).toLocaleString('fr-FR'):'—'}</small><div className="qpos-link"><code>{location.origin}/ops/{row.access_key}</code><button onClick={()=>copy(`${location.origin}/ops/${row.access_key}`)}><Copy/></button></div><div className="qpos-permissions compact" style={{marginTop:10}}>{PERMISSIONS.map(([key,label])=><label key={key}><input type="checkbox" checked={!!row[key]} disabled={busy===`access-${row.id}`} onChange={()=>void togglePermission(row,key)}/>{label}</label>)}</div></div><div className="qpos-row-actions"><button onClick={()=>toggleAccess(row)}>{row.enabled?'Désactiver':'Activer'}</button><button className="danger" onClick={()=>deleteAccess(row)}><Trash2/></button></div></article>)}{!workspace.accesses?.length&&<p className="qpos-empty">Aucun accès équipe pour ce catalogue.</p>}</div></section>
    </div>}
    {notice&&<p className="qpos-notice">{notice}</p>}
  </section></div>;
}
