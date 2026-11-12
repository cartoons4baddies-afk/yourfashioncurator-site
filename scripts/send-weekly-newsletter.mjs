// THE YFC LETTER: runs at Sunday 18:00 Europe/Zurich via GitHub Actions.
// Creates and sends a Brevo marketing campaign to the double-opt-in mailing list.
// Requires repository Actions secrets; never commit credentials.
const required=['BREVO_API_KEY','BREVO_LIST_ID','BREVO_SENDER_EMAIL','SUPABASE_URL','SUPABASE_ANON_KEY'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length){console.log('Newsletter inactive; missing secrets:',missing.join(', '));process.exit(0)}
const base='https://yourfashioncurator-site.pages.dev/';
const api=process.env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/posts';
const now=new Date();const weekAgo=new Date(now.getTime()-7*24*60*60*1000);
const qs=new URLSearchParams({select:'title,slug,excerpt,category,cover_url,blocks,published_at,status',status:'eq.published',published_at:'gte.'+weekAgo.toISOString(),order:'published_at.desc',limit:'1000'});
const response=await fetch(api+'?'+qs,{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+process.env.SUPABASE_ANON_KEY}});
if(!response.ok)throw Error('Could not fetch articles from Supabase: '+response.status);
const entries=await response.json();
const articles=entries.filter(p=>!p.blocks?.some(b=>b.type==='affiliate-listing'));
if(!articles.length){console.log('No articles this week — no campaign will be sent.');process.exit(0)}
const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const url=p=>base+'?section='+encodeURIComponent(p.category)+'&post='+encodeURIComponent(p.slug);
const start=weekAgo.toLocaleDateString('en-GB',{day:'numeric',month:'long',timeZone:'Europe/Zurich'});
const end=now.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Zurich'});
const dateTag=now.toLocaleDateString('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Zurich'});
const name='THE YFC LETTER / '+dateTag;
const hero=articles.map((p,i)=>'<div style="padding:22px 0;border-bottom:1px solid #e7cad8;">'+(p.cover_url&&/^https:\/\//.test(p.cover_url)?'<a href="'+safe(url(p))+'"><img src="'+safe(p.cover_url)+'" alt="" style="width:100%;max-width:540px;height:auto;display:block;margin:0 0 12px;"></a>':'')+'<p style="font:700 10px Arial;letter-spacing:2px;color:#995e79;">STORY '+String(i+1).padStart(2,'0')+' / '+safe(p.category.toUpperCase())+'</p><h2 style="font:italic 26px Georgia,serif;margin:9px 0;color:#35212c">'+safe(p.title)+'</h2>'+(p.excerpt?'<p style="font:14px/1.65 Arial;color:#604a56">'+safe(p.excerpt)+'</p>':'')+'<a href="'+safe(url(p))+'" style="color:#99516f;font:bold 12px Arial;text-decoration:underline;">READ THE STORY</a></div>').join('');
const html='<html><body style="background:#f6e5ed;margin:0;padding:24px 10px;"><table role="presentation" cellpadding="0" cellspacing="0" style="background:#fff9fc;border:1px solid #d5acbf;max-width:620px;width:100%;margin:auto"><tr><td style="padding:30px 30px 10px;text-align:center;background:#edd1dd;"><p style="font:bold 10px Arial;letter-spacing:3px;">YOURFASHIONCURATOR</p><h1 style="font:italic 42px Georgia,serif;color:#392331;margin:14px 0;">THE YFC LETTER</h1><p style="font:12px Arial;color:#674b5b;">YOUR WEEKLY FASHION DIARY / '+safe(start)+' – '+safe(end)+'</p></td></tr><tr><td style="padding:16px 30px 30px"><p style="font:15px/1.6 Arial;">A little love letter from our fashion world. Here’s every story we published this week.</p>'+hero+'<p style="text-align:center;padding:24px 0"><a href="'+base+'" style="display:inline-block;background:#38222e;padding:14px 24px;color:#fff;text-decoration:none;font:bold 12px Arial;">VISIT THE MAGAZINE</a></p><p style="text-align:center;color:#867580;font:11px/1.6 Arial;">You’re receiving this because you subscribed to THE YFC LETTER.<br><a href="{{ unsubscribe }}" style="color:#825773;">Unsubscribe</a> · <a href="'+base+'privacy.html" style="color:#825773;">Privacy</a></p></td></tr></table></body></html>';
const brevoHeaders={'api-key':process.env.BREVO_API_KEY,'content-type':'application/json','accept':'application/json'};
const call=async(path,options={})=>{const r=await fetch('https://api.brevo.com/v3/'+path,{...options,headers:{...brevoHeaders,...options.headers}});const txt=await r.text();if(!r.ok)throw Error('Brevo '+path+' returned '+r.status+': '+txt.slice(0,500));return txt?JSON.parse(txt):{};};
// Prevent duplicate sends on a rerun of the same Sunday schedule.
const existing=await call('emailCampaigns?limit=100&offset=0');
if(existing.campaigns?.some(c=>c.name===name)){console.log('Campaign already exists for '+dateTag+'; skipping to prevent duplicates.');process.exit(0)}
const newCampaign=await call('emailCampaigns',{method:'POST',body:JSON.stringify({name,type:'classic',subject:'THE YFC LETTER — This week in fashion',sender:{name:'Yourfashioncurator',email:process.env.BREVO_SENDER_EMAIL},replyTo:process.env.BREVO_SENDER_EMAIL,recipients:{listIds:[Number(process.env.BREVO_LIST_ID)]},htmlContent:html,previewText:articles.length+' new stories to read this week.'})});
console.log('Created newsletter campaign',newCampaign.id,'with',articles.length,'articles');
await call('emailCampaigns/'+newCampaign.id+'/sendNow',{method:'POST'});
console.log('Newsletter submitted to Brevo for sending.');
