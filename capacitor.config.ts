import type {CapacitorConfig} from '@capacitor/cli';

const config:CapacitorConfig={
  appId:'com.qatalink.pro',
  appName:'Qatalink Pro',
  webDir:'mobile-shell',
  server:{
    url:'https://qatalink.com/dashboard',
    cleartext:false,
    allowNavigation:['qatalink.com','*.qatalink.com']
  },
  android:{allowMixedContent:false},
  ios:{contentInset:'automatic'}
};

export default config;
