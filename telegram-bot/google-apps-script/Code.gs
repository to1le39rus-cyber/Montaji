const CFG = {
  tz: 'Europe/Kaliningrad',
  botTokenKey: 'TELEGRAM_BOT_TOKEN',
  botUsernameKey: 'BOT_USERNAME',
  spreadsheetIdKey: 'SPREADSHEET_ID',
  inviteDays: 7,
  slots: {1:'11:00–12:00',2:'14:00–16:00',3:'Без времени 1',4:'Без времени 2'},
  statuses: ['Бронь','Подтверждён','Выполнен','Перенос','Отменён'],
  payments: ['Не оплачено','Частично','Оплачено'],
  stores: ['База дверей','Астера','LAVETRA DOORS - Кирил','Ферони','Форпост','Дом дверей','Стальная линия','Фабрика дверей- циган']
};

const SHEETS = {
  jobs: ['Монтажи',['id','date','slot','client','phone','address','store','price','status','payment','comment','created_by','created_at','updated_at']],
  stores: ['Магазины',['name','active','sort']],
  users: ['Пользователи',['telegram_id','username','first_name','last_name','role','invite_code','invite_expires','created_at','updated_at']],
  sessions: ['Сессии',['telegram_id','state','payload','updated_at']],
  reminders: ['Напоминания',['key','job_id','type','date','sent_at']]
};

function doGet(){ return ContentService.createTextOutput('Montaji Google Sheets bot is running.'); }
function doPost(e){
  try { handleUpdate(JSON.parse(e.postData.contents)); }
  catch(err){ console.error(err && err.stack ? err.stack : err); }
  return ContentService.createTextOutput('ok');
}

function setup(){
  const p=PropertiesService.getScriptProperties();
  if(!p.getProperty(CFG.spreadsheetIdKey)) throw new Error('Сначала укажи SPREADSHEET_ID в Script Properties.');
  ensureSheets_();
  seedStores_();
  createReminderTrigger_();
}

function handleUpdate(u){
  if(u.callback_query){ callback_(u.callback_query); return; }
  if(!u.message) return;
  const m=u.message, from=m.from, chatId=m.chat.id, text=(m.text||'').trim();
  const user=ensureUser_(from);
  if(text.indexOf('/start')===0){
    const arg=text.split(/\s+/)[1]||'';
    if(arg.indexOf('invite_')===0) acceptInvite_(from,arg.slice(7));
    home_(chatId); return;
  }
  if(!authorized_(from.id)){ send_(chatId,'🔒 У тебя пока нет доступа. Нужна пригласительная ссылка от владельца.'); return; }
  if(text==='/cancel'){ clearSession_(from.id); home_(chatId); return; }
  if(text==='/today'){ today_(chatId); return; }
  if(text==='/new'){ newJob_(chatId,from.id); return; }
  if(text==='/calendar'){ calendar_(chatId,new Date()); return; }
  if(text==='/all'){ upcoming_(chatId); return; }
  if(text==='/search'){ setSession_(from.id,'search',{}); send_(chatId,'🔎 Напиши ФИО, телефон или адрес:'); return; }
  if(text==='/partner'){ partner_(chatId,from.id); return; }
  const s=getSession_(from.id);
  if(s && s.state==='search'){ search_(chatId,text); clearSession_(from.id); return; }
  if(s && s.state.indexOf('new_')===0){ newText_(chatId,from.id,s,text); return; }
  home_(chatId);
}

function callback_(q){
  const chatId=q.message.chat.id, uid=q.from.id, d=q.data||'';
  answer_(q.id);
  if(d==='home') return home_(chatId);
  if(!authorized_(uid)){ send_(chatId,'🔒 Нет доступа.'); return; }
  if(d==='today') return today_(chatId);
  if(d==='new') return newJob_(chatId,uid);
  if(d==='calendar') return calendar_(chatId,new Date());
  if(d==='all') return upcoming_(chatId);
  if(d==='partner') return partner_(chatId,uid);
  if(d.indexOf('cal:')===0){ const a=d.split(':')[1].split('-'); return calendar_(chatId,new Date(Number(a[0]),Number(a[1])-1,1)); }
  if(d.indexOf('new:')===0) return newCallback_(chatId,uid,d);
  if(d.indexOf('job:')===0) return jobCallback_(chatId,uid,d);
  if(d.indexOf('invite:')===0) return partner_(chatId,uid);
}

