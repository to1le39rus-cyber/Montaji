export const createRouter=({root,routes,notFound=()=>{}})=>{
 let current='';
 const render=async(name)=>{
  const route=routes[name];
  if(!route){notFound(name);return;}
  current=name;
  await route();
 };
 return {render,get current(){return current;}};
};
