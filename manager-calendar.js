import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig, 'montaji-aa-production');
const auth = getAuth(app);
const allowed = new Set(['manager','store_manager','store-manager','admin','owner']);

function applyManagerAccess(user){
  const nav = document.querySelector('.manager-only');
  const screen = document.getElementById('scheduleScreen');
  if(!nav || !screen) return;
  if(!user){ nav.style.display='none'; screen.classList.remove('active'); return; }
  user.getIdTokenResult().then(({claims})=>{
    const role = String(claims?.role || claims?.userRole || '').toLowerCase();
    const isManager = claims?.manager === true || allowed.has(role);
    nav.style.display = isManager ? '' : 'none';
    nav.setAttribute('aria-hidden', String(!isManager));
    if(!isManager && screen.classList.contains('active')) document.querySelector('[data-screen="todayScreen"]')?.click();
  }).catch(()=>{
    nav.style.display='none';
    if(screen.classList.contains('active')) document.querySelector('[data-screen="todayScreen"]')?.click();
  });
}

onAuthStateChanged(auth, applyManagerAccess);
