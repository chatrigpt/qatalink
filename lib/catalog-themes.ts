export type QatalinkPlan='trial'|'static'|'interactive'|'linkhub'|string;

export type CatalogVisualTheme={
  id:string;
  label:string;
  mode:'light'|'dark';
  preview:string;
  primary_color:string;
  secondary_color:string;
  background_color:string;
  background_mode:'solid'|'gradient';
  background_gradient:string;
  text_color:string;
  heading_font:string;
  body_font:string;
  border_radius:string;
  card_style:string;
  button_style:string;
  layout_style:string;
};

export const QATALINK_THEMES:CatalogVisualTheme[]=[
  {id:'ruby-light',label:'Rubis éditorial',mode:'light',preview:'linear-gradient(135deg,#fff8f8,#d54256,#981923)',primary_color:'#A71E2B',secondary_color:'#F1D7D9',background_color:'#FFF9F8',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFDFB 0%,#FFF4F1 52%,#F2DDDA 100%)',text_color:'#2A1416',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'12px',card_style:'clean',button_style:'simple',layout_style:'editorial'},
  {id:'ruby-dark',label:'Rubis sombre',mode:'dark',preview:'linear-gradient(135deg,#080709,#3b0d17,#a71e2b)',primary_color:'#D12B42',secondary_color:'#34151C',background_color:'#0B090B',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#080709 0%,#130C0F 52%,#2A0D14 100%)',text_color:'#FFF7F8',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'14px',card_style:'premium',button_style:'glossy',layout_style:'editorial'},
  {id:'deloria-gold',label:'Deloria doré',mode:'light',preview:'linear-gradient(135deg,#fffdf4,#5a2f12,#d3a51f)',primary_color:'#B88A17',secondary_color:'#F3E5B8',background_color:'#FFF9E9',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFDF5 0%,#FFF8E5 50%,#F4E5BD 100%)',text_color:'#583218',heading_font:'DM Serif Display',body_font:'Plus Jakarta Sans',border_radius:'16px',card_style:'premium',button_style:'glossy',layout_style:'compact'},
  {id:'night-gold',label:'Night club or',mode:'dark',preview:'linear-gradient(135deg,#050506,#2a2416,#e5c34b)',primary_color:'#D2AC2C',secondary_color:'#2B271C',background_color:'#08080A',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#050506 0%,#0E0E0F 55%,#201B0E 100%)',text_color:'#FFF6CF',heading_font:'DM Serif Display',body_font:'Plus Jakarta Sans',border_radius:'14px',card_style:'premium',button_style:'metallic',layout_style:'ledger'},
  {id:'maquis-amber',label:'Maquis ambré',mode:'light',preview:'linear-gradient(135deg,#fff9ed,#c44a19,#eaa548)',primary_color:'#C44A19',secondary_color:'#F1D2A6',background_color:'#FFF8ED',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFDF8 0%,#FFF1DB 52%,#F5D4AA 100%)',text_color:'#31170D',heading_font:'Plus Jakarta Sans',body_font:'Plus Jakarta Sans',border_radius:'16px',card_style:'clean',button_style:'glossy',layout_style:'compact'},
  {id:'champagne-bistro',label:'Champagne bistro',mode:'light',preview:'linear-gradient(135deg,#fffdf7,#cfad61,#6f4d22)',primary_color:'#A87822',secondary_color:'#F4E8C9',background_color:'#FFFCF5',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#FFFFFF 0%,#FFF8E8 52%,#F3E4C1 100%)',text_color:'#332619',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'10px',card_style:'clean',button_style:'simple',layout_style:'editorial'},
  {id:'lounge-bronze',label:'Lounge bronze',mode:'dark',preview:'linear-gradient(135deg,#09070a,#5f3a2b,#d6a15f)',primary_color:'#C58A4A',secondary_color:'#2C201C',background_color:'#0B090A',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#070607 0%,#120D0C 52%,#25160F 100%)',text_color:'#FFF4E7',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'premium',button_style:'metallic',layout_style:'editorial'},
  {id:'emerald-light',label:'Émeraude moderne',mode:'light',preview:'linear-gradient(135deg,#f4fff8,#12a86b,#a8e6c7)',primary_color:'#087F5B',secondary_color:'#DDF6E9',background_color:'#F7FFF9',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FCFFFD 0%,#F0FBF5 50%,#DFF4E9 100%)',text_color:'#10241D',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'22px',card_style:'soft',button_style:'simple',layout_style:'cards'},
  {id:'ocean-gloss',label:'Océan glossy',mode:'light',preview:'linear-gradient(135deg,#f2fbff,#168aad,#90e0ef)',primary_color:'#126E8A',secondary_color:'#D9F2F8',background_color:'#F5FCFF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#F0FAFE 50%,#DDF4FA 100%)',text_color:'#102730',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'18px',card_style:'clean',button_style:'glossy',layout_style:'cards'},
  {id:'indigo-grid',label:'Indigo galerie',mode:'light',preview:'linear-gradient(135deg,#f5f6ff,#4f46e5,#a5b4fc)',primary_color:'#4F46E5',secondary_color:'#E5E7FF',background_color:'#F8F8FF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#F4F4FF 50%,#E5E7FF 100%)',text_color:'#171833',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'18px',card_style:'soft',button_style:'simple',layout_style:'grid'},
  {id:'violet-showcase',label:'Violet vitrine',mode:'light',preview:'linear-gradient(135deg,#fcf8ff,#8b5cf6,#d8b4fe)',primary_color:'#7C3AED',secondary_color:'#F0E4FF',background_color:'#FCF9FF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#FAF4FF 50%,#EEE2FF 100%)',text_color:'#281738',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'22px',card_style:'soft',button_style:'glossy',layout_style:'showcase'},
  {id:'rose-soft',label:'Rose poudré',mode:'light',preview:'linear-gradient(135deg,#fff9fb,#e76f9d,#ffd6e6)',primary_color:'#C94C7C',secondary_color:'#FBE0EA',background_color:'#FFF9FB',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#FFF5F8 50%,#FBE2EB 100%)',text_color:'#331823',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'24px',card_style:'soft',button_style:'simple',layout_style:'cards'},
  {id:'solar-gloss',label:'Solaire glossy',mode:'light',preview:'linear-gradient(135deg,#fffef1,#ffd60a,#f4a100)',primary_color:'#D99A00',secondary_color:'#FFF2A8',background_color:'#FFFDF1',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#FFFBE0 52%,#FFF2A8 100%)',text_color:'#2D2608',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'18px',card_style:'clean',button_style:'glossy',layout_style:'compact'},
  {id:'forest-metal',label:'Forêt métal',mode:'dark',preview:'linear-gradient(135deg,#06110d,#0b6b4c,#9ac7ae)',primary_color:'#76A98F',secondary_color:'#123126',background_color:'#07110D',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#04100B 0%,#071710 52%,#0C291C 100%)',text_color:'#F4FFF8',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'premium',button_style:'metallic',layout_style:'ledger'},
  {id:'graphite-chrome',label:'Graphite chrome',mode:'dark',preview:'linear-gradient(135deg,#08090b,#474b52,#d8dde4)',primary_color:'#AEB6C2',secondary_color:'#242830',background_color:'#090B0E',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#07080A 0%,#11141A 55%,#242933 100%)',text_color:'#F8FAFC',heading_font:'Plus Jakarta Sans',body_font:'Plus Jakarta Sans',border_radius:'16px',card_style:'premium',button_style:'metallic',layout_style:'grid'},
  {id:'spectrum-night',label:'Prisme glossy',mode:'dark',preview:'linear-gradient(135deg,#08090d,#e63946,#ff9f1c,#2a9d8f,#457b9d,#7b2cbf)',primary_color:'#FF4D6D',secondary_color:'#1B1D2A',background_color:'#090A0F',background_mode:'gradient',background_gradient:'linear-gradient(145deg,#08090D 0%,#121526 38%,#1B1531 72%,#25131D 100%)',text_color:'#FFFFFF',heading_font:'Plus Jakarta Sans',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'premium',button_style:'glossy',layout_style:'grid'}
];

export function themeLimitForPlan(plan:QatalinkPlan){
  const p=String(plan||'trial').toLowerCase();
  if(p==='trial'||p==='linkhub')return 16;
  if(p==='interactive')return 8;
  if(p==='static')return 4;
  return 4;
}

export function allowedThemesForPlan(plan:QatalinkPlan){return QATALINK_THEMES.slice(0,themeLimitForPlan(plan));}
export function isThemeAllowed(themeId:string|undefined|null,plan:QatalinkPlan){return allowedThemesForPlan(plan).some(t=>t.id===themeId);}
