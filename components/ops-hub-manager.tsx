'use client';

import {ExternalLink,Globe2,Plus,Save,Trash2} from 'lucide-react';
import {useEffect,useState} from 'react';

type HubLink={id:string;kind:string;label:string;url:string;sort_order:number;is_visible:boolean};
type HubEditor={settings:Record<string,any>;links:HubLink[]};

const KINDS=[['custom','Lien'],['whatsapp','WhatsApp'],['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['youtube','YouTube'],['website','Site web'],['maps','Google Maps'],['google_reviews','Avis Google'],['x','X / Twitter'],['linkedin','LinkedIn']];

export function OpsHubManager({accessKey}:{accessKey:string}){
  const storageKey=`qatalink_ops_pin_${accessKey}`;
  const [hub,setHub]=useState<HubEditor|null>(null);const [catalog,setCatalog]=useState<any>(null);const [busy,setBusy]=useState('');const [notice,setNotice]=useState('');const [newLink,setNewLink]=useState({kind:'custom',label:'',url:''});

  function pin(){try{return sessionStorage.getItem(storageKey)||''}catch{return''}}
  async function api(action:string,extra:Record<string,unknown>={}){const p=pin();if(!p)throw new Error('CODE_REQUIRED');const r=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin:p,action,...extra}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'ACTION_FAILED');return d}
  async function load(){if(!pin())return;try{const d=await api('list',{limit:1});if(!d?.access?.can_manage_hub){setHub(null);return}setCatalog(d.catalog||null);setHub(d.hub_editor||{settings:{},links:[]})}catch{}}
  useEffect(()=>{let count=0;void load();const timer=setInterval(()=>{count++;if(!hub&&count<20)void load()},1000);return()=>clearInterval(timer)},[accessKey]);
  async function edit(editAction:string,payload:Record<string,unknown>){setBusy(editAction);setNotice('');try{await api('edit',{edit_action:editAction,payload});await load();setNotice('Page centrale mise à jour.')}catch(e:any){setNotice(e?.message||'Modification impossible.')}finally{setBusy('')}}
  if(!hub)return null;
  const s=hub.settings||{};
  const patch=(key:string,value:any)=>setHub(h=>h?{...h,settings:{...h.settings,[key]:value}}:h);
  const patchLink=(id:string,key:string,value:any)=>setHub(h=>h?{...h,links:h.links.map(l=>l.id===id?{...l,[key]:value}:l)}:h);
  return <section className="ops-hub-manager">
    <header className="ops-hub-head"><div><span>PAGE CENTRALE</span><h2>Gérer la page centrale</h2><p>Modifiez les informations, le style et les liens visibles sur la page centrale de ce catalogue, sans accéder aux paramètres sensibles du compte.</p></div>{catalog?.hub_url&&<a href={catalog.hub_url} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Voir la page</a>}</header>
    <div className="ops-hub-grid">
      <label>Titre principal<input value={s.profile_headline||''} onChange={e=>patch('profile_headline',e.target.value)} placeholder={catalog?.title||'Titre de la page'}/></label>
      <label>Bio / présentation<textarea value={s.profile_bio||''} onChange={e=>patch('profile_bio',e.target.value)} placeholder="Courte présentation de l’activité"/></label>
      <label>Logo (URL)<input value={s.logo_url||''} onChange={e=>patch('logo_url',e.target.value)} placeholder="https://…"/></label>
      <label>Couverture (URL)<input value={s.cover_url||''} onChange={e=>patch('cover_url',e.target.value)} placeholder="https://…"/></label>
      <label>Style des boutons<select value={s.button_style||'solid'} onChange={e=>patch('button_style',e.target.value)}><option value="solid">Uni</option><option value="gradient">Dégradé</option><option value="glossy">Brillant</option><option value="metallic">Métallique</option></select></label>
      <label>Arrondi des boutons<select value={s.button_radius||'18px'} onChange={e=>patch('button_radius',e.target.value)}><option value="8px">8 px</option><option value="14px">14 px</option><option value="18px">18 px</option><option value="24px">24 px</option><option value="999px">Pilule</option></select></label>
      <label>Couleur principale<input type="color" value={s.button_color||'#C7192F'} onChange={e=>patch('button_color',e.target.value)}/></label>
      <label>Couleur secondaire<input type="color" value={s.button_color_2||'#7A0E1D'} onChange={e=>patch('button_color_2',e.target.value)}/></label>
      <label>Couleur du texte<input type="color" value={s.button_text_color||'#FFFFFF'} onChange={e=>patch('button_text_color',e.target.value)}/></label>
      <label>Couleur de fond<input type="color" value={s.background_color||'#FFFFFF'} onChange={e=>patch('background_color',e.target.value)}/></label>
    </div>
    <button className="ops-hub-save" disabled={busy==='hub_update'} onClick={()=>void edit('hub_update',s)}><Save size={16}/>{busy==='hub_update'?'Enregistrement…':'Enregistrer la page centrale'}</button>

    <div className="ops-hub-links-head"><div><Globe2/><div><h3>Liens de la page</h3><p>Réseaux sociaux, WhatsApp, site, avis Google, localisation ou liens personnalisés.</p></div></div></div>
    <div className="ops-hub-new-link"><select value={newLink.kind} onChange={e=>setNewLink({...newLink,kind:e.target.value})}>{KINDS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input value={newLink.label} onChange={e=>setNewLink({...newLink,label:e.target.value})} placeholder="Libellé"/><input value={newLink.url} onChange={e=>setNewLink({...newLink,url:e.target.value})} placeholder="https://…"/><button disabled={!newLink.label.trim()||!newLink.url.trim()||busy==='hub_link_create'} onClick={async()=>{await edit('hub_link_create',{...newLink,is_visible:true});setNewLink({kind:'custom',label:'',url:''})}}><Plus/>Ajouter</button></div>
    <div className="ops-hub-links">{hub.links.map((link,index)=><article key={link.id}><select value={link.kind||'custom'} onChange={e=>patchLink(link.id,'kind',e.target.value)}>{KINDS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input value={link.label||''} onChange={e=>patchLink(link.id,'label',e.target.value)}/><input value={link.url||''} onChange={e=>patchLink(link.id,'url',e.target.value)}/><label className="ops-hub-visible"><input type="checkbox" checked={link.is_visible!==false} onChange={e=>patchLink(link.id,'is_visible',e.target.checked)}/>Visible</label><div className="ops-hub-link-actions"><button onClick={()=>void edit('hub_link_update',{...link,sort_order:index+1})}><Save/></button><button className="danger" onClick={()=>{if(confirm(`Supprimer « ${link.label} » ?`))void edit('hub_link_delete',{id:link.id})}}><Trash2/></button></div></article>)}{!hub.links.length&&<p className="ops-hub-empty">Aucun lien supplémentaire pour le moment.</p>}</div>
    {notice&&<p className="ops-hub-notice">{notice}</p>}
    <style jsx>{`
      .ops-hub-manager{max-width:1180px;margin:18px auto 42px;padding:22px;border:1px solid var(--line,#e6e6e6);border-radius:22px;background:var(--surface,#fff);color:var(--text,#171717)}
      .ops-hub-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.ops-hub-head span{font-size:11px;font-weight:900;letter-spacing:.12em;color:#c7192f}.ops-hub-head h2{margin:4px 0 5px}.ops-hub-head p,.ops-hub-links-head p{margin:0;color:var(--muted,#6d6d6d);line-height:1.45}.ops-hub-head a{display:flex;gap:7px;align-items:center;text-decoration:none;font-weight:800;color:#c7192f;white-space:nowrap}
      .ops-hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ops-hub-grid label{display:grid;gap:6px;font-size:12px;font-weight:800}.ops-hub-grid input,.ops-hub-grid textarea,.ops-hub-grid select,.ops-hub-new-link input,.ops-hub-new-link select,.ops-hub-links input,.ops-hub-links select{width:100%;border:1px solid var(--line,#ddd);border-radius:12px;background:var(--bg,#fff);color:inherit;padding:11px 12px;font:inherit}.ops-hub-grid textarea{min-height:92px;resize:vertical}.ops-hub-grid input[type=color]{height:44px;padding:4px}
      .ops-hub-save,.ops-hub-new-link button{margin-top:14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:12px;background:#c7192f;color:white;font-weight:900;padding:11px 15px;cursor:pointer}.ops-hub-save:disabled,.ops-hub-new-link button:disabled{opacity:.55}
      .ops-hub-links-head{margin:28px 0 12px;padding-top:22px;border-top:1px solid var(--line,#eee)}.ops-hub-links-head>div{display:flex;gap:10px;align-items:flex-start}.ops-hub-links-head h3{margin:0 0 3px}
      .ops-hub-new-link{display:grid;grid-template-columns:150px 1fr 2fr auto;gap:8px;align-items:center}.ops-hub-new-link button{margin:0;height:43px}
      .ops-hub-links{display:grid;gap:8px;margin-top:12px}.ops-hub-links article{display:grid;grid-template-columns:140px 1fr 2fr auto auto;gap:8px;align-items:center;padding:10px;border:1px solid var(--line,#eee);border-radius:14px}.ops-hub-visible{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:800}.ops-hub-visible input{width:auto}.ops-hub-link-actions{display:flex;gap:5px}.ops-hub-link-actions button{width:36px;height:36px;border:1px solid var(--line,#ddd);border-radius:10px;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer}.ops-hub-link-actions svg{width:15px}.ops-hub-link-actions .danger{color:#c7192f}.ops-hub-empty,.ops-hub-notice{color:var(--muted,#666)}.ops-hub-notice{margin:12px 0 0;font-weight:700}
      @media(max-width:800px){.ops-hub-manager{margin:14px 12px 32px;padding:16px}.ops-hub-head{display:grid}.ops-hub-grid{grid-template-columns:1fr}.ops-hub-new-link,.ops-hub-links article{grid-template-columns:1fr}.ops-hub-link-actions{justify-content:flex-end}}
    `}</style>
  </section>;
}
