const clean=v=>String(v??'').trim();
export const normalizeStore=(store={})=>({
 id:clean(store.id),
 name:clean(store.name),
 address:clean(store.address),
 phone:clean(store.phone),
 contact:clean(store.contact)
});
export const createStoreCommand=(input={})=>{
 const value=normalizeStore(input);
 if(!value.name) throw new Error('Укажите название магазина');
 return {...value,id:value.id||('store-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8))};
};
export const updateStoreCommand=(before,patch={})=>{
 const value=normalizeStore({...before,...patch,id:before?.id});
 if(!value.id) throw new Error('Магазин не найден');
 if(!value.name) throw new Error('Укажите название магазина');
 return value;
};
