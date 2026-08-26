'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {AlertTriangle,Link2,QrCode,RefreshCw} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Catalog={id:string;title:string;public_slug:string;hub_public_slug:string|null};

const PUBLIC_ORIGIN='https://qatalink.com';

function slugify(value:string){
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,52)||'catalogue';
}

function suffix(){return Math.random().toString(36).slice(2,7)}

export function CatalogLinkRenamer(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [editedTitle,setEditedTitle]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');

  useEffect(()=>{
    if(location.pathname!='/dashboard')return;
    let timer:ReturnType<typeof setTimeout>|null=null;
    let cancelled=false;

    const resolve=()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>void sync(),50);
    };

    const sync=async()=>{
      const pageTitle=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(pageTitle!=='Vos catalogues'){
        if(!cancelled){setHost(null);setCatalog(null)}
        return;
      }

      const section=document.querySelector('.dash-v3-main .dash-section');
      if(!section)return;
      const cards=Array.from(section.querySelectorAll('.catalog-v2-card'));
      const active=cards.find(el=>el.classList.contains('active'))||cards[0]||null;
      const small=active?.querySelector('small')?.textContent?.trim()||'';
      const currentSlug=small.replace(/^\/(?:q|c)\//,'');
      const settingsCard=section.querySelector('.settings-v2-grid')?.closest('.dash-card')||section;
      const titleInput=settingsCard.querySelector('input.input') as HTMLInputElement|null;
      const domTitle=titleInput?.value?.trim()||'';

      if(!cancelled){
        setHost(settingsCard);
        if(domTitle)setEditedTitle(domTitle);
      }
      if(!currentSlug)return;

      const {data}=await supabase
        .from('catalogs')
        .select('id,title,public_slug,hub_public_slug')
        .eq('public_slug',currentSlug)
        .maybeSingle();
      if(!cancelled&&data){
        setCatalog(data as Catalog);
        if(!domTitle)setEditedTitle(String(data.title||''));
      }
    };

    resolve();
    const observer=new MutationObserver(resolve);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','value']});
    document.addEventListener('click',resolve,true);
    document.addEventListener('input',resolve,true);
    window.addEventListener('popstate',resolve);
    return()=>{
      cancelled=true;
      if(timer)clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('click',resolve,true);
      document.removeEventListener('input',resolve,true);
      window.removeEventListener('popstate',resolve);
    };
  },[supabase]);

  async function availableSlug(base:string,field:'public_slug'|'hub_public_slug'){
    let candidate=base;
    for(let i=0;i<8;i++){
      const {data}=await supabase.from('catalogs').select('id').eq(field,candidate).neq('id',catalog!.id).limit(1);
      if(!data?.length)return candidate;
      candidate=`${base}-${suffix()}`;
    }
    return `${base}-${Date.now().toString(36).slice(-5)}`;
  }

  async function regenerate(){
    if(!catalog||!editedTitle.trim()||busy)return;
    const base=slugify(editedTitle);
    const ok=confirm(
      `Vous allez remplacer le lien public actuel :\n${PUBLIC_ORIGIN}/c/${catalog.public_slug}\n\npar un nouveau lien basé sur « ${editedTitle.trim()} ».\n\nIMPORTANT : l'ancien lien et l'ancien QR code ne fonctionneront plus. Un nouveau QR sera généré automatiquement. Continuer ?`
    );
    if(!ok)return;

    setBusy(true);setNotice('');
    const nextPublic=await availableSlug(base,'public_slug');
    const nextHub=await availableSlug(`${base}-page`,'hub_public_slug');
    const {error}=await supabase
      .from('catalogs')
      .update({title:editedTitle.trim(),public_slug:nextPublic,hub_public_slug:nextHub})
      .eq('id',catalog.id);

    if(error){setBusy(false);setNotice(error.message);return}

    setCatalog({...catalog,title:editedTitle.trim(),public_slug:nextPublic,hub_public_slug:nextHub});
    setNotice('Lien modifié. Le nouveau QR est prêt. Actualisation…');
    const params=new URLSearchParams(location.search);
    params.set('tab','catalogs');
    params.set('catalog',catalog.id);
    setTimeout(()=>{location.href=`/dashboard?${params.toString()}`},450);
  }

  if(!host||!catalog)return null;
  const proposed=slugify(editedTitle||catalog.title);

  return createPortal(
    <div className="catalog-link-renamer" style={{marginTop:18,paddingTop:18,borderTop:'1px solid var(--border, rgba(127,127,127,.2))'}}>
      <div style={{display:'flex',gap:10,alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap'}}>
        <div style={{minWidth:0,flex:'1 1 360px'}}>
          <div className="eyebrow">LIEN PUBLIC & QR</div>
          <h3 style={{margin:'6px 0'}}>Changer le lien de ce catalogue</h3>
          <p style={{margin:'0 0 12px'}}>Le lien est lié au catalogue sélectionné, pas au nom général de la boutique.</p>
          <div style={{display:'grid',gap:6}}>
            <code style={{overflowWrap:'anywhere'}}><Link2 size={13} style={{verticalAlign:'middle',marginRight:6}}/>{PUBLIC_ORIGIN}/c/{catalog.public_slug}</code>
            <code style={{overflowWrap:'anywhere'}}><QrCode size={13} style={{verticalAlign:'middle',marginRight:6}}/>{PUBLIC_ORIGIN}/q/{catalog.public_slug}</code>
          </div>
        </div>
      </div>

      <div style={{marginTop:14,padding:14,borderRadius:14,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.25)'}}>
        <div style={{display:'flex',gap:9,alignItems:'flex-start'}}><AlertTriangle size={18}/><div><b>Si vous changez ce lien, l'ancien QR devient invalide.</b><p style={{margin:'4px 0 0'}}>Qatalink créera immédiatement un nouveau QR pour le nouveau lien. Pensez à remplacer les anciens QR déjà imprimés ou partagés.</p></div></div>
      </div>

      <div style={{marginTop:14,display:'grid',gap:8}}>
        <label><span>Nouveau lien proposé à partir du nom du catalogue</span><div className="input" style={{marginTop:6,overflowWrap:'anywhere'}}>{PUBLIC_ORIGIN}/c/{proposed}</div></label>
        <button className="btn btn-ghost" disabled={busy||!editedTitle.trim()} onClick={()=>void regenerate()} style={{justifySelf:'start'}}><RefreshCw size={14}/>{busy?'Modification…':'Changer le lien et générer le nouveau QR'}</button>
      </div>
      {notice&&<p style={{marginTop:10}}>{notice}</p>}
    </div>,host
  );
}
