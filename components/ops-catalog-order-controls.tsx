'use client';

import {useEffect,useState} from 'react';
import {ChevronDown,ChevronUp,GripVertical,RefreshCw} from 'lucide-react';

type Category={id:string;name:string;sort_order?:number};
type Item={id:string;name:string;category_id:string|null;sort_order?:number};
type OpsPayload={access?:{can_edit_categories?:boolean;can_edit_items?:boolean};editor?:{categories?:Category[];items?:Item[]}|null};

export function OpsCatalogOrderControls({accessKey}:{accessKey:string}){
  const storageKey=`qatalink_ops_pin_${accessKey}`;
  const [pin,setPin]=useState('');
  const [payload,setPayload]=useState<OpsPayload|null>(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const read=()=>{try{const next=sessionStorage.getItem(storageKey)||'';setPin(current=>current===next?current:next)}catch{}};
    read();const timer=setInterval(read,1200);return()=>clearInterval(timer);
  },[storageKey]);
  useEffect(()=>{if(pin.length>=4)void load()},[pin]);

  async function request(editAction?:string,ids?:string[]){
    const body=editAction?{access_key:accessKey,pin,action:'edit',edit_action:editAction,payload:{ids}}:{access_key:accessKey,pin,action:'list',limit:1};
    const response=await fetch('/api/ops/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error||'ACTION_FAILED');
    return data;
  }
  async function load(){try{setPayload(await request())}catch{setPayload(null)}}
  async function reorder(action:'category_reorder'|'item_reorder',ids:string[]){if(busy)return;setBusy(true);try{await request(action,ids);await load()}finally{setBusy(false)}}
  async function moveCategory(index:number,delta:number){const categories=[...(payload?.editor?.categories||[])];const target=index+delta;if(target<0||target>=categories.length)return;[categories[index],categories[target]]=[categories[target],categories[index]];setPayload(current=>current?{...current,editor:{...(current.editor||{}),categories}}:current);await reorder('category_reorder',categories.map(x=>x.id))}
  async function moveItem(categoryId:string|null,index:number,delta:number){const all=[...(payload?.editor?.items||[])];const group=all.filter(x=>x.category_id===categoryId);const target=index+delta;if(target<0||target>=group.length)return;[group[index],group[target]]=[group[target],group[index]];setPayload(current=>current?{...current,editor:{...(current.editor||{}),items:all.map(item=>group.find(g=>g.id===item.id)||item)}}:current);await reorder('item_reorder',group.map(x=>x.id))}

  const editor=payload?.editor;if(!pin||!editor||(!payload?.access?.can_edit_categories&&!payload?.access?.can_edit_items))return null;
  const categories=editor.categories||[];const items=editor.items||[];
  return <section style={{maxWidth:1180,margin:'0 auto 28px',padding:'0 16px'}}><div style={{background:'#fff',border:'1px solid #e8e8eb',borderRadius:22,padding:18,boxShadow:'0 10px 35px rgba(0,0,0,.04)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14}}><div style={{display:'flex',gap:10,alignItems:'center'}}><GripVertical size={20}/><div><h2 style={{margin:0,fontSize:19}}>Ordre d’affichage</h2><p style={{margin:'4px 0 0',fontSize:13,opacity:.6}}>Réorganisez les catégories et les articles comme ils apparaissent au client.</p></div></div><button type="button" onClick={()=>void load()} disabled={busy} style={{border:'1px solid #ddd',background:'#fff',borderRadius:12,padding:9}}><RefreshCw size={15}/></button></div><div style={{display:'grid',gap:12}}>{categories.map((category,ci)=>{const group=items.filter(x=>x.category_id===category.id);return <article key={category.id} style={{border:'1px solid #ececef',borderRadius:16,padding:12}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><strong>{category.name}</strong>{payload?.access?.can_edit_categories&&<div style={{display:'flex',gap:6}}><OrderButton disabled={busy||ci===0} onClick={()=>void moveCategory(ci,-1)} up/><OrderButton disabled={busy||ci===categories.length-1} onClick={()=>void moveCategory(ci,1)}/></div>}</div>{payload?.access?.can_edit_items&&<div style={{display:'grid',gap:6,marginTop:9}}>{group.map((item,ii)=><div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:11,background:'#f7f7f8'}}><span style={{fontSize:13}}>{item.name}</span><div style={{display:'flex',gap:5}}><OrderButton disabled={busy||ii===0} onClick={()=>void moveItem(category.id,ii,-1)} up small/><OrderButton disabled={busy||ii===group.length-1} onClick={()=>void moveItem(category.id,ii,1)} small/></div></div>)}</div>}</article>})}</div></div></section>;
}

function OrderButton({disabled,onClick,up=false,small=false}:{disabled:boolean;onClick:()=>void;up?:boolean;small?:boolean}){return <button type="button" disabled={disabled} onClick={onClick} aria-label={up?'Monter':'Descendre'} style={{border:'1px solid #ddd',background:'#fff',borderRadius:9,padding:small?5:7,opacity:disabled?0.4:1}}>{up?<ChevronUp size={small?14:16}/>:<ChevronDown size={small?14:16}/>}</button>}
