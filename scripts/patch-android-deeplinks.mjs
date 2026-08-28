import fs from 'node:fs';

const file='android/app/src/main/AndroidManifest.xml';
let xml=fs.readFileSync(file,'utf8');
if(xml.includes('android:scheme="qatalink"')){console.log('Qatalink deep links already present');process.exit(0)}
const filters=`
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="qatalink" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="qatalink.com" android:pathPrefix="/livreur/" />
                <data android:scheme="https" android:host="qatalink.com" android:pathPrefix="/ops/" />
            </intent-filter>
`;
const marker='        </activity>';
if(!xml.includes(marker))throw new Error('MainActivity closing tag not found');
xml=xml.replace(marker,`${filters}${marker}`);
fs.writeFileSync(file,xml);
console.log('Qatalink Android deep links registered');
