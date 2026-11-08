(function(){
const CATS=[['bring-back','Bring Back'],['predictions','Fashion Predictions'],['brands','Brand Discovery'],['beauty','Beauty'],['shop','The Shop'],['basics','The Basics'],['archives','Fashion Archives'],['jewelry','Jewelry'],['collections','Collections Worth Mentioning'],['gifts','Gift Ideas']];
const TITLES=Object.fromEntries([['home','Home'],...CATS]);
let db=null;
const cfg=window.YFC_CONFIG||{};
if(cfg.SUPABASE_URL&&cfg.SUPABASE_PUBLISHABLE_KEY&&window.supabase){db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);}
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
const cleanUrl=v=>/^https?:\/\//i.test(String(v||''))?esc(v):'';
const e=(t,attrs={},children='')=>'<'+t+Object.entries(attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('')+'>'+children+'</'+t+'>';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
function stickerOverlay(b,i,interactive=false){
 const x=clamp(b.x??83,-5,105),y=clamp(b.y??8,-5,105),size=clamp(b.scale??27,10,65),angle=clamp(b.angle??-13,-180,180);
 const kind=b.stickerKind==='custom'&&cleanUrl(b.url)?'custom':(b.stickerKind==='pink'?'pink':b.stickerKind==='silver'?'silver':'tape');
 const inside=kind==='custom'?'<img draggable="false" src="'+cleanUrl(b.url)+'" alt="Decorative sticker">':'<span aria-hidden="true"></span>';
 return '<span class="photo-sticker sticker-'+kind+(interactive?' sticker-draggable':'')+'" style="left:'+x+'%;top:'+y+'%;width:'+size+'%;transform:translate(-50%,-50%) rotate('+angle+'deg)"'+(interactive?' data-sticker-idx="'+i+'" title="Drag sticker to move" role="button" tabindex="0" aria-label="Move sticker with mouse or arrow keys"':' aria-hidden="true"')+'>'+inside+'</span>';
}
function stickersFor(blocks,target,interactive=false){
 return (Array.isArray(blocks)?blocks:[]).map((b,i)=>b.type==='sticker' && b.anchor===target?stickerOverlay(b,i,interactive):'').join('');
}
function renderCover(coverUrl,blocks=[],interactive=false){
 const src=cleanUrl(coverUrl);if(!src)return '';
 return '<div class="article-cover-stage photo-stage"><img class="article-cover" src="'+src+'" alt="Cover image">'+stickersFor(blocks,'cover',interactive)+'</div>';
}
function renderBlocks(blocks=[],options={}){
 const all=Array.isArray(blocks)?blocks:[],interactive=!!options.interactive;
 return all.map((b,i)=>{
 const kind=b.type||'text',text=esc(b.text||'').replace(/\n/g,'<br>');
 const align=['left','center','right'].includes(b.align)?b.align:'left';
 const size=['normal','small','large'].includes(b.size)?b.size:'normal';
 const style='text-align:'+align+';';
 if(kind==='heading')return '<h2 class="article-heading '+size+'" style="'+style+'">'+text+'</h2>';
 if(kind==='text')return '<p class="article-prose '+size+'" style="'+style+'">'+text+'</p>';
 if(kind==='quote')return '<blockquote class="article-quote" style="'+style+'">'+text+'</blockquote>';
 if(kind==='divider')return '<div class="article-divider"></div>';
 if(kind==='sticker')return '';
 if(kind==='diptych'){
  const images=[['left',b.leftUrl,b.leftCaption],['right',b.rightUrl,b.rightCaption]].map(([side,url,caption])=>{
   const src=cleanUrl(url);if(!src)return '<div class="diptych-empty" aria-hidden="true"></div>';
   return '<figure class="diptych-photo"><img loading="lazy" src="'+src+'" alt="'+esc(caption||'')+'">'+(caption?'<figcaption>'+esc(caption)+'</figcaption>':'')+'</figure>';
  }).join('');
  return '<div class="article-diptych">'+images+'</div>';
 }
 if(kind==='image'){
  const src=cleanUrl(b.url);if(!src)return '';
  const width=['narrow','wide','full'].includes(b.width)?b.width:'wide';
  const target=b.uid||('image-'+i);
  return '<figure class="article-visual '+width+'" style="'+style+'"><div class="photo-stage article-photo-stage"><img loading="lazy" src="'+src+'" alt="'+esc(b.caption||'')+'">'+stickersFor(all,target,interactive)+'</div>'+(b.caption?'<figcaption>'+esc(b.caption)+'</figcaption>':'')+'</figure>';
 }
 return '';
 }).join('');
}
window.YFC={db,CATS,TITLES,esc,slug,cleanUrl,renderBlocks,renderCover,e};
})();
