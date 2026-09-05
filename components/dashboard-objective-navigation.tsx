'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Boxes,ChevronRight,Megaphone,Settings2,Sparkles,Store,X} from 'lucide-react';

type Goal={title:string;subtitle:string;icon:React.ReactNode;items:{label:string;tab:string}[]};
const goals:Goal[]=[
 {title:'Vendre',subtitle:'Catalogue & produits',icon:<Store size={18}/>,items:[{label:'Mes catalogues',tab:'catalogs'},{label:'Produits et catégories',tab:'items'},{label:'Apparence',tab:'appearance'}]},
 {title:'Attirer',subtitle:'QR & visibilité',icon:<Megaphone size={18}/>,items:[{label:'QR code et partage',tab:'qr'},{label:'Statistiques',tab:'stats'}]},
 {title:'Piloter',subtitle:'Stock & opérations',icon:<Boxes size={18}/>,items:[{label:'Gestion du stock',tab:'items#stock'},{label:'Point de vente',tab:'items#pos'},{label:'Vue d’ensemble',tab:'overview'}]},
 {title:'Automatiser',subtitle:'IA & prévisions',icon:<Sparkles size={18}/>,items:[{label:'Prévisions',tab:'stats#forecast'},{label:'Automatisations',tab:'overview#automation'}]},
 {title:'Configurer',subtitle:'Compte & réglages',icon:<Settings2 size={18}/>,items:[{label:'Abonnement',tab:'subscription'},{label:'Paramètres',tab:'settings'}]},
];

