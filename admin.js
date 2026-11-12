(async function(){
const {db,CATS,esc,slug,renderBlocks,renderCover,cleanUrl}=YFC;
const $=id=>document.getElementById(id);
const msg=(v)=>{$('app-msg').textContent=v||''};
const configured=!!db;
let rows=[],currentId=null,blocks=[],coverUrl='',savedSettings={},productId=null;
let cropX=50,cropY=50;
const categoryOptions=CATS.map(([v,l])=>'<option value="'+v+'">'+esc(l)+'</option>').join('');$('post-category').innerHTML=categoryOptions;
function pane(name){for(const p of ['posts','editor','products','product-editor','settings'])$(p+'-pane').hidden=(p!==name);msg('')}
if(!configured){$('auth-msg').textContent='Before using the editor, connect a Supabase project in config.js (see README).';$('login-form').querySelector('button').disabled=true;return;}
async function checkEditor(){const {data:s}=await db.auth.getSession();if(!s.session){$('auth-box').hidden=false;$('workspace').hidden=true;return}
const {data,error}=await db.from('editors').select('user_id').eq('user_id',s.session.user.id).maybeSingle();if(error||!data){$('auth-msg').textContent='This account is not authorized as an editor. Add your user ID to the editors table (see README).';await db.auth.signOut();$('auth-box').hidden=false;return;}
$('auth-box').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;await loadPosts();}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();
 const status=$('auth-msg'),button=$('login-form').querySelector('button[type="submit"]');
 status.textContent='Connecting to Supabase…';button.disabled=true;
 try{
  const result=await Promise.race([
   db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value}),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error('Connection timed out. Check your internet connection, then reload the page.')),15000))
  ]);
  if(result.error){status.textContent='Sign in failed: '+result.error.message;return;}
  status.textContent='Signed in. Checking editor access…';
  await checkEditor();
 }catch(error){status.textContent='Connection error: '+(error?.message||String(error));}
 finally{button.disabled=false;}
});
$('logout').addEventListener('click',async()=>{await db.auth.signOut();location.reload()});
$('posts-tab').addEventListener('click',async()=>{pane('posts');await loadPosts()});$('settings-tab').addEventListener('click',async()=>{pane('settings');await loadSettings()});
$('products-tab').addEventListener('click',()=>{pane('products');renderProductList()});$('new-product').addEventListener('click',()=>openProductEditor(null));$('cancel-product').addEventListener('click',()=>{pane('products');renderProductList()});
$('new-post').addEventListener('click',()=>openEditor(null));$('cancel-edit').addEventListener('click',()=>pane('posts'));
async function loadPosts(){const {data,error}=await db.from('posts').select('*').order('updated_at',{ascending:false});if(error){msg(error.message);return;}rows=data||[];renderList()}
function isAffiliateProduct(p){return Array.isArray(p?.blocks)&&p.blocks.some(b=>b.type==='affiliate-listing')}
function renderList(){const articles=rows.filter(p=>!isAffiliateProduct(p));$('admin-post-list').innerHTML=articles.length?articles.map(p=>'<div class="manager-item"><div><strong>'+esc(p.title||'Untitled')+'</strong><small>'+esc(CATS.find(c=>c[0]===p.category)?.[1]||'')+' / '+esc(p.status)+' / '+(p.featured?'PINNED / ':'')+new Date(p.updated_at).toLocaleDateString('en-GB')+'</small></div><div><button class="outline-btn" data-edit="'+p.id+'">EDIT</button></div></div>').join(''):'<div class="empty-journal"><h2>THE ARCHIVE IS EMPTY</h2><p>Create your first article when you are ready.</p></div>';document.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>openEditor(rows.find(p=>p.id===btn.dataset.edit)))}

