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

const drawableDir='android/app/src/main/res/drawable';
fs.mkdirSync(drawableDir,{recursive:true});
await sharp('public/qatalink-icon.svg',{density:512})
  .resize(512,512,{fit:'contain'})
  .png()
  .toFile(path.join(drawableDir,'qatalink_logo.png'));

console.log('Qatalink Android package corrected and launcher icon generated from public/qatalink-icon.svg');
