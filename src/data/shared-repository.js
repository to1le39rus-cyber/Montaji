export const createSharedRepository = ({firestore,doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp,collectionPath=['appData','shared']}) => {
  const ref=doc(firestore,...collectionPath);
  return {
    async load(){ const snap=await getDocFromServer(ref); return snap.exists()?snap.data()?.data:null; },
    subscribe(onData,onError){ return onSnapshot(ref,{includeMetadataChanges:true},snap=>onData(snap.exists()?snap.data()?.data:null,{fromCache:snap.metadata.fromCache===true,hasPendingWrites:snap.metadata.hasPendingWrites===true}),onError); },
    async transact(mutator,normalize){
      return runTransaction(firestore,async tx=>{
        const snap=await tx.get(ref);
        const current=snap.exists()?snap.data()?.data:null;
        const next=normalize(await mutator(current));
        tx.set(ref,{data:next,version:5,updatedAt:serverTimestamp(),updatedBy:'client'},{merge:true});
        return next;
      });
    }
  };
};
