const clean=value=>String(value??'').trim();
const email=value=>clean(value).toLowerCase();
export const STORE_ROLES=Object.freeze({admin:'Администратор',manager:'Менеджер'});
export const normalizeStoreMember=(member={})=>({
 id:clean(member.id),
 name:clean(member.name),
 email:email(member.email),
 role:member.role==='admin'?'admin':'manager',
 status:member.status==='active'?'active':'invited'
});
export const createStoreMemberCommand=(input={})=>{
 const value=normalizeStoreMember(input);
 if(!value.name)throw new Error('Укажите имя сотрудника');
 if(!value.email||!value.email.includes('@'))throw new Error('Укажите e-mail сотрудника');
 return {...value,id:value.id||('member-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8))};
};
export const storeAccessSummary=store=>{
 const members=Array.isArray(store?.members)?store.members.map(normalizeStoreMember):[];
 return {members,active:members.filter(x=>x.status==='active').length,pending:members.filter(x=>x.status==='invited').length};
};
