'use client';

import {useEffect} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type NativePrinterPort={writable:{getWriter:()=>{write:(data:Uint8Array)=>Promise<void>;close:()=>Promise<void>;releaseLock:()=>void}};open:(options?:unknown)=>Promise<void>;close:()=>Promise<void>};
type SavedTeam={key:string;pin:string;label:string;business?:string;catalog?:string;lastUsedAt:number};
const TEAM_STORE='qatalink_saved_team_accesses';
function setNavigatorProperty(name:string,value:unknown){try{Object.defineProperty(navigator,name,{configurable:true,value});return true}catch{}try{(navigator as any)[name]=value;return true}catch{}return false}
function browserPosition(raw:any):GeolocationPosition{const c=raw?.coords||{};return {coords:{latitude:Number(c.latitude),longitude:Number(c.longitude),accuracy:Number(c.accuracy||0),altitude:c.altitude==null?null:Number(c.altitude),altitudeAccuracy:c.altitudeAccuracy==null?null:Number(c.altitudeAccuracy),heading:c.heading==null?null:Number(c.heading),speed:c.speed==null?null:Number(c.speed)},timestamp:Number(raw?.timestamp||Date.now())} as GeolocationPosition}
function browserGeoError(err:any):GeolocationPositionError{const message=String(err?.message||err||'Localisation indisponible');const denied=/permission|denied|autorisation|0003/i.test(message),timeout=/timeout/i.test(message);return {code:denied?1:timeout?3:2,message,PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3} as GeolocationPositionError}
function pathFromDeepLink(raw:string){try{if(raw.startsWith('qatalink://'))return '/'+raw.slice('qatalink://'.length).replace(/^\/+/, '');const u=new URL(raw);if(u.hostname==='qatalink.com'||u.hostname.endsWith('.qatalink.com'))return `${u.pathname}${u.search}${u.hash}`}catch{}return ''}
function readSavedTeam():SavedTeam[]{try{const raw=JSON.parse(localStorage.getItem(TEAM_STORE)||'[]');return Array.isArray(raw)?raw.filter(x=>x&&x.key&&x.pin):[]}catch{return[]}}
function writeSavedTeam(entries:SavedTeam[]){try{localStorage.setItem(TEAM_STORE,JSON.stringify(entries.slice(0,12)))}catch{}}
function restoreTeamPin(key:string){const entry=readSavedTeam().find(x=>x.key===key);if(entry)try{sessionStorage.setItem(`qatalink_ops_pin_${key}`,entry.pin)}catch{}}

const CP850_ASCII:Record<number,number>={130:101,131:97,132:97,133:97,134:97,135:99,136:101,137:101,138:101,139:105,140:105,141:105,142:65,143:65,144:69,145:97,146:65,147:111,148:111,149:111,150:117,151:117,152:121,153:79,154:85,155:111,156:76,157:79,160:97,161:105,162:111,163:117,164:110,165:78,166:97,167:111,168:63,169:82,170:45,171:49,172:49,173:33,174:60,175:62,181:65,182:65,183:65,184:67,189:99,190:89,198:97,199:65,207:36,210:69,211:69,212:69,213:105,214:73,215:73,216:73,222:73,224:79,225:115,226:79,227:79,228:111,229:79,230:117,233:85,234:85,235:85,236:121,237:89,248:111};
function nativePrinterBytes(input:Uint8Array){
 const out:number[]=[];
 for(let i=0;i<input.length;i++){
  const b=input[i];
  if(b===0x1b&&input[i+1]===0x74){i+=2;continue}
  if(b===0x0a){if(out[out.length-1]!==0x0d)out.push(0x0d);out.push(0x0a);continue}
  if(b>=128){out.push(CP850_ASCII[b]??63);continue}
  out.push(b)
 }
 return new Uint8Array(out)
}

