'use client';

import React from 'react';

type Props={children:React.ReactNode;silent?:boolean};
type State={failed:boolean};

export class PublicCatalogBoundary extends React.Component<Props,State>{
  state:State={failed:false};
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(){/* Public catalog must remain user-safe; no technical details rendered. */}
  render(){if(!this.state.failed)return this.props.children;if(this.props.silent)return null;return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>Impossible d’afficher le catalogue</h1><p>Rechargez la page pour réessayer.</p><button className="btn btn-primary" onClick={()=>location.reload()}>Recharger</button></div></main>}
}
