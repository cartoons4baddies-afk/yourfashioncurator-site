(function(){
const CATS=[['bring-back','Bring Back'],['predictions','Fashion Predictions'],['brands','Brand Discovery'],['beauty','Beauty'],['shop','The Shop'],['basics','The Basics'],['archives','Fashion Archives'],['jewelry','Jewelry'],['collections','Collections Worth Mentioning']];
const TITLES=Object.fromEntries([['home','Home'],...CATS]);
let db=null;
const cfg=window.YFC_CONFIG||{};
if(cfg.SUPABASE_URL&&cfg.SUPABASE_PUBLISHABLE_KEY&&window.supabase){db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);}
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
const cleanUrl=v=>/^https?:\/\//i.test(String(v||''))?esc(v):'';
const e=(t,attrs={},children='')=>'<'+t+Object.entries(attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('')+'>'+children+'</'+t+'>';
function renderBlocks(blocks=[]){return (Array.isArray(blocks)?blocks:[]).map(b=>{
 const kind=b.type||'text',text=esc(b.text||'').replace(/\n/g,'<br>');
 const align=['left','center','right'].includes(b.align)?b.align:'left';
 const size=['normal','small','large'].includes(b.size)?b.size:'normal';
 const style='text-align:'+align+';';
 if(kind==='heading')return '<h2 class="article-heading '+size+'" style="'+style+'">'+text+'</h2>';
 if(kind==='text')return '<p class="article-prose '+size+'" style="'+style+'">'+text+'</p>';
 if(kind==='quote')return '<blockquote class="article-quote" style="'+style+'">'+text+'</blockquote>';
 if(kind==='divider')return '<div class="article-divider"></div>';
 if(kind==='image'||kind==='sticker'){
  const src=cleanUrl(b.url);if(!src)return '';
  const width=['narrow','wide','full'].includes(b.width)?b.width:'wide';
  return '<figure class="article-visual '+width+' '+(kind==='sticker'?'cutout':'')+'" style="'+style+'"><img loading="lazy" src="'+src+'" alt="'+esc(b.caption||'')+'">'+(b.caption?'<figcaption>'+esc(b.caption)+'</figcaption>':'')+'</figure>';
 }
 return '';
 }).join('');}
window.YFC={db,CATS,TITLES,esc,slug,cleanUrl,renderBlocks,e};
})();
