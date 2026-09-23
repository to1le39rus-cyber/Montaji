import { normalizePartnerRequest } from '../domain/partner-requests.js';

const clean=value=>JSON.parse(JSON.stringify(value??null));
const toData=snap=>snap.docs.map(item=>normalizePartnerRequest({id:item.id,...item.data()}));

export const createPartnerRequestRepository=({
 firestore,collection,query,where,doc,onSnapshot,setDoc,updateDoc,serverTimestamp
})=>{
 const requests=collection(firestore,'storeRequests');
 return {
  subscribeInstaller(onData,onError){
   return onSnapshot(requests,snap=>onData(toData(snap)),onError);
  },
  subscribeStore(storeId,onData,onError){
   const q=query(requests,where('organizationId','==',storeId));
   return onSnapshot(q,snap=>onData(toData(snap)),onError);
  },
  async create(request){
   const item=normalizePartnerRequest(request);
   if(!item.id)throw new Error('У заявки должен быть id');
   const ref=doc(firestore,'storeRequests',item.id);
   await setDoc(ref,{...clean(item),createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   return item;
  },
  async patch(id,patch){
   const ref=doc(firestore,'storeRequests',id);
   await updateDoc(ref,{...clean(patch),updatedAt:serverTimestamp()});
   return {id,...clean(patch)};
  }
 };
};
