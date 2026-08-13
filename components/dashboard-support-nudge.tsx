'use client';

import {useEffect,useState} from 'react';
import {MessagesSquare,X} from 'lucide-react';

export function DashboardSupportNudge(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);if(params.get('created')!=='1')return;
    const catalog=params.get('catalog')||'latest';const key=`qatalink_support_nudge_${catalog}`;
    if(localStorage.getItem(key)==='1')return;
    const timer=window.setTimeout(()=>{setVisible(true);localStorage.setItem(key,'1')},15000);
    return()=>window.clearTimeout(timer);
  },[]);
  if(!visible)return null;
  return <aside className="dashboard-support-nudge" role="status" aria-live="polite"><div className="dashboard-support-nudge-icon"><MessagesSquare size={19}/></div><div className="dashboard-support-nudge-copy"><b>Besoin d’aide pour finaliser votre catalogue ?</b><p>Écrivez votre préoccupation ou votre question dans le chat. L’Assistant Qatalink peut vous guider immédiatement, et vous pouvez aussi passer au support humain.</p><button type="button" onClick={()=>{window.dispatchEvent(new CustomEvent('qatalink:support-open',{detail:{mode:'ai'}}));setVisible(false)}}>Poser ma question →</button></div><button type="button" className="dashboard-support-nudge-close" onClick={()=>setVisible(false)} aria-label="Fermer"><X size={15}/></button></aside>;
}
