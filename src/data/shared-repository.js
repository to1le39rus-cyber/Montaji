export const createSharedRepository = ({firestore, doc, getDocFromServer, onSnapshot, runTransaction, collectionPath=['appData','shared']}) => {
  const ref=doc(firestore,...collectionPath);
  return {
    async load(){
      const snap=await getDocFromServer(ref);
      return snap.exists() ? snap.data()?.data : null;
    },
    subscribe(onData,onError){
      return onSnapshot(ref,snap=>onData(snap.exists()?snap.data()?.data:null),onError);
    },
    async transact(mutator, normalize){
      return runTransaction(firestore,async tx=>{
        const snap=await tx.get(ref);
        const current=snap.exists()?snap.data()?.data:null;
        const next=normalize ? normalize(await mutator(current)) : await mutator(current);
        tx.set(ref,{data:next,updatedAt:new Date(),}, {merge:true});
        return next;
      });
    }
  };
};
