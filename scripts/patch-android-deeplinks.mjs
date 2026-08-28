import fs from 'node:fs';

const file='android/app/src/main/AndroidManifest.xml';
let xml=fs.readFileSync(file,'utf8');

const permissions=[
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
];
for(const permission of permissions){
  if(!xml.includes(permission.match(/android:name="([^"]+)/)?.[1]||''))xml=xml.replace('<application',`${permission}\n    <application`);
}

if(!xml.includes('android:scheme="qatalink"')){
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
}
fs.writeFileSync(file,xml);
console.log('Qatalink Android permissions and deep links registered');
