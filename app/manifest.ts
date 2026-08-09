import type { MetadataRoute } from 'next';

const LOGO='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/QATALINK%20LOGO%20(1).png';

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'Qatalink',
    short_name:'Qatalink',
    description:'Créez et partagez des menus et catalogues interactifs avec QR code.',
    start_url:'/',
    display:'standalone',
    background_color:'#ffffff',
    theme_color:'#c7192f',
    orientation:'portrait-primary',
    icons:[
      {src:LOGO,sizes:'192x192',type:'image/png'},
      {src:LOGO,sizes:'512x512',type:'image/png',purpose:'any'},
      {src:LOGO,sizes:'512x512',type:'image/png',purpose:'maskable'}
    ]
  };
}
