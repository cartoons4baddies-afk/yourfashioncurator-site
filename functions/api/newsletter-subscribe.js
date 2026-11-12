// Cloudflare Pages Function — Brevo double-opt-in without exposing API keys to visitors.
export async function onRequestPost({request,env}) {
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 if(!env.BREVO_API_KEY||!env.BREVO_LIST_ID||!env.BREVO_DOI_TEMPLATE_ID)return json({error:'The mailing list is being prepared. Please check back soon.'},503);
 const origin=request.headers.get('origin');if(origin && new URL(origin).origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
 let body;try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
 if(body?.website)return json({ok:true});
 const email=String(body?.email||'').trim().toLowerCase();
 if(!body?.consent||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Enter a valid email and accept the subscription terms.'},400);
 const listId=Number(env.BREVO_LIST_ID),templateId=Number(env.BREVO_DOI_TEMPLATE_ID);
 if(!Number.isSafeInteger(listId)||!Number.isSafeInteger(templateId))return json({error:'The mailing list is being prepared.'},503);
 try{
 const response=await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'content-type':'application/json','accept':'application/json'},body:JSON.stringify({email,includeListIds:[listId],redirectionUrl:new URL('/?newsletter=confirmed',request.url).href,templateId})});
 if(!response.ok){const detail=(await response.text()).slice(0,600);console.error('Brevo DOI error',JSON.stringify({status:response.status,detail:detail.replace(email,'[email-redacted]'),templateId,listId}));let reason='Brevo rejected the request';try{const parsed=JSON.parse(detail);const code=String(parsed.code||'').toLowerCase(),message=String(parsed.message||'').toLowerCase();if(/template/.test(message+code))reason='The confirmation email template needs checking';else if(/sender|domain|authentication|dkim/.test(message+code))reason='The sender address needs verification';else if(/key|unauthoriz|permission|forbidden|auth/.test(message+code)||response.status===401||response.status===403)reason='The Brevo API key or its permissions need checking';else if(/contact|duplicate|already exist/.test(message+code))reason='This email may already be registered';else if(/parameter|invalid|bad_request/.test(message+code))reason='A Brevo setting is invalid';}catch{}return json({error:'Subscription unavailable ('+response.status+'): '+reason+'.',errorCode:'BREVO_'+response.status},502)}
 return json({ok:true});
 }catch(err){console.error('Newsletter connection failed',err);return json({error:'Subscription is temporarily unavailable.'},502)}
}
export async function onRequestGet({env}){const enabled=Boolean(env.BREVO_API_KEY&&env.BREVO_LIST_ID&&env.BREVO_DOI_TEMPLATE_ID);return new Response(JSON.stringify({enabled}),{headers:{'content-type':'application/json','cache-control':'no-store'}})}
