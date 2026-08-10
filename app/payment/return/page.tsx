'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CheckCircle2,LoaderCircle,RefreshCw,ShieldCheck,XCircle} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';
import './payment-return.css';

type State='checking'|'success'|'pending'|'error'|'login';

export default function PaymentReturnPage(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [state,setState]=useState<State>('checking');
  const [message,setMessage]=useState('Confirmation de votre paiement…');
  const [details,setDetails]=useState('Cette vérification peut prendre quelques secondes.');
  const attempts=useRef(0);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const verify=useCallback(async()=>{
    if(timer.current)clearTimeout(timer.current);
    setState('checking');
    setMessage('Confirmation de votre paiement…');
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token){
      setState('login');
      setMessage('Reconnectez-vous pour confirmer votre paiement');
      setDetails('Votre paiement ne sera pas perdu.');
      return;
    }

    try{
      const response=await fetch('/api/payment/maketou/status',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({}),
        cache:'no-store'
      });
      const result=await response.json().catch(()=>({}));

      if(response.ok&&result.status==='completed'){
        setState('success');
        if(result.purchase_type==='credits'){
          setMessage('Crédits ajoutés avec succès');
          setDetails(`${Number(result.credits_added||100)} crédits ont été ajoutés à votre compte.`);
        }else{
          setMessage('Paiement confirmé');
          setDetails('Votre formule est maintenant active. Redirection vers votre espace…');
        }
        timer.current=setTimeout(()=>window.location.replace('/dashboard?payment=success'),1800);
        return;
      }

      const providerStatus=String(result.status||'').toLowerCase();
      const stillPending=response.status===404||['pending','processing','initiated','created','waiting'].includes(providerStatus);
      if(stillPending&&attempts.current<30){
        attempts.current+=1;
        setState('pending');
        setMessage('Paiement en cours de confirmation');
        setDetails('Nous attendons la confirmation. Cette page se met à jour automatiquement.');
        timer.current=setTimeout(verify,2000);
        return;
      }

      setState('error');
      setMessage('Paiement non confirmé');
      setDetails('Si vous avez été débité, réessayez la vérification dans quelques instants.');
    }catch{
      if(attempts.current<30){attempts.current+=1;timer.current=setTimeout(verify,2500);return}
      setState('error');
      setMessage('Vérification momentanément indisponible');
      setDetails('Réessayez dans quelques instants.');
    }
  },[supabase]);

  useEffect(()=>{attempts.current=0;verify();return()=>{if(timer.current)clearTimeout(timer.current)}},[verify]);

  return <main className="payment-return-page">
    <div className="payment-return-card">
      <div className={`payment-return-icon ${state}`}>
        {state==='success'?<CheckCircle2/>:state==='error'?<XCircle/>:state==='login'?<ShieldCheck/>:<LoaderCircle className="spin"/>}
      </div>
      <div className="payment-return-brand">QATALINK</div>
      <h1>{message}</h1>
      <p>{details}</p>
      {(state==='checking'||state==='pending')&&<div className="payment-progress"><span/></div>}
      {state==='error'&&<button className="payment-primary" onClick={()=>{attempts.current=0;verify()}}><RefreshCw/> Vérifier à nouveau</button>}
      {state==='login'&&<button className="payment-primary" onClick={()=>window.location.href='/login?next=/payment/return'}>Se connecter</button>}
      {state==='error'&&<button className="payment-secondary" onClick={()=>window.location.href='/dashboard'}>Retour au tableau de bord</button>}
    </div>
  </main>;
}