const productCategories=[['home','Home'],...CATS];
$('product-categories').innerHTML=productCategories.map(([value,label])=>'<label class="affiliate-category-choice"><input type="checkbox" value="'+esc(value)+'" '+(value==='shop'?'checked':'')+'><span>'+esc(label)+'</span></label>').join('');
function productData(p){return p?.blocks?.find(b=>b.type==='affiliate-listing')||null}
function selectedProductCategories(){return Array.from($('product-categories').querySelectorAll('input:checked')).map(e=>e.value)}
function renderProductList(){
 const products=rows.filter(isAffiliateProduct);
 $('admin-product-list').innerHTML=products.length?products.map(p=>{
  const data=productData(p)||{};
  const image=p.cover_url?'<img src="'+cleanUrl(p.cover_url)+'" alt="" loading="lazy">':'';
  return '<div class="manager-item affiliate-manager-item">'+image+'<div><strong>'+esc(p.title)+'</strong><small>'+esc(p.status.toUpperCase())+' / FOLDER: '+esc(data.folder||'Unsorted Finds')+' / '+esc((data.categories||['shop']).map(c=>productCategories.find(x=>x[0]===c)?.[1]||c).join(', '))+'</small></div><button type="button" class="outline-btn" data-edit-product="'+p.id+'">EDIT</button></div>';
 }).join(''):'<div class="empty-journal"><h2>YOUR SHOPPING EDIT STARTS HERE</h2><p>Add a product photo, a clickable description and an affiliate link.</p></div>';
 $('admin-product-list').querySelectorAll('[data-edit-product]').forEach(btn=>btn.onclick=()=>openProductEditor(rows.find(p=>p.id===btn.dataset.editProduct)));
}
function updateProductImage(){
 const image=cleanUrl($('product-photo').value.trim());
 $('product-image-preview').innerHTML=image?'<img src="'+image+'" alt="Product preview">':'';
}
$('product-photo').addEventListener('input',updateProductImage);
function openProductEditor(p){
 pane('product-editor');productId=p?.id||null;const data=productData(p)||{};
 $('product-editor-heading').textContent=p?'EDIT AFFILIATE PRODUCT':'NEW AFFILIATE PRODUCT';
 $('product-title').value=p?.title||'';
 $('product-description').value=p?.excerpt||'';
 $('product-photo').value=p?.cover_url||'';
 $('product-link').value=data.linkUrl||'';
 $('product-folder').value=data.folder||'';
 $('product-file').value='';
 $('product-status').value=p?.status||'draft';
 const selected=Array.isArray(data.categories)?data.categories:['shop'];
 $('product-categories').querySelectorAll('input').forEach(input=>input.checked=selected.includes(input.value));
 $('delete-product').hidden=!p;
 updateProductImage();
}
$('product-file').addEventListener('change',async()=>{
 const el=$('product-file'),file=el.files?.[0];if(!file)return;
 el.disabled=true;msg('Uploading product photo…');
 try{$('product-photo').value=await upload(file);updateProductImage();msg('Product photo uploaded.');el.value='';}
 catch(error){msg('Upload failed: '+error.message)}
 finally{el.disabled=false;}
});
$('product-form').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('save-product');button.disabled=true;msg('Saving product…');
 try{
  const title=$('product-title').value.trim(),description=$('product-description').value.trim(),photo=$('product-photo').value.trim(),linkUrl=$('product-link').value.trim(),categories=selectedProductCategories();
  if(!title||!description||!photo||!linkUrl)throw Error('Add a product name, description, photo and affiliate link.');
  if(!cleanUrl(photo)||!cleanUrl(linkUrl))throw Error('Please use valid http(s) URLs.');
  if(!categories.length)throw Error('Choose at least one section.');
  const prior=rows.find(p=>p.id===productId);
  const slugInput=prior?.slug||'affiliate-product-'+slug(title).slice(0,60)+'-'+crypto.randomUUID().slice(0,8);
  const status=$('product-status').value;
  const folder=$('product-folder').value.trim().replace(/\s+/g,' ').slice(0,45);
  const row={title,slug:slugInput,excerpt:description,category:'shop',cover_url:photo,status,featured:false,blocks:[{type:'affiliate-listing',linkUrl,categories,folder}],published_at:status==='published'?(prior?.published_at||new Date().toISOString()):null};
  const op=productId?db.from('posts').update(row).eq('id',productId):db.from('posts').insert(row);
  const {error}=await op;if(error)throw error;
  msg('Affiliate product saved.');await loadPosts();pane('products');renderProductList();
 }catch(error){msg('Could not save product: '+error.message)}
 finally{button.disabled=false;}
});
$('delete-product').addEventListener('click',async()=>{
 if(!productId||!confirm('Delete this affiliate product permanently?'))return;
 const {error}=await db.from('posts').delete().eq('id',productId);
 if(error){msg(error.message);return}
 await loadPosts();pane('products');renderProductList();msg('Product deleted.');
});

