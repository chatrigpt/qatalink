import type { MetadataRoute } from 'next';

export default function manifest():MetadataRoute.Manifest{
  return {
    id:'/mobile',
    name:'Qatalink',
    short_name:'Qatalink',
    description:'Commerce local, catalogues, commandes, caisse et livraisons Qatalink.',
    start_url:'/mobile',
    display:'standalone',
    background_color:'#ffffff',
    theme_color:'#c7192f',
    orientation:'any',
    icons:[
      {src:'/qatalink-icon.svg',sizes:'192x192',type:'image/svg+xml'},
      {src:'/qatalink-icon.svg',sizes:'512x512',type:'image/svg+xml',purpose:'any'},
      {src:'/qatalink-icon.svg',sizes:'512x512',type:'image/svg+xml',purpose:'maskable'}
    ]
  };
}
