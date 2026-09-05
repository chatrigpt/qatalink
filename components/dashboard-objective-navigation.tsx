'use client';
import {useState} from 'react';
import {BarChart3,Boxes,ChevronRight,Megaphone,Settings2,Sparkles,Store,X} from 'lucide-react';

type Goal={title:string;subtitle:string;icon:React.ReactNode;items:{label:string;tab:string}[]};
const goals:Goal[]=[
 {title:'Vendre et présenter',subtitle:'Catalogue, articles et apparence',icon:<Store size={20}/>,items:[{label:'Mes catalogues',tab:'catalogs'},{label:'Produits et catégories',tab:'items'},{label:'Design du catalogue',tab:'appearance'}]},
 {title:'Partager et attirer',subtitle:'QR code, visibilité et supports',icon:<Megaphone size={20}/>,items:[{label:'QR code et partage',tab:'qr'},{label:'Voir les statistiques',tab:'stats'}]},
 {title:'Piloter mon activité',subtitle:'Stock, commandes et performances',icon:<Boxes size={20}/>,items:[{label:'Gestion du stock',tab:'items#stock'},{label:'Performances',tab:'stats'},{label:'Vue d’ensemble',tab:'overview'}]},
 {title:'Automatiser et prévoir',subtitle:'IA, prévisions et actions intelligentes',icon:<Sparkles size={20}/>,items:[{label:'Prévision et IA',tab:'stats#forecast'},{label:'Outils intelligents',tab:'overview#automation'}]},
 {title:'Configurer mon espace',subtitle:'Abonnement et paramètres',icon:<Settings2 size={20}/>,items:[{label:'Mon abonnement',tab:'subscription'},{label:'Paramètres',tab:'settings'}]},
];

export function DashboardObjectiveNavigation(){
 const [open,setOpen]=useState(false);
 const go=(tab:string)=>{const [section,hash]=tab.split('#');window.location.href=`/dashboard?tab=${section}${hash?`#${hash}`:''}`};
 return <>
  <button className="q-objective-trigger" onClick={()=>setOpen(true)}><Sparkles size={17}/><span>Mes objectifs</span></button>
  {open&&<div className="q-objective-backdrop" onClick={()=>setOpen(false)}><div className="q-objective-sheet" onClick={e=>e.stopPropagation()}>
   <div className="q-objective-head"><div><small>ESPACE QATALINK</small><h2>Que voulez-vous faire ?</h2><p>Choisissez un objectif : Qatalink vous montre uniquement les outils utiles.</p></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X size={20}/></button></div>
   <div className="q-objective-grid">{goals.map(goal=><section key={goal.title} className="q-objective-card"><div className="q-objective-title"><span>{goal.icon}</span><div><b>{goal.title}</b><small>{goal.subtitle}</small></div></div><div className="q-objective-links">{goal.items.map(item=><button key={item.label} onClick={()=>go(item.tab)}>{item.label}<ChevronRight size={15}/></button>)}</div></section>)}</div>
  </div></div>}
  <style jsx global>{`
   .q-objective-trigger{display:none}.q-objective-backdrop{display:none}
   @media(max-width:980px){
    .dash-v3-mobile-tabs{display:none!important}
    .q-objective-trigger{position:fixed;left:14px;bottom:18px;z-index:119;display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 16px;background:#b5122b;color:#fff;font:850 13px/1 var(--font-jakarta),Arial,sans-serif;box-shadow:0 14px 36px rgba(181,18,43,.28);cursor:pointer}
    .q-objective-backdrop{position:fixed;inset:0;z-index:220;display:flex;align-items:flex-end;background:rgba(12,8,10,.56);backdrop-filter:blur(8px);padding:10px}
    .q-objective-sheet{width:100%;max-height:min(88vh,820px);overflow:auto;border-radius:28px 28px 18px 18px;background:var(--bg);color:var(--text);padding:20px 16px 22px;border:1px solid var(--line);box-shadow:0 -24px 70px rgba(0,0,0,.28)}
    .q-objective-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}.q-objective-head small{font-size:10px;font-weight:900;letter-spacing:.13em;color:#b5122b}.q-objective-head h2{margin:5px 0 6px;font-size:25px;letter-spacing:-.035em}.q-objective-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}.q-objective-head>button{border:1px solid var(--line);background:var(--surface);color:var(--text);width:40px;height:40px;border-radius:13px;display:grid;place-items:center}
    .q-objective-grid{display:grid;gap:10px}.q-objective-card{border:1px solid color-mix(in srgb,#b5122b 16%,var(--line));border-radius:20px;background:var(--surface);overflow:hidden}.q-objective-title{display:flex;gap:11px;align-items:center;padding:14px}.q-objective-title>span{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#b5122b;color:#fff}.q-objective-title b,.q-objective-title small{display:block}.q-objective-title b{font-size:14px}.q-objective-title small{margin-top:3px;color:var(--muted);font-size:10px}.q-objective-links{display:grid;border-top:1px solid var(--line)}.q-objective-links button{display:flex;align-items:center;justify-content:space-between;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);padding:12px 14px;font:750 12px/1.2 var(--font-jakarta),Arial,sans-serif;text-align:left}.q-objective-links button:last-child{border-bottom:0}
    .dash-v3-main{padding-bottom:88px!important}.dash-v3-top{padding:12px;border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,#b5122b 7%,var(--surface)),var(--surface));border:1px solid color-mix(in srgb,#b5122b 14%,var(--line))}
   }
   @media(min-width:981px){.dash-v3-nav button.active{background:#b5122b!important;color:#fff!important}.dash-v3-nav button:hover{background:color-mix(in srgb,#b5122b 10%,var(--surface))}.dash-card:nth-child(3n+1){border-top:3px solid #b5122b}.dash-v3-top .eyebrow{color:#b5122b!important}.dash-v3-sidebar{border-right-color:color-mix(in srgb,#b5122b 16%,var(--line))}}
  `}</style>
 </>;
}
