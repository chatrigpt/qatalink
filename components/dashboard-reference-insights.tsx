'use client';

import {createPortal} from 'react-dom';
import {Moon,Sun} from 'lucide-react';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useTheme} from 'next-themes';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Order={status:string;total_minor:number|null;created_at:string};
type Item={name:string|null;price_minor:number|null};
type Stock={quantity:number|null;low_stock_threshold:number|null};
type Period='day'|'7d'|'30d'|'90d';

type InsightData={
  revenue:number;
  orderCount:number;
  revenueChange:number;
  ordersChange:number;
  stockRate:number;
  complete:number;
  bars:number[];
};

const PERIODS:Record<Period,{label:string;days:number;compare:string}>={
  day:{label:'Aujourd’hui',days:1,compare:'vs hier'},
  '7d':{label:'7 jours',days:7,compare:'vs 7 j précédents'},
  '30d':{label:'30 jours',days:30,compare:'vs 30 j précédents'},
  '90d':{label:'90 jours',days:90,compare:'vs 90 j précédents'}
};
const startOfDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const pct=(now:number,before:number)=>before===0?(now===0?0:100):Math.round(((now-before)/Math.abs(before))*1000)/10;
const signed=(n:number)=>`${n>0?'+':''}${String(n).replace('.',',')} %`;
const money=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(n)||0).replace(/\u202f/g,' ')+' F';

