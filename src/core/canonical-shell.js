import { createAppState } from './app-state.js';
import { createRouter } from './router.js';
import { buildTodayModel, renderToday } from '../screens/today.js';
import { buildScheduleModel, renderSchedule } from '../screens/schedule.js';
import { buildMoneyModel, renderMoney } from '../screens/money.js';
import { buildClientsModel, renderClients } from '../screens/clients.js';
import { buildNotesModel, renderNotes } from '../screens/notes.js';
import { buildMoreModel, renderMore } from '../screens/more.js';

export const createCanonicalShell=({root,initialState={jobs:[],expenses:[],version:5},initialNotes=[],user=null})=>{
 const state=createAppState();
 state.setState(initialState); state.setNotes(initialNotes); state.setUser(user);
 const content=document.createElement('main'); content.className='app-content';
 const nav=document.createElement('nav'); nav.className='app-nav';
 root.innerHTML=''; root.className='app-shell'; root.append(nav,content);
 const names=['today','schedule','money','clients','notes','more'];
 const labels={today:'Сегодня',schedule:'Расписание',money:'Деньги',clients:'Клиенты',notes:'Заметки',more:'Ещё'};
 const router=createRouter({
  root:content,
  routes:{
   today:async()=>renderToday({root:content,model:buildTodayModel({state:state.snapshot.state,date:new Date().toISOString().slice(0,10)})}),
   schedule:async()=>renderSchedule({root:content,model:buildScheduleModel({state:state.snapshot.state,date:new Date().toISOString().slice(0,10)})}),
   money:async()=>renderMoney({root:content,model:buildMoneyModel({state:state.snapshot.state,start:new Date().toISOString().slice(0,10),end:new Date().toISOString().slice(0,10)})}),
   clients:async()=>renderClients({root:content,model:buildClientsModel({state:state.snapshot.state})}),
   notes:async()=>renderNotes({root:content,model:buildNotesModel({notes:state.snapshot.notes})}),
   more:async()=>renderMore({root:content,model:buildMoreModel({user:state.snapshot.user,dataStatus:state.snapshot.dataStatus})})
  }
 });
 for(const name of names){
  const button=document.createElement('button'); button.type='button'; button.textContent=labels[name]; button.dataset.route=name;
  button.addEventListener('click',()=>router.render(name).then(()=>nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.route===name?'page':'false'))));
  nav.append(button);
 }
 router.render('today').then(()=>nav.querySelector('[data-route="today"]')?.setAttribute('aria-current','page'));
 return {state,router,root};
};
