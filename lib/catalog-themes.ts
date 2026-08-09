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
  {id:'ruby-light',label:'Rubis clair',mode:'light',preview:'linear-gradient(135deg,#fff8f8,#ef476f,#b5122b)',primary_color:'#B5122B',secondary_color:'#F8DDE2',background_color:'#FFF9FA',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFDFD 0%,#FFF3F5 52%,#F8DDE2 100%)',text_color:'#251317',heading_font:'Plus Jakarta Sans',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'soft',button_style:'rounded',layout_style:'list'},
  {id:'ruby-night',label:'Rubis nuit',mode:'dark',preview:'linear-gradient(135deg,#12070a,#7f1020,#d32643)',primary_color:'#E02A45',secondary_color:'#351117',background_color:'#11080A',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#090506 0%,#16090C 55%,#2A0B12 100%)',text_color:'#FFF7F8',heading_font:'DM Serif Display',body_font:'Plus Jakarta Sans',border_radius:'16px',card_style:'premium',button_style:'rounded',layout_style:'list'},
  {id:'sunset-light',label:'Mandarine',mode:'light',preview:'linear-gradient(135deg,#fff8ef,#ff7a18,#ffb000)',primary_color:'#E85D04',secondary_color:'#FFE2C3',background_color:'#FFF8EF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFDF9 0%,#FFF4E5 48%,#FFE4C7 100%)',text_color:'#2C1B11',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'20px',card_style:'soft',button_style:'pill',layout_style:'list'},
  {id:'sunset-night',label:'Orange nuit',mode:'dark',preview:'linear-gradient(135deg,#120b04,#bd4b00,#ff8c1a)',primary_color:'#FF7A18',secondary_color:'#3A1A08',background_color:'#100A05',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#090604 0%,#1C0E05 55%,#321504 100%)',text_color:'#FFF8F0',heading_font:'DM Serif Display',body_font:'Plus Jakarta Sans',border_radius:'16px',card_style:'premium',button_style:'rounded',layout_style:'list'},
  {id:'solar-light',label:'Solaire',mode:'light',preview:'linear-gradient(135deg,#fffef1,#ffd60a,#f4a100)',primary_color:'#D99A00',secondary_color:'#FFF2A8',background_color:'#FFFDF1',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#FFFBE0 52%,#FFF2A8 100%)',text_color:'#2D2608',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'18px',card_style:'clean',button_style:'pill',layout_style:'list'},
  {id:'emerald-light',label:'Émeraude clair',mode:'light',preview:'linear-gradient(135deg,#f4fff8,#12a86b,#a8e6c7)',primary_color:'#087F5B',secondary_color:'#DDF6E9',background_color:'#F7FFF9',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FCFFFD 0%,#F0FBF5 50%,#DFF4E9 100%)',text_color:'#10241D',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'22px',card_style:'soft',button_style:'pill',layout_style:'list'},
  {id:'forest-night',label:'Forêt nuit',mode:'dark',preview:'linear-gradient(135deg,#06110d,#0b6b4c,#79c9a2)',primary_color:'#2AB57A',secondary_color:'#123126',background_color:'#07110D',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#04100B 0%,#071710 52%,#0C291C 100%)',text_color:'#F4FFF8',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'premium',button_style:'rounded',layout_style:'list'},
  {id:'ocean-light',label:'Océan clair',mode:'light',preview:'linear-gradient(135deg,#f2fbff,#168aad,#90e0ef)',primary_color:'#126E8A',secondary_color:'#D9F2F8',background_color:'#F5FCFF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#F0FAFE 50%,#DDF4FA 100%)',text_color:'#102730',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'18px',card_style:'clean',button_style:'rounded',layout_style:'list'},
  {id:'ocean-night',label:'Océan nuit',mode:'dark',preview:'linear-gradient(135deg,#06111d,#0369a1,#22d3ee)',primary_color:'#0EA5E9',secondary_color:'#102B3A',background_color:'#06111B',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#04101A 0%,#071827 55%,#0B2D40 100%)',text_color:'#F3FBFF',heading_font:'Plus Jakarta Sans',body_font:'Plus Jakarta Sans',border_radius:'16px',card_style:'premium',button_style:'rounded',layout_style:'list'},
  {id:'indigo-light',label:'Indigo clair',mode:'light',preview:'linear-gradient(135deg,#f5f6ff,#4f46e5,#a5b4fc)',primary_color:'#4F46E5',secondary_color:'#E5E7FF',background_color:'#F8F8FF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#F4F4FF 50%,#E5E7FF 100%)',text_color:'#171833',heading_font:'Plus Jakarta Sans',body_font:'Inter',border_radius:'18px',card_style:'soft',button_style:'pill',layout_style:'list'},
  {id:'indigo-night',label:'Indigo nuit',mode:'dark',preview:'linear-gradient(135deg,#0b0c1d,#3730a3,#6366f1)',primary_color:'#818CF8',secondary_color:'#20234D',background_color:'#0A0B18',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#080914 0%,#101225 55%,#1E2150 100%)',text_color:'#F7F7FF',heading_font:'DM Serif Display',body_font:'Plus Jakarta Sans',border_radius:'17px',card_style:'premium',button_style:'rounded',layout_style:'list'},
  {id:'violet-light',label:'Lavande',mode:'light',preview:'linear-gradient(135deg,#fcf8ff,#8b5cf6,#d8b4fe)',primary_color:'#7C3AED',secondary_color:'#F0E4FF',background_color:'#FCF9FF',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#FAF4FF 50%,#EEE2FF 100%)',text_color:'#281738',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'22px',card_style:'soft',button_style:'pill',layout_style:'list'},
  {id:'violet-night',label:'Améthyste nuit',mode:'dark',preview:'linear-gradient(135deg,#100a18,#7c3aed,#d946ef)',primary_color:'#A855F7',secondary_color:'#2A1537',background_color:'#100A17',background_mode:'gradient',background_gradient:'linear-gradient(155deg,#0A0710 0%,#160C20 50%,#2C1040 100%)',text_color:'#FFF7FF',heading_font:'DM Serif Display',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'premium',button_style:'rounded',layout_style:'list'},
  {id:'rose-light',label:'Rose poudré',mode:'light',preview:'linear-gradient(135deg,#fff9fb,#e76f9d,#ffd6e6)',primary_color:'#C94C7C',secondary_color:'#FBE0EA',background_color:'#FFF9FB',background_mode:'gradient',background_gradient:'linear-gradient(160deg,#FFFFFF 0%,#FFF5F8 50%,#FBE2EB 100%)',text_color:'#331823',heading_font:'Playfair Display',body_font:'Plus Jakarta Sans',border_radius:'24px',card_style:'soft',button_style:'pill',layout_style:'list'},
  {id:'spectrum-night',label:'Prisme nuit',mode:'dark',preview:'linear-gradient(135deg,#08090d,#e63946,#ff9f1c,#2a9d8f,#457b9d,#7b2cbf)',primary_color:'#FF4D6D',secondary_color:'#1B1D2A',background_color:'#090A0F',background_mode:'gradient',background_gradient:'linear-gradient(145deg,#08090D 0%,#121526 38%,#1B1531 72%,#25131D 100%)',text_color:'#FFFFFF',heading_font:'Plus Jakarta Sans',body_font:'Plus Jakarta Sans',border_radius:'18px',card_style:'premium',button_style:'rounded',layout_style:'list'}
];

export function themeLimitForPlan(plan:QatalinkPlan){
  const p=String(plan||'trial').toLowerCase();
  if(p==='trial'||p==='linkhub')return 15;
  if(p==='interactive')return 7;
  if(p==='static')return 3;
  return 3;
}

export function allowedThemesForPlan(plan:QatalinkPlan){return QATALINK_THEMES.slice(0,themeLimitForPlan(plan));}
export function isThemeAllowed(themeId:string|undefined|null,plan:QatalinkPlan){return allowedThemesForPlan(plan).some(t=>t.id===themeId);}
