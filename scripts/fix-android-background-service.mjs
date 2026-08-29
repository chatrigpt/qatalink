import fs from 'node:fs';
import path from 'node:path';

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
console.log('Qatalink Android native package corrected to com.qatalink.pro; background service and launcher activity are runtime-addressable');
