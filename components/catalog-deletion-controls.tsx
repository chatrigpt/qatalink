'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Trash2} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function CatalogDeletionControls(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [host,setHost]=useState<Element|null>(null);
  const [catalogId,setCatalogId]=useState('');
  const [catalogTitle,setCatalogTitle]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const resolve=()=>{
      const title=document.querySelector('.dash-v3-top h1')?.textContent?.trim()||'';
      if(title!=='Vos catalogues'){setHost(null);setCatalogId('');setCatalogTitle('');return}
      const active=document.querySelector('.catalog-v2-card.active') as HTMLElement|null;
      const slug=(active?.querySelector('small')?.textContent||'').replace(/^\/q\//,'').trim();
      const editCard=document.querySelector('.catalog-v2-grid + .dash-card');
      setHost(editCard);
      if(!slug){setCatalogId('');setCatalogTitle('');return}
      const h3=active?.querySelector('h3')?.textContent?.trim()||'ce catalogue';
      setCatalogTitle(h3);
      (async()=>{
        const {data}=await supabase.from('catalogs').select('id').eq('public_slug',slug).maybeSingle();
        setCatalogId(data?.id||'');
      })();
    };
    resolve();
    const mo=new MutationObserver(()=>setTimeout(resolve,20));
    mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',resolve,true);
    return()=>{mo.disconnect();document.removeEventListener('click',resolve,true)};
  },[supabase]);

  async function removeCatalog(){
    if(!catalogId||busy)return;
    const ok=window.confirm(`Supprimer définitivement « ${catalogTitle} » ?\n\nLe catalogue, ses articles, catégories, QR, statistiques et réglages associés seront supprimés. Cette action est irréversible.`);
    if(!ok)return;
    setBusy(true);
    try{
      const {data:items}=await supabase.from('items').select('id').eq('catalog_id',catalogId);
      const itemIds=(items||[]).map((x:any)=>x.id);
      if(itemIds.length){
        const {data:images}=await supabase.from('item_images').select('storage_path').in('item_id',itemIds);
        const paths=(images||[]).map((x:any)=>x.storage_path).filter(Boolean);
        if(paths.length)await supabase.storage.from('catalog-assets').remove(paths);
      }
      const {error}=await supabase.from('catalogs').delete().eq('id',catalogId);
      if(error)throw error;
      window.location.href='/dashboard?tab=catalogs';
    }catch(error:any){
      alert(error?.message||'Impossible de supprimer ce catalogue pour le moment.');
      setBusy(false);
    }
  }

  if(!host||!catalogId)return null;
  return createPortal(
    <div className="catalog-delete-zone">
      <div><b>Zone sensible</b><span>Vous pouvez supprimer ce catalogue si vous n’en avez plus besoin.</span></div>
      <button className="catalog-delete-btn" onClick={removeCatalog} disabled={busy}><Trash2 size={15}/>{busy?'Suppression…':'Supprimer ce catalogue'}</button>
    </div>,
    host
  );
}
