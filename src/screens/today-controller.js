import { buildTodayModel, renderToday } from './today.js';

export const createTodayController=({getState,getDate,root,onOpenJob=()=>{},onComplete=()=>{},onPaid=()=>{}})=>{
 const render=()=>{
   const model=buildTodayModel({state:getState(),date:getDate()});
   renderToday({root,model,onJobClick:onOpenJob});
 };
 return {render,onComplete,onPaid};
};