const NATIVE_CSS=`
html[data-qatalink-native],html[data-qatalink-native] body{width:100%;max-width:100%;min-width:0;overflow-x:hidden!important}
html[data-qatalink-native] *{box-sizing:border-box}
html[data-qatalink-native] .pwa-install-trigger,html[data-qatalink-native] .pwa-install-backdrop{display:none!important}
html[data-qatalink-native] .ops-shell{width:100%!important;max-width:100vw!important;min-width:0!important;overflow-x:hidden!important;padding:12px!important;padding-top:max(12px,env(safe-area-inset-top))!important;padding-bottom:max(18px,env(safe-area-inset-bottom))!important}
html[data-qatalink-native] .ops-header,html[data-qatalink-native] .ops-tabs,html[data-qatalink-native] .ops-metrics,html[data-qatalink-native] .ops-orders,html[data-qatalink-native] .ops-new,html[data-qatalink-native] .ops-editor,html[data-qatalink-native] .ops-pos-panel-host,html[data-qatalink-native] .ops-stock-alert-host,html[data-qatalink-native] .ops-bills{width:100%!important;max-width:100%!important;min-width:0!important;margin-left:0!important;margin-right:0!important}
html[data-qatalink-native] .ops-header{gap:10px!important;margin-bottom:13px!important}
html[data-qatalink-native] .ops-header>div{min-width:0!important;width:100%}
html[data-qatalink-native] .ops-header h1{font-size:clamp(1.65rem,8vw,2.25rem)!important;line-height:1.05!important;overflow-wrap:anywhere!important;max-width:100%}
html[data-qatalink-native] .ops-header p{font-size:.9rem!important;overflow-wrap:anywhere!important}
html[data-qatalink-native] .ops-header-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%!important;gap:8px!important}
html[data-qatalink-native] .ops-header-actions>*{width:100%!important;min-width:0!important;max-width:none!important;white-space:normal!important;overflow-wrap:anywhere!important;justify-content:center!important;text-align:center!important;line-height:1.15!important;padding:10px 7px!important;font-size:.83rem!important}
html[data-qatalink-native] .ops-tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;overflow:visible!important;white-space:normal!important;margin-bottom:13px!important}
html[data-qatalink-native] .ops-tabs button{width:100%!important;min-width:0!important;max-width:none!important;flex:none!important;justify-content:center!important;white-space:normal!important;overflow-wrap:anywhere!important;text-align:center!important;line-height:1.1!important;font-size:.8rem!important;padding:10px 6px!important}
html[data-qatalink-native] .ops-tabs button:nth-child(3){grid-column:1/-1}
html[data-qatalink-native] .ops-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;margin:13px 0!important}
html[data-qatalink-native] .ops-metrics>div{min-width:0!important;min-height:112px!important;padding:14px!important;border-radius:16px!important;overflow:hidden!important}
html[data-qatalink-native] .ops-metrics b{font-size:clamp(1.35rem,7vw,1.9rem)!important;line-height:1.05!important;overflow-wrap:anywhere!important}
html[data-qatalink-native] .ops-metrics span{font-size:.77rem!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:anywhere!important}
html[data-qatalink-native] .ops-login{width:100%!important;max-width:440px!important;margin:3vh auto!important;padding:20px!important;border-radius:20px!important;min-width:0!important}
html[data-qatalink-native] .ops-login h1{font-size:clamp(1.8rem,9vw,2.5rem)!important;line-height:1.05!important;overflow-wrap:anywhere!important}
html[data-qatalink-native] .ops-login p{font-size:.95rem!important;line-height:1.4!important}
html[data-qatalink-native] .ops-pos-panel{padding:8px 0 24px!important;width:100%!important;min-width:0!important}
html[data-qatalink-native] .ops-pos-head{gap:9px!important;margin-bottom:12px!important}
html[data-qatalink-native] .ops-pos-head h2{font-size:1.45rem!important;overflow-wrap:anywhere!important}
html[data-qatalink-native] .ops-pos-head p{font-size:.78rem!important;line-height:1.35!important}
html[data-qatalink-native] .ops-pos-layout{grid-template-columns:minmax(0,1fr)!important;gap:11px!important;width:100%!important;min-width:0!important}
html[data-qatalink-native] .ops-pos-products,html[data-qatalink-native] .ops-pos-cart{width:100%!important;max-width:100%!important;min-width:0!important;position:static!important;border-radius:16px!important;padding:11px!important}
html[data-qatalink-native] .ops-pos-tools{grid-template-columns:minmax(0,1fr)!important;gap:7px!important}
html[data-qatalink-native] .ops-pos-grid{grid-template-columns:minmax(0,1fr)!important;gap:8px!important}
html[data-qatalink-native] .ops-pos-grid article{grid-template-columns:54px minmax(0,1fr) auto!important;gap:8px!important;padding:8px!important;min-width:0!important}
html[data-qatalink-native] .ops-pos-grid img,html[data-qatalink-native] .ops-pos-placeholder{width:54px!important;height:54px!important}
html[data-qatalink-native] .ops-pos-product-copy b{font-size:.82rem!important;overflow-wrap:anywhere!important}
html[data-qatalink-native] .ops-pos-product-copy small{font-size:.68rem!important}
html[data-qatalink-native] .ops-pos-product-copy strong{font-size:.76rem!important}
html[data-qatalink-native] .ops-pos-qty{grid-template-columns:28px 22px 28px!important;gap:2px!important}
html[data-qatalink-native] .ops-pos-qty button{width:28px!important;height:28px!important;border-radius:8px!important}
html[data-qatalink-native] .ops-pos-fields{grid-template-columns:minmax(0,1fr)!important}
html[data-qatalink-native] .ops-pos-fields label:last-child{grid-column:auto!important}
html[data-qatalink-native] .editor-add,html[data-qatalink-native] .editor-add.item-add,html[data-qatalink-native] .editor-row,html[data-qatalink-native] .editor-item-fields{grid-template-columns:minmax(0,1fr)!important}
html[data-qatalink-native] .editor-item{grid-template-columns:58px minmax(0,1fr)!important;gap:9px!important}
html[data-qatalink-native] .editor-item>img{width:58px!important;height:58px!important}
html[data-qatalink-native] .ops-order,html[data-qatalink-native] .ops-bills article,html[data-qatalink-native] .editor-panel{min-width:0!important;max-width:100%!important;overflow:hidden!important}
html[data-qatalink-native] input,html[data-qatalink-native] select,html[data-qatalink-native] textarea,html[data-qatalink-native] button{max-width:100%}
`;

