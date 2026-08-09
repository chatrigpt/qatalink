import type { MetadataRoute } from 'next';

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'Qatalink',
    short_name:'Qatalink',
    description:'Créez et partagez des menus et catalogues interactifs avec QR code.',
    start_url:'/',
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
