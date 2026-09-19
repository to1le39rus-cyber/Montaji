import { normalizeStore } from '../domain/stores.js';
export const createStoreRepository=({firestore,doc,runTransaction,serverTimestamp,collectionPath=['appData','shared'],actorId='client'})=>{
 const ref=doc(firestore,...collectionPath);
 const read=snap=>{if(!snap.exists())throw new Error('Общая база не найдена');const current=snap.data()?.data||{};return {current,stores:Array.isArray(current.stores)?current.stores:[]}};
 const write=(tx,current,stores)=>{const next={...current,stores,version:5};tx.set(ref,{data:next,version:5,updatedAt:serverTimestamp(),updatedBy:actorId},{merge:true});return next};
 const create=store=>runTransaction(firestore,async tx=>{const {current,stores}=read(await tx.get(ref));const value=normalizeStore(store);if(!value.id)throw new Error('У магазина должен быть id');if(stores.some(x=>x?.id===value.id))throw new Error('Магазин уже существует');write(tx,current,[...stores,value]);return value});
 const update=(id,store)=>runTransaction(firestore,async tx=>{const {current,stores}=read(await tx.get(ref));const i=stores.findIndex(x=>x?.id===id);if(i<0)throw new Error('Магазин не найден');const value=normalizeStore({...stores[i],...store,id});write(tx,current,stores.map((x,n)=>n===i?value:x));return value});
 const remove=id=>runTransaction(firestore,async tx=>{const {current,stores}=read(await tx.get(ref));if(!stores.some(x=>x?.id===id))throw new Error('Магазин не найден');write(tx,current,stores.filter(x=>x?.id!==id));return id});
 return {create,update,remove};
};
