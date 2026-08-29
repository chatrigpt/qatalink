'use client';

import {useEffect,useMemo,useState} from 'react';
import {ChevronDown,ChevronUp,GripVertical} from 'lucide-react';
import {createPortal} from 'react-dom';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Cat={id:string;name:string;sort_order:number};
type Item={id:string;name:string;category_id:string|null;sort_order:number};

export function CatalogOrderControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);const [host,setHost]=useState<Element|null>(null);const [catalogId,setCatalogId]=useState('');const [cats,setCats]=useState<Cat[]>([]);const [items,setItems]=useState<Item[]>([]);const [busy,setBusy]=useState('');
  useEffect(()=>{
    if(location.pathname!='/dashboard')return;let timer:ReturnType<typeof setTimeout>|null=null;
    const sync=()=>{const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';const nextHost=title==='Articles & catégories'?document.querySelector('.dash-v3-main .dash-section'):null;setHost(nextHost);const id=new URLSearchParams(location.search).get('catalog')||'';setCatalogId(id)};
    const schedule=()=>{if(timer)clearTimeout(timer);timer=setTimeout(sync,80)};schedule();const interval=setInterval(schedule,1200);document.addEventListener('click',schedule,true);window.addEventListener('popstate',schedule);window.addEventListener('qatalink:catalog-change',schedule as EventListener);
    return()=>{if(timer)clearTimeout(timer);clearInterval(interval);document.removeEventListener('click',schedule,true);window.removeEventListener('popstate',schedule);window.removeEventListener('qatalink:catalog-change',schedule as EventListener)}
  },[]);
  useEffect(()=>{if(!host||!catalogId)return;void load()},[host,catalogId]);
  async function load(){const [{data:c},{data:i}]=await Promise.all([supabase.from('categories').select('id,name,sort_order').eq('catalog_id',catalogId).order('sort_order'),supabase.from('items').select('id,name,category_id,sort_order').eq('catalog_id',catalogId).order('sort_order')]);setCats((c||[]) as Cat[]);setItems((i||[]) as Item[])}
  async function moveCat(index:number,delta:number){const target=index+delta;if(target<0||target>=cats.length||busy)return;setBusy('cat');const next=[...cats];[next[index],next[target]]=[next[target],next[index]];setCats(next);await Promise.all(next.map((c,i)=>supabase.from('categories').update({sort_order:i+1}).eq('id',c.id)));setBusy('')}
  async function saveItemGroup(group:Item[]){const rank=new Map(group.map((x,i)=>[x.id,i+1]));setItems(v=>v.map(x=>rank.has(x.id)?{...x,sort_order:rank.get(x.id)!}:x));await Promise.all(group.map((x,i)=>supabase.from('items').update({sort_order:i+1}).eq('id',x.id)))}
  async function moveItem(catId:string|null,index:number,delta:number){const group=items.filter(x=>x.category_id===catId).sort((a,b)=>a.sort_order-b.sort_order);const target=index+delta;if(target<0||target>=group.length||busy)return;setBusy('item');[group[index],group[target]]=[group[target],group[index]];await saveItemGroup(group);setBusy('')}
  async function setItemPosition(catId:string|null,itemId:string,position:number){const group=items.filter(x=>x.category_id===catId).sort((a,b)=>a.sort_order-b.sort_order);const current=group.findIndex(x=>x.id===itemId);if(current<0||busy)return;const target=Math.max(0,Math.min(group.length-1,Math.round(position)-1));if(target===current)return;setBusy('item');const [moved]=group.splice(current,1);group.splice(target,0,moved);await saveItemGroup(group);setBusy('')}
  if(!host||!catalogId)return null;
  const ui=<section className="catalog-order-panel"><div className="catalog-order-head"><GripVertical size={20}/><div><h3>Organiser l’affichage</h3><p>Modifiez l’ordre public des catégories et des articles. La position 1 apparaît en premier.</p></div></div><div className="catalog-order-groups">{cats.map((cat,ci)=>{const group=items.filter(x=>x.category_id===cat.id).sort((a,b)=>a.sort_order-b.sort_order);return <article key={cat.id} className="catalog-order-group"><div className="catalog-order-category"><b>{cat.name}</b><div><button type="button" disabled={ci===0||!!busy} onClick={()=>void moveCat(ci,-1)} aria-label="Monter la catégorie"><ChevronUp size={16}/></button><button type="button" disabled={ci===cats.length-1||!!busy} onClick={()=>void moveCat(ci,1)} aria-label="Descendre la catégorie"><ChevronDown size={16}/></button></div></div><div className="catalog-order-items">{group.map((item,ii)=><div key={item.id} className="catalog-order-item"><span>{item.name}</span><label>Position<input key={`${item.id}-${ii}`} type="number" min={1} max={group.length} defaultValue={ii+1} disabled={!!busy} onBlur={e=>void setItemPosition(cat.id,item.id,Number(e.currentTarget.value||ii+1))} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label><div><button type="button" disabled={ii===0||!!busy} onClick={()=>void moveItem(cat.id,ii,-1)}><ChevronUp size={14}/></button><button type="button" disabled={ii===group.length-1||!!busy} onClick={()=>void moveItem(cat.id,ii,1)}><ChevronDown size={14}/></button></div></div>)}</div></article>})}</div></section>;
  return createPortal(ui,host);
}
