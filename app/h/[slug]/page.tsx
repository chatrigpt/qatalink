import {createClient} from '@supabase/supabase-js';
import {BookOpen,ExternalLink,Facebook,Globe2,Instagram,Linkedin,MapPin,MessageCircle,Music2,Youtube} from 'lucide-react';

export const dynamic='force-dynamic';
export const revalidate=0;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

type BrandDefaults={style:'solid'|'gradient'|'glossy'|'metallic';a:string;b:string;text:string;iconUrl?:string};

function platformDefaults(kind:string):BrandDefaults|null{
  if(kind==='instagram')return{style:'gradient',a:'#833AB4',b:'#FD1D1D',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/instagram/ffffff'};
  if(kind==='facebook')return{style:'solid',a:'#1877F2',b:'#1877F2',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/facebook/ffffff'};
  if(kind==='x'||kind==='twitter')return{style:'solid',a:'#000000',b:'#000000',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/x/ffffff'};
  if(kind==='threads')return{style:'solid',a:'#000000',b:'#000000',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/threads/ffffff'};
  if(kind==='google_reviews')return{style:'solid',a:'#FFFFFF',b:'#FFFFFF',text:'#202124',iconUrl:'https://cdn.simpleicons.org/google/4285F4'};
  if(kind==='whatsapp')return{style:'solid',a:'#25D366',b:'#25D366',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/whatsapp/ffffff'};
  if(kind==='youtube')return{style:'solid',a:'#FF0000',b:'#FF0000',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/youtube/ffffff'};
  if(kind==='tiktok')return{style:'solid',a:'#000000',b:'#000000',text:'#FFFFFF',iconUrl:'https://cdn.simpleicons.org/tiktok/ffffff'};
  if(kind==='wave')return{style:'solid',a:'#54C8E8',b:'#54C8E8',text:'#071820'};
  if(kind==='orange_money')return{style:'solid',a:'#FF7900',b:'#FF7900',text:'#111111'};
  if(kind==='maps')return{style:'solid',a:'#4285F4',b:'#4285F4',text:'#FFFFFF'};
  return null;
}

function Icon({kind}:{kind:string}){
  const props={size:19,strokeWidth:2.2};
  if(kind==='instagram')return <Instagram {...props}/>;
  if(kind==='facebook')return <Facebook {...props}/>;
  if(kind==='tiktok')return <Music2 {...props}/>;
  if(kind==='youtube')return <Youtube {...props}/>;
  if(kind==='linkedin')return <Linkedin {...props}/>;
  if(kind==='website')return <Globe2 {...props}/>;
  if(kind==='maps')return <MapPin {...props}/>;
  if(kind==='whatsapp')return <MessageCircle {...props}/>;
  return <ExternalLink {...props}/>;
}

function LinkIcon({link}:{link:any}){
  const defaults=platformDefaults(String(link.kind||''));
  const src=link.icon_url||defaults?.iconUrl||'';
  if(src)return <img src={src} alt="" style={{width:20,height:20,objectFit:'contain',flex:'0 0 20px'}}/>;
  return <Icon kind={link.kind}/>;
}

function buttonBackground(style:string,a:string,b:string){
  if(style==='gradient')return `linear-gradient(135deg,${a} 0%,${b} 100%)`;
  if(style==='glossy')return `linear-gradient(180deg,rgba(255,255,255,.42) 0%,rgba(255,255,255,.10) 38%,rgba(0,0,0,.16) 100%),linear-gradient(135deg,${a} 0%,${b} 100%)`;
  if(style==='metallic')return `linear-gradient(125deg,${a} 0%,${b} 18%,rgba(255,255,255,.82) 36%,${a} 52%,rgba(16,16,18,.48) 70%,${b} 86%,${a} 100%)`;
  return a;
}

export default async function CatalogHubPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  const {data,error}=await supabase.rpc('get_public_catalog_hub',{p_slug:slug});
  if(error||!data)return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>Page centrale indisponible</h1><p>Cette page n’est pas publiée ou son accès a expiré.</p></div></main>;

  const business=data.business||{};
  const catalog=data.catalog||{};
  const theme=data.theme||{};
  const hub=data.hub||{};
  const links=Array.isArray(data.links)?data.links:[];
  const primary=theme.primary_color||'#C7192F';
  const bg=theme.background_color||'#FFF';
  const text=theme.text_color||'#171719';
  const pageBg=theme.background_image_url
    ?`linear-gradient(rgba(0,0,0,${Math.max(0,Math.min(.8,Number(theme.background_image_overlay??.16)))}),rgba(0,0,0,${Math.max(0,Math.min(.8,Number(theme.background_image_overlay??.16)))})),url(${theme.background_image_url}) center/cover fixed`
    :(theme.background_mode==='gradient'&&theme.background_gradient?theme.background_gradient:bg);
  const buttonA=hub.button_color||primary;
  const buttonB=hub.button_color_2||theme.secondary_color||'#7A0E1D';
  const buttonText=hub.button_text_color||'#FFFFFF';
  const buttonStyle=String(hub.button_style||'solid');
  const buttonRadius=hub.button_radius||'18px';
  const buttonBg=buttonBackground(buttonStyle,buttonA,buttonB);
  const logo=hub.logo_url||business.logo_url;
  const cover=hub.cover_url||business.cover_url;
  const phone=String(business.whatsapp_number||'').replace(/\D/g,'');
  const vars={'--v-primary':primary,'--v-bg':bg,'--v-text':text,'--hub-radius':buttonRadius} as React.CSSProperties;
  const btnStyle={background:buttonBg,color:buttonText,borderRadius:buttonRadius} as React.CSSProperties;
  const whatsappConfig=links.find((link:any)=>String(link.kind)==='whatsapp');
  const visibleLinks=links.filter((link:any)=>String(link.kind)!=='whatsapp');
  const styleFor=(link:any)=>{
    const defaults=platformDefaults(String(link.kind||''));
    const style=String(link.button_style||defaults?.style||buttonStyle);
    const a=link.button_color||defaults?.a||buttonA;
    const b=link.button_color_2||defaults?.b||buttonB;
    const color=link.button_text_color||defaults?.text||buttonText;
    return {background:buttonBackground(style,a,b),color,borderRadius:buttonRadius} as React.CSSProperties;
  };

  return <main className="vitrine-page catalog-hub-page" style={{...vars,background:pageBg,color:text}}>
    <section className="vitrine-card catalog-hub-card">
      {cover&&<div className="vitrine-cover" style={{backgroundImage:`url(${cover})`}}/>}
      <div className="vitrine-profile">
        {logo&&<div className="vitrine-logo catalog-hub-logo"><img src={logo} alt={`Logo ${business.name||''}`}/></div>}
        <span className="vitrine-kicker">QATALINK</span>
        <h1>{business.profile_headline||business.name}</h1>
        <p>{business.profile_bio||business.description}</p>
      </div>

      <div className={`vitrine-links hub-buttons hub-style-${buttonStyle}`}>
        <a className="vitrine-main-link hub-custom-button" style={btnStyle} href={`/c/${encodeURIComponent(catalog.public_slug)}`}>
          <BookOpen size={21}/><span><b>{catalog.title||'Menu / catalogue'}</b><small>{catalog.type==='menu'?'Voir le menu':'Voir le catalogue'}</small></span><ExternalLink size={17}/>
        </a>
        {whatsappConfig?<a className="vitrine-link hub-custom-button" style={styleFor(whatsappConfig)} href={whatsappConfig.url} target="_blank" rel="noreferrer"><LinkIcon link={whatsappConfig}/><span>{whatsappConfig.label||'WhatsApp'}</span><ExternalLink size={15}/></a>:phone&&<a className="vitrine-link hub-custom-button" style={styleFor({kind:'whatsapp'})} href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer"><LinkIcon link={{kind:'whatsapp'}}/><span>WhatsApp</span><ExternalLink size={15}/></a>}
        {visibleLinks.map((link:any)=><a className="vitrine-link hub-custom-button" style={styleFor(link)} key={`${link.kind}-${link.label}-${link.sort_order}`} href={link.url} target="_blank" rel="noreferrer"><LinkIcon link={link}/><span>{link.label}</span><ExternalLink size={15}/></a>)}
        {data.location?.maps_url&&<a className="vitrine-link hub-custom-button" style={styleFor({kind:'maps'})} href={data.location.maps_url} target="_blank" rel="noreferrer"><MapPin size={19}/><span>{data.location.label||data.location.address_text||'Nous trouver'}</span><ExternalLink size={15}/></a>}
      </div>

      <footer className="vitrine-footer">Propulsé par <b>Qatalink</b></footer>
    </section>
  </main>;
}
