export type SeoCity={slug:string;name:string;country:string;countryCode:string;region:string;aliases:string[]};

export const SEO_CITIES:SeoCity[]=[
  {slug:'abidjan',name:'Abidjan',country:"Côte d’Ivoire",countryCode:'CI',region:'District autonome d’Abidjan',aliases:['Cocody','Yopougon','Marcory','Treichville','Plateau','Koumassi','Port-Bouët','Bingerville']},
  {slug:'bouake',name:'Bouaké',country:"Côte d’Ivoire",countryCode:'CI',region:'Gbêkê',aliases:['Bouaké']},
  {slug:'yamoussoukro',name:'Yamoussoukro',country:"Côte d’Ivoire",countryCode:'CI',region:'District autonome de Yamoussoukro',aliases:['Yamoussoukro']},
  {slug:'san-pedro',name:'San-Pédro',country:"Côte d’Ivoire",countryCode:'CI',region:'San-Pédro',aliases:['San Pedro']},
  {slug:'korhogo',name:'Korhogo',country:"Côte d’Ivoire",countryCode:'CI',region:'Poro',aliases:['Korhogo']},
  {slug:'dakar',name:'Dakar',country:'Sénégal',countryCode:'SN',region:'Dakar',aliases:['Plateau','Almadies','Mermoz','Ouakam','Parcelles Assainies']},
  {slug:'thies',name:'Thiès',country:'Sénégal',countryCode:'SN',region:'Thiès',aliases:['Thies']},
  {slug:'bamako',name:'Bamako',country:'Mali',countryCode:'ML',region:'District de Bamako',aliases:['ACI 2000','Hamdallaye','Badalabougou']},
  {slug:'ouagadougou',name:'Ouagadougou',country:'Burkina Faso',countryCode:'BF',region:'Centre',aliases:['Ouaga','Ouagadougou']},
  {slug:'bobo-dioulasso',name:'Bobo-Dioulasso',country:'Burkina Faso',countryCode:'BF',region:'Hauts-Bassins',aliases:['Bobo Dioulasso']},
  {slug:'conakry',name:'Conakry',country:'Guinée',countryCode:'GN',region:'Conakry',aliases:['Kaloum','Ratoma','Matam','Dixinn']},
  {slug:'lome',name:'Lomé',country:'Togo',countryCode:'TG',region:'Maritime',aliases:['Lome']},
  {slug:'cotonou',name:'Cotonou',country:'Bénin',countryCode:'BJ',region:'Littoral',aliases:['Cotonou']},
  {slug:'porto-novo',name:'Porto-Novo',country:'Bénin',countryCode:'BJ',region:'Ouémé',aliases:['Porto Novo']},
  {slug:'douala',name:'Douala',country:'Cameroun',countryCode:'CM',region:'Littoral',aliases:['Akwa','Bonapriso','Bonanjo','Deido']},
  {slug:'yaounde',name:'Yaoundé',country:'Cameroun',countryCode:'CM',region:'Centre',aliases:['Yaounde','Bastos','Mvan']},
  {slug:'libreville',name:'Libreville',country:'Gabon',countryCode:'GA',region:'Estuaire',aliases:['Libreville']},
  {slug:'brazzaville',name:'Brazzaville',country:'République du Congo',countryCode:'CG',region:'Brazzaville',aliases:['Poto-Poto','Bacongo']},
  {slug:'pointe-noire',name:'Pointe-Noire',country:'République du Congo',countryCode:'CG',region:'Pointe-Noire',aliases:['Pointe Noire']},
  {slug:'kinshasa',name:'Kinshasa',country:'RDC',countryCode:'CD',region:'Kinshasa',aliases:['Gombe','Ngaliema','Limete']},
  {slug:'lubumbashi',name:'Lubumbashi',country:'RDC',countryCode:'CD',region:'Haut-Katanga',aliases:['Lubumbashi']},
  {slug:'kigali',name:'Kigali',country:'Rwanda',countryCode:'RW',region:'Kigali',aliases:['Kigali']},
  {slug:'bujumbura',name:'Bujumbura',country:'Burundi',countryCode:'BI',region:'Bujumbura Mairie',aliases:['Bujumbura']},
  {slug:'niamey',name:'Niamey',country:'Niger',countryCode:'NE',region:'Niamey',aliases:['Niamey']},
  {slug:'bangui',name:'Bangui',country:'République centrafricaine',countryCode:'CF',region:'Bangui',aliases:['Bangui']},
  {slug:'nouakchott',name:'Nouakchott',country:'Mauritanie',countryCode:'MR',region:'Nouakchott',aliases:['Nouakchott']},
  {slug:'antananarivo',name:'Antananarivo',country:'Madagascar',countryCode:'MG',region:'Analamanga',aliases:['Tana','Antananarivo']},
  {slug:'moroni',name:'Moroni',country:'Comores',countryCode:'KM',region:'Grande Comore',aliases:['Moroni']},
];

export function getSeoCity(slug:string){return SEO_CITIES.find(c=>c.slug===slug)}
export const SEO_CITY_NAMES=SEO_CITIES.map(c=>c.name);