function openEditor(p){pane('editor');currentId=p?.id||null;blocks=Array.isArray(p?.blocks)?structuredClone(p.blocks):[];
 // Ensure every photo has a stable anchor, including older articles.
 blocks.forEach((b,i)=>{if(b.type==='image'&&!b.uid)b.uid='image-'+crypto.randomUUID();});
 blocks.forEach((b,i)=>{if(b.type==='sticker'&&!b.anchor){const prev=blocks.slice(0,i).reverse().find(q=>q.type==='image');b.anchor=prev?.uid||'cover';}});
 const storedCrop=blocks.find(b=>b.type==='cover-crop');blocks=blocks.filter(b=>b.type!=='cover-crop');cropX=Math.max(0,Math.min(100,Number(storedCrop?.x??50)));cropY=Math.max(0,Math.min(100,Number(storedCrop?.y??50)));coverUrl=p?.cover_url||'';$('editor-heading').textContent=p?'EDIT ARTICLE':'NEW ARTICLE';$('post-title').value=p?.title||'';$('post-excerpt').value=p?.excerpt||'';$('post-slug').value=p?.slug||'';$('post-category').value=p?.category||'bring-back';$('post-status').value=p?.status||'draft';$('post-featured').checked=!!p?.featured;$('post-cover-file').value='';$('delete-post').hidden=!p;$('cover-preview').innerHTML=coverUrl?'<img style="max-width:230px;max-height:180px" src="'+cleanUrl(coverUrl)+'" alt="Current cover">':'';renderEditorBlocks();updatePreview()}

