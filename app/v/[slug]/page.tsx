import {createClient} from '@supabase/supabase-js';
import {ExternalLink,Instagram,Facebook,Music2,Youtube,Linkedin,Globe2,MapPin,MessageCircle,BookOpen} from 'lucide-react';

export const dynamic='force-dynamic';
export const revalidate=0;

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';

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

export default async function VitrinePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false}});
  const {data,error}=await supabase.rpc('get_public_vitrine',{p_slug:slug});
  if(error||!data)return <main className="public-unavailable"><div><div className="eyebrow">QATALINK</div><h1>Vitrine indisponible</h1><p>Cette vitrine n’est pas publiée ou son accès a expiré.</p></div></main>;

  const b=data.business||{}; const theme=data.theme||{}; const links=Array.isArray(data.links)?data.links:[]; const catalog=data.catalog;
  const primary=theme.primary_color||'#C7192F'; const secondary=theme.secondary_color||'#F7E8EA'; const bg=theme.background_color||'#FFF'; const text=theme.text_color||'#171719';
  const pageBg=theme.background_image_url
    ?`linear-gradient(rgba(0,0,0,${Math.max(0,Math.min(.8,Number(theme.background_image_overlay??.16)))}),rgba(0,0,0,${Math.max(0,Math.min(.8,Number(theme.background_image_overlay??.16)))})),url(${theme.background_image_url}) center/cover fixed`
    :(theme.background_mode==='gradient'&&theme.background_gradient?theme.background_gradient:bg);
  const vars={'--v-primary':primary,'--v-secondary':secondary,'--v-bg':bg,'--v-text':text} as React.CSSProperties;
  const phone=String(b.whatsapp_number||'').replace(/\D/g,'');

  return <main className="vitrine-page" style={{...vars,background:pageBg,color:text}}>
    <section className="vitrine-card">
      {b.cover_url&&<div className="vitrine-cover" style={{backgroundImage:`url(${b.cover_url})`}}/>}
      <div className="vitrine-profile">
        {b.logo_url&&<div className="vitrine-logo"><img src={b.logo_url} alt={`Logo ${b.name||''}`}/></div>}
        <span className="vitrine-kicker">QATALINK VITRINE</span>
        <h1>{b.profile_headline||b.name}</h1>
        <p>{b.profile_bio||b.description}</p>
      </div>

      <div className="vitrine-links">
        {catalog&&<a className="vitrine-main-link" href={`/c/${encodeURIComponent(catalog.public_slug)}`}><BookOpen size={21}/><span><b>Voir {catalog.type==='menu'?'le menu':'le catalogue'}</b><small>{catalog.title}</small></span><ExternalLink size={17}/></a>}
        {phone&&<a className="vitrine-link" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer"><MessageCircle size={19}/><span>WhatsApp</span><ExternalLink size={15}/></a>}
        {links.map((l:any)=><a className="vitrine-link" key={`${l.kind}-${l.label}-${l.sort_order}`} href={l.url} target="_blank" rel="noreferrer"><Icon kind={l.kind}/><span>{l.label}</span><ExternalLink size={15}/></a>)}
        {data.location?.maps_url&&<a className="vitrine-link" href={data.location.maps_url} target="_blank" rel="noreferrer"><MapPin size={19}/><span>{data.location.label||data.location.address_text||'Nous trouver'}</span><ExternalLink size={15}/></a>}
      </div>

      <footer className="vitrine-footer">Propulsé par <b>Qatalink</b></footer>
    </section>
  </main>;
}
