const DB_NAME='qatalink-offline-pos';
const DB_VERSION=1;
const STORE='keys';
const KEY_ID='device-aes-key';
const RECORD_PREFIX='qatalink_offline_pos_access:';
const DEFAULT_TTL_DAYS=30;

type StoredCredential={v:1;iv:string;data:string;expires_at:number;access_key:string};

function b64(bytes:Uint8Array){let raw='';for(const b of bytes)raw+=String.fromCharCode(b);return btoa(raw)}
function fromB64(value:string){const raw=atob(value),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function recordKey(accessKey:string){return `${RECORD_PREFIX}${accessKey}`}

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(new Error('INDEXEDDB_UNAVAILABLE'));
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('INDEXEDDB_OPEN_FAILED'));
  });
}

async function getStoredKey():Promise<CryptoKey|null>{
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY_ID);req.onsuccess=()=>resolve((req.result as CryptoKey)||null);req.onerror=()=>reject(req.error)})}finally{db.close()}
}
async function putStoredKey(key:CryptoKey){
  const db=await openDb();
  try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(key,KEY_ID);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
async function deviceKey(){
  if(!globalThis.crypto?.subtle)throw new Error('WEBCRYPTO_UNAVAILABLE');
  let key=await getStoredKey();
  if(key)return key;
  key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  await putStoredKey(key);
  return key;
}

export async function rememberOfflinePosAccess(accessKey:string,pin:string,ttlDays=DEFAULT_TTL_DAYS){
  if(typeof window==='undefined'||!accessKey||!pin)return false;
  const expiresAt=Date.now()+Math.max(1,ttlDays)*24*60*60*1000;
  try{
    const key=await deviceKey(),iv=crypto.getRandomValues(new Uint8Array(12));
    const plain=new TextEncoder().encode(JSON.stringify({pin,access_key:accessKey,expires_at:expiresAt}));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);
    const record:StoredCredential={v:1,iv:b64(iv),data:b64(new Uint8Array(encrypted)),expires_at:expiresAt,access_key:accessKey};
    localStorage.setItem(recordKey(accessKey),JSON.stringify(record));
    return true;
  }catch{return false}
}

export async function restoreOfflinePosPin(accessKey:string){
  if(typeof window==='undefined'||!accessKey)return'';
  try{
    const raw=localStorage.getItem(recordKey(accessKey));if(!raw)return'';
    const record=JSON.parse(raw) as StoredCredential;
    if(!record||record.v!==1||record.access_key!==accessKey||Date.now()>Number(record.expires_at||0)){localStorage.removeItem(recordKey(accessKey));return''}
    const key=await deviceKey();
    const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(record.iv)},key,fromB64(record.data));
    const payload=JSON.parse(new TextDecoder().decode(decrypted));
    if(payload?.access_key!==accessKey||Date.now()>Number(payload?.expires_at||0)||!payload?.pin){localStorage.removeItem(recordKey(accessKey));return''}
    return String(payload.pin);
  }catch{return''}
}

export function hasOfflinePosAccess(accessKey:string){
  if(typeof window==='undefined'||!accessKey)return false;
  try{const record=JSON.parse(localStorage.getItem(recordKey(accessKey))||'null') as StoredCredential|null;return !!record&&record.v===1&&record.access_key===accessKey&&Date.now()<Number(record.expires_at||0)}catch{return false}
}

export function clearOfflinePosAccess(accessKey:string){if(typeof window!=='undefined'&&accessKey)try{localStorage.removeItem(recordKey(accessKey))}catch{}}
export const OFFLINE_POS_ACCESS_DAYS=DEFAULT_TTL_DAYS;
