import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const svg=join(root,'public','qatalink-icon.svg');
const res=join(root,'android','app','src','main','res');
if(!existsSync(svg)||!existsSync(res))process.exit(0);

const regular={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
const foreground={mdpi:108,hdpi:162,xhdpi:216,xxhdpi:324,xxxhdpi:432};
function render(folder,name,size){const dir=join(res,folder);mkdirSync(dir,{recursive:true});execFileSync('rsvg-convert',['-w',String(size),'-h',String(size),'-o',join(dir,name),svg],{stdio:'inherit'})}
for(const [density,size] of Object.entries(regular)){render(`mipmap-${density}`,'ic_launcher.png',size);render(`mipmap-${density}`,'ic_launcher_round.png',size)}
for(const [density,size] of Object.entries(foreground))render(`mipmap-${density}`,'ic_launcher_foreground.png',size);
const any=join(res,'mipmap-anydpi-v26');mkdirSync(any,{recursive:true});
const xml=`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/ic_launcher_background"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
writeFileSync(join(any,'ic_launcher.xml'),xml);writeFileSync(join(any,'ic_launcher_round.xml'),xml);
const values=join(res,'values');mkdirSync(values,{recursive:true});writeFileSync(join(values,'ic_launcher_background.xml'),'<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
console.log('Qatalink Android launcher icons generated from public/qatalink-icon.svg');
