export const createAuthController = ({auth,authApi,onUser,onError}) => {
  let unsubscribe=null;
  const start=()=>{
    unsubscribe=authApi.onAuthStateChanged(auth,user=>onUser(user),err=>onError?.(err));
    return unsubscribe;
  };
  return {
    start,
    stop(){unsubscribe?.();unsubscribe=null;},
    signIn:(email,password)=>authApi.signInWithEmailAndPassword(auth,email,password),
    register:(email,password)=>authApi.createUserWithEmailAndPassword(auth,email,password),
    reset:(email)=>authApi.sendPasswordResetEmail(auth,email),
    signOut:()=>authApi.signOut(auth)
  };
};
