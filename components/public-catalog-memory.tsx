'use client';

import {useEffect} from 'react';

export type RememberedCatalog={slug:string;title:string;displayName:string;businessType:string;logoUrl:string|null;coverUrl:string|null;lastVisitedAt:string;favorite?:boolean};
export const RECENT_CATALOGS_KEY='qatalink_recent_catalogs_v1';

export function PublicCatalogMemory({catalog}:{catalog:Omit<RememberedCatalog,'lastVisitedAt'|'favorite'>}){
  useEffect(()=>{
    try{
      const current=JSON.parse(localStorage.getItem(RECENT_CATALOGS_KEY)||'[]');
      const list:Array<RememberedCatalog>=Array.isArray(current)?current:[];
      const previous=list.find(x=>x.slug===catalog.slug);
      const next:RememberedCatalog={...catalog,lastVisitedAt:new Date().toISOString(),favorite:!!previous?.favorite};
      localStorage.setItem(RECENT_CATALOGS_KEY,JSON.stringify([next,...list.filter(x=>x.slug!==catalog.slug)].slice(0,60)));
      window.dispatchEvent(new CustomEvent('qatalink:catalog-visited',{detail:next}));
    }catch{}
  },[catalog.slug,catalog.title,catalog.displayName,catalog.businessType,catalog.logoUrl,catalog.coverUrl]);
  return null;
}