export function DashboardObjectiveNavigation(){
 const [host,setHost]=useState<Element|null>(null);
 const [active,setActive]=useState<Goal|null>(null);
 useEffect(()=>{
  const locate=()=>setHost(document.querySelector('.dash-v3-top'));
  locate();
  const obs=new MutationObserver(locate);
  obs.observe(document.body,{childList:true,subtree:true});
  return()=>obs.disconnect();
 },[]);
 const go=(tab:string)=>{const [section,hash]=tab.split('#');const p=new URLSearchParams(window.location.search);const catalog=p.get('catalog');window.location.href=`/dashboard?tab=${section}${catalog?`&catalog=${catalog}`:''}${hash?`&view=${hash}`:''}`};
 const mobileHub=host?createPortal(<section className="q-objective-mobile-hub"><div className="q-objective-mobile-head"><div><small>VOTRE ESPACE, PAR OBJECTIF</small><b>Que voulez-vous faire ?</b></div></div><div className="q-objective-mobile-grid">{goals.map(goal=><button key={goal.title} onClick={()=>setActive(goal)}><span>{goal.icon}</span><div><b>{goal.title}</b><small>{goal.subtitle}</small></div><ChevronRight size={15}/></button>)}</div></section>,host):null;
 return <>{mobileHub}{active&&<div className="q-objective-backdrop" onClick={()=>setActive(null)}><div className="q-objective-sheet" onClick={e=>e.stopPropagation()}><div className="q-objective-head"><div><small>OBJECTIF</small><h2>{active.title}</h2><p>{active.subtitle}</p></div><button onClick={()=>setActive(null)} aria-label="Fermer"><X size={20}/></button></div><div className="q-objective-links">{active.items.map(item=><button key={item.label} onClick={()=>go(item.tab)}>{item.label}<ChevronRight size={16}/></button>)}</div></div></div>}<style jsx global>{`
.q-objective-mobile-hub{display:none}
@media(max-width:980px){
 .dash-v3-mobile-tabs{display:none!important}
 .q-objective-mobile-hub{display:block;grid-column:1/-1;width:100%;margin-top:2px;padding-top:12px;border-top:1px solid color-mix(in srgb,#b5122b 16%,var(--line))}
 .q-objective-mobile-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:9px}.q-objective-mobile-head small,.q-objective-mobile-head b{display:block}.q-objective-mobile-head small{font-size:9px;font-weight:900;letter-spacing:.11em;color:#b5122b;margin-bottom:3px}.q-objective-mobile-head b{font-size:14px}
 .q-objective-mobile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.q-objective-mobile-grid button{min-width:0;border:1px solid color-mix(in srgb,#b5122b 14%,var(--line));background:var(--surface);color:var(--text);border-radius:15px;padding:10px;display:grid;grid-template-columns:34px minmax(0,1fr) 14px;gap:8px;align-items:center;text-align:left}.q-objective-mobile-grid button:nth-child(1),.q-objective-mobile-grid button:nth-child(4){background:#b5122b;color:#fff;border-color:#b5122b}.q-objective-mobile-grid button:nth-child(5){grid-column:1/-1}.q-objective-mobile-grid button>span{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,#b5122b 12%,var(--surface));color:#b5122b}.q-objective-mobile-grid button:nth-child(1)>span,.q-objective-mobile-grid button:nth-child(4)>span{background:rgba(255,255,255,.16);color:#fff}.q-objective-mobile-grid b,.q-objective-mobile-grid small{display:block;overflow:hidden;text-overflow:ellipsis}.q-objective-mobile-grid b{font-size:12px}.q-objective-mobile-grid small{font-size:9px;opacity:.7;margin-top:2px;white-space:nowrap}
 .q-objective-backdrop{position:fixed;inset:0;z-index:240;display:flex;align-items:flex-end;background:rgba(12,8,10,.56);backdrop-filter:blur(8px);padding:10px}.q-objective-sheet{width:100%;border-radius:26px 26px 18px 18px;background:var(--bg);color:var(--text);padding:20px 16px 22px;border:1px solid var(--line);box-shadow:0 -24px 70px rgba(0,0,0,.28)}.q-objective-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px}.q-objective-head small{font-size:10px;font-weight:900;letter-spacing:.13em;color:#b5122b}.q-objective-head h2{margin:5px 0 4px;font-size:25px}.q-objective-head p{margin:0;color:var(--muted);font-size:12px}.q-objective-head>button{border:1px solid var(--line);background:var(--surface);color:var(--text);width:40px;height:40px;border-radius:13px;display:grid;place-items:center}.q-objective-links{display:grid;gap:8px}.q-objective-links button{display:flex;align-items:center;justify-content:space-between;border:1px solid color-mix(in srgb,#b5122b 14%,var(--line));border-radius:14px;background:var(--surface);color:var(--text);padding:13px 14px;font:800 12px/1.2 var(--font-jakarta),Arial,sans-serif;text-align:left}
 .dash-v3-top{padding:12px!important;border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,#b5122b 8%,var(--surface)),var(--surface));border:1px solid color-mix(in srgb,#b5122b 16%,var(--line));box-shadow:0 12px 30px rgba(181,18,43,.06)}
 .dash-card{border-color:color-mix(in srgb,#b5122b 10%,var(--line))}.dash-card h3{color:color-mix(in srgb,#b5122b 88%,var(--text))}
}
@media(min-width:981px){
 .dash-v3-nav button.active{background:#b5122b!important;color:#fff!important;box-shadow:0 8px 18px rgba(181,18,43,.18)}
 .dash-v3-nav button:hover{background:color-mix(in srgb,#b5122b 10%,var(--surface))}
 .dash-v3-sidebar{border-right-color:color-mix(in srgb,#b5122b 20%,var(--line));background:linear-gradient(180deg,color-mix(in srgb,#b5122b 3%,var(--surface)),var(--surface))}
 .dash-v3-top{padding:16px 18px;border-radius:22px;background:linear-gradient(120deg,color-mix(in srgb,#b5122b 6%,var(--surface)),var(--surface));border:1px solid color-mix(in srgb,#b5122b 14%,var(--line))}
 .dash-card{border-color:color-mix(in srgb,#b5122b 9%,var(--line))}.dash-card:nth-child(3n+1){border-top:4px solid #b5122b}.dash-card:nth-child(3n+2){box-shadow:inset 4px 0 0 color-mix(in srgb,#b5122b 35%,transparent),0 10px 30px rgba(0,0,0,.035)}
 .btn-primary{background:#b5122b!important;border-color:#b5122b!important}
}
`}</style></>;
}
