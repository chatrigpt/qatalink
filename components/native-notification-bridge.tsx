'use client';
import {useEffect} from 'react';

declare global{interface Window{qatalinkNativeNotify?:(title:string,body:string,url?:string)=>Promise<boolean>;qatalinkNativeNotificationPermission?:()=>Promise<boolean>;qatalinkNativeScheduleNotification?:(id:number,title:string,body:string,url:string,at:number)=>Promise<boolean>;qatalinkNativeCancelNotification?:(id:number)=>Promise<boolean>}}

export function NativeNotificationBridge(){
 useEffect(()=>{const cap=(window as any).Capacitor;if(!cap?.isNativePlatform?.())return;let disposed=false;
  window.qatalinkNativeNotificationPermission=async()=>{try{const {LocalNotifications}=await import('@capacitor/local-notifications');const current=await LocalNotifications.checkPermissions();if(current.display==='granted')return true;const next=await LocalNotifications.requestPermissions();return next.display==='granted'}catch{return false}};
  window.qatalinkNativeScheduleNotification=async(id,title,body,url,at)=>{try{const {LocalNotifications}=await import('@capacitor/local-notifications');const ok=await window.qatalinkNativeNotificationPermission?.();if(!ok)return false;await LocalNotifications.cancel({notifications:[{id}]});await LocalNotifications.schedule({notifications:[{id,title,body,smallIcon:'ic_launcher_foreground',extra:{url},schedule:{at:new Date(Math.max(Date.now()+500,at))}}]});return true}catch{return false}};
  window.qatalinkNativeCancelNotification=async(id)=>{try{const {LocalNotifications}=await import('@capacitor/local-notifications');await LocalNotifications.cancel({notifications:[{id}]});return true}catch{return false}};
  window.qatalinkNativeNotify=async(title,body,url='/mobile')=>window.qatalinkNativeScheduleNotification?.(Math.floor(Date.now()%2147483000),title,body,url,Date.now()+120)??false;
  void window.qatalinkNativeNotificationPermission?.();
  void (async()=>{try{const {LocalNotifications}=await import('@capacitor/local-notifications');const h=await LocalNotifications.addListener('localNotificationActionPerformed',ev=>{const url=String(ev.notification.extra?.url||'/mobile');if(!disposed)location.assign(url)});if(disposed)void h.remove();else (window as any).__qatalinkNotifHandle=h}catch{}})();
  return()=>{disposed=true;delete window.qatalinkNativeNotify;delete window.qatalinkNativeNotificationPermission;delete window.qatalinkNativeScheduleNotification;delete window.qatalinkNativeCancelNotification;try{void (window as any).__qatalinkNotifHandle?.remove?.()}catch{}}
 },[]);return null;
}
