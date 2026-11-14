(function(){
'use strict';
const $=id=>document.getElementById(id);
const num=new Intl.NumberFormat('en-GB');
let busy=false;
function ranking(id,rows,type){
 const root=$(id);root.replaceChildren();
 if(!rows?.length){const p=document.createElement('p');p.className='hint';p.textContent='No data yet.';root.append(p);return}
 for(const row of rows.slice(0,8)){
  const div=document.createElement('div'),name=document.createElement('strong'),stats=document.createElement('small');
  div.className='yfc-analytics-item';
  name.textContent=row.name;
  stats.textContent=num.format(type==='pageViews'?row.pageViews:row.visits)+' '+(type==='pageViews'?'page views':'visits');
  div.append(name,stats);root.append(div);
 }
}
async function refreshCloudflare(){
 if(busy||$('analytics-pane').hidden)return;
 busy=true;const status=$('cf-live-status');status.textContent='Synchronizing Cloudflare…';
 try{
  const db=window.YFC?.db;
  if(!db)throw Error('Supabase is not connected.');
  const {data,error}=await db.auth.getSession();
  if(error||!data?.session?.access_token)throw Error('Sign in to the editor first.');
  const response=await fetch('/api/analytics',{headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});
  const payload=await response.json();
  if(!response.ok)throw Error((payload.error||'Analytics API is unavailable.')+(Array.isArray(payload.details)&&payload.details.length?' — '+payload.details.join(' | '):''));
  const metric=(title,value,description)=>{
   const outer=document.createElement('div'),small=document.createElement('small'),strong=document.createElement('strong'),detail=document.createElement('span');
   outer.className='yfc-analytics-metric';small.textContent=title;strong.textContent=num.format(value);detail.textContent=description;
   outer.append(small,strong,detail);return outer;
  };
  const metrics=$('cf-live-metrics');metrics.replaceChildren(
   metric('VISITS',payload.totals.visits,'Cloudflare / site-wide'),
   metric('PAGE VIEWS',payload.totals.pageViews,'Cloudflare / site-wide'),
   metric('INSTAGRAM VISITS',payload.referrers.filter(r=>r.name==='l.instagram.com'||r.name==='instagram.com').reduce((a,r)=>a+r.visits,0),'Identifiable Instagram referrals'),
   metric('PAGES PER VISIT',payload.totals.visits?(payload.totals.pageViews/payload.totals.visits).toFixed(2):0,'Average · site-wide')
  );
  ranking('cf-live-pages',payload.pages,'pageViews');
  ranking('cf-live-referrers',payload.referrers,'visits');
  ranking('cf-live-countries',payload.countries,'visits');
  $('cf-live-period').textContent=payload.period.start+' to '+payload.period.end+' (rolling period) · Updated '+new Date(payload.retrievedAt).toLocaleString('en-GB');
  $('cf-live-content').hidden=false;
  status.textContent='Cloudflare connected · latest successful sync '+new Date(payload.retrievedAt).toLocaleTimeString('en-GB');
 }catch(error){
  status.textContent='Live connection pending: '+(error?.message||'Unknown error');
 }finally{busy=false}
}
function attach(){
 $('analytics-tab').addEventListener('click',()=>setTimeout(refreshCloudflare,0));
 $('analytics-refresh').addEventListener('click',()=>setTimeout(refreshCloudflare,0));
 if(!$('workspace').hidden&&!$('analytics-pane').hidden)refreshCloudflare();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();