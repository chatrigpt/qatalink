'use client';

import {useEffect} from 'react';

type NativePrinterPort={
  writable:{getWriter:()=>{write:(data:Uint8Array)=>Promise<void>;close:()=>Promise<void>;releaseLock:()=>void}};
  open:(options?:unknown)=>Promise<void>;
  close:()=>Promise<void>;
};

function setNavigatorProperty(name:string,value:unknown){
  try{Object.defineProperty(navigator,name,{configurable:true,value});return true}catch{}
  try{(navigator as any)[name]=value;return true}catch{}
  return false;
}

function browserPosition(raw:any):GeolocationPosition{
  const c=raw?.coords||{};
  return {coords:{latitude:Number(c.latitude),longitude:Number(c.longitude),accuracy:Number(c.accuracy||0),altitude:c.altitude==null?null:Number(c.altitude),altitudeAccuracy:c.altitudeAccuracy==null?null:Number(c.altitudeAccuracy),heading:c.heading==null?null:Number(c.heading),speed:c.speed==null?null:Number(c.speed)},timestamp:Number(raw?.timestamp||Date.now())} as GeolocationPosition;
}

function browserGeoError(err:any):GeolocationPositionError{
  const message=String(err?.message||err||'Localisation indisponible');
  const denied=/permission|denied|autorisation|0003/i.test(message);const timeout=/timeout/i.test(message);
  return {code:denied?1:timeout?3:2,message,PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3} as GeolocationPositionError;
}

function pathFromDeepLink(raw:string){
  try{
    if(raw.startsWith('qatalink://')){
      const rest=raw.slice('qatalink://'.length).replace(/^\/+/, '');
      return '/'+rest;
    }
    const u=new URL(raw);if(u.hostname==='qatalink.com'||u.hostname.endsWith('.qatalink.com'))return `${u.pathname}${u.search}${u.hash}`;
  }catch{}
  return '';
}

