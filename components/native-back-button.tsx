'use client';

import {ArrowLeft} from 'lucide-react';
import {createPortal} from 'react-dom';
import {useEffect,useState} from 'react';

function isAppSurface(){return /^\/(dashboard|app|ops\/|livreur\/|suivi\/|mobile)/.test(location.pathname)}
function shouldHide(){return location.pathname==='/'||location.pathname==='/login'||location.pathname==='/mobile'}
function fallback(){if(location.pathname.startsWith('/ops/'))return'/mobile';if(location.pathname.startsWith('/livreur/'))return'/mobile';if(location.pathname.startsWith('/suivi/'))return'/app';if(location.pathname==='/app')return'/mobile';if(location.pathname.startsWith('/dashboard'))return'/mobile';return'/mobile'}
function goBack(){try{const ref=document.referrer?new URL(document.referrer):null;if(ref&&ref.origin===location.origin&&history.length>1){history.back();return}}catch{}location.assign(fallback())}

export function NativeBackButton(){
 const [show,setShow]=useState(false),[host,setHost]=useState<Element|null>(null);
 useEffect(()=>{const native=!!(window as any).Capacitor?.isNativePlatform?.();const standalone=matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true;setShow((native||standalone)&&isAppSurface()&&!shouldHide());const locate=()=>setHost(document.querySelector('.dash-v3-top')||document.querySelector('.ops-header')||document.querySelector('main header')||document.querySelector('header'));locate();const lt=setTimeout(locate,500);let remove:undefined|(()=>void);if(native){void import('@capacitor/app').then(async({App})=>{const h=await App.addListener('backButton',()=>goBack());remove=()=>void h.remove()}).catch(()=>{})}return()=>{clearTimeout(lt);remove?.()}},[]);
 if(!show)return null;
 const btn=<button type="button" onClick={goBack} aria-label="Revenir à l’écran précédent" title="Retour" className="qatalink-app-back"><ArrowLeft size={19}/><span>Retour</span></button>;
 return <>{host?createPortal(btn,host):<div className="qatalink-app-back-fallback">{btn}</div>}<style jsx global>{`.qatalink-app-back{order:-20;flex:0 0 auto;border:1px solid var(--line,#dedee2);background:var(--surface,#fff);color:var(--text,#111);border-radius:13px;height:42px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;font-weight:800}.dash-v3-top>.qatalink-app-back,.ops-header>.qatalink-app-back,main>header>.qatalink-app-back{align-self:flex-start}.qatalink-app-back-fallback{position:fixed;left:12px;top:max(12px,env(safe-area-inset-top));z-index:2147482400}@media(max-width:640px){.qatalink-app-back{width:40px;height:40px;padding:0;justify-content:center}.qatalink-app-back span{display:none}}`}</style></>
}
