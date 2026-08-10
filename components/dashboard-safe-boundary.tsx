'use client';

import React from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Props={children:React.ReactNode;critical?:boolean};
type State={failed:boolean};

export class DashboardSafeBoundary extends React.Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error:unknown,info:React.ErrorInfo){
    try{
      const supabase=createSupabaseBrowserClient();
      const message=error instanceof Error?error.message:String(error||'Unknown client error');
      const stack=error instanceof Error?error.stack||null:null;
      void supabase.rpc('log_dashboard_client_error',{
        p_route:typeof window!=='undefined'?window.location.pathname+window.location.search:'',
        p_message:message,
        p_stack:stack,
        p_component_stack:info.componentStack||null,
        p_user_agent:typeof navigator!=='undefined'?navigator.userAgent:null
      });
    }catch{}
  }
  render(){
    if(!this.state.failed)return this.props.children;
    if(!this.props.critical)return null;
    return <main className="dashboard-recovery"><div><span className="eyebrow">QATALINK</span><h1>Votre espace a besoin d’être rechargé</h1><p>Votre catalogue est bien enregistré. Rechargez simplement cet écran pour reprendre là où vous étiez.</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Recharger mon espace</button><a className="btn btn-ghost" href="/dashboard">Retour au dashboard</a></div></main>;
  }
}

export function DashboardStorageGuard(){
  React.useLayoutEffect(()=>{
    try{
      const raw=localStorage.getItem('qatalink_pending_image_jobs');
      if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.some(x=>typeof x!=='string'))localStorage.removeItem('qatalink_pending_image_jobs')}
    }catch{localStorage.removeItem('qatalink_pending_image_jobs')}
    try{
      const raw=localStorage.getItem('qatalink_import_preview');
      if(raw)JSON.parse(raw);
    }catch{localStorage.removeItem('qatalink_import_preview')}
  },[]);
  return null;
}