function home_(chatId){
  const jobs=jobsForDate_(today_());
  const open=jobs.filter(j=>j.status!=='Выполнен'&&j.status!=='Отменён').length;
  send_(chatId,'🔨 <b>МОНТАЖИ</b>\n\nСегодня: <b>'+open+'</b> открытых монтажей\n\nВыбери действие:',mainKb_());
}
function mainKb_(){return {inline_keyboard:[[{text:'🔨 Сегодня',callback_data:'today'},{text:'➕ Новый монтаж',callback_data:'new'}],[{text:'📆 Календарь',callback_data:'calendar'},{text:'📋 Ближайшие',callback_data:'all'}],[{text:'🔎 Поиск',callback_data:'search'},{text:'👥 Напарник',callback_data:'partner'}]]};}
function today_(chatId){ showDate_(chatId,today_(),'🔨 <b>МОНТАЖИ СЕГОДНЯ</b>'); }
function showDate_(chatId,date,title){
  const a=jobsForDate_(date).sort((x,y)=>Number(x.slot)-Number(y.slot));
  if(!a.length){send_(chatId,title+'\n\nМонтажей нет.',{inline_keyboard:[[{text:'➕ Добавить',callback_data:'new'}],[{text:'⬅️ Меню',callback_data:'home'}]]});return;}
  let t=title+'\n\n'; const kb=[];
  a.forEach((j,i)=>{t+=(i+1)+'. '+statusEmoji_(j.status)+' <b>'+slot_(j.slot)+'</b> — '+esc_(j.client)+'\n📍 '+esc_(j.address||'—')+'\n🏪 '+esc_(j.store||'—')+'\n💰 '+money_(j.price)+' ₽\n\n';kb.push([{text:statusEmoji_(j.status)+' '+j.client,callback_data:'job:'+j.id}]);});
  kb.push([{text:'➕ Новый монтаж',callback_data:'new'},{text:'⬅️ Меню',callback_data:'home'}]); send_(chatId,t,{inline_keyboard:kb});
}
function upcoming_(chatId){
  const all=jobs_().filter(j=>j.date>=today_()&&j.status!=='Выполнен'&&j.status!=='Отменён').sort((a,b)=>(a.date+a.slot).localeCompare(b.date+b.slot)).slice(0,20);
  if(!all.length){send_(chatId,'📋 <b>БЛИЖАЙШИЕ</b>\n\nНет открытых монтажей.',backKb_());return;}
  let t='📋 <b>БЛИЖАЙШИЕ МОНТАЖИ</b>\n\n',kb=[]; let last='';
  all.forEach(j=>{if(j.date!==last){t+='\n<b>'+fmt_(j.date)+'</b>\n';last=j.date;}t+=statusEmoji_(j.status)+' '+slot_(j.slot)+' — '+esc_(j.client)+' — '+money_(j.price)+' ₽\n';kb.push([{text:fmt_(j.date)+' · '+j.client,callback_data:'job:'+j.id}]);});
  kb.push([{text:'⬅️ Меню',callback_data:'home'}]); send_(chatId,t,{inline_keyboard:kb});
}
function calendar_(chatId,d){
  const y=d.getFullYear(),m=d.getMonth()+1,a=jobs_().filter(j=>j.date.indexOf(y+'-'+pad_(m)+'-')===0); const counts={};a.forEach(j=>counts[j.date]=(counts[j.date]||0)+1);
  let t='📆 <b>'+Utilities.formatDate(new Date(y,m-1,1),CFG.tz,'MMMM yyyy').toUpperCase()+'</b>\n\n';
  Object.keys(counts).sort().forEach(x=>t+='• <b>'+Number(x.slice(8))+'</b> — '+counts[x]+' монтаж'+plural_(counts[x])+'\n');
  if(!a.length)t+='Монтажей нет.\n';
  const prev=new Date(y,m-2,1),next=new Date(y,m,1); send_(chatId,t,{inline_keyboard:[[{text:'‹',callback_data:'cal:'+prev.getFullYear()+'-'+(prev.getMonth()+1)},{text:'›',callback_data:'cal:'+next.getFullYear()+'-'+(next.getMonth()+1)}],[{text:'⬅️ Меню',callback_data:'home'}]]});
}

