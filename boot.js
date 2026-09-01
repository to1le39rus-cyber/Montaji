const APP_URL = new URL('app.js?runtime=20260901-overdue-fix', location.href);

async function boot(){
  const response = await fetch(APP_URL, {cache:'no-store'});
  if(!response.ok) throw new Error(`APP_LOAD_${response.status}`);
  let source = await response.text();

  // app.js is evaluated from a Blob so we can apply small production fixes.
  // Blob modules have no normal filesystem-relative base, therefore the
  // Firebase config import must be rewritten to an absolute same-origin URL.
  source = source.replace(
    "import { firebaseConfig } from './firebase-config.js';",
    `import { firebaseConfig } from '${new URL('firebase-config.js', location.href).href}';`
  );

  // Keep the login session on iOS/Safari and prevent the native form from
  // navigating away before Firebase finishes sign-in.
  source = source.replace(
    "auth=authMod.getAuth(app);db=fs.getFirestore(app);F={...fs,authMod};",
    "auth=authMod.getAuth(app);await authMod.setPersistence(auth,authMod.browserLocalPersistence).catch(err=>console.warn('Auth persistence setup failed',err));db=fs.getFirestore(app);F={...fs,authMod};"
  );
  source = source.replace(
    "function bindAuth(){$('#authForm').onsubmit=",
    "function bindAuth(){const form=$('#authForm');if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const email=$('#authEmail').value.trim(),pass=$('#authPassword').value;if(!online)return authMessage('Нет интернета.',true);if(!email||!pass)return authMessage('Введите email и пароль.',true);authMessage('Входим…');try{await F.authMod.signInWithEmailAndPassword(auth,email,pass)}catch(err){authMessage(authError(err),true)}});};$('#authForm').onsubmit="
  );

  const blob = new Blob([source], {type:'text/javascript'});
  const url = URL.createObjectURL(blob);
  try {
    await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  // Historical calendar overlay. It runs independently from app.js and never
  // changes the main Firebase bootstrap or its server loading path.
  import(new URL('calendar-history.js?v=20260902-1', location.href).href)
    .catch(error=>console.warn('Calendar history module failed',error));
}

boot().catch(error=>{
  console.error('Montaji boot failed', error);
  const el=document.querySelector('#syncStatus');
  if(el){el.textContent='Ошибка запуска';el.dataset.state='offline';}
  const toast=document.querySelector('#toast');
  if(toast){toast.textContent=`Не удалось запустить приложение: ${error?.message||'ошибка'}`;toast.dataset.state='error';}
});
