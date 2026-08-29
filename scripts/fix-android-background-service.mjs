import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const wrongDir='android/app/src/main/java/com/qatalink/app';
const correctDir='android/app/src/main/java/com/qatalink/pro';
const files=['MainActivity.java','QatalinkBackgroundLocationPlugin.java','QatalinkBackgroundLocationService.java'];

if(!fs.existsSync(wrongDir))throw new Error('Qatalink background service was not generated');
fs.mkdirSync(correctDir,{recursive:true});

for(const name of files){
  const source=path.join(wrongDir,name);
  if(!fs.existsSync(source))throw new Error(`Missing generated Android source: ${name}`);
  let java=fs.readFileSync(source,'utf8')
    .replaceAll('package com.qatalink.app;','package com.qatalink.pro;')
    .replaceAll('com.qatalink.app.','com.qatalink.pro.');
  if(name==='QatalinkBackgroundLocationService.java'){
    java=java.replace('.setSmallIcon(R.drawable.qatalink_logo)','.setSmallIcon(getApplicationInfo().icon)');
    java=java.replace('if (code == 400 || code == 404 || code == 410) stopSelf();','if (code == 400 || code == 404 || code == 410) stopTracking();');
  }
  fs.writeFileSync(path.join(correctDir,name),java);
}

fs.rmSync(wrongDir,{recursive:true,force:true});

const iconSource='public/qatalink-icon.svg';
const drawableDir='android/app/src/main/res/drawable';
fs.mkdirSync(drawableDir,{recursive:true});
await sharp(iconSource,{density:512}).resize(512,512,{fit:'contain'}).png().toFile(path.join(drawableDir,'qatalink_logo.png'));

const launchers=[['mipmap-mdpi',48],['mipmap-hdpi',72],['mipmap-xhdpi',96],['mipmap-xxhdpi',144],['mipmap-xxxhdpi',192]];
for(const [folder,size] of launchers){
  const dir=path.join('android/app/src/main/res',String(folder));fs.mkdirSync(dir,{recursive:true});
  const png=await sharp(iconSource,{density:512}).resize(Number(size),Number(size),{fit:'contain'}).png().toBuffer();
  fs.writeFileSync(path.join(dir,'ic_launcher.png'),png);
  fs.writeFileSync(path.join(dir,'ic_launcher_round.png'),png);
}

const manifestFile='android/app/src/main/AndroidManifest.xml';
let manifest=fs.readFileSync(manifestFile,'utf8');
manifest=manifest.replace(/android:icon="@[^"]+"/,'android:icon="@mipmap/ic_launcher"');
manifest=manifest.replace(/android:roundIcon="@[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');
fs.writeFileSync(manifestFile,manifest);

console.log('Qatalink Android package corrected and launcher icons generated from current public/qatalink-icon.svg');
