(function(){
'use strict';
const db=window.YFC?.db;
const $=id=>document.getElementById(id);
if(!db)return;
const state={month:new Date(),entries:[],selected:null,ready:false};
state.month.setDate(1);
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dateOf=e=>dateKey(new Date(e.scheduled_for));
const done=e=>e.status==='Published';
const setStatus=s=>$('calendar-feedback').textContent=s;
function render(){
 $('calendar-month').textContent=state.month.toLocaleString('en-GB',{month:'long',year:'numeric'}).toUpperCase();
 const start=new Date(state.month.getFullYear(),state.month.getMonth(),1,12);
 const offset=(start.getDay()+6)%7,root=$('calendar-days');root.replaceChildren();
 for(let i=0;i<42;i++){
  const d=new Date(start.getFullYear(),start.getMonth(),1-offset+i,12),key=dateKey(d);
  const button=document.createElement('button');button.type='button';
  button.className='yfc-calendar-day'+(d.getMonth()!==start.getMonth()?' outside':'')+(key===dateKey(new Date())?' today':'')+(key===state.selected?' selected':'');
  button.setAttribute('aria-label',d.toLocaleDateString('en-GB',{dateStyle:'full'}));
  const number=document.createElement('span');number.className='day-number';number.textContent=d.getDate();button.append(number);
  const tasks=state.entries.filter(e=>dateOf(e)===key);
  for(const task of tasks.slice(0,3)){
   const line=document.createElement('span');line.className='calendar-dotline'+(done(task)?' is-done':'');
   const dot=document.createElement('i');dot.className='calendar-dot'+(done(task)?' is-done':'');
   const label=document.createElement('span');label.textContent=task.title;
   line.append(dot,label);button.append(line);
  }
  if(tasks.length>3){const more=document.createElement('small');more.textContent='+'+(tasks.length-3)+' more';button.append(more)}
  button.addEventListener('click',()=>showDay(key));root.append(button);
 }
 const monthItems=state.entries.filter(e=>{const d=new Date(e.scheduled_for);return d.getFullYear()===start.getFullYear()&&d.getMonth()===start.getMonth()});
 $('calendar-total').textContent=monthItems.filter(e=>!done(e)).length+' TO DO · '+monthItems.filter(done).length+' DONE';
}
function showDay(key){
 state.selected=key;
 $('calendar-selected').textContent=new Date(key+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 const list=$('calendar-day-list');list.replaceChildren();
 const tasks=state.entries.filter(e=>dateOf(e)===key).sort((a,b)=>Number(done(a))-Number(done(b)));
 for(const task of tasks){
  const item=document.createElement('div');item.className='calendar-list-item'+(done(task)?' task-completed':'');
  const wrap=document.createElement('div');wrap.className='calendar-task-wrap';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=done(task);checkbox.disabled=!state.ready;
  checkbox.setAttribute('aria-label','Mark '+task.title+' as '+(done(task)?'not done':'done'));
  checkbox.addEventListener('change',async()=>{
   checkbox.disabled=true;
   const {error}=await db.from('editorial_calendar').update({status:checkbox.checked?'Published':'Idea'}).eq('id',task.id);
   if(error){setStatus('Could not update task: '+error.message);checkbox.checked=!checkbox.checked;}
   else{task.status=checkbox.checked?'Published':'Idea';setStatus('Task updated.');showDay(key);render()}
   checkbox.disabled=false;
  });
  const content=document.createElement('div'),heading=document.createElement('strong'),notes=document.createElement('small');
  heading.textContent=task.title;notes.textContent=task.notes||'';content.append(heading);if(task.notes)content.append(notes);
  wrap.append(checkbox,content);
  const edit=document.createElement('button');edit.type='button';edit.className='outline-btn';edit.textContent='EDIT';edit.addEventListener('click',()=>openForm(task));
  item.append(wrap,edit);list.append(item);
 }
 if(!tasks.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='No tasks for this day. Add one whenever you like.';list.append(empty)}
 $('calendar-add-date').onclick=()=>openForm(null,key);
 render();
}
function openForm(task,date=state.selected||dateKey(new Date())){
 $('calendar-form').hidden=false;
 $('calendar-form-title').textContent=task?'EDIT TASK':'ADD TASK';
 $('calendar-id').value=task?.id||'';
 $('calendar-title-input').value=task?.title||'';
 $('calendar-date-input').value=task?dateOf(task):date;
 $('calendar-notes').value=task?.notes||'';
 $('calendar-done').checked=Boolean(task&&done(task));
 $('calendar-delete').hidden=!task;
 $('calendar-form').scrollIntoView({block:'nearest',behavior:'smooth'});
}
async function load(){
 setStatus('Loading your to-do list…');
 const {data,error}=await db.from('editorial_calendar').select('id,title,scheduled_for,status,notes').order('scheduled_for',{ascending:true}).limit(1500);
 if(error){
  $('calendar-unavailable').hidden=false;
  $('calendar-unavailable').textContent='ONE-TIME SETUP: Run migration-yfc-content-calendar.sql in Supabase SQL Editor to save your tasks. '+error.message;
  state.ready=false;state.entries=[];$('calendar-save').disabled=true;$('calendar-add-date').disabled=true;
  render();setStatus('Calendar storage unavailable.');return;
 }
 $('calendar-unavailable').hidden=true;state.ready=true;state.entries=data||[];
 $('calendar-save').disabled=false;$('calendar-add-date').disabled=false;
 showDay(state.selected||dateKey(new Date()));setStatus('Private to-do list saved in Supabase. No publication synchronization.');
}
async function save(e){
 e.preventDefault();if(!state.ready)return;
 const id=$('calendar-id').value,day=$('calendar-date-input').value;
 const title=$('calendar-title-input').value.trim();
 if(!title||!day)return setStatus('Add a task and date.');
 const row={title,scheduled_for:new Date(day+'T12:00:00').toISOString(),notes:$('calendar-notes').value.trim(),status:$('calendar-done').checked?'Published':'Idea'};
 // Old database schema still requires a channel; it is intentionally hidden from the simple planner.
 if(!id)row.channel='Other';
 $('calendar-save').disabled=true;setStatus('Saving task…');
 const result=id?await db.from('editorial_calendar').update(row).eq('id',id):await db.from('editorial_calendar').insert(row);
 $('calendar-save').disabled=false;
 if(result.error)return setStatus('Could not save: '+result.error.message);
 $('calendar-form').hidden=true;state.selected=day;state.month=new Date(Number(day.slice(0,4)),Number(day.slice(5,7))-1,1,12);
 await load();
}
async function remove(){
 const id=$('calendar-id').value;if(!id||!state.ready||!confirm('Delete this task?'))return;
 const {error}=await db.from('editorial_calendar').delete().eq('id',id);
 if(error)return setStatus('Could not delete: '+error.message);
 $('calendar-form').hidden=true;await load();
}
function init(){
 $('calendar-tab').addEventListener('click',async()=>{for(const p of document.querySelectorAll('#workspace>section[id$="-pane"]'))p.hidden=p.id!=='calendar-pane';$('app-msg').textContent='';await load()});
 $('calendar-prev').addEventListener('click',()=>{state.month.setDate(1);state.month.setMonth(state.month.getMonth()-1);render()});
 $('calendar-next').addEventListener('click',()=>{state.month.setDate(1);state.month.setMonth(state.month.getMonth()+1);render()});
 $('calendar-today').addEventListener('click',()=>{state.month=new Date();state.month.setDate(1);showDay(dateKey(new Date()))});
 $('calendar-reload').addEventListener('click',load);
 $('calendar-new').addEventListener('click',()=>openForm(null,dateKey(new Date())));
 $('calendar-form').addEventListener('submit',save);
 $('calendar-cancel').addEventListener('click',()=>{$('calendar-form').hidden=true});
 $('calendar-delete').addEventListener('click',remove);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();