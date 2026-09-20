const hostname=typeof location==='undefined'?'':location.hostname;
const production=hostname==='montaji.vercel.app';
export const environment=Object.freeze({
 mode:production?'production':'demo',
 id:production?'production-firestore':'astra-synthetic-v1',
 label:production?'LIVE · FIRESTORE':'DEV · вымышленные данные'
});
