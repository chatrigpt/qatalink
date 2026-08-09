'use client';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';

export function PublicCatalog({data}:{data:any}){
  const [cart,setCart]=useState<Record<string,number>>({});
  const interactive=['interactive','linkhub'].includes(String(data?.plan_code||''));
  const categories=Array.isArray(data?.categories)?data.categories:[];
  const allItems=categories.flatMap((c:any)=>Array.isArray(c.items)?c.items:[]);
  const currency=data?.business?.currency_code||'XOF';
  const theme=data?.theme||{};
  const primary=theme.primary_color||'#B5122B';
  const secondary=theme.secondary_color||'#F7E8EA';
  const background=theme.background_color||'#FFFFFF';
  const textColor=theme.text_color||'#171719';
  const headingFont=theme.heading_font||'Plus Jakarta Sans';
  const bodyFont=theme.body_font||'Plus Jakarta Sans';
  const radius=theme.border_radius||'18px';
  const layout=theme.layout_style||'cards';
  const showName=theme.show_business_name!==false;
  const showLogo=theme.show_logo!==false;
  const showPrices=theme.show_prices!==false;
  const align=theme.header_alignment||'left';
  const format=(v:number)=>currency==='XOF'?`${new Intl.NumberFormat('fr-FR').format(v).replace(/\u202f/g,' ')} F`:new Intl.NumberFormat('fr-FR',{style:'currency',currency}).format(v);
  const selected=allItems.filter((i:any)=>(cart[i.id]||0)>0);
  const total=selected.reduce((sum:number,i:any)=>sum+(Number(i.price_minor||0)*(cart[i.id]||0)),0);
  const phone=String(data?.business?.whatsapp_number||'').replace(/\D/g,'');
  const message=useMemo(()=>{
    if(interactive&&selected.length){
      const lines=selected.map((i:any)=>`• ${cart[i.id]} × ${i.name}${showPrices?` — ${format(Number(i.price_minor||0)*(cart[i.id]||0))}`:''}`);
      return `Bonjour ${data?.business?.name||''}, je souhaite commander depuis votre Qatalink :\n\n${lines.join('\n')}${showPrices?`\n\nTotal : ${format(total)}`:''}`;
    }
    return `Bonjour ${data?.business?.name||''}, je vous contacte depuis votre catalogue Qatalink.`;
  },[cart,selected,total,interactive,showPrices]);
  const whatsapp=phone?`https://wa.me/${phone}?text=${encodeURIComponent(message)}`:'#';
  const change=(id:string,delta:number)=>setCart(prev=>({...prev,[id]:Math.max(0,(prev[id]||0)+delta)}));

  const style={
    '--red':primary,
    '--catalog-primary':primary,
    '--catalog-secondary':secondary,
    '--bg':background,
    '--surface':background,
    '--surface-2':secondary,
    '--text':textColor,
    '--catalog-radius':radius,
    '--catalog-heading':headingFont,
    '--catalog-body':bodyFont,
    background,
    color:textColor,
    fontFamily:`${bodyFont}, sans-serif`
  } as React.CSSProperties;

  return <main className={`public-catalog-page public-themed public-layout-${layout} public-card-${theme.card_style||'soft'} public-button-${theme.button_style||'rounded'}`} style={style}>
    <header className="public-cover" style={data?.business?.cover_url?{backgroundImage:`linear-gradient(180deg,transparent,rgba(0,0,0,.58)),url(${data.business.cover_url})`}:undefined}>
      <div className="public-business-head" style={{textAlign:align as any,justifyContent:align==='center'?'center':align==='right'?'flex-end':'flex-start'}}>
        {showLogo&&data?.business?.logo_url&&<img src={data.business.logo_url} alt=""/>}
        <div><span>QATALINK</span>{showName&&<h1 style={{fontFamily:`${headingFont}, sans-serif`}}>{data?.business?.name||data?.catalog?.title}</h1>}<p>{data?.business?.description||data?.catalog?.title}</p></div>
      </div>
    </header>
    <div className="public-catalog-inner">
      <div className="public-title-row"><div><span className="eyebrow">{data?.catalog?.type==='menu'?'MENU':'CATALOGUE'}</span><h2 style={{fontFamily:`${headingFont}, sans-serif`}}>{data?.catalog?.title}</h2></div>{interactive&&<div className="public-cart-count"><ShoppingBag size={17}/>{selected.reduce((s:number,i:any)=>s+(cart[i.id]||0),0)}</div>}</div>
      {categories.map((cat:any)=><section className="public-category" key={cat.id}><div className="public-category-head"><h3 style={{fontFamily:`${headingFont}, sans-serif`}}>{cat.name}</h3>{cat.description&&<p>{cat.description}</p>}</div><div className="public-items-grid">{(cat.items||[]).map((item:any)=><article className="public-item-card" key={item.id}>{item.image_url?<img className="public-item-image" src={item.image_url} alt={item.name}/>:<div className="public-item-image public-item-placeholder"/>}<div className="public-item-content"><h4 style={{fontFamily:`${headingFont}, sans-serif`}}>{item.name}</h4><p>{item.description||' '}</p><div className="public-item-bottom">{showPrices&&<strong>{format(Number(item.price_minor||0))}</strong>}{interactive&&<div className="qty-control">{(cart[item.id]||0)>0&&<><button onClick={()=>change(item.id,-1)}><Minus size={15}/></button><span>{cart[item.id]}</span></>}<button onClick={()=>change(item.id,1)}><Plus size={15}/></button></div>}</div></div></article>)}</div></section>)}
    </div>
    <div className="public-whatsapp-bar"><a className="btn btn-primary" href={whatsapp} target="_blank" rel="noreferrer">{interactive&&selected.length?(showPrices?`Commander · ${format(total)}`:'Envoyer ma sélection'):'Contacter sur WhatsApp'}</a></div>
  </main>
}
