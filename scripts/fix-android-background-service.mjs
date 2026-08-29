import fs from 'node:fs';

const service='android/app/src/main/java/com/qatalink/app/QatalinkBackgroundLocationService.java';
if(!fs.existsSync(service))throw new Error('Qatalink background service was not generated');
let java=fs.readFileSync(service,'utf8');
java=java.replace('.setSmallIcon(R.drawable.qatalink_logo)','.setSmallIcon(getApplicationInfo().icon)');
java=java.replace('if (code == 400 || code == 404 || code == 410) stopSelf();','if (code == 400 || code == 404 || code == 410) stopTracking();');
fs.writeFileSync(service,java);
console.log('Qatalink background service compile compatibility applied');
