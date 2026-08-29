'use client';

import {useEffect,useMemo,useState} from 'react';
import {BarChart3,Download,FileText,RefreshCw} from 'lucide-react';

type Preset='month'|'previous_month'|'chosen_month'|'week'|'yesterday'|'custom';
type Stats={catalog?:{title?:string;currency_code?:string};period?:{start:string;end:string};access?:{can_view_revenue?:boolean};summary?:{orders_count?:number;revenue_minor?:number|null;average_order_minor?:number|null;scans?:number;catalog_events?:number;unique_sessions?:number};statuses?:any[];sources?:any[];events?:any[];top_items?:any[];orders?:any[]};

function localStart(d:Date){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function bounds(preset:Preset,chosenMonth:string,from:string,to:string){
  const now=new Date();let start:Date,end:Date;
  if(preset==='previous_month'){start=new Date(now.getFullYear(),now.getMonth()-1,1);end=new Date(now.getFullYear(),now.getMonth(),1)}
  else if(preset==='chosen_month'){const [y,m]=chosenMonth.split('-').map(Number);start=new Date(y||now.getFullYear(),Math.max(0,(m||1)-1),1);end=new Date(start.getFullYear(),start.getMonth()+1,1)}
  else if(preset==='week'){start=localStart(now);const day=(start.getDay()+6)%7;start.setDate(start.getDate()-day);end=new Date(now.getTime()+1000)}
  else if(preset==='yesterday'){end=localStart(now);start=new Date(end);start.setDate(start.getDate()-1)}
  else if(preset==='custom'){start=new Date(`${from}T00:00:00`);end=new Date(`${to}T00:00:00`);end.setDate(end.getDate()+1)}
  else{start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getTime()+1000)}
  return {start:start.toISOString(),end:end.toISOString()};
}
function money(v:number|null|undefined,currency='XOF'){
  if(v==null)return'—';
  const value=Number(v);
  if(currency==='XOF')return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(value).replace(/\u202f/g,' ')} F CFA`;
  try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency}).format(value)}catch{return `${new Intl.NumberFormat('fr-FR').format(value)} ${currency}`}
}
function csvCell(v:any){const s=String(v??'');return /[",\n;]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function ascii(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?').replace(/([\\()])/g,'\\$1')}
function simplePdf(lines:string[]){
  const text=lines.slice(0,55).map((line,i)=>`${i===0?'BT /F1 16 Tf 42 800 Td':'0 -14 Td'} (${ascii(line)}) Tj`).join('\n')+'\nET';
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${new TextEncoder().encode(text).length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(new TextEncoder().encode(pdf).length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=new TextEncoder().encode(pdf).length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:'application/pdf'});
}

export function OpsPosStats({accessKey}:{accessKey:string}){
  const storageKey=useMemo(()=>`qatalink_ops_pin_${accessKey}`,[accessKey]);
  const [pin,setPin]=useState('');const [allowed,setAllowed]=useState<boolean|null>(null);const [preset,setPreset]=useState<Preset>('month');const [chosenMonth,setChosenMonth]=useState(new Date().toISOString().slice(0,7));const [from,setFrom]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10));const [to,setTo]=useState(new Date().toISOString().slice(0,10));const [stats,setStats]=useState<Stats|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{const read=()=>{try{setPin(sessionStorage.getItem(storageKey)||'')}catch{}};read();const timer=setInterval(read,1200);return()=>clearInterval(timer)},[storageKey]);
  useEffect(()=>{if(pin.length>=4)void checkPermission();else{setAllowed(null);setStats(null)}},[pin]);
  async function api(action:string,extra:any={}){const r=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_key:accessKey,pin,action,...extra}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(d?.error||'ACTION_FAILED'));return d}
  async function checkPermission(){try{const d=await api('list',{limit:1});const ok=!!d?.access?.can_view_catalog_stats;setAllowed(ok);if(ok)void load()}catch{setAllowed(false)}}
  async function load(){if(pin.length<4)return;setBusy(true);setError('');try{const b=bounds(preset,chosenMonth,from,to);const d=await api('stats',b);setStats(d);setAllowed(true)}catch(e:any){const msg=String(e?.message||'');if(msg.includes('STATS_FORBIDDEN')){setAllowed(false);setError('Cet accès n’a pas l’autorisation de voir les statistiques du catalogue.')}else setError(msg||'Statistiques indisponibles.')}finally{setBusy(false)}}
  useEffect(()=>{if(allowed)void load()},[preset,chosenMonth,from,to]);
  function exportCsv(){if(!stats)return;const rows=[['Commande','Date','Statut','Source','Total']];for(const o of stats.orders||[])rows.push([o.order_number,new Date(o.created_at).toLocaleString('fr-FR'),o.status,o.source,o.total_minor==null?'':String(Number(o.total_minor))]);const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`qatalink-stats-${new Date().toISOString().slice(0,10)}.csv`)}
  function exportPdf(){if(!stats)return;const s=stats.summary||{},currency=stats.catalog?.currency_code||'XOF';const lines=[`Qatalink - Rapport POS - ${stats.catalog?.title||'Catalogue'}`,`Periode: ${new Date(stats.period?.start||'').toLocaleDateString('fr-FR')} - ${new Date(stats.period?.end||'').toLocaleDateString('fr-FR')}`,`Commandes: ${s.orders_count||0}`,`Chiffre d'affaires: ${money(s.revenue_minor,currency)}`,`Panier moyen: ${money(s.average_order_minor,currency)}`,`Scans QR: ${s.scans||0}`,`Sessions catalogue: ${s.unique_sessions||0}`,`Evenements catalogue: ${s.catalog_events||0}`,'','Top articles:',...(stats.top_items||[]).slice(0,12).map((x:any)=>`- ${x.name}: ${x.quantity} unite(s)${x.revenue_minor==null?'':` - ${money(x.revenue_minor,currency)}`}`),'','Commandes recentes:',...(stats.orders||[]).slice(0,24).map((o:any)=>`${o.order_number} | ${new Date(o.created_at).toLocaleString('fr-FR')} | ${o.status} | ${o.source}${o.total_minor==null?'':` | ${money(o.total_minor,currency)}`}`)];downloadBlob(simplePdf(lines),`qatalink-stats-${new Date().toISOString().slice(0,10)}.pdf`)}
  if(!pin||allowed===null)return null;
  if(!allowed)return null;
  const s=stats?.summary||{},currency=stats?.catalog?.currency_code||'XOF';
  return <section className="ops-pos-stats"><div className="ops-pos-stats-head"><div><span>STATISTIQUES</span><h2><BarChart3 size={22}/> Analyse du point de vente</h2><p>Choisissez la période à analyser puis exportez le rapport.</p></div><button type="button" onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/>Actualiser</button></div>
    <div className="ops-stats-filters"><label>Période<select value={preset} onChange={e=>setPreset(e.target.value as Preset)}><option value="month">Mois en cours</option><option value="previous_month">Mois passé</option><option value="chosen_month">Mois au choix</option><option value="week">Semaine en cours</option><option value="yesterday">Veille</option><option value="custom">Période au choix</option></select></label>{preset==='chosen_month'&&<label>Mois<input type="month" value={chosenMonth} onChange={e=>setChosenMonth(e.target.value)}/></label>}{preset==='custom'&&<><label>Du<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Au<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></>}</div>
    {error&&<p className="ops-stats-error">{error}</p>}{busy&&!stats?<p>Chargement des statistiques…</p>:stats&&<><div className="ops-stats-cards"><article><strong>{s.orders_count||0}</strong><span>Commandes</span></article><article><strong>{money(s.revenue_minor,currency)}</strong><span>Chiffre d’affaires</span></article><article><strong>{money(s.average_order_minor,currency)}</strong><span>Panier moyen</span></article><article><strong>{s.scans||0}</strong><span>Scans QR</span></article><article><strong>{s.unique_sessions||0}</strong><span>Sessions catalogue</span></article><article><strong>{s.catalog_events||0}</strong><span>Actions catalogue</span></article></div><div className="ops-stats-columns"><div><h3>Sources des commandes</h3>{(stats.sources||[]).length?(stats.sources||[]).map((x:any)=><p key={x.source}><b>{x.source}</b><span>{x.count} commande(s){x.revenue_minor==null?'':` · ${money(x.revenue_minor,currency)}`}</span></p>):<small>Aucune commande sur cette période.</small>}</div><div><h3>Articles les plus vendus</h3>{(stats.top_items||[]).length?(stats.top_items||[]).slice(0,8).map((x:any)=><p key={x.name}><b>{x.name}</b><span>{x.quantity} unité(s){x.revenue_minor==null?'':` · ${money(x.revenue_minor,currency)}`}</span></p>):<small>Aucune vente sur cette période.</small>}</div></div><div className="ops-stats-export"><button type="button" onClick={exportCsv}><Download size={16}/>Télécharger CSV</button><button type="button" onClick={exportPdf}><FileText size={16}/>Télécharger PDF</button></div></>}
  </section>;
}
