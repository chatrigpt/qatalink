'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CheckCircle2,LoaderCircle,RefreshCw,ShieldCheck,XCircle} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';
import './payment-return.css';

type State='checking'|'success'|'pending'|'error'|'login';
type PurchaseType='credits'|'subscription'|'';

export default function PaymentReturnPage(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [state,setState]=useState<State>('checking');
  const [purchaseType,setPurchaseType]=useState<PurchaseType>('');
  const [message,setMessage]=useState('Confirmation de votre paiement…');
  const [details,setDetails]=useState('Cette vérification peut prendre quelques secondes.');
  const [directEmail,setDirectEmail]=useState('');
  const [directPlan,setDirectPlan]=useState('');
  const attempts=useRef(0);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const verify=useCallback(async()=>{
    if(timer.current)clearTimeout(timer.current);
    setState('checking');
    setMessage('Confirmation de votre paiement…');
    const directToken=new URLSearchParams(window.location.search).get('direct')||'';

    if(directToken){
      try{
        const response=await fetch(`/api/payment/maketou/direct-status?token=${encodeURIComponent(directToken)}`,{cache:'no-store'});
        const result=await response.json().catch(()=>({}));
        if(response.ok&&String(result.status).toLowerCase()==='completed'){
          const email=String(result.email||'');const plan=String(result.plan||'Qatalink');
          setDirectEmail(email);setDirectPlan(plan);setPurchaseType('subscription');setState('success');
          setMessage(`Abonnement ${plan} validé`);
          setDetails(`Le paiement est confirmé${email?` pour ${email}`:''}. L’abonnement est bien rattaché à ce compte Qatalink, même si vous n’étiez pas connecté pendant le paiement.`);
          return;
        }
        const providerStatus=String(result.status||'').toLowerCase();
        if(['pending','processing','initiated','created','waiting'].includes(providerStatus)&&attempts.current<30){attempts.current+=1;setState('pending');setMessage('Paiement en cours de confirmation');setDetails('Nous attendons la confirmation du paiement. Cette page se met à jour automatiquement.');timer.current=setTimeout(verify,2000);return}
        setState('error');setMessage('Paiement non confirmé');setDetails('Si vous avez été débité, réessayez la vérification dans quelques instants.');return;
      }catch{if(attempts.current<30){attempts.current+=1;timer.current=setTimeout(verify,2500);return}setState('error');setMessage('Vérification momentanément indisponible');setDetails('Réessayez dans quelques instants.');return}
    }

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
        const type=result.purchase_type==='credits'?'credits':'subscription';
        setPurchaseType(type);setState('success');
        if(type==='credits'){
          setMessage('Crédits ajoutés avec succès');
          setDetails(`${Number(result.credits_added||100)} crédits ont été ajoutés à votre compte. Vous pouvez reprendre vos illustrations immédiatement.`);
        }else{
          setMessage('Votre abonnement Qatalink est actif');
          setDetails('Paiement confirmé. Vous pouvez continuer à utiliser vos fonctionnalités et partager votre catalogue.');
        }
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
  const isDirect=!!directEmail||!!directPlan;

  return <main className="payment-return-page">
    <div className="payment-return-card">
      <div className={`payment-return-icon ${state}`}>
        {state==='success'?<CheckCircle2/>:state==='error'?<XCircle/>:state==='login'?<ShieldCheck/>:<LoaderCircle className="spin"/>}
      </div>
      <div className="payment-return-brand">QATALINK</div>
      <h1>{message}</h1>
      <p>{details}</p>
      {state==='success'&&isDirect&&directEmail&&<div className="payment-account-confirm"><span>Compte concerné</span><strong>{directEmail}</strong></div>}
      {(state==='checking'||state==='pending')&&<div className="payment-progress"><span/></div>}
      {state==='success'&&purchaseType==='subscription'&&isDirect&&<><button className="payment-primary" onClick={()=>window.location.href=`/login?next=${encodeURIComponent('/dashboard')}`}>Se connecter à Qatalink</button><button className="payment-secondary" onClick={()=>window.location.href='/'}>Retour à l’accueil</button></>}
      {state==='success'&&purchaseType==='subscription'&&!isDirect&&<><button className="payment-primary" onClick={()=>window.location.href='/dashboard?tab=qr'}>Partager mon catalogue maintenant</button><button className="payment-secondary" onClick={()=>window.location.href='/dashboard'}>Retour au tableau de bord</button></>}
      {state==='success'&&purchaseType==='credits'&&<><button className="payment-primary" onClick={()=>window.location.href='/dashboard?tab=items'}>Reprendre mes illustrations</button><button className="payment-secondary" onClick={()=>window.location.href='/dashboard'}>Retour au tableau de bord</button></>}
      {state==='error'&&<button className="payment-primary" onClick={()=>{attempts.current=0;verify()}}><RefreshCw/> Vérifier à nouveau</button>}
      {state==='login'&&<button className="payment-primary" onClick={()=>window.location.href='/login?next=/payment/return'}>Se connecter</button>}
      {state==='error'&&<button className="payment-secondary" onClick={()=>window.location.href='/'}>Retour à l’accueil</button>}
    </div>
    <style jsx>{`.payment-account-confirm{margin:16px 0;padding:12px 14px;border-radius:14px;background:#fff5f7;border:1px solid #efd1d8;display:grid;gap:4px;text-align:left}.payment-account-confirm span{font-size:11px;color:#7b6f73;text-transform:uppercase;font-weight:800;letter-spacing:.06em}.payment-account-confirm strong{font-size:14px;overflow-wrap:anywhere}`}</style>
  </main>;
}