function photoTargets(){return [{id:'cover',label:'COVER PHOTO'},...blocks.filter(b=>b.type==='image').map((b,i)=>({id:b.uid,label:'ARTICLE PHOTO '+(i+1)}))];}
function renderEditorBlocks(){
 const wrap=$('block-list'),targets=photoTargets();
 wrap.innerHTML=blocks.map((b,i)=>{
 const kind=b.type||'text';
 const top='<div class="block-controls"><strong>'+esc(kind.toUpperCase())+' / '+(i+1)+'</strong><div><button type="button" data-move="up" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-move="down" '+(i===blocks.length-1?'disabled':'')+'>↓</button><button type="button" data-remove="1">×</button></div></div>';
 let fields='';
 if(kind==='cover-crop')return '';
 if(kind==='sticker'){
  const options=[['tape','CREAM TAPE'],['pink','PINK TAPE'],['silver','SILVER TAPE'],['custom','CUSTOM STICKER IMAGE']].map(([v,l])=>'<option value="'+v+'" '+((b.stickerKind||'tape')===v?'selected':'')+'>'+l+'</option>').join('');
  const anchorOptions=targets.map(t=>'<option value="'+esc(t.id)+'" '+(b.anchor===t.id?'selected':'')+'>'+esc(t.label)+'</option>').join('');
  fields='<p class="hint">Drag this sticker directly on its photo in LIVE PREVIEW. Only stickers move; the article stays structured.</p>'+
   '<div class="block-options"><label>Sticker style<select data-field="stickerKind">'+options+'</select></label><label>On photo<select data-field="anchor">'+anchorOptions+'</select></label></div>'+
   '<div class="block-options"><label>Size (%)<input type="number" min="10" max="65" data-field="scale" value="'+esc(b.scale??27)+'"></label><label>Rotation (°)<input type="number" min="-180" max="180" data-field="angle" value="'+esc(b.angle??-13)+'"></label></div>'+
   '<label>Custom PNG / image (only for custom sticker)<input class="block-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>'+
   '<label>Custom sticker URL<input data-field="url" type="url" value="'+esc(b.url||'')+'" placeholder="https://..."></label>';
 }else if(kind==='diptych'){
  fields='<p class="hint">A structured two-photo spread. Photos stay side by side on mobile.</p>'+
   '<label>Left photo<input class="diptych-file" data-side="leftUrl" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>'+
   '<label>Left photo URL<input data-field="leftUrl" type="url" value="'+esc(b.leftUrl||'')+'" placeholder="https://..."></label>'+
   '<label>Left caption<input data-field="leftCaption" value="'+esc(b.leftCaption||'')+'"></label>'+
   '<label>Right photo<input class="diptych-file" data-side="rightUrl" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>'+
   '<label>Right photo URL<input data-field="rightUrl" type="url" value="'+esc(b.rightUrl||'')+'" placeholder="https://..."></label>'+
   '<label>Right caption<input data-field="rightCaption" value="'+esc(b.rightCaption||'')+'"></label>';
 }else if(kind==='affiliate'){
   fields='<p class="hint">Upload a photo, add a clickable description and paste your affiliate URL.</p>'+
    '<label>Product photo<input class="block-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>'+
    '<label>Photo URL<input data-field="url" type="url" value="'+esc(b.url||'')+'" placeholder="https://..."></label>'+
    '<label>Clickable description<textarea data-field="description" rows="3" placeholder="Discover the Tara dress by DEME by Gabriella">'+esc(b.description||'')+'</textarea></label>'+
    '<label>Affiliate link<input data-field="linkUrl" type="url" value="'+esc(b.linkUrl||'')+'" placeholder="https://www.awin1.com/cread.php?..."></label>'+
    '<p class="hint">The description appears underlined and opens the affiliate link. The photo is also clickable. Disclose affiliate links in the article.</p>';
 }else if(kind==='divider'){
  fields='';
 }else{
  fields=kind==='image'?'<label>Upload photo<input class="block-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><label>Image URL<input data-field="url" type="url" value="'+esc(b.url||'')+'" placeholder="https://..."></label><label>Caption (optional)<input data-field="caption" value="'+esc(b.caption||'')+'"></label>':'<label>Text<textarea data-field="text" rows="3">'+esc(b.text||'')+'</textarea></label>';
  fields+='<div class="block-options"><label>Align<select data-field="align">'+['left','center','right'].map(v=>'<option value="'+v+'" '+(b.align===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+(kind==='image'?'<label>Width<select data-field="width">'+['narrow','wide','full'].map(v=>'<option value="'+v+'" '+(b.width===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>':'<label>Text size<select data-field="size">'+['small','normal','large'].map(v=>'<option value="'+v+'" '+(b.size===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>')+'</div>';
 }
 return '<section class="block-edit" data-idx="'+i+'">'+top+fields+'</section>';
 }).join('');
 wrap.querySelectorAll('.block-edit').forEach(el=>{
  const i=Number(el.dataset.idx);
  el.querySelectorAll('[data-field]').forEach(inp=>inp.addEventListener('input',()=>{
   let val=inp.value;if(inp.type==='number')val=Number(val);
   blocks[i][inp.dataset.field]=val;updatePreview();
  }));
  el.querySelector('[data-remove]').onclick=()=>{
   const deleted=blocks[i];
   if(deleted.type==='image')blocks.filter(b=>b.type==='sticker'&&b.anchor===deleted.uid).forEach(b=>b.anchor='cover');
   blocks.splice(i,1);renderEditorBlocks();updatePreview();
  };
  for(const a of ['up','down'])el.querySelector('[data-move="'+a+'"]').onclick=()=>{
   const next=a==='up'?i-1:i+1;
   [blocks[i],blocks[next]]=[blocks[next],blocks[i]];
   renderEditorBlocks();updatePreview();
  };
  el.querySelectorAll('.diptych-file').forEach(input=>input.onchange=async()=>{
   const file=input.files?.[0];if(!file)return;
   input.disabled=true;msg('Uploading photo…');
   try{blocks[i][input.dataset.side]=await upload(file);msg('Photo uploaded.');renderEditorBlocks();updatePreview();}
   catch(e){msg('Upload failed: '+e.message);input.disabled=false;}
  });
  const fi=el.querySelector('.block-file');
  if(fi)fi.onchange=async()=>{
   const file=fi.files?.[0];if(!file)return;
   fi.disabled=true;msg('Uploading image…');
   try{blocks[i].url=await upload(file);msg('Image uploaded.');renderEditorBlocks();updatePreview();}
   catch(e){msg('Upload failed: '+e.message);fi.disabled=false;}
  };
 });
}

function updateCropPreview(){
 const src=coverUrl?cleanUrl(coverUrl):'';
 for(const id of ['crop-card-image','crop-feature-image']){
  const img=$(id),sample=img.parentElement;
  img.src=src||'';
  img.style.objectPosition=cropX+'% '+cropY+'%';
  sample.classList.toggle('no-cover',!src);
 }
 $('crop-x').value=cropX;$('crop-y').value=cropY;
 $('crop-x-output').textContent=cropX+'%';$('crop-y-output').textContent=cropY+'%';
}
for(const axis of ['x','y'])$('crop-'+axis).addEventListener('input',()=>{
 if(axis==='x')cropX=Number($('crop-x').value);else cropY=Number($('crop-y').value);
 updateCropPreview();
});
$('crop-reset').addEventListener('click',()=>{cropX=50;cropY=50;updateCropPreview()});
function updatePreview(){
 updateCropPreview();
 const title=$('post-title').value.trim()||'YOUR ARTICLE TITLE';
 const cover=$('cover-preview');
 if(coverUrl)cover.innerHTML='<img style="max-width:230px;max-height:180px" src="'+cleanUrl(coverUrl)+'" alt="Cover">';
 $('article-preview').innerHTML='<div class="article-kicker">'+esc(CATS.find(c=>c[0]===$('post-category').value)?.[1]||'')+'</div><h1 class="article-title">'+esc(title)+'</h1>'+renderCover(coverUrl,blocks,true)+'<p class="article-summary">'+esc($('post-excerpt').value.trim())+'</p><div class="article-content">'+renderBlocks(blocks,{interactive:true})+'</div>';
}
for(const id of ['post-title','post-excerpt','post-category'])$(id).addEventListener('input',updatePreview);
document.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>{
 const type=btn.dataset.add;
 if(type==='sticker'){
  const image=blocks.filter(b=>b.type==='image'&&b.url).at(-1);
  if(!image&&!coverUrl){msg('Add a cover photo or article photo first, then place tape on it.');return;}
  blocks.push({type:'sticker',stickerKind:'tape',anchor:image?.uid||'cover',x:80,y:9,scale:27,angle:-13,url:''});
 }else{
  blocks.push(type==='diptych'?{type:'diptych',leftUrl:'',rightUrl:'',leftCaption:'',rightCaption:''}:type==='affiliate'?{type:'affiliate',url:'',description:'',linkUrl:''}:{type,text:'',url:'',caption:'',align:'left',size:'normal',width:'wide',...(type==='image'?{uid:'image-'+crypto.randomUUID()}: {})});
 }
 renderEditorBlocks();updatePreview();msg('');
});
// Only stickers are draggable; photographs and text remain in normal reading order.
let dragging=null;
$('article-preview').addEventListener('pointerdown',event=>{
 const sticker=event.target.closest('[data-sticker-idx]');
 if(!sticker||event.button!==0)return;
 const stage=sticker.closest('.photo-stage');if(!stage)return;
 dragging={index:Number(sticker.dataset.stickerIdx),stage,sticker,pointer:event.pointerId};
 sticker.setPointerCapture(event.pointerId);event.preventDefault();
});
$('article-preview').addEventListener('pointermove',event=>{
 if(!dragging||dragging.pointer!==event.pointerId)return;
 const {stage,sticker,index}=dragging,rect=stage.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 const x=Math.min(105,Math.max(-5,100*(event.clientX-rect.left)/rect.width));
 const y=Math.min(105,Math.max(-5,100*(event.clientY-rect.top)/rect.height));
 blocks[index].x=Math.round(x*10)/10;blocks[index].y=Math.round(y*10)/10;
 sticker.style.left=x+'%';sticker.style.top=y+'%';
});
function finishDrag(event){
 if(!dragging||dragging.pointer!==event.pointerId)return;
 dragging=null;
}
$('article-preview').addEventListener('pointerup',finishDrag);
$('article-preview').addEventListener('pointercancel',finishDrag);
$('article-preview').addEventListener('keydown',event=>{
 const sticker=event.target.closest('[data-sticker-idx]');if(!sticker)return;
 const b=blocks[Number(sticker.dataset.stickerIdx)],delta=event.shiftKey?5:1;
 if(event.key==='ArrowLeft')b.x=Math.max(-5,(b.x??80)-delta);
 else if(event.key==='ArrowRight')b.x=Math.min(105,(b.x??80)+delta);
 else if(event.key==='ArrowUp')b.y=Math.max(-5,(b.y??9)-delta);
 else if(event.key==='ArrowDown')b.y=Math.min(105,(b.y??9)+delta);
 else return;
 event.preventDefault();sticker.style.left=b.x+'%';sticker.style.top=b.y+'%';
});
$('post-cover-file').addEventListener('change',async()=>{
 const input=$('post-cover-file'),file=input.files?.[0];if(!file)return;
 msg('Uploading cover photo…');input.disabled=true;
 try{coverUrl=await upload(file);input.value='';renderEditorBlocks();updatePreview();msg('Cover photo uploaded.');}
 catch(error){msg('Cover upload failed: '+error.message);}
 finally{input.disabled=false;}
});
async function upload(file){if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Only JPG, PNG, WebP or GIF images are supported.');if(file.size>8*1024*1024)throw new Error('Maximum image size: 8 MB.');const extension=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];const filename=crypto.randomUUID()+'.'+extension;const {error}=await db.storage.from('media').upload('uploads/'+filename,file,{contentType:file.type,upsert:false});if(error)throw error;const {data}=db.storage.from('media').getPublicUrl('uploads/'+filename);return data.publicUrl}
$('post-form').addEventListener('submit',async e=>{e.preventDefault();msg('Saving article…');$('save-post').disabled=true;try{const file=$('post-cover-file').files?.[0];if(file)coverUrl=await upload(file);const title=$('post-title').value.trim();if(!title)throw Error('Add a title.');const status=$('post-status').value;const slugInput=slug($('post-slug').value||title);if(!slugInput)throw Error('Please enter a valid URL slug.');const prior=rows.find(p=>p.id===currentId);const row={title,slug:slugInput,excerpt:$('post-excerpt').value.trim(),category:$('post-category').value,status,featured:$('post-featured').checked,cover_url:coverUrl||null,blocks:[...blocks.filter(b=>b.type!=='cover-crop'),{type:'cover-crop',x:cropX,y:cropY}],published_at:status==='published'?(prior?.published_at||new Date().toISOString()):null};const op=currentId?db.from('posts').update(row).eq('id',currentId):db.from('posts').insert(row);const {error}=await op;if(error)throw error;msg('Saved successfully.');await loadPosts();pane('posts')}catch(err){msg('Could not save: '+err.message)}finally{$('save-post').disabled=false}});
$('delete-post').addEventListener('click',async()=>{if(!currentId||!confirm('Delete this article permanently?'))return;const {error}=await db.from('posts').delete().eq('id',currentId);if(error){msg(error.message);return;}await loadPosts();pane('posts')});
async function loadSettings(){const {data,error}=await db.from('site_settings').select('key,value');if(error){msg(error.message);return;}savedSettings=Object.fromEntries((data||[]).map(r=>[r.key,r.value]));for(const key of ['intro','about','instagram','tiktok','pinterest','email'])$('setting-'+key).value=savedSettings[key]||''}
$('settings-form').addEventListener('submit',async e=>{e.preventDefault();const keys=['intro','about','instagram','tiktok','pinterest','email'];let data=keys.map(key=>({key,value:$('setting-'+key).value.trim()}));const {error}=await db.from('site_settings').upsert(data,{onConflict:'key'});msg(error?'Unable to save settings: '+error.message:'Homepage settings saved.');});
try{await checkEditor();}catch(error){$('auth-msg').textContent='Could not check editor session: '+(error?.message||String(error));}
})();
