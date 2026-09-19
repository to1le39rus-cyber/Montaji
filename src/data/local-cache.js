const CACHE_DB_NAME='montaji-canonical-cache';
const CACHE_DB_VERSION=1;
const CACHE_STORE='snapshots';
const CACHE_KEY='current';
export const CANONICAL_RUNTIME_VERSION='2026-09-19-canonical-v2';

const hasIndexedDB=()=>typeof indexedDB!=='undefined';

const openDb=()=>new Promise((resolve,reject)=>{
  if(!hasIndexedDB()){resolve(null);return;}
  const request=indexedDB.open(CACHE_DB_NAME,CACHE_DB_VERSION);
  request.onupgradeneeded=()=>request.result.createObjectStore(CACHE_STORE,{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('IndexedDB unavailable'));
});

export const loadLocalSnapshot=async()=>{
  try{
    const db=await openDb();
    if(!db)return null;
    const value=await new Promise((resolve,reject)=>{
      const request=db.transaction(CACHE_STORE,'readonly').objectStore(CACHE_STORE).get(CACHE_KEY);
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error);
    });
    db.close();
    if(!value || value.runtimeVersion!==CANONICAL_RUNTIME_VERSION)return null;
    if(!value.shared || !Array.isArray(value.shared.jobs))return null;
    return {shared:value.shared,notes:Array.isArray(value.notes)?value.notes:[],savedAt:value.savedAt||null};
  }catch(error){
    console.warn('Local cache read skipped',error);
    return null;
  }
};

export const saveLocalSnapshot=async({shared,notes=[]}={})=>{
  try{
    const db=await openDb();
    if(!db)return false;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(CACHE_STORE,'readwrite');
      tx.objectStore(CACHE_STORE).put({
        key:CACHE_KEY,
        runtimeVersion:CANONICAL_RUNTIME_VERSION,
        savedAt:new Date().toISOString(),
        shared,
        notes:Array.isArray(notes)?notes:[]
      });
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
    });
    db.close();
    return true;
  }catch(error){
    console.warn('Local cache write skipped',error);
    return false;
  }
};

const deleteDatabase=()=>new Promise(resolve=>{
  if(!hasIndexedDB()){resolve();return;}
  const request=indexedDB.deleteDatabase(CACHE_DB_NAME);
  request.onsuccess=request.onerror=request.onblocked=()=>resolve();
});

export const clearLocalCache=async()=>{
  await deleteDatabase();
  if(typeof caches!=='undefined'){
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('montaji-')).map(name=>caches.delete(name)));
  }
  return true;
};
