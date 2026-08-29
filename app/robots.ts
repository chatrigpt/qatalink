import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:'*',allow:['/','/c/','/catalogue/','/blog/','/docs','/afrique/'],disallow:['/admin','/api/','/dashboard','/login','/mobile','/ops/','/livreur/','/suivi/','/payment/return']}],sitemap:'https://qatalink.com/sitemap.xml',host:'https://qatalink.com'}}
