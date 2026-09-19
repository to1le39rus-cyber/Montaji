import { createFirebase } from './data/firebase.js';
import { createSharedRepository } from './data/shared-repository.js';
import { createNotesRepository } from './data/notes-repository.js';
import { normalizeShared } from './domain/normalize.js';
import { createAuthController } from './auth/auth-controller.js';

export const createApp = ({firebaseConfig,ui={}}) => {
  const fb=createFirebase(firebaseConfig);
  const shared=createSharedRepository({
    firestore:fb.firestore,
    ...fb.firestoreApi
  });
  const notes=createNotesRepository({
    firestore:fb.firestore,
    ...fb.firestoreApi
  });

  let currentUser=null;
  let sharedUnsubscribe=null;
  let notesUnsubscribe=null;

  const setDataStatus=ui.setDataStatus||(()=>{});
  const setAuthUser=ui.setAuthUser||(()=>{});
  const setSharedData=ui.setSharedData||(()=>{});
  const setNotes=ui.setNotes||(()=>{});
  const setError=ui.setError||(()=>{});

  const stopRealtime=()=>{
    sharedUnsubscribe?.(); notesUnsubscribe?.();
    sharedUnsubscribe=null; notesUnsubscribe=null;
  };

  const load=async()=>{
    if(!currentUser) return;
    setDataStatus('loading');
    try {
      const [rawShared,rawNotes]=await Promise.all([shared.load(),notes.load()]);
      setSharedData(normalizeShared(rawShared));
      setNotes(rawNotes);
      setDataStatus('ready');
    } catch(error) {
      setDataStatus('error');
      setError(error);
    }
  };

  const startRealtime=()=>{
    stopRealtime();
    if(!currentUser) return;
    sharedUnsubscribe=shared.subscribe(
      raw=>setSharedData(normalizeShared(raw)),
      error=>{setDataStatus('error');setError(error);}
    );
    notesUnsubscribe=notes.subscribe(
      value=>setNotes(value),
      error=>setError(error)
    );
  };

  const auth=createAuthController({
    auth:fb.auth,authApi:fb.authApi,
    onUser:async user=>{
      currentUser=user||null;
      setAuthUser(currentUser);
      if(!currentUser){stopRealtime();return;}
      await load();
      startRealtime();
    },
    onError:error=>setError(error)
  });

  return {
    auth,
    async start(){auth.start();},
    async saveShared(mutator){return shared.transact(mutator,normalizeShared);},
    async saveNotes(mutator){return notes.transact(mutator);},
    stop(){stopRealtime();auth.stop();}
  };
};