function newJob_(chatId,uid){clearSession_(uid);setSession_(uid,'new_date',{});send_(chatId,'➕ <b>НОВЫЙ МОНТАЖ</b>\n\nНа какую дату?',{inline_keyboard:[[{text:'Сегодня',callback_data:'new:date:today'},{text:'Завтра',callback_data:'new:date:tomorrow'}],[{text:'Ввести дату',callback_data:'new:date:manual'}],[{text:'❌ Отмена',callback_data:'home'}]]});}
function newCallback_(chatId,uid,d){
  const p=d.split(':'); const s=getSession_(uid); let data=s?s.payload:{};
  if(p[1]==='date'){if(p[2]==='manual'){setSession_(uid,'new_date_manual',{});send_(chatId,'Введите дату: <b>12.08.2026</b>');return;}data.date=p[2]==='today'?today_():addDays_(today_(),1);setSession_(uid,'new_slot',data);return askSlots_(chatId);}
  if(p[1]==='slot'){data.slot=Number(p[2]);setSession_(uid,'new_client',data);send_(chatId,'👤 Введите ФИО клиента:');return;}
  if(p[1]==='store'){data.store=p[2]==='none'?'':p[2];setSession_(uid,'new_price',data);send_(chatId,'💰 Стоимость монтажа (числом):');return;}
  if(p[1]==='confirm') return createJob_(chatId,uid);
}
function askSlots_(chatId){send_(chatId,'🕐 Выбери время:',{inline_keyboard:[[1,2,3,4].map(n=>({text:slot_(n),callback_data:'new:slot:'+n}))]});}
function newText_(chatId,uid,s,text){
  let p=s.payload||{};
  if(s.state==='new_date_manual'){const d=parseDate_(text);if(!d){send_(chatId,'Не понял дату. Пример: <b>12.08.2026</b>');return;}p.date=d;setSession_(uid,'new_slot',p);askSlots_(chatId);return;}
  if(s.state==='new_client'){p.client=text;setSession_(uid,'new_phone',p);send_(chatId,'📞 Телефон (или «пропустить»):');return;}
  if(s.state==='new_phone'){p.phone=text.toLowerCase()==='пропустить'?'':text;setSession_(uid,'new_address',p);send_(chatId,'📍 Адрес монтажа:');return;}
  if(s.state==='new_address'){p.address=text;setSession_(uid,'new_store',p);return askStores_(chatId);}
  if(s.state==='new_price'){const n=Number(text.replace(/\s/g,'').replace(',','.'));if(!isFinite(n)){send_(chatId,'Введите число, например <b>8000</b>.');return;}p.price=n;setSession_(uid,'new_comment',p);send_(chatId,'📝 Комментарий (или «пропустить»):');return;}
  if(s.state==='new_comment'){p.comment=text.toLowerCase()==='пропустить'?'':text;setSession_(uid,'new_confirm',p);return draft_(chatId,p);}
}
function askStores_(chatId){const a=readRows_('Магазины').filter(x=>x.active!=='FALSE');const kb=[];for(let i=0;i<a.length;i+=2)kb.push(a.slice(i,i+2).map(x=>({text:x.name,callback_data:'new:store:'+x.name})));kb.push([{text:'Без магазина',callback_data:'new:store:none'}]);send_(chatId,'🏪 Выбери магазин:',{inline_keyboard:kb});}
function draft_(chatId,p){send_(chatId,'🔨 <b>ПРОВЕРЬ МОНТАЖ</b>\n\n📅 '+fmt_(p.date)+'\n🕐 '+slot_(p.slot)+'\n👤 '+esc_(p.client)+'\n📞 '+esc_(p.phone||'—')+'\n📍 '+esc_(p.address||'—')+'\n🏪 '+esc_(p.store||'—')+'\n💰 '+money_(p.price)+' ₽\n📝 '+esc_(p.comment||'—'),{inline_keyboard:[[{text:'✅ Сохранить',callback_data:'new:confirm'}],[{text:'❌ Отмена',callback_data:'home'}]]});}
function createJob_(chatId,uid){
  const s=getSession_(uid),p=s&&s.payload;if(!p||!p.date||!p.client||!p.slot){send_(chatId,'Сессия устарела. Начни заново: /new');return;}
  if(jobsForDate_(p.date).some(j=>Number(j.slot)===Number(p.slot)&&j.status!=='Отменён')){send_(chatId,'⚠️ Этот слот уже занят. Выбери другой.',{inline_keyboard:[[{text:'Выбрать слот',callback_data:'new'}]]});return;}
  const id=Utilities.getUuid();const now=new Date();append_('Монтажи',[id,p.date,p.slot,p.client,p.phone||'',p.address||'',p.store||'',p.price||0,'Бронь','Не оплачено',p.comment||'',String(uid),now,now]);clearSession_(uid);send_(chatId,'✅ <b>Монтаж добавлен</b>\n\n'+fmt_(p.date)+' · '+slot_(p.slot)+'\n'+esc_(p.client)+'\n📍 '+esc_(p.address||'—'),{inline_keyboard:[[{text:'🔨 Сегодня',callback_data:'today'},{text:'⬅️ Меню',callback_data:'home'}]]});
}

