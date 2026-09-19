// Synthetic sandbox only. Never used as a cache or replacement for Firestore.
export function createDemoTransport(seed, {name = 'montaji-astra-synthetic-v1', fault = () => null} = {}) {
  let db, channel, disposed = false;
  const listeners = new Set();
  const open = new Promise((resolve,reject) => {
    const request = indexedDB.open(name,1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      const tx = db.transaction('documents','readwrite'), store = tx.objectStore('documents');
      for (const key of ['shared','notes']) {
        const get = store.get(key);
        get.onsuccess = () => { if (!get.result) store.put(seed[key],key); };
      }
      tx.oncomplete = () => resolve(db); tx.onerror = () => reject(tx.error);
    };
  });
  async function emit() {
    try {
      await open; if (disposed) return;
      const failure = fault(); if (failure) throw failure;
      for (const key of ['shared','notes']) {
        const request = db.transaction('documents').objectStore('documents').get(key);
        request.onsuccess = () => { if (!disposed) for (const listener of listeners) listener.data(key,request.result,{fromCache:false,pending:false}); };
        request.onerror = () => { for (const listener of listeners) listener.error(request.error); };
      }
    } catch (error) { for (const listener of listeners) listener.error(error); }
  }
  if (typeof BroadcastChannel !== 'undefined') { channel = new BroadcastChannel(name); channel.onmessage = emit; }
  return {
    subscribe(data,error) { const listener={data,error}; listeners.add(listener); emit(); return () => listeners.delete(listener); },
    async transact(key,mutator) {
      await open;
      if (disposed) throw new Error('Сессия закрыта.');
      const failure=fault(); if (failure) throw failure;
      const result=await new Promise((resolve,reject) => {
        const tx=db.transaction('documents','readwrite'), store=tx.objectStore('documents'); let value, rejected;
        const get=store.get(key);
        get.onsuccess=()=>{try { const mutation=mutator(get.result); value=mutation.result; store.put(mutation.document,key); } catch(error) {rejected=error;tx.abort();}};
        tx.oncomplete=()=>resolve(value); tx.onabort=tx.onerror=()=>reject(rejected||tx.error||new Error('Не удалось сохранить данные.'));
      });
      channel?.postMessage('changed'); await emit(); return result;
    },
    refresh:emit,
    async reset() { await open; const tx=db.transaction('documents','readwrite'); for(const key of ['shared','notes']) tx.objectStore('documents').put(seed[key],key); await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});channel?.postMessage('changed');await emit(); },
    close() { disposed=true; listeners.clear();channel?.close();db?.close(); }
  };
}
