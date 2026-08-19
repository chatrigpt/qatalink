'use client';

import {useEffect,useMemo} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

function setReactTextareaValue(el:HTMLTextAreaElement,value:string){
  const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;
  if(setter)setter.call(el,value);else el.value=value;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
}

export function ItemDescriptionGenerationControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);

  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let stopped=false;
    let timer:ReturnType<typeof setTimeout>|null=null;

    async function resolveCatalogId(){
      const explicit=new URLSearchParams(location.search).get('catalog');
      if(explicit)return explicit;
      const title=document.querySelector('.dash-toolbar h3')?.textContent?.trim();
      if(!title)return'';
      const {data:{session}}=await supabase.auth.getSession();
      if(!session)return'';
      const {data:businesses}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const businessId=businesses?.[0]?.id;if(!businessId)return'';
      const {data}=await supabase.from('catalogs').select('id').eq('business_id',businessId).eq('title',title).order('created_at',{ascending:false}).limit(1);
      return String(data?.[0]?.id||'');
    }

    async function decorate(){
      if(stopped)return;
      const pageTitle=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(pageTitle!=='Articles & catégories')return;
      const cards=Array.from(document.querySelectorAll<HTMLElement>('.item-v2-card'));
      if(!cards.length)return;
      const catalogId=await resolveCatalogId();if(!catalogId)return;
      const {data:rows}=await supabase.from('items').select('id,name,description,sort_order').eq('catalog_id',catalogId).order('sort_order').order('created_at');
      const items=rows||[];

      cards.forEach((card,index)=>{
        if(card.querySelector('.q-description-action'))return;
        const item=items[index];if(!item)return;
        const textarea=card.querySelector<HTMLTextAreaElement>('.item-v2-fields textarea');
        if(!textarea)return;
        const wrap=document.createElement('div');wrap.className='q-description-action';
        const button=document.createElement('button');button.type='button';button.className='q-description-button';
        const hasDescription=String(item.description||textarea.value||'').trim().length>0;
        button.textContent=hasDescription?'✨ Rendre la description plus appétissante':'✨ Générer une description';
        const hint=document.createElement('small');hint.textContent='À partir du nom du plat/article et de votre texte actuel, sans inventer de faits.';
        button.addEventListener('click',async()=>{
          if(button.dataset.busy==='1')return;
          button.dataset.busy='1';button.disabled=true;button.textContent='Création de la description…';
          try{
            const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('SESSION_EXPIRED');
            const response=await fetch('/api/descriptions/generate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({item_id:item.id})});
            const data=await response.json().catch(()=>({}));if(!response.ok||!data.description)throw new Error(data.error||'GENERATION_FAILED');
            setReactTextareaValue(textarea,String(data.description));
            button.textContent='✓ Description générée';
            setTimeout(()=>{button.textContent='✨ Régénérer la description'},1600);
          }catch{
            button.textContent='Réessayer la génération';
          }finally{
            button.dataset.busy='0';button.disabled=false;
          }
        });
        wrap.append(button,hint);textarea.insertAdjacentElement('afterend',wrap);
      });
    }

    const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(()=>void decorate(),80)};
    schedule();
    const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',schedule,true);
    return()=>{stopped=true;if(timer)clearTimeout(timer);observer.disconnect();document.removeEventListener('click',schedule,true)};
  },[supabase]);

  return null;
}