function jobCallback_(chatId,uid,d){const p=d.split(':');const id=p[1],j=findJob_(id);if(!j){send_(chatId,'Монтаж не найден.',backKb_());return;}if(p.length===2){showJob_(chatId,j);return;}if(p[2]==='done')return patchJob_(chatId,j,'status','Выполнен');if(p[2]==='confirm')return patchJob_(chatId,j,'status','Подтверждён');if(p[2]==='cancel')return patchJob_(chatId,j,'status','Отменён');if(p[2]==='pay')return patchJob_(chatId,j,'payment','Оплачено');if(p[2]==='route')return send_(chatId,'🗺 <a href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(j.address)+'">Открыть маршрут</a>',backKb_);}
function showJob_(chatId,j){send_(chatId,'🔨 <b>МОНТАЖ</b>\n\n📅 '+fmt_(j.date)+'\n🕐 '+slot_(j.slot)+'\n👤 '+esc_(j.client)+'\n📞 '+esc_(j.phone||'—')+'\n📍 '+esc_(j.address||'—')+'\n🏪 '+esc_(j.store||'—')+'\n💰 '+money_(j.price)+' ₽\n📌 '+esc_(j.status)+'\n💳 '+esc_(j.payment)+'\n📝 '+esc_(j.comment||'—'),{inline_keyboard:[[{text:'📍 Маршрут',callback_data:'job:'+j.id+':route'},{text:'📞 Позвонить',url:j.phone?'tel:'+j.phone:'https://t.me'}],[{text:'🟢 Подтвердить',callback_data:'job:'+j.id+':confirm'},{text:'✅ Выполнен',callback_data:'job:'+j.id+':done'}],[{text:'💳 Оплачено',callback_data:'job:'+j.id+':pay'},{text:'❌ Отменить',callback_data:'job:'+j.id+':cancel'}],[{text:'⬅️ Меню',callback_data:'home'}]]});}
function patchJob_(chatId,j,field,value){const sh=sheet_('Монтажи'),h=headers_(sh),row=findRow_(sh,'id',j.id);sh.getRange(row,h.indexOf(field)+1).setValue(value);sh.getRange(row,h.indexOf('updated_at')+1).setValue(new Date());showJob_(chatId,findJob_(j.id));}

function partner_(chatId,uid){const u=findUser_(uid);if(!u||u.role!=='owner'){send_(chatId,'👥 Приглашение может создать только владелец.',backKb_);return;}const code=Utilities.getUuid().replace(/-/g,'').slice(0,12);const sh=sheet_('Пользователи'),r=findRow_(sh,'telegram_id',String(uid));const h=headers_(sh);sh.getRange(r,h.indexOf('invite_code')+1).setValue(code);sh.getRange(r,h.indexOf('invite_expires')+1).setValue(new Date(Date.now()+CFG.inviteDays*86400000));const bot=PropertiesService.getScriptProperties().getProperty(CFG.botUsernameKey)||'MontajiBot';send_(chatId,'👥 <b>ПРИГЛАШЕНИЕ НАПАРНИКА</b>\n\nОтправь ссылку:\n\nhttps://t.me/'+bot+'?start=invite_'+code+'\n\nСсылка действует '+CFG.inviteDays+' дней.',backKb_());}
function acceptInvite_(from,code){const owner=findRows_('Пользователи').find(u=>u.invite_code===code&&new Date(u.invite_expires)>new Date());if(!owner){send_(from.id,'❌ Приглашение недействительно или просрочено.');return;}if(Number(owner.telegram_id)===Number(from.id))return;ensureUser_(from);const sh=sheet_('Пользователи'),r=findRow_(sh,'telegram_id',String(from.id)),h=headers_(sh);sh.getRange(r,h.indexOf('role')+1).setValue('member');sh.getRange(r,h.indexOf('invite_code')+1).setValue('');send_(from.id,'✅ Ты подключён к монтажам. Теперь вы с напарником работаете с одной таблицей.');}

function search_(chatId,q){q=q.toLowerCase();const a=jobs_().filter(j=>[j.client,j.phone,j.address].some(v=>String(v||'').toLowerCase().indexOf(q)>=0)).slice(0,15);if(!a.length){send_(chatId,'Ничего не найдено.',backKb_);return;}const kb=a.map(j=>[{text:j.client,callback_data:'job:'+j.id}]);kb.push([{text:'⬅️ Меню',callback_data:'home'}]);send_(chatId,a.map(j=>statusEmoji_(j.status)+' <b>'+esc_(j.client)+'</b>\n'+fmt_(j.date)+' · '+slot_(j.slot)+'\n📍 '+esc_(j.address||'—')).join('\n\n'),{inline_keyboard:kb});}

function runReminders(){
  const now=new Date(),date=Utilities.formatDate(now,CFG.tz,'yyyy-MM-dd'),hm=Utilities.formatDate(now,CFG.tz,'HH:mm'),hour=Number(hm.slice(0,2)),minute=Number(hm.slice(3));
  const users=findRows_('Пользователи').filter(u=>u.role==='owner'||u.role==='member');if(!users.length)return;const jobs=jobsForDate_(date).filter(j=>j.status!=='Выполнен'&&j.status!=='Отменён');
  if(hour===8&&minute<5&&jobs.length&&!reminderExists_('morning',date)){const t='☀️ <b>ДОБРОЕ УТРО</b>\n\nСегодня '+jobs.length+' монтаж'+plural_(jobs.length)+':\n\n'+jobs.map(j=>'🔨 '+slot_(j.slot)+' — '+esc_(j.client)).join('\n');users.forEach(u=>send_(u.telegram_id,t));markReminder_('morning','',date);}
  jobs.forEach(j=>{const mins=j.slot==1?660:j.slot==2?840:null;if(mins===null)return;const current=hour*60+minute;if(mins-current>=55&&mins-current<=65&&!reminderExists_('one_hour',j.id+'',date)){const t='⏰ <b>МОНТАЖ ЧЕРЕЗ ЧАС</b>\n\n👤 '+esc_(j.client)+'\n📍 '+esc_(j.address||'—')+'\n🕐 '+slot_(j.slot)+'\n🏪 '+esc_(j.store||'—');users.forEach(u=>send_(u.telegram_id,t,{inline_keyboard:[[{text:'📍 Маршрут',callback_data:'job:'+j.id+':route'},{text:'Открыть',callback_data:'job:'+j.id}]]}));markReminder_('one_hour',j.id,date);}});
  if(hour===20&&minute<5&&jobs.length&&!reminderExists_('evening',date)){const t='⚠️ <b>МОНТАЖИ НЕ ЗАКРЫТЫ</b>\n\n'+jobs.map(j=>'🔨 '+slot_(j.slot)+' — '+esc_(j.client)).join('\n');users.forEach(u=>send_(u.telegram_id,t));markReminder_('evening','',date);}
}

function ensureUser_(from){const id=String(from.id),u=findUser_(id);if(u){const sh=sheet_('Пользователи'),r=findRow_(sh,'telegram_id',id),h=headers_(sh);sh.getRange(r,h.indexOf('username')+1).setValue(from.username||'');sh.getRange(r,h.indexOf('first_name')+1).setValue(from.first_name||'');sh.getRange(r,h.indexOf('last_name')+1).setValue(from.last_name||'');return u;}const any=findRows_('Пользователи').length;append_('Пользователи',[id,from.username||'',from.first_name||'',from.last_name||'',any?'pending':'owner','','',new Date(),new Date()]);return findUser_(id);}
function authorized_(uid){const u=findUser_(uid);return !!u&&(u.role==='owner'||u.role==='member');}

function ensureSheets_(){Object.keys(SHEETS).forEach(k=>{const [name,heads]=SHEETS[k],ss=ss_();let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.getRange(1,1,1,heads.length).setValues([heads]);else{const cur=headers_(sh);if(cur.join('|')!==heads.join('|'))sh.getRange(1,1,1,heads.length).setValues([heads]);}sh.setFrozenRows(1);});}
function seedStores_(){const sh=sheet_('Магазины');if(sh.getLastRow()>1)return;const rows=CFG.stores.map((x,i)=>[x,'TRUE',(i+1)*10]);sh.getRange(2,1,rows.length,3).setValues(rows);}
function createReminderTrigger_(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='runReminders').forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('runReminders').timeBased().everyMinutes(5).create();}

function ss_(){return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty(CFG.spreadsheetIdKey));}
function sheet_(n){const sh=ss_().getSheetByName(n);if(!sh)throw new Error('Нет листа '+n);return sh;}
function headers_(sh){return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);}
function readRows_(n){const sh=sheet_(n),h=headers_(sh);if(sh.getLastRow()<2)return [];return sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues().map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]])));}
function findRows_(n){return readRows_(n);}
function findUser_(id){return findRows_('Пользователи').find(u=>String(u.telegram_id)===String(id));}
function findJob_(id){return jobs_().find(j=>String(j.id)===String(id));}
function jobs_(){return readRows_('Монтажи');}
function jobsForDate_(d){return jobs_().filter(j=>j.date===d);}
function findRow_(sh,key,val){const h=headers_(sh),idx=h.indexOf(key);if(idx<0)return -1;const vals=sh.getRange(2,idx+1,Math.max(0,sh.getLastRow()-1),1).getValues();for(let i=0;i<vals.length;i++)if(String(vals[i][0])===String(val))return i+2;return -1;}
function append_(n,row){sheet_(n).appendRow(row);}
function setSession_(uid,state,payload){const sh=sheet_('Сессии'),r=findRow_(sh,'telegram_id',String(uid)),h=headers_(sh),now=new Date();if(r<0)append_('Сессии',[String(uid),state,JSON.stringify(payload||{}),now]);else{sh.getRange(r,h.indexOf('state')+1).setValue(state);sh.getRange(r,h.indexOf('payload')+1).setValue(JSON.stringify(payload||{}));sh.getRange(r,h.indexOf('updated_at')+1).setValue(now);}}
function getSession_(uid){const a=findRows_('Сессии').find(x=>String(x.telegram_id)===String(uid));if(!a)return null;let p={};try{p=JSON.parse(a.payload||'{}')}catch(e){}return {state:a.state,payload:p};}
function clearSession_(uid){setSession_(uid,'idle',{});}
function reminderExists_(type,jobOrDate,date){return findRows_('Напоминания').some(r=>r.type===type&&String(r.job_id)===String(jobOrDate)&&r.date===date);}
function markReminder_(type,job,date){append_('Напоминания',[Utilities.getUuid(),job,type,date,new Date()]);}

