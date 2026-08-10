'use client';

import {useEffect} from 'react';

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{console.error(error)},[error]);
  return <main className="dashboard-recovery"><div><span className="eyebrow">QATALINK</span><h1>Un écran n’a pas pu se charger</h1><p>Vos données enregistrées restent intactes. Vous pouvez relancer l’affichage sans recommencer votre travail.</p><button className="btn btn-primary" onClick={reset}>Réessayer</button><a className="btn btn-ghost" href="/dashboard">Retour au dashboard</a></div></main>;
}