export function CapacitorNativeBridge(){
  useEffect(()=>{
    const cap=(window as any).Capacitor;if(!cap?.isNativePlatform?.())return;
    document.documentElement.dataset.qatalinkNative='true';
    let disposed=false;const originalGeo=navigator.geolocation;const originalSerial=(navigator as any).serial;const originalShare=navigator.share?.bind(navigator);const originalCanShare=navigator.canShare?.bind(navigator);
    const nativeWatchIds=new Map<number,string>();let nextWatchId=910000;let activePrinter:any=null;let activePort:NativePrinterPort|null=null;let removeDeepLink:(()=>Promise<void>)|null=null;

    // The web receipt module treats navigator.share as its mobile fallback. In the native shell
    // we intentionally disable that fallback so it uses the synthetic serial port below.
    setNavigatorProperty('share',undefined);setNavigatorProperty('canShare',undefined);

    void (async()=>{
      try{
        const {Geolocation}=await import('@capacitor/geolocation');if(disposed)return;
        const nativeGeo={
          getCurrentPosition(success:PositionCallback,error?:PositionErrorCallback,options?:PositionOptions){
            void Geolocation.requestPermissions({permissions:['location']}).then(()=>Geolocation.getCurrentPosition({enableHighAccuracy:options?.enableHighAccuracy!==false,timeout:options?.timeout||20000,maximumAge:options?.maximumAge||0})).then(p=>success(browserPosition(p))).catch(e=>error?.(browserGeoError(e)));
          },
          watchPosition(success:PositionCallback,error?:PositionErrorCallback,options?:PositionOptions){
            const localId=nextWatchId++;
            void Geolocation.requestPermissions({permissions:['location']}).then(()=>Geolocation.watchPosition({enableHighAccuracy:options?.enableHighAccuracy!==false,timeout:options?.timeout||20000,maximumAge:options?.maximumAge||2000},(p,e)=>{if(e){error?.(browserGeoError(e));return}if(p)success(browserPosition(p))})).then(nativeId=>{if(disposed){void Geolocation.clearWatch({id:nativeId});return}nativeWatchIds.set(localId,nativeId)}).catch(e=>error?.(browserGeoError(e)));
            return localId;
          },
          clearWatch(id:number){const nativeId=nativeWatchIds.get(id);if(nativeId){nativeWatchIds.delete(id);void Geolocation.clearWatch({id:nativeId})}}
        };
        setNavigatorProperty('geolocation',nativeGeo);
      }catch(e){console.warn('[Qatalink Pro] GPS natif indisponible',e)}
    })();

    void (async()=>{
      try{
        const {App}=await import('@capacitor/app');const handle=await App.addListener('appUrlOpen',({url})=>{const path=pathFromDeepLink(url);if(path)location.assign(path)});removeDeepLink=()=>handle.remove();
      }catch(e){console.warn('[Qatalink Pro] Deep links indisponibles',e)}
    })();

    function portFor(printer:any):NativePrinterPort{
      return {writable:{getWriter:()=>({async write(data:Uint8Array){await printer.send(Array.from(data))},async close(){},releaseLock(){}})},async open(){},async close(){try{await printer.disconnect()}catch{}try{await printer.dispose()}catch{}if(activePrinter===printer){activePrinter=null;activePort=null}}};
    }

    async function chooseNativePrinter(){
      const {EscPosPrinter,BluetoothPrinter}=await import('@fedejm/capacitor-esc-pos-printer');
      try{await EscPosPrinter.requestBluetoothEnable()}catch{}
      const result=await EscPosPrinter.getBluetoothPrinterDevices();const devices=(result?.devices||[]).filter((d:any)=>d?.address);
      if(!devices.length)throw new Error('Aucune imprimante Bluetooth détectée. Allumez et associez votre imprimante thermique 58 mm puis réessayez.');
      const remembered=localStorage.getItem('qatalink_native_printer_address');let selected=devices.find((d:any)=>d.address===remembered)||null;
      if(!selected&&devices.length===1)selected=devices[0];
      if(!selected){const menu=devices.map((d:any,i:number)=>`${i+1}. ${d.name||d.alias||'Imprimante'} — ${d.address}`).join('\n');const answer=window.prompt(`Choisissez l’imprimante thermique :\n\n${menu}\n\nEntrez le numéro :`,'1');if(answer===null)throw Object.assign(new Error('Sélection annulée'),{name:'NotFoundError'});const index=Math.max(0,Math.min(devices.length-1,(Number(answer)||1)-1));selected=devices[index]}
      const printer=new BluetoothPrinter(selected.address);await printer.link();await printer.connect();activePrinter=printer;activePort=portFor(printer);
      localStorage.setItem('qatalink_native_printer_address',selected.address);localStorage.setItem('qatalink_native_printer_name',selected.name||selected.alias||'Imprimante 58 mm');return activePort;
    }

    setNavigatorProperty('serial',{async getPorts(){return activePort?[activePort]:[]},async requestPort(){return activePort||await chooseNativePrinter()}});

    return()=>{
      disposed=true;document.documentElement.removeAttribute('data-qatalink-native');void removeDeepLink?.();
      void import('@capacitor/geolocation').then(({Geolocation})=>Promise.all([...nativeWatchIds.values()].map(id=>Geolocation.clearWatch({id})))).catch(()=>{});nativeWatchIds.clear();
      if(originalGeo)setNavigatorProperty('geolocation',originalGeo);if(originalSerial)setNavigatorProperty('serial',originalSerial);else try{delete (navigator as any).serial}catch{}
      if(originalShare)setNavigatorProperty('share',originalShare);if(originalCanShare)setNavigatorProperty('canShare',originalCanShare);
      if(activePrinter){void activePrinter.disconnect().catch(()=>{});void activePrinter.dispose().catch(()=>{})}
    };
  },[]);
  return null;
}