export function CapacitorNativeBridge(){
  useEffect(()=>{
    const cap=(window as any).Capacitor;if(!cap?.isNativePlatform?.())return;
    document.documentElement.dataset.qatalinkNative='true';
    const style=document.createElement('style');style.id='qatalink-native-runtime-css';style.textContent=NATIVE_CSS;document.head.appendChild(style);
    let disposed=false;const originalGeo=navigator.geolocation,originalSerial=(navigator as any).serial,originalShare=navigator.share?.bind(navigator),originalCanShare=navigator.canShare?.bind(navigator);
    const nativeWatchIds=new Map<number,string>();let nextWatchId=910000,activePrinter:any=null,activePort:NativePrinterPort|null=null;const removeHandles:Array<()=>Promise<void>>=[];
    setNavigatorProperty('share',undefined);setNavigatorProperty('canShare',undefined);

    void (async()=>{try{const {Geolocation}=await import('@capacitor/geolocation');if(disposed)return;const nativeGeo={getCurrentPosition(success:PositionCallback,error?:PositionErrorCallback,options?:PositionOptions){void Geolocation.requestPermissions({permissions:['location']}).then(()=>Geolocation.getCurrentPosition({enableHighAccuracy:options?.enableHighAccuracy!==false,timeout:options?.timeout||20000,maximumAge:options?.maximumAge||0})).then(p=>success(browserPosition(p))).catch(e=>error?.(browserGeoError(e)))},watchPosition(success:PositionCallback,error?:PositionErrorCallback,options?:PositionOptions){const localId=nextWatchId++;void Geolocation.requestPermissions({permissions:['location']}).then(()=>Geolocation.watchPosition({enableHighAccuracy:options?.enableHighAccuracy!==false,timeout:options?.timeout||20000,maximumAge:options?.maximumAge||2000},(p,e)=>{if(e){error?.(browserGeoError(e));return}if(p)success(browserPosition(p))})).then(nativeId=>{if(disposed){void Geolocation.clearWatch({id:nativeId});return}nativeWatchIds.set(localId,nativeId)}).catch(e=>error?.(browserGeoError(e)));return localId},clearWatch(id:number){const nativeId=nativeWatchIds.get(id);if(nativeId){nativeWatchIds.delete(id);void Geolocation.clearWatch({id:nativeId})}}};setNavigatorProperty('geolocation',nativeGeo)}catch(e){console.warn('[Qatalink] GPS natif indisponible',e)}})();

    async function refreshPendingPayment(){const cartId=localStorage.getItem('qatalink_maketou_cart_id');window.dispatchEvent(new Event('qatalink:access-refresh'));if(!cartId)return;try{const supabase=createSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session)return;const r=await fetch('/api/payment/maketou/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({cart_id:cartId}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(r.ok&&d?.status==='completed'){localStorage.removeItem('qatalink_maketou_cart_id');window.dispatchEvent(new CustomEvent('qatalink:payment-completed',{detail:d}));location.reload()}}catch{}}

    void (async()=>{try{const {App}=await import('@capacitor/app');const deep=await App.addListener('appUrlOpen',({url})=>{const path=pathFromDeepLink(url);if(path){const match=path.match(/^\/livreur\/([^/?#]+)/);if(match)try{localStorage.setItem('qatalink_last_driver_token',decodeURIComponent(match[1]))}catch{};const team=path.match(/^\/ops\/([^/?#]+)/);if(team)try{const key=decodeURIComponent(team[1]);localStorage.setItem('qatalink_last_team_key',key);restoreTeamPin(key)}catch{};location.assign(path)}});removeHandles.push(()=>deep.remove());const state=await App.addListener('appStateChange',({isActive})=>{if(isActive)void refreshPendingPayment()});removeHandles.push(()=>state.remove());void refreshPendingPayment()}catch(e){console.warn('[Qatalink] Intégration App indisponible',e)}})();

    function portFor(printer:any):NativePrinterPort{return {writable:{getWriter:()=>({async write(data:Uint8Array){await printer.send(Array.from(nativePrinterBytes(data)))},async close(){},releaseLock(){}})},async open(){},async close(){try{await printer.disconnect()}catch{}try{await printer.dispose()}catch{}if(activePrinter===printer){activePrinter=null;activePort=null}}}}
    async function chooseNativePrinter(){const {EscPosPrinter,BluetoothPrinter}=await import('@fedejm/capacitor-esc-pos-printer');try{await EscPosPrinter.requestBluetoothEnable()}catch{}const result=await EscPosPrinter.getBluetoothPrinterDevices(),devices=(result?.devices||[]).filter((d:any)=>d?.address);if(!devices.length)throw new Error('Aucune imprimante Bluetooth détectée.');const remembered=localStorage.getItem('qatalink_native_printer_address');let selected=devices.find((d:any)=>d.address===remembered)||devices[0];if(devices.length>1&&!devices.find((d:any)=>d.address===remembered)){const menu=devices.map((d:any,i:number)=>`${i+1}. ${d.name||d.alias||'Imprimante'} — ${d.address}`).join('\n');const answer=window.prompt(`Choisissez l’imprimante thermique :\n\n${menu}`,'1');if(answer===null)throw Object.assign(new Error('Sélection annulée'),{name:'NotFoundError'});selected=devices[Math.max(0,Math.min(devices.length-1,(Number(answer)||1)-1))]}const printer=new BluetoothPrinter(selected.address);await printer.link();await printer.connect();activePrinter=printer;activePort=portFor(printer);localStorage.setItem('qatalink_native_printer_address',selected.address);return activePort}
    setNavigatorProperty('serial',{async getPorts(){return activePort?[activePort]:[]},async requestPort(){return activePort||await chooseNativePrinter()}});

    const accessTimer=window.setInterval(()=>{try{const match=location.pathname.match(/^\/ops\/([^/?#]+)/);if(!match)return;const key=decodeURIComponent(match[1]),pin=sessionStorage.getItem(`qatalink_ops_pin_${key}`)||'';const header=document.querySelector('.ops-header');if(!pin||!header)return;const label=header.querySelector('.eyebrow')?.textContent?.trim()||'Accès équipe',business=header.querySelector('h1')?.textContent?.trim()||'',catalog=header.querySelector('p')?.textContent?.trim()||'';if(!business)return;const entry:SavedTeam={key,pin,label,business,catalog,lastUsedAt:Date.now()};writeSavedTeam([entry,...readSavedTeam().filter(x=>x.key!==key)])}catch{}},1400);

    return()=>{disposed=true;window.clearInterval(accessTimer);style.remove();document.documentElement.removeAttribute('data-qatalink-native');for(const remove of removeHandles)void remove();void import('@capacitor/geolocation').then(({Geolocation})=>Promise.all([...nativeWatchIds.values()].map(id=>Geolocation.clearWatch({id})))).catch(()=>{});nativeWatchIds.clear();if(originalGeo)setNavigatorProperty('geolocation',originalGeo);if(originalSerial)setNavigatorProperty('serial',originalSerial);else try{delete (navigator as any).serial}catch{};if(originalShare)setNavigatorProperty('share',originalShare);if(originalCanShare)setNavigatorProperty('canShare',originalCanShare);if(activePrinter){void activePrinter.disconnect().catch(()=>{});void activePrinter.dispose().catch(()=>{})}};
  },[]);return null;
}
