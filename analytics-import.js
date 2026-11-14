(function(){
'use strict';
const $=id=>document.getElementById(id);
const csvParse=text=>{
 const rows=[],row=[];let cell='',quoted=false;
 text=String(text).replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(ch===','&&!quoted){row.push(cell);cell=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row.slice());row.length=0;cell=''}
  else cell+=ch;
 }
 row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
};
const normalize=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const n=v=>{const cleaned=String(v||'').trim().replace(/\s/g,'').replace(/%/g,'').replace(',','.');return Number(cleaned)};
const fmt=new Intl.NumberFormat('en-GB');
const state={user:null};
const storageKey=()=>state.user?'yfc-gsc-import-v1-'+state.user:null;
function report(){
 const key=storageKey();if(!key)return null;
 try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
}
function display(){
 const data=report();
 $('gsc-placeholder').hidden=!!data;
 $('gsc-results').hidden=!data;
 if(!data)return;
 $('gsc-date').textContent='CSV imported '+new Date(data.importedAt).toLocaleString('en-GB')+' · stored only in this browser';
 const metrics=[['GOOGLE CLICKS',data.totals.clicks],['IMPRESSIONS',data.totals.impressions],['AVERAGE CTR',data.totals.ctr.toFixed(2)+'%'],['AVG. POSITION',data.totals.position.toFixed(1)]];
 $('gsc-metrics').innerHTML=metrics.map(([label,value])=>'<div class="yfc-analytics-metric"><small>'+label+'</small><strong>'+value+'</strong></div>').join('');
 for(const type of ['queries','pages']){
  const target=$('gsc-'+type);
  const rows=data[type]||[];
  target.innerHTML=rows.length?rows.slice(0,8).map(x=>'<div class="yfc-analytics-item"><strong></strong><small></small></div>').join(''):'<p class="hint">Import '+(type==='queries'?'Queries.csv':'Pages.csv')+' to see this ranking.</p>';
  [...target.querySelectorAll('.yfc-analytics-item')].forEach((el,i)=>{el.querySelector('strong').textContent=rows[i].name;el.querySelector('small').textContent=fmt.format(rows[i].clicks)+' clicks · '+fmt.format(rows[i].impressions)+' impressions';});
 }
}
function kind(headers){
 const has=v=>headers.includes(v);
 if(has('date')&&has('clicks')&&has('impressions'))return 'chart';
 if((has('topqueries')||has('query')||has('requete')||has('requetes'))&&has('clicks'))return 'queries';
 if((has('toppages')||has('page')||has('pages'))&&has('clicks'))return 'pages';
 return null;
}
function parseFile(content){
 const grid=csvParse(content);if(grid.length<2)throw Error('CSV has no data rows.');
 const headers=grid[0].map(normalize);
 const type=kind(headers);if(!type)throw Error('This CSV is not a Search Console Chart, Queries or Pages export (English/French headers expected).');
 const ix=k=>headers.indexOf(k),field=(row,k)=>ix(k)>=0?row[ix(k)]:'';
 const clicksRow=row=>n(field(row,'clicks')),impressionsRow=row=>n(field(row,'impressions'));
 const clicksTotal=grid.slice(1).reduce((s,r)=>s+(Number.isFinite(clicksRow(r))?clicksRow(r):0),0);
 const impressionsTotal=grid.slice(1).reduce((s,r)=>s+(Number.isFinite(impressionsRow(r))?impressionsRow(r):0),0);
 const valid=grid.slice(1).filter(r=>Number.isFinite(clicksRow(r))&&Number.isFinite(impressionsRow(r)));
 if(!valid.length)throw Error('No numeric clicks/impressions detected.');
 if(type==='chart'){
  const totalImpressions=valid.reduce((s,r)=>s+impressionsRow(r),0);
  const position=totalImpressions?valid.reduce((s,r)=>s+n(field(r,'position'))*impressionsRow(r),0)/totalImpressions:0;
  return {type,totals:{clicks:clicksTotal,impressions:impressionsTotal,ctr:impressionsTotal?100*clicksTotal/impressionsTotal:0,position}};
 }
 const idIdx=type==='queries'?headers.findIndex(h=>['topqueries','query','requete','requetes'].includes(h)):headers.findIndex(h=>['toppages','page','pages'].includes(h));
 return {type,items:valid.map(r=>({name:r[idIdx]||'',clicks:clicksRow(r),impressions:impressionsRow(r)})).filter(r=>r.name).sort((a,b)=>b.clicks-a.clicks)};
}
async function init(){
 const db=window.YFC?.db;if(!db)return;
 const session=await db.auth.getSession();state.user=session.data?.session?.user?.id||null;
 if(!state.user)return;
 display();
 $('gsc-files').addEventListener('change',async e=>{
  const files=Array.from(e.target.files||[]),status=$('gsc-status');
  if(!files.length)return;
  try{
   const current=report()||{totals:null,queries:[],pages:[]};
   let chart=false;
   for(const file of files){
    const parsed=parseFile(await file.text());
    if(parsed.type==='chart'){current.totals=parsed.totals;chart=true}
    else current[parsed.type]=parsed.items;
   }
   // Totals must come from Chart.csv; summing top queries/pages undercounts search traffic.
   if(!current.totals)throw Error('Import Chart.csv first. Queries and Pages files do not contain reliable totals.');
   current.importedAt=new Date().toISOString();
   localStorage.setItem(storageKey(),JSON.stringify(current));
   status.textContent=(chart?'Search metrics and':'Rankings')+' imported successfully. Data remains in this browser.';
   display();
  }catch(err){status.textContent='Import failed: '+err.message}
  finally{e.target.value=''}
 });
 $('gsc-clear').addEventListener('click',()=>{
  if(!confirm('Delete imported Search Console data from this browser?'))return;
  localStorage.removeItem(storageKey());display();$('gsc-status').textContent='Local data cleared.';
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();