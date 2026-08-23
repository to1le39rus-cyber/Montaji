export const firebaseConfig = (() => {
  const NativeBlob = globalThis.Blob
  if (NativeBlob && !globalThis.__montajiAuthPersistencePatched) {
    globalThis.Blob = function MontajiBlob(parts, options) {
      let nextParts = parts
      try {
        const first = Array.isArray(parts) ? parts[0] : null
        if (typeof first === 'string' && first.includes('authMod.getAuth(app);')) {
          nextParts = [first.replace('authMod.getAuth(app);', 'authMod.initializeAuth(app,{persistence:[authMod.indexedDBLocalPersistence,authMod.browserLocalPersistence,authMod.browserSessionPersistence]});')]
        }
      } catch (_) {}
      return new NativeBlob(nextParts, options)
    }
    globalThis.Blob.prototype = NativeBlob.prototype
    globalThis.__montajiAuthPersistencePatched = true
  }
  return {
    apiKey: "AIzaSyARuz40aEnYf9A0X8v5_5AN9pK58lfx0es",
    authDomain: "montaj-39.firebaseapp.com",
    projectId: "montaj-39",
    storageBucket: "montaj-39.firebasestorage.app",
    messagingSenderId: "1078766399423",
    appId: "1:1078766399423:web:9de0fabf89a5b1aeda3b0a",
    measurementId: "G-LJG1HV95BV"
  }
})();