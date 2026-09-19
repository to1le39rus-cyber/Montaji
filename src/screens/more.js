export const buildMoreModel=({user=null,dataStatus='idle',cacheStatus='none'})=>({
 email:user?.email||'',
 dataStatus,
 cacheStatus
});
export const renderMore=({root,model,actions={}})=>{
 if(!root)return;
 const cacheText=model.cacheStatus==='cached'?'Локальный снимок загружен':'Локального снимка нет';
 root.innerHTML='<section class="more-screen"><h1>Ещё</h1><p>Аккаунт: '+(model.email||'—')+'</p><p>База: '+model.dataStatus+'</p><p>'+cacheText+'</p><div class="more-actions"><button type="button" data-action="clear-cache">Очистить локальные данные / кэш</button><button type="button" data-action="export">Экспорт</button><button type="button" data-action="signout">Выйти</button></div></section>';
 root.querySelector('[data-action="clear-cache"]')?.addEventListener('click',()=>actions.clearCache?.());
 root.querySelector('[data-action="export"]')?.addEventListener('click',()=>actions.export?.());
 root.querySelector('[data-action="signout"]')?.addEventListener('click',()=>actions.signOut?.());
};
