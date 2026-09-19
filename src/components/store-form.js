const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
export const createStoreForm=({store={},onSubmit=()=>{},onCancel=()=>{}})=>{
 const form=document.createElement('form');form.className='store-form';
 form.innerHTML='<label>Название<input name="name" value="'+esc(store.name||'')+'" required></label><label>Адрес<input name="address" value="'+esc(store.address||'')+'"></label><label>Телефон<input name="phone" inputmode="tel" value="'+esc(store.phone||'')+'"></label><label>Контакт / комментарий<input name="contact" value="'+esc(store.contact||'')+'"></label><div class="job-form-actions"><button type="button" data-cancel>Отмена</button><button type="submit">Сохранить</button></div>';
 form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form);onSubmit({name:String(fd.get('name')||'').trim(),address:String(fd.get('address')||'').trim(),phone:String(fd.get('phone')||'').trim(),contact:String(fd.get('contact')||'').trim()})};
 form.querySelector('[data-cancel]').onclick=onCancel;return form;
};
