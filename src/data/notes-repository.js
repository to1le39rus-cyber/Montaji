export const createNotesRepository = ({firestore,doc,getDocFromServer,onSnapshot,runTransaction,collectionPath=['appData','notes']}) => {
  const ref=doc(firestore,...collectionPath);
  return {
    async load(){
      const snap=await getDocFromServer(ref);
      return snap.exists() ? (snap.data()?.data?.notes || []) : [];
    },
    subscribe(onData,onError){
      return onSnapshot(ref,snap=>onData(snap.exists()?(snap.data()?.data?.notes||[]):[]),onError);
    },
    async transact(mutator){
      return runTransaction(firestore,async tx=>{
        const snap=await tx.get(ref);
        const current={notes:snap.exists()?(snap.data()?.data?.notes||[]):[]};
        const next=await mutator(structuredClone(current));
        tx.set(ref,{data:{notes:Array.isArray(next.notes)?next.notes:[]},updatedAt:new Date()},{merge:true});
        return next.notes;
      });
    }
  };
};
