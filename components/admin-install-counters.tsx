'use client';
import {Download,MonitorDown} from 'lucide-react';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

export function AdminInstallCounters(){
 const [host,setHost]=useState<Element|null>(null),[apk,setApk]=useState(0),[pwa,setPwa]=useState(0),[ready,setReady]=useState(false);
 useEffect(()=>{if(location.pathname!=='/admin')return;const locate=()=>setHost(document.querySelector('.admin-kpis'));locate();const t=setTimeout(locate,500);Promise.all([fetch('/api/android-beta/stats',{cache:'no-store'}).then(r=>r.json()).catch(()=>({count:0})),fetch('/api/pwa/stats',{cache:'no-store'}).then(r=>r.json()).catch(()=>({count:0}))]).then(([a,p])=>{setApk(Number(a?.count||0));setPwa(Number(p?.count||0));setReady(true)});return()=>clearTimeout(t)},[]);
 if(!host||!ready)return null;return createPortal(<><div className="admin-metric"><span><Download/></span><div><b>{new Intl.NumberFormat('fr-FR').format(apk)}</b><small>Téléchargements APK bêta</small></div></div><div className="admin-metric"><span><MonitorDown/></span><div><b>{new Intl.NumberFormat('fr-FR').format(pwa)}</b><small>Installations / ajouts PWA</small></div></div></>,host)
}