function send_(chatId,text,markup){const body={chat_id:chatId,text:text,parse_mode:'HTML',disable_web_page_preview:true};if(markup)body.reply_markup=markup;return telegram_('sendMessage',body);}
function answer_(id){return telegram_('answerCallbackQuery',{callback_query_id:id});}
function telegram_(method,body){const token=PropertiesService.getScriptProperties().getProperty(CFG.botTokenKey);if(!token)throw new Error('TELEGRAM_BOT_TOKEN не задан');const r=UrlFetchApp.fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'post',contentType:'application/json',payload:JSON.stringify(body),muteHttpExceptions:true});const code=r.getResponseCode(),txt=r.getContentText();if(code>=300)throw new Error('Telegram '+code+': '+txt);return JSON.parse(txt);}
function backKb_(){return {inline_keyboard:[[{text:'⬅️ Меню',callback_data:'home'}]]};}
function today_(){return Utilities.formatDate(new Date(),CFG.tz,'yyyy-MM-dd');}
function addDays_(iso,n){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return Utilities.formatDate(d, 'UTC','yyyy-MM-dd');}
function parseDate_(s){const m=String(s).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);return m?m[3]+'-'+pad_(m[2])+'-'+pad_(m[1]):null;}
function fmt_(iso){return Utilities.formatDate(new Date(iso+'T12:00:00Z'),CFG.tz,'dd.MM.yyyy');}
function slot_(n){return CFG.slots[Number(n)]||'Без времени';}
function pad_(n){return String(n).padStart(2,'0');}
function money_(n){return Number(n||0).toLocaleString('ru-RU');}
function statusEmoji_(s){return ({'Бронь':'🟡','Подтверждён':'🟢','Выполнен':'✅','Перенос':'🔄','Отменён':'🔴'})[s]||'⚪';}
function plural_(n){const a=Math.abs(n)%100,b=a%10;if(a>10&&a<20)return 'ей';if(b===1)return 'й';if(b>=2&&b<=4)return 'я';return 'ей';}
function esc_(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
