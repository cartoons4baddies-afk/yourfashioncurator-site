(function(){
'use strict';
const db=window.YFC?.db;
const $=id=>document.getElementById(id);
if(!db)return;
const state={month:new Date(),entries:[],published:[],selected:null,ready:false};
state.month.setDate(1);state.month.setHours(12,0,0,0);
const fmt=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'});
const esc=window.YFC.esc;
const dayKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const fromTimestamp=iso=>new Date(iso);
const classify=(row)=>row.channel+' · '+row.status;
function status(message){$('calendar-feedback').textContent=message||''}
function render(){
 $('calendar-month').textContent=fmt.format(state.month).toUpperCase();
 const start=new Date(state.month.getFullYear(),state.month.getMonth(),1,12);
 const offset=(start.getDay()+6)%7;
 const grid=$('calendar-days');
 grid.replaceChildren();
 for(let i=0;i<42;i++){
  const d=new Date(start.getFullYear(),start.getMonth(),1-offset+i,12);
  const date=dayKey(d);
  const button=document.createElement('button');
  button.type='button';button.className='yfc-calendar-day'+(d.getMonth()!==start.getMonth()?' outside':'')+(date===dayKey(new Date())?' today':'');
  button.setAttribute('aria-label',d.toLocaleDateString('en-GB',{dateStyle:'full'}));
  const number=document.createElement('span');number.className='day-number';number.textContent=d.getDate();button.append(number);
  const matches=state.entries.filter(e=>dayKey(fromTimestamp(e.scheduled_for))===date);
  const published=state.published.filter(e=>dayKey(fromTimestamp(e.published_at))===date);
  [...matches.map(e=>({name:e.title,channel:e.channel,status:e.status})),...published.map(e=>({name:e.title,channel:'Website',status:'Published'}))].slice(0,3).forEach(item=>{
   const line=document.createElement('span');line.className='calendar-dotline';
   const dot=document.createElement('i');dot.className='calendar-dot channel-'+item.channel.toLowerCase().replace(/[^a-z]+/g,'-');
   const name=document.createElement('span');name.textContent=item.name;line.append(dot,name);button.append(line);
  });
  if(matches.length+published.length>3){const more=document.createElement('small');more.textContent='+'+(matches.length+published.length-3)+' more';button.append(more)}
  button.addEventListener('click',()=>{state.selected=date;showDay(date);});
  grid.append(button);
 }
 const thisMonth=state.entries.filter(e=>{const d=fromTimestamp(e.scheduled_for);return d.getFullYear()===start.getFullYear()&&d.getMonth()===start.getMonth()});
 $('calendar-total').textContent=thisMonth.length+' PLANNED ITEM'+(thisMonth.length===1?'':'S');
}
function showDay(date){
 $('calendar-selected').textContent=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const matches=state.entries.filter(e=>dayKey(fromTimestamp(e.scheduled_for))===date).sort((a,b)=>new Date(a.scheduled_for)-new Date(b.scheduled_for));
 const actual=state.published.filter(e=>dayKey(fromTimestamp(e.published_at))===date);
 const list=$('calendar-day-list');list.replaceChildren();
 for(const row of matches){
  const item=document.createElement('div');item.className='calendar-list-item';
  const content=document.createElement('div'),heading=document.createElement('strong'),detail=document.createElement('small'),edit=document.createElement('button');
  heading.textContent=row.title;detail.textContent=[fromTimestamp(row.scheduled_for).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),classify(row),row.campaign].filter(Boolean).join(' · ');
  content.append(heading,detail);edit.type='button';edit.className='outline-btn';edit.textContent='EDIT';edit.addEventListener('click',()=>openForm(row));
  item.append(content,edit);list.append(item);
 }
 for(const row of actual){
  const item=document.createElement('div');item.className='calendar-list-item';
  const content=document.createElement('div'),heading=document.createElement('strong'),detail=document.createElement('small');
  heading.textContent=row.title;detail.textContent='Published on website · '+new Date(row.published_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  content.append(heading,detail);item.append(content);list.append(item);
 }
 if(!matches.length&&!actual.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='Nothing scheduled for this day yet.';list.append(empty)}
 $('calendar-add-date').onclick=()=>openForm(null,date);
}
function openForm(entry,date=state.selected||dayKey(new Date())){
 const form=$('calendar-form');
 form.hidden=false;
 $('calendar-form-title').textContent=entry?'EDIT CONTENT':'ADD CONTENT';
 $('calendar-id').value=entry?.id||'';
 $('calendar-title-input').value=entry?.title||'';
 const d=entry?fromTimestamp(entry.scheduled_for):new Date(date+'T19:00:00');
 const local=dayKey(d)+'T'+[d.getHours(),d.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':');
 $('calendar-date-input').value=local;
 $('calendar-channel').value=entry?.channel||'Instagram';
 $('calendar-type').value=entry?.content_type||'Editorial';
 $('calendar-campaign').value=entry?.campaign||'';
 $('calendar-status').value=entry?.status||'Idea';
 $('calendar-notes').value=entry?.notes||'';
 $('calendar-url').value=entry?.content_url||'';
 $('calendar-delete').hidden=!entry;
 form.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function load(){
 status('Loading your editorial calendar…');
 const [{data,error},{data:posts,error:postsError}]=await Promise.all([
  db.from('editorial_calendar').select('*').order('scheduled_for',{ascending:true}).limit(1000),
  db.from('posts').select('title,published_at,blocks,status').eq('status','published').not('published_at','is',null).order('published_at',{ascending:false}).limit(500)
 ]);
 if(error){
  $('calendar-unavailable').hidden=false;
  $('calendar-unavailable').textContent='ONE-TIME SETUP NEEDED — Run migration-yfc-content-calendar.sql in your Supabase SQL Editor. Calendar items cannot be saved until the private table is created. ('+error.message+')';
  $('calendar-save').disabled=true;
  $('calendar-add-date').disabled=true;
  state.entries=[];state.ready=false;render();status('Calendar storage is not enabled yet.');return;
 }
 $('calendar-unavailable').hidden=true;$('calendar-save').disabled=false;$('calendar-add-date').disabled=false;
 state.entries=data||[];
 state.published=(posts||[]).filter(p=>!Array.isArray(p.blocks)||!p.blocks.some(b=>b.type==='affiliate-listing'));
 state.ready=true;render();
 showDay(state.selected||dayKey(new Date()));
 status(postsError?'Calendar ready. Published-article markers could not be loaded.':'Calendar ready · private entries saved to Supabase. Published website articles are shown automatically.');
}
async function save(e){
 e.preventDefault();if(!state.ready)return;
 const id=$('calendar-id').value;
 const date=$('calendar-date-input').value;
 if(!date)return status('Choose a date and time.');
 const row={title:$('calendar-title-input').value.trim(),scheduled_for:new Date(date).toISOString(),channel:$('calendar-channel').value,content_type:$('calendar-type').value.trim()||'Editorial',campaign:$('calendar-campaign').value.trim(),status:$('calendar-status').value,notes:$('calendar-notes').value.trim(),content_url:$('calendar-url').value.trim()};
 if(!row.title)return status('Please add a title.');
 if(row.content_url&&!/^https?:\/\//i.test(row.content_url))return status('Use a full https:// link or leave the link empty.');
 $('calendar-save').disabled=true;status('Saving…');
 const result=id?await db.from('editorial_calendar').update(row).eq('id',id):await db.from('editorial_calendar').insert(row);
 $('calendar-save').disabled=false;
 if(result.error)return status('Could not save: '+result.error.message);
 $('calendar-form').hidden=true;state.selected=dayKey(new Date(row.scheduled_for));state.month=new Date(new Date(row.scheduled_for).getFullYear(),new Date(row.scheduled_for).getMonth(),1,12);await load();
}
async function remove(){
 const id=$('calendar-id').value;if(!id||!state.ready)return;
 if(!confirm('Delete this calendar item permanently?'))return;
 status('Deleting…');
 const {error}=await db.from('editorial_calendar').delete().eq('id',id);
 if(error)return status('Could not delete: '+error.message);
 $('calendar-form').hidden=true;await load();
}
function init(){
 $('calendar-tab').addEventListener('click',async()=>{document.querySelectorAll('#workspace>section[id$="-pane"]').forEach(p=>p.hidden=p.id!=='calendar-pane');$('app-msg').textContent='';await load()});
 $('calendar-prev').addEventListener('click',()=>{state.month.setMonth(state.month.getMonth()-1);render()});
 $('calendar-next').addEventListener('click',()=>{state.month.setMonth(state.month.getMonth()+1);render()});
 $('calendar-today').addEventListener('click',()=>{state.month=new Date();state.month.setDate(1);render();showDay(dayKey(new Date()))});
 $('calendar-reload').addEventListener('click',load);
 $('calendar-form').addEventListener('submit',save);
 $('calendar-cancel').addEventListener('click',()=>{$('calendar-form').hidden=true});
 $('calendar-delete').addEventListener('click',remove);
 $('calendar-new').addEventListener('click',()=>openForm(null,dayKey(new Date())));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();