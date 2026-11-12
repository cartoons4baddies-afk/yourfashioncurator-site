(()=>{
const params=new URLSearchParams(location.search);
if((params.get('section')||'home')!=='home'||params.has('post'))return;
const backdrop=document.getElementById('yfc-newsletter-backdrop'),widget=document.getElementById('yfc-newsletter');
const form=document.getElementById('yfc-newsletter-form'),feedback=document.getElementById('yfc-newsletter-feedback');
const closeButton=document.getElementById('yfc-newsletter-close'),button=form?.querySelector('button[type="submit"]');
if(!backdrop||!widget||!form||!closeButton||!button)return;
const KEY='yfc-newsletter-dismissed-until-v1',WEEK=7*24*60*60*1000;
let previousFocus=null;
function dismiss(){
 backdrop.hidden=true;widget.hidden=true;document.body.classList.remove('yfc-popup-open');
 try{localStorage.setItem(KEY,String(Date.now()+WEEK))}catch{}
 document.removeEventListener('keydown',onKey);
 if(previousFocus?.isConnected)previousFocus.focus();
}
function onKey(e){
 if(e.key==='Escape')dismiss();
 if(e.key==='Tab'&&!backdrop.hidden){
  const focusables=[...widget.querySelectorAll('button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),a[href]')].filter(el=>el.getClientRects().length);
  if(!focusables.length)return;
  const first=focusables[0],last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
}
closeButton.addEventListener('click',dismiss);
backdrop.addEventListener('click',e=>{if(e.target===backdrop)dismiss()});
let suppressed=false;try{suppressed=Number(localStorage.getItem(KEY)||0)>Date.now()}catch{}
if(!suppressed){
 window.setTimeout(()=>{previousFocus=document.activeElement;backdrop.hidden=false;widget.hidden=false;document.body.classList.add('yfc-popup-open');closeButton.focus();document.addEventListener('keydown',onKey)},1200);
}
button.disabled=true;
fetch('/api/newsletter-subscribe').then(r=>r.ok?r.json():{enabled:false}).then(data=>{
 if(data.enabled){button.disabled=false}
 else{button.textContent='COMING SOON';feedback.textContent='Our Sunday letter is getting ready. Subscriptions open soon.'}
}).catch(()=>{button.textContent='COMING SOON';feedback.textContent='Our Sunday letter is getting ready. Subscriptions open soon.'});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!form.reportValidity())return;
 button.disabled=true;feedback.textContent='SIGNING YOU UP…';
 try{
  const r=await fetch('/api/newsletter-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value,consent:form.elements.consent.checked,website:form.elements.website.value})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'We could not sign you up right now.');
  feedback.textContent='Check your inbox to confirm your subscription. Your first Sunday letter is coming!';
  form.reset();try{localStorage.setItem(KEY,String(Date.now()+30*24*60*60*1000))}catch{}
 }catch(err){feedback.textContent=err.message||'Please try again later.'}
 finally{button.disabled=false}
});
})();