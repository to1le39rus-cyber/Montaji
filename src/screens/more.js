export const buildMoreModel=({user=null,dataStatus='idle'})=>({
 email:user?.email||'',
 dataStatus
});
export const renderMore=({root,model,actions={}})=>{
 if(!root)return;
 root.innerHTML='<section class="more-screen"><h1>Ещё</h1><p>Аккаунт: '+(model.email||'—')+'</p><p>База: '+model.dataStatus+'</p><div class="more-actions"><button type="button" data-action="export">Экспорт</button><button type="button" data-action="signout">Выйти</button></div></section>';
 root.querySelector('[data-action="export"]')?.addEventListener('click',()=>actions.export?.());
 root.querySelector('[data-action="signout"]')?.addEventListener('click',()=>actions.signOut?.());
};
