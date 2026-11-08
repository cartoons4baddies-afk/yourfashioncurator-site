(async function(){
const {db,TITLES,esc,renderBlocks,renderCover,cleanUrl}=YFC;
const qs=new URLSearchParams(location.search);const category=qs.get('section')||'home';const postSlug=qs.get('post');const validCategory=Object.hasOwn(TITLES,category)?category:'home';
document.body.className='theme-'+validCategory;
const list=document.getElementById('main-content');document.querySelectorAll('[data-section]').forEach(a=>{if(a.dataset.section===validCategory)a.setAttribute('aria-current','page')});const explore=document.querySelector('.more');if(explore&&explore.querySelector('[aria-current="page"]'))explore.classList.add('has-active');
let settings={};let posts=[];let products=[];
if(db){
 const [s,p]=await Promise.all([db.from('site_settings').select('key,value'),db.from('posts').select('id,title,slug,excerpt,category,cover_url,blocks,featured,published_at,status').eq('status','published').order('published_at',{ascending:false})]);
 if(s.error||p.error){list.innerHTML='<div class="error-msg">The journal could not load right now. Please try again later.</div>';return;}
 settings=Object.fromEntries(s.data.map(r=>[r.key,r.value]));const all=p.data||[];products=all.filter(x=>Array.isArray(x.blocks)&&x.blocks.some(b=>b.type==='affiliate-listing'));posts=all.filter(x=>!products.includes(x));
}
const about=String(settings.about||'').trim();const aboutEl=document.getElementById('about-text');if(about){aboutEl.textContent=about;aboutEl.classList.remove('hidden')}
const email=String(settings.email||'').trim();
if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
 const link=document.getElementById('contact-link');
 link.href='mailto:'+encodeURIComponent(email);
 link.innerHTML='<span>EMAIL:</span> <span class="link-detail">'+esc(email)+'</span>';
 link.hidden=false;
}
function profileUsername(value,platform){
 try{
  const u=new URL(value),host=u.hostname.toLowerCase().replace(/^www\./,'');
  const accepted=platform==='instagram'?['instagram.com']:['tiktok.com'];
  if(!accepted.includes(host))return '';
  const part=decodeURIComponent(u.pathname.split('/').filter(Boolean)[0]||'').replace(/^@/,'');
  if(!part || ['p','reel','reels','stories','explore','share','login','accounts','video','tag'].includes(part.toLowerCase()))return '';
  return '@'+part;
 }catch{return '';}
}
const links=[];
for(const [key,label] of [['instagram','INSTAGRAM'],['tiktok','TIKTOK']]){
 const original=String(settings[key]||'').trim();
 const url=cleanUrl(original);
 if(!url)continue;
 const username=profileUsername(original,key);
 links.push('<a target="_blank" rel="noopener noreferrer" href="'+url+'"><span>'+label+':</span>'+(username?' <span class="link-detail">'+esc(username)+'</span>':'')+'</a>');
}
document.getElementById('social-links').innerHTML=links.join('')||'<span>LINKS COMING SOON</span>';

function date(x){return x?new Date(x).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):''}
function articleHref(p){return '?section='+encodeURIComponent(p.category)+'&post='+encodeURIComponent(p.slug)}
function coverPosition(p){
 const crop=Array.isArray(p.blocks)?p.blocks.find(b=>b.type==='cover-crop'):null;
 const clamp=v=>Math.max(0,Math.min(100,Number.isFinite(Number(v))?Number(v):50));
 return clamp(crop?.x??50)+'% '+clamp(crop?.y??50)+'%';
}
function card(p){
 const href=articleHref(p),title=esc(p.title),category=esc(TITLES[p.category]||p.category);
 const picture=p.cover_url?'<img loading="lazy" src="'+cleanUrl(p.cover_url)+'" alt="'+title+'" style="object-position:'+coverPosition(p)+'">':'<div class="story-no-photo" aria-hidden="true">YOURFASHIONCURATOR</div>';
 return '<a class="story" href="'+href+'">'+picture+'<div><div class="category">'+category+' / '+date(p.published_at)+'</div><h3 class="story-title">'+title+'</h3>'+(p.excerpt?'<p class="description">'+esc(p.excerpt)+'</p>':'')+'</div></a>';
}
function productDetails(p){return Array.isArray(p.blocks)?p.blocks.find(b=>b.type==='affiliate-listing')||{}:{}}
function productCard(p){
 const data=productDetails(p),url=cleanUrl(data.linkUrl),image=cleanUrl(p.cover_url),description=esc(p.excerpt||p.title);
 if(!url||!image)return '';
 return '<figure class="shop-product">'+
 '<a class="shop-product-photo" href="'+url+'" target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label="Shop '+esc(p.title)+'"><img loading="lazy" src="'+image+'" alt="'+esc(p.title)+'"></a>'+
 '<figcaption><a href="'+url+'" target="_blank" rel="sponsored nofollow noopener noreferrer">'+description+'</a></figcaption></figure>';
}
function productsIn(section){return products.filter(p=>{
 const cats=productDetails(p).categories;
 return Array.isArray(cats)?cats.includes(section):section==='shop';
});}
function productGallery(items){
 const cards=items.map(productCard).filter(Boolean);if(!cards.length)return '';
 return '<section class="shop-products-section" aria-label="Curated affiliate shopping">'+heading('THE CURATOR SHOPPING EDIT','SHOP DIRECTLY FROM THE EDIT')+
 '<div class="shop-products-grid">'+cards.join('')+'</div>'+
 '<p class="affiliate-disclosure">Some shopping links are affiliate links. Yourfashioncurator may earn a commission on qualifying purchases, at no additional cost to you.</p></section>';
}
function topLine(section=''){return '<div class="archive-top"><span>YOURFASHIONCURATOR / EST. 2026</span><span>'+esc(section||'INDEPENDENT FASHION JOURNAL')+'</span></div>'}
function heading(label,caption){return '<div class="section-head"><h2>'+esc(label)+'</h2><small>'+esc(caption)+'</small></div>'}
function updateMetadata(title,description,image){
 document.title=title+' — Yourfashioncurator';
 const summary=String(description||'An independent fashion journal exploring fashion archives, beauty and collections.').slice(0,160);
 const meta=document.querySelector('meta[name="description"]');
 if(meta)meta.content=summary;
 const canonical=document.querySelector('link[rel="canonical"]');
 if(canonical)canonical.href=location.origin+location.pathname+(location.search||'');
 const ogTitle=document.querySelector('meta[property="og:title"]');
 const ogDescription=document.querySelector('meta[property="og:description"]');
 const ogImage=document.querySelector('meta[property="og:image"]');
 const ogUrl=document.querySelector('meta[property="og:url"]');
 if(ogTitle)ogTitle.content=title+' — Yourfashioncurator';
 if(ogDescription)ogDescription.content=summary;
 if(ogImage&&image&&/^https:\/\//i.test(image))ogImage.content=image;
 if(ogUrl)ogUrl.content=location.href;
}
const featuredPosts=posts.filter(p=>p.featured);
const pinnedWidget=document.getElementById('pinned-widget');
const pinnedList=document.getElementById('pinned-list');
if(pinnedWidget&&pinnedList&&featuredPosts.length){
 pinnedList.innerHTML=featuredPosts.slice(0,3).map(p=>'<a class="pinned-story" href="'+articleHref(p)+'"><small>'+esc(TITLES[p.category]||p.category)+'</small><span>'+esc(p.title)+'</span></a>').join('');
 pinnedWidget.hidden=false;
}
if(postSlug){
 const p=posts.find(x=>x.slug===postSlug);
 if(!p){list.innerHTML=topLine()+'<div class="empty-journal"><h2>STORY NOT FOUND</h2><p>This article may not be published yet.</p></div>';return;}
 document.body.className='theme-'+(TITLES[p.category]?p.category:'home');
 updateMetadata(p.title,p.excerpt||'Fashion editorial by Yourfashioncurator',p.cover_url);
 list.innerHTML=topLine(TITLES[p.category])+
 '<article class="full-article"><a class="article-back" href="?section='+encodeURIComponent(p.category)+'"><span class="text-only-arrow" aria-hidden="true">←︎</span> '+esc(TITLES[p.category]||'ALL ARTICLES')+'</a>'+
 '<div class="article-kicker">'+esc(TITLES[p.category]||'')+' / '+date(p.published_at)+'</div><h1 class="article-title">'+esc(p.title)+'</h1>'+
 (p.excerpt?'<p class="article-summary">'+esc(p.excerpt)+'</p>':'')+
 renderCover(p.cover_url,p.blocks)+'<div class="article-content">'+renderBlocks(p.blocks)+'</div></article>';
 return;
}
const display=validCategory==='home'?posts:posts.filter(p=>p.category===validCategory);
const visibleProducts=productsIn(validCategory);
const fixedIntro=String(settings.intro||'').trim();
let html=topLine(validCategory==='home'?'THE FRONT PAGE':TITLES[validCategory]);
if(validCategory==='home'){
 updateMetadata('Independent Fashion Journal','Fashion archives, predictions, beauty, brand discoveries and collections worth remembering.');
 if(display.length){
  const lead=featuredPosts[0]||display[0];
  const secondary=featuredPosts.filter(p=>p.id!==lead.id).slice(0,2);
  const remaining=display.filter(p=>p.id!==lead.id&&!secondary.some(x=>x.id===p.id));
  html+='<section class="magazine-cover" aria-label="Featured fashion story">'+
   '<div class="magazine-cover-top"><span>THE FRONT PAGE</span><span>THE EDIT / '+new Date().getFullYear()+'</span></div>'+
   '<a class="magazine-lead" href="'+articleHref(lead)+'">'+
   '<div class="magazine-lead-photo">'+(lead.cover_url?'<img src="'+cleanUrl(lead.cover_url)+'" alt="'+esc(lead.title)+'" style="object-position:'+coverPosition(lead)+'">':'<div class="magazine-no-cover" aria-hidden="true">YFC / EDITORIAL</div>')+'<span class="magazine-photo-stamp">01 / THE COVER</span></div>'+
   '<div class="magazine-lead-copy"><span class="article-kicker">'+esc(TITLES[lead.category]||lead.category)+' / '+date(lead.published_at)+'</span>'+
   '<h1>'+esc(lead.title)+'</h1>'+(lead.excerpt?'<p>'+esc(lead.excerpt)+'</p>':'')+
   '<span class="magazine-read">READ THE STORY <svg class="editorial-arrow-icon" aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none"><path d="M3.5 12.5 12.5 3.5M5.5 3.5h7v7" stroke="currentColor" stroke-width="1.4" stroke-linecap="square" stroke-linejoin="miter"/></svg></span></div></a></section>';
  if(fixedIntro)html+='<section class="editorial-letter"><div class="editorial-letter-heading">A NOTE FROM THE EDITOR <svg class="editorial-star-icon" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 1.7v20.6M1.7 12h20.6M4.7 4.7l14.6 14.6M19.3 4.7 4.7 19.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/></svg></div><p>'+esc(fixedIntro)+'</p></section>';
  if(secondary.length)html+=heading('EDITOR’S SELECTION','FEATURED STORIES')+'<div class="stories">'+secondary.map(card).join('')+'</div>';
  if(remaining.length)html+=heading('FRESH FROM THE ARCHIVE',remaining.length+' MORE TO READ')+'<div class="stories archive-stories">'+remaining.map(card).join('')+'</div>';
  html+=productGallery(visibleProducts);
 }else{
  if(fixedIntro)html+='<section class="editorial-letter"><div class="editorial-letter-heading">A NOTE FROM THE EDITOR</div><p>'+esc(fixedIntro)+'</p></section>';
  html+=productGallery(visibleProducts);
  if(!visibleProducts.length)html+='<div class="empty-journal"><h2>THE FIRST ISSUE IS COMING.</h2><p>New fashion stories will appear here when published.</p></div>'; 
 }
}else{
 updateMetadata(TITLES[validCategory]||'The Journal','Explore '+(TITLES[validCategory]||'fashion')+' stories on Yourfashioncurator.');
 html+='<div class="cover-note"><div><span class="tiny">THE JOURNAL / '+esc(validCategory.toUpperCase())+'</span><h1>'+esc(TITLES[validCategory])+'</h1></div><span class="issue">The Edit</span></div>';
 html+=productGallery(visibleProducts);
 if(display.length){html+=heading('THE ARTICLES',display.length+' STORIES')+'<div class="stories archive-stories category-stories">'+display.map(card).join('')+'</div>';}
 else if(!visibleProducts.length){html+='<div class="empty-journal"><h2>NO STORIES YET.</h2><p>New fashion stories will appear here when published.</p></div>';} 
}
list.innerHTML=html;
})();
