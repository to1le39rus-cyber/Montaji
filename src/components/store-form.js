const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const readStore=form=>{const fd=new FormData(form);return {name:String(fd.get('name')||'').trim(),address:String(fd.get('address')||'').trim(),phone:String(fd.get('phone')||'').trim(),contact:String(fd.get('contact')||'').trim()}};
export const createStoreForm=({store={},onSubmit=()=>{},onCancel=()=>{}})=>{
 const form=document.createElement('form');form.className='store-form';
 form.innerHTML='<label>Название<input name="name" value="'+esc(store.name||'')+'" required></label><label>Адрес<input name="address" value="'+esc(store.address||'')+'"></label><label>Телефон<input name="phone" inputmode="tel" value="'+esc(store.phone||'')+'"></label><label>Контакт / комментарий<input name="contact" value="'+esc(store.contact||'')+'"></label><div class="job-form-actions"><button type="button" data-cancel>Отмена</button><button type="submit">Сохранить</button></div>';
 const initial=readStore(form);
 form.onsubmit=async e=>{e.preventDefault();if(form.dataset.saving==='true')return;const current=readStore(form);const patch=store.id?Object.fromEntries(Object.entries(current).filter(([key,value])=>!Object.is(value,initial[key]))):current;if(store.id&&!Object.keys(patch).length){onCancel();return}const submit=form.querySelector('[type="submit"]');form.dataset.saving='true';submit.disabled=true;const label=submit.textContent;submit.textContent='Сохраняем…';try{await onSubmit(patch)}finally{form.dataset.saving='false';submit.disabled=false;submit.textContent=label}};
 form.querySelector('[data-cancel]').onclick=onCancel;return form;
};
