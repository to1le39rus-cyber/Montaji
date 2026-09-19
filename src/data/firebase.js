import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export const createFirebase = config => {
  const app=initializeApp(config);
  const auth=getAuth(app);
  const firestore=getFirestore(app);
  return {
    app, auth, firestore,
    authApi:{onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut},
    firestoreApi:{doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp}
  };
};
