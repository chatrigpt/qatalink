'use client';

import {CheckCircle2,LocateFixed,MapPin,Navigation,Radio,Route,ShieldCheck} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';

function validCoords(lat:any,lng:any){const a=Number(lat),b=Number(lng);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180&&!(Math.abs(a)<1e-8&&Math.abs(b)<1e-8)}

export default function DriverTrackingPage({params}:{params:Promise<{token:string}>}){
  const [token,setToken]=useState('');const [active,setActive]=useState(false);const [message,setMessage]=useState('Prêt à partager la position.');const [last,setLast]=useState<any>(null);const [busy,setBusy]=useState(false);const [delivery,setDelivery]=useState<any>(null);const watchRef=useRef<number|null>(null);const lastSent=useRef(0);const sendingRef=useRef(false);
  useEffect(()=>{params.then(p=>setToken(String(p.token||'')))},[params]);
  useEffect(()=>{if(!token)return;let stopped=false;const load=()=>fetch(`/api/delivery/driver?token=${encodeURIComponent(token)}`,{cache:'no-store'}).then(async r=>{const j=await r.json().catch(()=>({}));if(!stopped&&r.ok)setDelivery(j.delivery)}).catch(()=>{});void load();const id=setInterval(load,10000);return()=>{stopped=true;clearInterval(id)}},[token]);
  useEffect(()=>()=>{if(watchRef.current!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchRef.current)},[]);
  const finished=!!delivery?.delivered_at||['completed','cancelled'].includes(String(delivery?.status||''));

  async function sendLocation(position:GeolocationPosition){
    const now=Date.now();if(now-lastSent.current<4500||sendingRef.current)return;const c=position.coords;
    if(!validCoords(c.latitude,c.longitude)){setActive(false);setMessage('Position GPS non valide. Attendez un signal plus précis.');return}
    lastSent.current=now;sendingRef.current=true;setMessage('Position trouvée. Transmission à Qatalink…');
    try{
      const r=await fetch('/api/delivery/driver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:'location',lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,heading:c.heading,speed:c.speed}),cache:'no-store'});
      const j=await r.json().catch(()=>({}));if(!r.ok||!j?.updated)throw new Error(j?.error||'LOCATION_FAILED');
      setLast({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,at:new Date()});setActive(true);setMessage('Position reçue par Qatalink et visible dans le suivi client.');
      setDelivery((d:any)=>d?{...d,status:'out_for_delivery',is_active:true,last_location_at:j.at}:d);
    }catch(e:any){
      setActive(false);const reason=String(e?.message||'');
      setMessage(reason.includes('DRIVER_TOKEN_INVALID')?'Ce lien de livraison n’est plus actif. Demandez un nouveau lien au point de vente.':'Votre téléphone a trouvé votre position, mais Qatalink ne l’a pas reçue. Vérifiez la connexion puis réessayez.');
    }finally{sendingRef.current=false}
  }

  function start(){
    if(finished){setMessage('Cette livraison est déjà terminée. Le partage GPS est fermé.');return}
    if(!token||!navigator.geolocation){setMessage('La géolocalisation n’est pas disponible sur cet appareil.');return}
    if(watchRef.current!==null)return;
    setActive(false);setMessage('Autorisez la localisation précise. Le statut passera au vert seulement après réception par Qatalink.');
    watchRef.current=navigator.geolocation.watchPosition(p=>{void sendLocation(p)},e=>{setActive(false);setMessage(e.code===1?'Autorisation de localisation refusée. Activez la localisation précise pour ce site.':e.code===3?'Le GPS met trop de temps à répondre. Sortez si possible à découvert et réessayez.':'Position indisponible. Activez le GPS et réessayez.')},{enableHighAccuracy:true,maximumAge:2000,timeout:20000});
  }

  async function stop(){
    if(watchRef.current!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null}
    setActive(false);setMessage('Mise en pause du partage…');
    try{const r=await fetch('/api/delivery/driver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:'pause'}),cache:'no-store'});if(!r.ok)throw new Error();setMessage('Partage de position en pause. Le client ne verra plus ce signal comme étant en direct.')}catch{setMessage('Le GPS est arrêté sur ce téléphone, mais Qatalink n’a pas pu confirmer la pause. Vérifiez la connexion.')}
  }

  async function complete(){
    if(!token||busy||finished)return;
    if(!last&&!confirm('Aucune position GPS n’a encore été confirmée par Qatalink. Marquer quand même cette commande comme livrée ?'))return;
    if(last&&!confirm('Confirmer que la commande a été livrée ?'))return;
    setBusy(true);try{const r=await fetch('/api/delivery/driver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,action:'complete'}),cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||'COMPLETE_FAILED');if(watchRef.current!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null}setActive(false);setDelivery((d:any)=>d?{...d,status:'completed',delivered_at:new Date().toISOString(),is_active:false}:d);setMessage('Commande marquée comme livrée. Le suivi GPS est terminé.')}catch{setMessage('Impossible de terminer la livraison.')}finally{setBusy(false)}
  }

  const maps=last?`https://www.google.com/maps?q=${last.lat},${last.lng}`:'#';
  const destination=validCoords(delivery?.customer_lat,delivery?.customer_lng)?`${Number(delivery.customer_lat)},${Number(delivery.customer_lng)}`:String(delivery?.delivery_address||'').trim();
  const routeUrl=destination?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`:'#';
  return <main className="delivery-driver-page"><section className="delivery-driver-card"><div className="delivery-brand"><img src="/qatalink-icon.svg" alt="Qatalink"/><span>Qatalink Livraison</span></div><div className={`delivery-live-orb ${active?'active':''}`}>{active?<Radio/>:<Navigation/>}</div><h1>{finished?'Livraison terminée':active?'Position partagée en direct':'Démarrer le suivi livreur'}</h1><p>{finished?'Cette livraison est clôturée. Le lien GPS ne peut plus être réactivé.':'Qatalink n’affiche le GPS comme actif qu’après confirmation de réception de votre position par le serveur.'}</p>{delivery&&<div className="delivery-driver-status" style={{marginBottom:'12px'}}><span className="on">DESTINATION</span><b>{delivery.delivery_address||'Position GPS du client'}</b>{delivery.order_number&&<small>Commande {delivery.order_number}</small>}{destination&&<a className="delivery-map-link" href={routeUrl} target="_blank" rel="noreferrer"><Route/>Ouvrir l’itinéraire vers le client</a>}</div>}<div className="delivery-driver-status"><span className={active?'on':'off'}>{active?'GPS confirmé':'GPS non confirmé'}</span><b>{message}</b>{last&&<small>Dernière position confirmée : {last.at.toLocaleTimeString('fr-FR')} · précision ≈ {Math.round(last.accuracy)} m</small>}</div>{last&&<a className="delivery-map-link" href={maps} target="_blank" rel="noreferrer"><MapPin/>Voir ma position confirmée</a>}<div className="delivery-driver-actions">{!finished&&(active||watchRef.current!==null?<button className="secondary" onClick={()=>void stop()}><LocateFixed/>Mettre en pause</button>:<button className="primary" onClick={start}><LocateFixed/>Partager ma position</button>)}<button className="success" disabled={busy||finished} onClick={complete}><CheckCircle2/>{finished?'Livraison terminée':busy?'Validation…':'Commande livrée'}</button></div><div className="delivery-privacy"><ShieldCheck/><span>Gardez cette page ouverte pendant le trajet. Sur mobile, le navigateur peut suspendre la géolocalisation si l’onglet est fermé, si l’application passe longtemps en arrière-plan ou si le téléphone verrouille son activité.</span></div></section></main>;
}