export function DashboardReferenceInsights(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [period,setPeriod]=useState<Period>('day');
  const [mobileHeader,setMobileHeader]=useState<HTMLElement|null>(null);
  const [welcome,setWelcome]=useState<HTMLElement|null>(null);
  const {theme,setTheme,resolvedTheme}=useTheme();
  const dataRef=useRef<InsightData|null>(null);

  useEffect(()=>{
    if(typeof window==='undefined'||!location.pathname.startsWith('/dashboard'))return;
    let timer:ReturnType<typeof setTimeout>|null=null;
    const locate=()=>{
      setMobileHeader(document.querySelector('.q-ops-mobile-bar') as HTMLElement|null);
      const cockpit=document.querySelector('.q-ops-cockpit');
      setWelcome(cockpit?.querySelector('.q-ops-welcome') as HTMLElement|null);
    };
    locate();
    const mo=new MutationObserver(()=>{if(timer)clearTimeout(timer);timer=setTimeout(locate,40)});
    mo.observe(document.body,{childList:true,subtree:true});
    return()=>{mo.disconnect();if(timer)clearTimeout(timer)};
  },[]);

  useEffect(()=>{
    if(typeof window==='undefined'||!location.pathname.startsWith('/dashboard'))return;
    let dead=false;
    let timer:ReturnType<typeof setTimeout>|null=null;

    const paint=()=>{
      document.querySelectorAll('.q-kpi-insight,.q-mini-bars').forEach(x=>x.remove());
      const d=dataRef.current;if(!d)return;
      const cards=Array.from(document.querySelectorAll<HTMLElement>('.q-ops-kpis:not(.q-stock-kpis)>article'));
      if(cards.length<4)return;
      const config=PERIODS[period];
      const label=cards[0].querySelector('span');
      const value=cards[0].querySelector('strong');
      const detail=cards[0].querySelector('small');
      if(label)label.textContent=`Chiffre d’affaires · ${config.label}`;
      if(value)value.textContent=money(d.revenue);
      if(detail)detail.textContent=`${d.orderCount} commande${d.orderCount!==1?'s':''} sur la période`;
      const orderLabel=cards[1].querySelector('span');
      const orderValue=cards[1].querySelector('strong');
      const orderDetail=cards[1].querySelector('small');
      if(orderLabel)orderLabel.textContent='Commandes';
      if(orderValue)orderValue.textContent=String(d.orderCount);
      if(orderDetail)orderDetail.textContent=config.label.toLowerCase();
      const add=(card:HTMLElement,text:string,tone:'good'|'bad'|'warn'|'neutral')=>{
        const el=document.createElement('span');el.className=`q-kpi-insight ${tone}`;el.textContent=text;card.appendChild(el);
      };
      add(cards[0],`${d.revenueChange>=0?'↗':'↘'} ${signed(d.revenueChange)} ${config.compare}`,d.revenueChange>0?'good':d.revenueChange<0?'bad':'neutral');
      add(cards[1],`${d.ordersChange>=0?'↗':'↘'} ${signed(d.ordersChange)} ${config.compare}`,d.ordersChange>0?'good':d.ordersChange<0?'bad':'neutral');
      add(cards[2],`${String(d.stockRate).replace('.',',')} % du stock à surveiller`,d.stockRate===0?'good':d.stockRate<=20?'warn':'bad');
      add(cards[3],`${String(d.complete).replace('.',',')} % complet`,d.complete>=90?'good':d.complete>=70?'warn':'bad');
      const chart=document.createElement('div');chart.className='q-mini-bars';chart.setAttribute('aria-hidden','true');
      d.bars.forEach((h,i)=>{const s=document.createElement('span');s.style.height=`${Math.max(14,h)}%`;if(i===d.bars.length-1)s.className='active';chart.appendChild(s)});cards[0].appendChild(chart);
    };

    const load=async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session||dead)return;
      const {data:bs}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1);
      const businessId=bs?.[0]?.id;if(!businessId)return;
      const requested=new URLSearchParams(location.search).get('catalog');
      let catalogId=requested||'';
      if(!catalogId){const {data:cs}=await supabase.from('catalogs').select('id').eq('business_id',businessId).order('created_at',{ascending:false}).limit(1);catalogId=cs?.[0]?.id||''}
      if(!catalogId)return;
      const days=PERIODS[period].days;
      const currentEnd=new Date();
      const currentStart=startOfDay(new Date());currentStart.setDate(currentStart.getDate()-(days-1));
      const previousEnd=new Date(currentStart.getTime()-1);
      const previousStart=startOfDay(new Date(currentStart));previousStart.setDate(previousStart.getDate()-days);
      const [{data:orders},{data:items},{data:stocks}]=await Promise.all([
        supabase.from('orders').select('status,total_minor,created_at').eq('catalog_id',catalogId).gte('created_at',previousStart.toISOString()).lte('created_at',currentEnd.toISOString()).limit(3000),
        supabase.from('items').select('name,price_minor').eq('catalog_id',catalogId),
        supabase.from('inventory_stock_items').select('quantity,low_stock_threshold').eq('business_id',businessId).eq('active',true)
      ]);
      if(dead)return;
      const rows=((orders||[]) as Order[]).filter(o=>o.status!=='cancelled');
      const inRange=(o:Order,start:Date,end:Date)=>{const t=new Date(o.created_at).getTime();return t>=start.getTime()&&t<=end.getTime()};
      const current=rows.filter(o=>inRange(o,currentStart,currentEnd));
      const previous=rows.filter(o=>inRange(o,previousStart,previousEnd));
      const currentRevenue=current.reduce((s,o)=>s+Number(o.total_minor||0),0);
      const previousRevenue=previous.reduce((s,o)=>s+Number(o.total_minor||0),0);
      const stockRows=(stocks||[]) as Stock[];const alerts=stockRows.filter(s=>Number(s.quantity||0)<=Number(s.low_stock_threshold||0)).length;
      const itemRows=(items||[]) as Item[];const completeRows=itemRows.filter(i=>String(i.name||'').trim()&&Number(i.price_minor||0)>0).length;
      const bins=7;const span=Math.max(1,currentEnd.getTime()-currentStart.getTime());
      const barValues=Array.from({length:bins},()=>0);
      current.forEach(o=>{const ratio=Math.min(.999999,Math.max(0,(new Date(o.created_at).getTime()-currentStart.getTime())/span));const idx=Math.min(bins-1,Math.floor(ratio*bins));barValues[idx]+=Number(o.total_minor||0)});
      const max=Math.max(1,...barValues);
      dataRef.current={revenue:currentRevenue,orderCount:current.length,revenueChange:pct(currentRevenue,previousRevenue),ordersChange:pct(current.length,previous.length),stockRate:Math.round((alerts/Math.max(1,stockRows.length))*1000)/10,complete:Math.round((completeRows/Math.max(1,itemRows.length))*1000)/10,bars:barValues.map(v=>Math.round((v/max)*100))};
      paint();
    };

    void load();
    const mo=new MutationObserver(()=>{if(timer)clearTimeout(timer);timer=setTimeout(paint,80)});mo.observe(document.body,{childList:true,subtree:true});
    const onNav=()=>setTimeout(()=>void load(),100);window.addEventListener('popstate',onNav);document.addEventListener('click',onNav,true);
    return()=>{dead=true;mo.disconnect();if(timer)clearTimeout(timer);window.removeEventListener('popstate',onNav);document.removeEventListener('click',onNav,true)};
  },[supabase,period]);

  const isDark=(resolvedTheme||theme)==='dark';
  return <>
    {mobileHeader&&createPortal(<button className="q-mobile-theme-toggle" onClick={()=>setTheme(isDark?'light':'dark')} aria-label={isDark?'Passer en mode clair':'Passer en mode sombre'} title={isDark?'Mode clair':'Mode sombre'}>{isDark?<Sun size={18}/>:<Moon size={18}/>}</button>,mobileHeader)}
    {welcome&&createPortal(<div className="q-home-period" aria-label="Période des statistiques">{(Object.keys(PERIODS) as Period[]).map(key=><button key={key} className={period===key?'active':''} onClick={()=>setPeriod(key)}>{PERIODS[key].label}</button>)}</div>,welcome)}
  </>;
}
