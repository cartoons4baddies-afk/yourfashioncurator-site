// Public, non-sensitive setup diagnostics for YFC newsletter. Never return keys, email addresses or raw provider errors.
export async function onRequestGet({env}){
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
 if(!env.BREVO_API_KEY||!env.BREVO_LIST_ID||!env.BREVO_DOI_TEMPLATE_ID)return json({ready:false,check:'configuration',message:'Brevo configuration is incomplete.'});
 const hdr={'api-key':env.BREVO_API_KEY,'Accept':'application/json'};
 const [templ,list]=await Promise.allSettled([
  fetch('https://api.brevo.com/v3/smtp/templates/'+encodeURIComponent(env.BREVO_DOI_TEMPLATE_ID),{headers:hdr}),
  fetch('https://api.brevo.com/v3/contacts/lists/'+encodeURIComponent(env.BREVO_LIST_ID),{headers:hdr})
 ]);
 const get=async(r)=>{if(r.status!=='fulfilled')return {ok:false};const x=r.value;return x.ok?{ok:true,data:await x.json()}:{ok:false,status:x.status}};
 const t=await get(templ),l=await get(list);
 if(!t.ok)return json({ready:false,check:'template_access',message:'Brevo cannot read confirmation template',status:t.status||null});
 if(!l.ok)return json({ready:false,check:'list_access',message:'Brevo cannot read subscriber list',status:l.status||null});
 if(!t.data.isActive)return json({ready:false,check:'template_inactive',message:'Confirmation template is not active'});
 if(t.data.doiTemplate===false)return json({ready:false,check:'template_not_double_opt_in',message:'Confirmation template is not recognized as a double opt-in template. Check the confirm button link.'});
 return json({ready:true,check:'template_and_list',message:'Template and list are valid. Sending permissions and sender authentication still need testing.'});
}
