'use client';

import {useEffect,useMemo,useRef} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Order={status:string;total_minor:number|null;created_at:string};
type Item={name:string|null;price_minor:number|null};
type Stock={quantity:number|null;low_stock_threshold:number|null};

const startOfDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const dayKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const pct=(now:number,before:number)=>{
  if(before===0)return now===0?0:100;
  return Math.round(((now-before)/Math.abs(before))*1000)/10;
};
const signed=(n:number)=>`${n>0?'+':''}${String(n).replace('.',',')} %`;

export function DashboardReferenceInsights(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const dataRef=useRef<{rev:number;orders:number;stockRate:number;complete:number;bars:number[]}|null>(null);

  useEffect(()=>{
    if(typeof window==='undefined'||!location.pathname.startsWith('/dashboard'))return;
    let dead=false;
    let timer:ReturnType<typeof setTimeout>|null=null;

    const paint=()=>{
      const d=dataRef.current;if(!d)return;
      const cards=Array.from(document.querySelectorAll<HTMLElement>('.q-ops-kpis:not(.q-stock-kpis)>article'));
      if(cards.length<4)return;
      cards.forEach(c=>{c.querySelectorAll('.q-kpi-insight,.q-mini-bars').forEach(x=>x.remove())});
      const add=(card:HTMLElement,text:string,tone:'good'|'bad'|'warn'|'neutral')=>{
        const el=document.createElement('span');el.className=`q-kpi-insight ${tone}`;el.textContent=text;card.appendChild(el);
      };
      add(cards[0],`${d.rev>=0?'↗':'↘'} ${signed(d.rev)} vs hier`,d.rev>0?'good':d.rev<0?'bad':'neutral');
      add(cards[1],`${d.orders>=0?'↗':'↘'} ${signed(d.orders)} vs hier`,d.orders>0?'good':d.orders<0?'bad':'neutral');
      add(cards[2],`${String(d.stockRate).replace('.',',')} % du stock à surveiller`,d.stockRate===0?'good':d.stockRate<=20?'warn':'bad');
      add(cards[3],`${String(d.complete).replace('.',',')} % complet`,d.complete>=90?'good':d.complete>=70?'warn':'bad');
      const chart=document.createElement('div');chart.className='q-mini-bars';chart.setAttribute('aria-hidden','true');
      d.bars.forEach((h,i)=>{const s=document.createElement('span');s.style.height=`${Math.max(18,h)}%`;if(i===d.bars.length-1)s.className='active';chart.appendChild(s)});cards[0].appendChild(chart);
    };

    const load=async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session||dead)return;
      const {data:bs}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const businessId=bs?.[0]?.id;if(!businessId)return;
      const requested=new URLSearchParams(location.search).get('catalog');
      let catalogId=requested||'';
      if(!catalogId){const {data:cs}=await supabase.from('catalogs').select('id').eq('business_id',businessId).order('created_at',{ascending:false}).limit(1);catalogId=cs?.[0]?.id||''}
      if(!catalogId)return;
      const today=startOfDay(new Date());const yesterday=new Date(today);yesterday.setDate(today.getDate()-1);const since=new Date(today);since.setDate(today.getDate()-7);
      const [{data:orders},{data:items},{data:stocks}]=await Promise.all([
        supabase.from('orders').select('status,total_minor,created_at').eq('catalog_id',catalogId).gte('created_at',since.toISOString()),
        supabase.from('items').select('name,price_minor').eq('catalog_id',catalogId),
        supabase.from('inventory_stock_items').select('quantity,low_stock_threshold').eq('business_id',businessId).eq('active',true)
      ]);
      if(dead)return;
      const rows=(orders||[]) as Order[];
      const revFor=(date:Date)=>rows.filter(o=>new Date(o.created_at).toDateString()===date.toDateString()&&o.status!=='cancelled').reduce((s,o)=>s+Number(o.total_minor||0),0);
      const countFor=(date:Date)=>rows.filter(o=>new Date(o.created_at).toDateString()===date.toDateString()&&o.status!=='cancelled').length;
      const tr=revFor(today),yr=revFor(yesterday),tc=countFor(today),yc=countFor(yesterday);
      const stockRows=(stocks||[]) as Stock[];const alerts=stockRows.filter(s=>Number(s.quantity||0)<=Number(s.low_stock_threshold||0)).length;
      const itemRows=(items||[]) as Item[];const completeRows=itemRows.filter(i=>String(i.name||'').trim()&&Number(i.price_minor||0)>0).length;
      const seven=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-(6-i));return revFor(d)});const max=Math.max(1,...seven);
      dataRef.current={rev:pct(tr,yr),orders:pct(tc,yc),stockRate:Math.round((alerts/Math.max(1,stockRows.length))*1000)/10,complete:Math.round((completeRows/Math.max(1,itemRows.length))*1000)/10,bars:seven.map(v=>Math.round((v/max)*100))};
      paint();
    };

    void load();
    const mo=new MutationObserver(()=>{if(timer)clearTimeout(timer);timer=setTimeout(paint,70)});mo.observe(document.body,{childList:true,subtree:true});
    const onNav=()=>setTimeout(()=>void load(),80);window.addEventListener('popstate',onNav);document.addEventListener('click',onNav,true);
    return()=>{dead=true;mo.disconnect();if(timer)clearTimeout(timer);window.removeEventListener('popstate',onNav);document.removeEventListener('click',onNav,true)};
  },[supabase]);
  return null;
}
