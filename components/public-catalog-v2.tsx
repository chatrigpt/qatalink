'use client';

import {Minus,Plus,ShoppingBag,X,ZoomIn} from 'lucide-react';
import {useMemo,useState} from 'react';

type AnyItem={id:string;name:string;description?:string|null;price_minor?:number|null;promo_price_minor?:number|null;promo_starts_at?:string|null;promo_ends_at?:string|null;image_url?:string|null};

function promoActive(item:AnyItem){
  if(item.promo_price_minor===null||item.promo_price_minor===undefined)return false;
  const now=Date.now();
  if(item.promo_starts_at&&new Date(item.promo_starts_at).getTime()>now)return false;
  if(item.promo_ends_at&&new Date(item.promo_ends_at).getTime()<=now)return false;
  return true;
}

export function PublicCatalogV2({data}:{data:any}){
  const [cart,setCart]=useState<Record<string,number>>({});
  const [activeCategory,setActiveCategory]=useState<string>(data?.categories?.[0]?.id||'');
  const [zoom,setZoom]=useState<{url:string;name:string}|null>(null);
  const plan=String(data?.plan_code||'');
  const interactive=['trial','interactive','linkhub'].includes(plan);
  const categories=Array.isArray(data?.categories)?data.categories:[];
  const allItems=categories.flatMap((c:any)=>Array.isArray(c.items)?c.items:[]);
  const currency=data?.business?.currency_code||'XOF';
  const theme=data?.theme||{};
  const primary=theme.primary_color||'#B5122B';
  const secondary=theme.secondary_color||'#F7E8EA';
  const bg=theme.background_color||'#FFFFFF';
  const bgMode=theme.background_mode||'solid';
  const bgGradient=theme.background_gradient||'';
  const bgImage=theme.background_image_url||'';
  const overlay=Math.max(0,Math.min(0.85,Number(theme.background_image_overlay??0.18)));
  const textColor=theme.text_color||'#171719';
  const headingFont=theme.heading_font||'Plus Jakarta Sans';
  const bodyFont=theme.body_font||'Plus Jakarta Sans';
  const radius=theme.border_radius||'18px';
  const layout=theme.layout_style||'list';
  const showName=theme.show_business_name!==false;
  const showLogo=theme.show_logo!==false;
  const showPrices=theme.show_prices!==false;
  const align=theme.header_alignment||'left';
  const logoShape=theme.logo_shape||'rounded';
  const isMenu=String(data?.catalog?.type||'menu')==='menu';
  const format=(v:number)=>currency==='XOF'?`${new Intl.NumberFormat('fr-FR').format(v).replace(/\u202f/g,' ')} F`:new Intl.NumberFormat('fr-FR',{style:'currency',currency}).format(v);
  const selected=allItems.filter((i:any)=>(cart[i.id]||0)>0);
  const unit=(i:AnyItem)=>promoActive(i)?Number(i.promo_price_minor||0):Number(i.price_minor||0);
  const total=selected.reduce((sum:number,i:any)=>sum+unit(i)*(cart[i.id]||0),0);
  const phone=String(data?.business?.whatsapp_number||'').replace(/\D/g,'');
  const message=useMemo(()=>{
    if(interactive&&selected.length){
      const lines=selected.map((i:any)=>`• ${cart[i.id]} × ${i.name}${showPrices?` — ${format(unit(i)*(cart[i.id]||0))}`:''}`);
      return `Bonjour ${data?.business?.name||''}, je souhaite commander depuis votre Qatalink :\n\n${lines.join('\n')}${showPrices?`\n\nTotal : ${format(total)}`:''}`;
    }
    return `Bonjour ${data?.business?.name||''}, je vous contacte depuis votre catalogue Qatalink.`;
  },[cart,selected,total,interactive,showPrices,data?.business?.name]);
  const whatsapp=phone?`https://wa.me/${phone}?text=${encodeURIComponent(message)}`:'#';
  const change=(id:string,delta:number)=>setCart(prev=>({...prev,[id]:Math.max(0,(prev[id]||0)+delta)}));
  const jump=(id:string)=>{setActiveCategory(id);document.getElementById(`cat-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'});};

  const headingStyle:React.CSSProperties={
    fontFamily:`${headingFont}, sans-serif`,
    fontWeight:theme.heading_bold===false?400:700,
    fontStyle:theme.heading_italic?'italic':'normal',
    textDecoration:theme.heading_underline?'underline':'none',
    textTransform:(theme.heading_case||'none') as any
  };
  const bodyStyle:React.CSSProperties={
    fontFamily:`${bodyFont}, sans-serif`,
    fontWeight:theme.body_bold?700:400,
    fontStyle:theme.body_italic?'italic':'normal',
    textDecoration:theme.body_underline?'underline':'none',
    textTransform:(theme.body_case||'none') as any
  };
  const pageBackground=bgImage
    ?`linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url(${bgImage}) center/cover fixed`
    :(bgMode==='gradient'&&bgGradient?bgGradient:bg);
  const cssVars={'--catalog-primary':primary,'--catalog-secondary':secondary,'--catalog-bg':bg,'--catalog-text':textColor,'--catalog-radius':radius} as React.CSSProperties;

  return <main className={`public-v2 layout-${layout} ${isMenu?'menu-mode':'catalog-mode'}`} style={{...cssVars,...bodyStyle,background:pageBackground,color:textColor}}>
    <header className="public-v2-hero" style={data?.business?.cover_url?{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.58)),url(${data.business.cover_url})`}:undefined}>
      <div className="public-v2-brand" style={{textAlign:align as any,justifyContent:align==='center'?'center':align==='right'?'flex-end':'flex-start'}}>
        {showLogo&&data?.business?.logo_url&&<div className={`public-v2-logo ${logoShape}`}><img src={data.business.logo_url} alt={`Logo ${data?.business?.name||''}`}/></div>}
        <div><span className="public-v2-kicker">QATALINK</span>{showName&&<h1 style={headingStyle}>{data?.business?.name||data?.catalog?.title}</h1>}<p>{data?.business?.description||data?.catalog?.title}</p></div>
      </div>
    </header>

    {categories.length>1&&<nav className="public-v2-tabs">{categories.map((cat:any)=><button key={cat.id} className={activeCategory===cat.id?'active':''} onClick={()=>jump(cat.id)}>{cat.name}</button>)}</nav>}

    <div className="public-v2-inner">
      <div className="public-v2-title"><div><span className="public-v2-kicker">{isMenu?'MENU':'CATALOGUE'}</span><h2 style={headingStyle}>{data?.catalog?.title}</h2></div>{interactive&&<div className="public-v2-cart-count"><ShoppingBag size={17}/>{selected.reduce((s:number,i:any)=>s+(cart[i.id]||0),0)}</div>}</div>
      {categories.map((cat:any)=><section id={`cat-${cat.id}`} className="public-v2-category" key={cat.id}>
        <div className="public-v2-category-head"><h3 style={headingStyle}>{cat.name}</h3>{cat.description&&<p>{cat.description}</p>}</div>
        <div className="public-v2-items">{(cat.items||[]).map((item:AnyItem)=>{
          const promo=promoActive(item); const current=unit(item);
          return <article className={`public-v2-item ${item.image_url?'has-image':'no-image'}`} key={item.id}>
            {item.image_url&&<button className="public-v2-image-wrap" onClick={()=>setZoom({url:item.image_url!,name:item.name})} aria-label={`Agrandir ${item.name}`}><img src={item.image_url} alt={item.name}/><span><ZoomIn size={17}/></span></button>}
            <div className="public-v2-copy"><div className="public-v2-name-price"><h4 style={headingStyle}>{item.name}</h4>{showPrices&&<div className="public-v2-price">{promo&&<del>{format(Number(item.price_minor||0))}</del>}<strong>{format(current)}</strong>{promo&&item.promo_ends_at&&<small>Promo jusqu’au {new Date(item.promo_ends_at).toLocaleDateString('fr-FR')}</small>}</div>}</div>{item.description&&<p>{item.description}</p>}</div>
            {interactive&&<div className="public-v2-qty">{(cart[item.id]||0)>0&&<><button onClick={()=>change(item.id,-1)} aria-label={`Retirer ${item.name}`}><Minus size={15}/></button><span>{cart[item.id]}</span></>}<button onClick={()=>change(item.id,1)} aria-label={`Ajouter ${item.name}`}><Plus size={15}/></button></div>}
          </article>})}</div>
      </section>)}
    </div>

    <div className="public-v2-whatsapp"><a href={whatsapp} target="_blank" rel="noreferrer">{interactive&&selected.length?(showPrices?`Commander · ${format(total)}`:'Envoyer ma sélection'):'Contacter sur WhatsApp'}</a></div>
    {zoom&&<div className="public-v2-lightbox" onClick={()=>setZoom(null)}><button onClick={()=>setZoom(null)} aria-label="Fermer"><X/></button><img src={zoom.url} alt={zoom.name}/><strong>{zoom.name}</strong></div>}
  </main>;
}
