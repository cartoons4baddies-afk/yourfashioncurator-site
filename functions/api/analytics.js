// Cloudflare Pages Function: private, read-only Cloudflare Web Analytics.
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
});
const query=`query YFCAnalytics($account: String!, $start: Date!, $end: Date!, $host: String!) {
 viewer {
  accounts(filter: {accountTag: $account}) {
   total: rumPageloadEventsAdaptiveGroups(
    limit: 1, filter: {date_geq: $start, date_leq: $end, requestHost: $host}
   ) {count sum {visits} dimensions {requestHost}}
   pages: rumPageloadEventsAdaptiveGroups(
    limit: 20, orderBy: [count_DESC],
    filter: {date_geq: $start, date_leq: $end, requestHost: $host}
   ) {count sum {visits} dimensions {requestPath}}
   referrers: rumPageloadEventsAdaptiveGroups(
    limit: 15, orderBy: [sum_visits_DESC],
    filter: {date_geq: $start, date_leq: $end, requestHost: $host}
   ) {count sum {visits} dimensions {refererHost}}
   countries: rumPageloadEventsAdaptiveGroups(
    limit: 12, orderBy: [sum_visits_DESC],
    filter: {date_geq: $start, date_leq: $end, requestHost: $host}
   ) {count sum {visits} dimensions {countryName}}
  }
 }
}`;
export async function onRequestGet({request,env}){
 const bearer=request.headers.get('Authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(bearer))return json({error:'Sign in to The Editor\'s Room first.'},401);
 const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,CF_ANALYTICS_TOKEN,CF_ACCOUNT_ID}=env;
 if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY||!CF_ANALYTICS_TOKEN||!CF_ACCOUNT_ID)
  return json({error:'Cloudflare live analytics is not configured yet.'},503);
 try{
  // Check the token with Supabase Auth, not by decoding an unverified JWT.
  const base=SUPABASE_URL.replace(/\/$/,'');
  const headers={'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':bearer};
  const userResponse=await fetch(base+'/auth/v1/user',{headers});
  if(!userResponse.ok)return json({error:'Your editor session has expired.'},401);
  const user=await userResponse.json();
  if(!user.id)return json({error:'Invalid editor session.'},401);
  // RLS: authenticated users can only read their own editor permission row.
  const roleResponse=await fetch(base+'/rest/v1/editors?select=user_id&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers});
  if(!roleResponse.ok)return json({error:'Editor authorization could not be verified.'},403);
  const roles=await roleResponse.json();
  if(!Array.isArray(roles)||!roles.some(role=>role.user_id===user.id))
   return json({error:'Only authorized editors can access analytics.'},403);
  const now=new Date(),end=now.toISOString().slice(0,10);
  const begin=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);
  const host='yourfashioncurator-site.pages.dev';
  const result=await fetch('https://api.cloudflare.com/client/v4/graphql',{
   method:'POST',headers:{'Authorization':'Bearer '+CF_ANALYTICS_TOKEN,'Content-Type':'application/json'},
   body:JSON.stringify({query,variables:{account:CF_ACCOUNT_ID,start:begin,end,host}})
  });
  if(!result.ok)return json({error:'Cloudflare API returned HTTP '+result.status+'. Check the token permission.'},502);
  const payload=await result.json();
  if(payload.errors?.length)return json({error:'Cloudflare rejected the analytics query. Check the account and API permissions.',details:payload.errors.map(e=>e.message).slice(0,3)},502);
  const groups=payload.data?.viewer?.accounts;
  if(!Array.isArray(groups)||groups.length!==1)return json({error:'Cloudflare analytics account was not found.'},502);
  const a=groups[0];
  const mapped=(values,dimension)=>Array.isArray(values)?values.map(item=>({
   name:String(item.dimensions?.[dimension]||'(unknown)').slice(0,180),
   visits:Number(item.sum?.visits||0),pageViews:Number(item.count||0)
  })):[];
  const overall=a.total?.[0]||{};
  return json({source:'Cloudflare Web Analytics',period:{start:begin,end,timezone:'UTC',note:'Calendar days (including today), not a rolling 168-hour window.'},retrievedAt:now.toISOString(),
   totals:{visits:Number(overall.sum?.visits||0),pageViews:Number(overall.count||0)},
   pages:mapped(a.pages,'requestPath'),
   referrers:mapped(a.referrers,'refererHost'),
   countries:mapped(a.countries,'countryName'),
   note:'Includes visits to the private editor. Page paths may be grouped without URL query parameters.'
  });
 }catch(error){
  return json({error:'Could not retrieve Cloudflare analytics. Please retry.'},502);
 }
}
