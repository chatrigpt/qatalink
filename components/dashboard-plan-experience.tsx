'use client';

import {useEffect,useMemo,useState} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

const labels:Record<string,string>={static:'STARTER',interactive:'PRO',linkhub:'BUSINESS',trial:'ESSAI 7 JOURS'};

export function DashboardPlanExperience(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [plan,setPlan]=useState('');

  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let cancelled=false;
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session||cancelled)return;
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);const bid=businesses?.[0]?.id;if(!bid)return;
      const {data:subs}=await supabase.from('subscriptions').select('plan_code,status,current_period_end').eq('business_id',bid).order('created_at',{ascending:false}).limit(1);const s=subs?.[0];const valid=!!s&&['active','trialing'].includes(String(s.status))&&(!s.current_period_end||new Date(s.current_period_end).getTime()>Date.now());if(!cancelled)setPlan(valid?String(s.plan_code||''):'');
    })();
    return()=>{cancelled=true};
  },[supabase]);

  useEffect(()=>{
    if(!plan||location.pathname!='/dashboard')return;
    const apply=()=>{
      const eyebrow=document.querySelector<HTMLElement>('.dash-v3-top .eyebrow');
      if(eyebrow&&labels[plan])eyebrow.textContent=labels[plan];
      document.querySelectorAll<HTMLElement>('*').forEach(el=>{
        if(el.children.length)return;
        const value=(el.textContent||'').trim();
        if(value==='Essai complet 24 h')el.textContent='Essai complet 7 jours';
        if(value==='Basic : 3 · Interactif : 7 · Vitrine : 15 · Essai : les 15 pour tester.')el.textContent='Starter : 3 · Pro : 7 · Business : 15 · Essai : les 15 pour tester.';
        if(value==='1 image = 5 crédits. Basic reçoit 50 crédits, Interactif 150, Vitrine 250.')el.textContent='1 image = 5 crédits. Starter reçoit 50 crédits, Pro 150, Business 250.';
      });

      const orderBlock=document.querySelector<HTMLElement>('.order-settings-block');
      if(orderBlock){
        const old=orderBlock.querySelector('.q-plan-order-note');old?.remove();
        if(plan==='static'){
          const note=document.createElement('div');note.className='q-plan-order-note';note.innerHTML='<b>Starter · WhatsApp direct</b><span>Le client compose sa commande dans le catalogue puis l’envoie directement sur WhatsApp. L’enregistrement privé des commandes et les accès équipe commencent avec Pro.</span>';
          orderBlock.querySelector('.order-section-head')?.insertAdjacentElement('afterend',note);
          orderBlock.querySelectorAll<HTMLLabelElement>('.order-checks label').forEach(label=>{
            const input=label.querySelector<HTMLInputElement>('input[type="checkbox"]');if(!input)return;
            if((label.textContent||'').includes('Enregistrer les commandes')){input.checked=false;input.disabled=true;label.classList.add('q-plan-disabled')}
            if((label.textContent||'').includes('WhatsApp')){input.checked=true;input.disabled=true;label.classList.add('q-plan-required')}
          });
          const access=orderBlock.querySelector<HTMLElement>('.order-access-box');if(access)access.style.display='none';
        }else{
          orderBlock.querySelectorAll<HTMLInputElement>('.order-checks input').forEach(input=>input.disabled=false);
          orderBlock.querySelectorAll<HTMLElement>('.order-checks label').forEach(label=>label.classList.remove('q-plan-disabled','q-plan-required'));
          const access=orderBlock.querySelector<HTMLElement>('.order-access-box');if(access)access.style.removeProperty('display');
        }
      }
    };
    apply();const observer=new MutationObserver(()=>setTimeout(apply,20));observer.observe(document.body,{subtree:true,childList:true,characterData:true});return()=>observer.disconnect();
  },[plan]);

  return null;
}
