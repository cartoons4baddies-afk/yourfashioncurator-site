(async function(){
const {db,TITLES,esc,renderBlocks,renderCover,cleanUrl}=YFC;
const qs=new URLSearchParams(location.search);const category=qs.get('section')||'home';const postSlug=qs.get('post');const validCategory=Object.hasOwn(TITLES,category)?category:'home';
document.body.className='theme-'+validCategory;
const list=document.getElementById('main-content');document.querySelectorAll('[data-section]').forEach(a=>{if(a.dataset.section===validCategory)a.setAttribute('aria-current','page')});
let settings={};let posts=[];
if(db){
 const [s,p]=await Promise.all([db.from('site_settings').select('key,value'),db.from('posts').select('id,title,slug,excerpt,category,cover_url,blocks,featured,published_at,status').eq('status','published').order('published_at',{ascending:false})]);
 if(s.error||p.error){list.innerHTML='<div class="error-msg">The journal could not load right now. Please try again later.</div>';return;}
 settings=Object.fromEntries(s.data.map(r=>[r.key,r.value]));posts=p.data||[];
}
const about=String(settings.about||'').trim();const aboutEl=document.getElementById('about-text');if(about){aboutEl.textContent=about;aboutEl.classList.remove('hidden')}
const email=String(settings.email||'').trim();if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){const link=document.getElementById('contact-link');link.href='mailto:'+encodeURIComponent(email);link.hidden=false;}
const links=[];for(const [key,label] of [['instagram','INSTAGRAM'],['tiktok','TIKTOK']]){const url=cleanUrl(settings[key]);if(url)links.push('<a target="_blank" rel="noopener noreferrer" href="'+url+'">'+label+'</a>')};document.getElementById('social-links').innerHTML=links.join('')||'<span>LINKS COMING SOON</span>';
function date(x){return x?new Date(x).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):''}
function card(p){return '<a class="story" href="?section='+encodeURIComponent(p.category)+'&post='+encodeURIComponent(p.slug)+'">'+(p.cover_url?'<img loading="lazy" src="'+cleanUrl(p.cover_url)+'" alt="">':'')+'<div><div class="category">'+esc(TITLES[p.category]||p.category)+' / '+date(p.published_at)+'</div><h3 class="story-title">'+esc(p.title)+'</h3>'+(p.excerpt?'<p class="description">'+esc(p.excerpt)+'</p>':'')+'</div></a>'}
function topLine(section=''){return '<div class="archive-top"><span>YOURFASHIONCURATOR / EST. 2026</span><span>'+esc(section||'INDEPENDENT FASHION JOURNAL')+'</span></div>'}
function heading(label,caption){return '<div class="section-head"><h2>'+esc(label)+'</h2><small>'+esc(caption)+'</small></div>'}
if(postSlug){const p=posts.find(x=>x.slug===postSlug);if(!p){list.innerHTML=topLine()+'<div class="empty-journal"><h2>STORY NOT FOUND</h2><p>This article may not be published yet.</p></div>';return;}
 document.body.className='theme-'+(TITLES[p.category]?p.category:'home');document.title=p.title+' — Yourfashioncurator';
 list.innerHTML=topLine(TITLES[p.category])+ '<div style="margin-top:24px"><a class="article-back" href="?section='+encodeURIComponent(p.category)+'">← '+esc(TITLES[p.category]||'ALL ARTICLES')+'</a><div class="article-kicker" style="margin-top:35px">'+esc(TITLES[p.category]||'')+' / '+date(p.published_at)+'</div><h1 class="article-title">'+esc(p.title)+'</h1>'+(p.excerpt?'<p class="article-summary">'+esc(p.excerpt)+'</p>':'')+renderCover(p.cover_url,p.blocks)+'<div class="article-content">'+renderBlocks(p.blocks)+'</div></div>';return;
}
let display=validCategory==='home'?posts:posts.filter(p=>p.category===validCategory);
const fixedIntro=String(settings.intro||'').trim();let html=topLine(validCategory==='home'?'THE FRONT PAGE':TITLES[validCategory]);
if(validCategory==='home' && fixedIntro){html+='<div class="cover-note"><div><span class="tiny">EDITORIAL NOTE</span><p>'+esc(fixedIntro)+'</p></div></div>';}else if(validCategory!=='home'){html+='<div class="cover-note"><div><span class="tiny">THE JOURNAL / '+esc(validCategory.toUpperCase())+'</span><h1>'+esc(TITLES[validCategory])+'</h1></div><span class="issue">The Edit</span></div>';}
const featured=validCategory==='home'?display.filter(p=>p.featured):[];if(featured.length)html+=heading('ON THE COVER','EDITOR\'S SELECTION')+'<div class="stories">'+featured.map(card).join('')+'</div>';
html+=heading(validCategory==='home'?'RECENTLY PUBLISHED':'THE ARTICLES',display.length?display.length+' STORIES':'THE FIRST ISSUE IS COMING');
html+=display.length?'<div class="stories">'+display.map(card).join('')+'</div>':'<div class="empty-journal"><h2>NO STORIES YET.</h2><p>New fashion stories will appear here when published.</p></div>';
list.innerHTML=html;
})();
