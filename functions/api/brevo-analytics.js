// Read-only Brevo metrics. Requires an authenticated Supabase editor.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function onRequestGet({request,env}){
 const bearer=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(bearer))return json({error:'Sign in to The Editor\'s Room first.'},401);
 const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,BREVO_API_KEY,BREVO_LIST_ID}=env;
 if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY)return json({error:'Supabase authentication is not configured.'},503);
 if(!BREVO_API_KEY||!BREVO_LIST_ID)return json({error:'Brevo is not connected to this Pages environment. Add BREVO_API_KEY and BREVO_LIST_ID in Variables and Secrets.'},503);
 const listId=String(BREVO_LIST_ID).trim();
 if(!/^\d+$/.test(listId))return json({error:'BREVO_LIST_ID must contain a numeric Brevo contact list ID.'},503);
 try{
  const base=SUPABASE_URL.replace(/\/$/,'');
  const headers={'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':bearer};
  const userRes=await fetch(base+'/auth/v1/user',{headers});
  if(!userRes.ok)return json({error:'Editor session expired.'},401);
  const user=await userRes.json();
  if(!user.id)return json({error:'Editor session invalid.'},401);
  const permission=await fetch(base+'/rest/v1/editors?select=user_id&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers});
  if(!permission.ok)return json({error:'Could not verify editor permissions.'},403);
  const rows=await permission.json();
  if(!Array.isArray(rows)||!rows.some(r=>r.user_id===user.id))return json({error:'Editor permission required.'},403);
  const apiHeaders={'api-key':String(BREVO_API_KEY).trim(),'Accept':'application/json'};
  const [listRes,newRes]=await Promise.all([
   fetch('https://api.brevo.com/v3/contacts/lists/'+listId,{headers:apiHeaders}),
   fetch('https://api.brevo.com/v3/contacts?'+new URLSearchParams({
    limit:'1',listIds:listId,createdSince:new Date(Date.now()-7*86400000).toISOString()
   }),{headers:apiHeaders})
  ]);
  if(!listRes.ok||!newRes.ok)return json({error:'Brevo could not return newsletter metrics. Check API key, list ID and API permissions.',status:{list:listRes.status,newContacts:newRes.status}},502);
  const list=await listRes.json(),recent=await newRes.json();
  const total=Number(list.totalSubscribers),newContacts=Number(recent.count);
  if(!Number.isFinite(total)||!Number.isFinite(newContacts))return json({error:'Brevo returned unexpected contact counts.'},502);
  return json({source:'Brevo',listName:String(list.name||'Newsletter').slice(0,100),totalSubscribers:total,
   newContacts7d:newContacts,retrievedAt:new Date().toISOString(),
   notes:'New contacts = contacts currently in this list whose Brevo contact record was created during the past 7 days; this is not an exact double-opt-in confirmation count, and may include unsubscribed contacts.'});
 }catch{return json({error:'Could not retrieve Brevo metrics right now.'},502)}
}
