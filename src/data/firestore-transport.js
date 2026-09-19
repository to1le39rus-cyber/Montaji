// Existing v5 document schema is preserved. No automatic creation or migration.
export function createFirestoreTransport({firestore,doc,onSnapshot,runTransaction,serverTimestamp,actorId}) {
  let closed=false;
  const refs={shared:doc(firestore,'appData','shared'),notes:doc(firestore,'appData','notes')};
  return {
    subscribe(data,error) {
      const stops=Object.entries(refs).map(([key,ref])=>onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{
        if(closed)return;
        if(!snapshot.exists() && key==='shared') {error(new Error('Общая база не найдена. Обратитесь к владельцу.'));return;}
        data(key,snapshot.data()?.data||(key==='notes'?{notes:[]}:{}),{fromCache:snapshot.metadata.fromCache,pending:snapshot.metadata.hasPendingWrites});
      },error));
      return ()=>stops.forEach(stop=>stop());
    },
    transact(key,mutator) {
      if(closed)return Promise.reject(new Error('Сессия закрыта.'));
      return runTransaction(firestore,async tx=>{
        if(closed)throw new Error('Сессия закрыта.');
        const snapshot=await tx.get(refs[key]);
        if(!snapshot.exists() && key==='shared')throw new Error('Общая база не найдена.');
        const current=snapshot.data()?.data||(key==='notes'?{notes:[]}:{});
        const mutation=mutator(current);
        if(mutation.document!==current)tx.set(refs[key],{data:mutation.document,version:key==='shared'?5:2,updatedAt:serverTimestamp(),updatedBy:actorId},{merge:true});
        return mutation.result;
      });
    },
    close(){closed=true;}
  };
}
