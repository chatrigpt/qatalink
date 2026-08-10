'use client';

import React from 'react';

type Props={children:React.ReactNode;critical?:boolean};
type State={failed:boolean};

export class DashboardSafeBoundary extends React.Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(){/* Keep the user interface available even if an optional module fails. */}
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
