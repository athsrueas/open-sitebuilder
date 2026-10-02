import { escapeHtml as esc } from '/shared/render.js';
import { editText, resizeImage, assignArtwork } from '/ui/canvas-model.js';
const $ = s => document.querySelector(s);
const id = () => crypto.randomUUID().replaceAll('-','');
const types = {hero:['◒','Introduction'],image:['▧','Image'],gallery:['▦','Gallery'],carousel:['↔','Carousel'],text:['T','Text'],sketchbook:['▤','Sketchbook'],divider:['―','Divider']};
let project, pageId, blockId, tab='pages', saveTimer, cleanupTimer, saveQueue=Promise.resolve(), revision=0;
const page = () => project.pages.find(p=>p.id===pageId);
const block = () => page().blocks.find(b=>b.id===blockId);
async function api(path, value, extra={}) {
  const response = await fetch('/api/'+path, value===undefined ? {} : {method:'POST',headers:{'X-Folio-Token':$('meta[name=folio-token]').content,'Content-Type':'application/json',...extra},body:value instanceof Blob ? value : JSON.stringify(value)});
  const data = await response.json();
  if(!response.ok) throw new Error(data.error || 'Operation failed');
  return data;
}
function toast(message){ $('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(cleanupTimer);cleanupTimer=setTimeout(()=>$('#toast').style.display='none',5000); }
function preview(focus=false){if(!project)return;$('#preview').contentWindow.postMessage({type:'render',project,pageId,blockId,focus},location.origin);$('#page-label').textContent=page().title;}
function changed(repaint=false,focus=false,inline=false){revision++;$('#save-status').textContent='Unsaved changes';clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(e=>toast(e.message)),650);if(repaint)render();if(!inline)preview(focus);}
function save(){
  clearTimeout(saveTimer);const snapshot=structuredClone(project), version=revision;
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{ $('#save-status').textContent='Saving…';try{await api('project',snapshot);if(revision===version)$('#save-status').textContent='All changes saved';}catch(e){$('#save-status').textContent='Save failed';throw e;} });return saveQueue;
}
function makeBlock(type){return {id:id(),type,title:type==='hero'?'Introduction':types[type][1],label:'',text:'',images:[],spreads:type==='sketchbook'?Array.from({length:4},(_,i)=>({id:id(),image:'',title:i===0?'Sketchbook':'',caption:'',background:'#faf7ef',fit:'contain',hard:i===0||i===3})):[],fit:'contain'};}
function render(){renderLeft();renderInspector();$('#artist-name').textContent=project.name;}
function renderLeft(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  if(tab==='pages'){
    $('#left-content').innerHTML=`${project.pages.map((p,i)=>`<div class="page-item ${p.id===pageId?'active':''}"><button data-select-page="${p.id}">▱ &nbsp; ${esc(p.title)} ${i===0?'<small>HOME</small>':''}</button></div>`).join('')}<button id="add-page" class="wide-button">+ New page</button><label>Page title<input id="page-title" value="${esc(page().title)}"></label><label>Page URL<input id="page-slug" value="${esc(page().slug)}"></label><p class="small-note">The first page is your homepage.</p><div class="settings-row"><button id="page-up" ${project.pages.indexOf(page())===0?'disabled':''}>Move earlier</button><button id="remove-page" class="danger" ${project.pages.length===1?'disabled':''}>Delete page</button></div><div class="section-title">ON THIS PAGE <span>${page().blocks.length} BLOCKS</span></div><div id="block-list">${page().blocks.map(b=>`<div draggable="true" data-block-id="${b.id}" class="block-item ${b.id===blockId?'selected':''}"><span class="drag-grip">⠿</span><span class="block-symbol">${types[b.type][0]}</span><span class="block-title">${esc(b.title || types[b.type][1])}<small>${types[b.type][1]}</small></span><button class="icon-button" data-block-up="${b.id}" aria-label="Move block earlier">↑</button><button class="icon-button" data-block-down="${b.id}" aria-label="Move block later">↓</button></div>`).join('')}</div><div class="section-title">ADD A BLOCK</div><div class="palette">${Object.entries(types).map(([type,[icon,name]])=>`<button draggable="true" data-add="${type}"><span>${icon}</span>${name}</button>`).join('')}</div><p class="small-note">Drag a block by its dotted handle to reorder it. Drag a tile below onto the live preview to add it there.</p>`;
    document.querySelectorAll('[data-select-page]').forEach(b=>b.onclick=()=>{pageId=b.dataset.selectPage;blockId=page().blocks[0]?.id;render();preview();});
    $('#add-page').onclick=()=>{const n=project.pages.length+1;const p={id:id(),title:'New page '+n,slug:'page-'+id().slice(0,8),blocks:[makeBlock('hero')]};project.pages.push(p);pageId=p.id;blockId=p.blocks[0].id;changed(true);};
    $('#page-title').oninput=e=>{page().title=e.target.value;changed();};
    $('#page-title').onchange=()=>{const button=document.querySelector(`[data-select-page="${pageId}"]`);button.innerHTML=`▱ &nbsp; ${esc(page().title)} ${project.pages[0].id===pageId?'<small>HOME</small>':''}`;};
    $('#page-slug').onchange=e=>{const slug=e.target.value.trim();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||['media','_astro'].includes(slug)||project.pages.some(p=>p.id!==pageId&&p.slug===slug)){toast('Choose a unique URL using lowercase words and hyphens.');e.target.value=page().slug;return;}page().slug=slug;changed();};
    $('#page-up').onclick=()=>{const i=project.pages.indexOf(page());if(i>0){[project.pages[i-1],project.pages[i]]=[project.pages[i],project.pages[i-1]];changed(true);}};
    $('#remove-page').onclick=()=>{if(project.pages.length>1&&confirm('Delete this page and its blocks?')){project.pages=project.pages.filter(p=>p.id!==pageId);pageId=project.pages[0].id;blockId=page().blocks[0]?.id;changed(true);}};
    document.querySelectorAll('[data-add]').forEach(b=>{b.onclick=()=>addBlock(b.dataset.add);b.ondragstart=e=>{e.dataTransfer.effectAllowed='copyMove';e.dataTransfer.setData('text/plain','new:'+b.dataset.add);};});
    document.querySelectorAll('[data-block-id]').forEach(el=>{
      el.onclick=()=>{blockId=el.dataset.blockId;render();preview(true);};
      el.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','block:'+el.dataset.blockId);};
      el.ondragover=e=>{e.preventDefault();el.classList.add('drop-target');};el.ondragleave=()=>el.classList.remove('drop-target');
      el.ondrop=e=>{e.preventDefault();e.stopPropagation();dropBlock(e.dataTransfer.getData('text/plain'),page().blocks.findIndex(b=>b.id===el.dataset.blockId));};
    });
    document.querySelectorAll('[data-block-up],[data-block-down]').forEach(button=>button.onclick=e=>{e.stopPropagation();const uid=button.dataset.blockUp||button.dataset.blockDown;const i=page().blocks.findIndex(b=>b.id===uid),j=i+(button.dataset.blockUp?-1:1);if(j>=0&&j<page().blocks.length){[page().blocks[i],page().blocks[j]]=[page().blocks[j],page().blocks[i]];changed(true);}});
    $('#block-list').ondragover=e=>e.preventDefault();$('#block-list').ondrop=e=>{e.preventDefault();dropBlock(e.dataTransfer.getData('text/plain'),page().blocks.length);};
  } else if(tab==='theme'){
    $('#left-content').innerHTML=`<div class="section-title">COLORS</div><label>Palette<select id="preset"><option value="">Choose a palette</option><option value="paper">Paper</option><option value="night">Dark</option><option value="white">White</option></select></label>${['background','ink','accent'].map(k=>`<label>${k[0].toUpperCase()+k.slice(1)}<input type="color" data-theme="${k}" value="${project.theme[k]}"></label>`).join('')}<div class="section-title">LAYOUT</div>${[['serif','Serif font'],['spacious','Extra spacing'],['wide','Wide page layout'],['rounded','Rounded image corners']].map(([k,label])=>`<label class="check"><input type="checkbox" data-theme="${k}" ${project.theme[k]?'checked':''}>${label}</label>`).join('')}<p class="muted">These controls change the generated CSS. Your preview and exported site use the same renderer.</p>`;
    document.querySelectorAll('[data-theme]').forEach(el=>el.oninput=()=>{project.theme[el.dataset.theme]=el.type==='checkbox'?el.checked:el.value;changed();});
    $('#preset').onchange=e=>{const presets={paper:['#f5f1e9','#292d29','#798269'],night:['#20241f','#ede9df','#c4b38a'],white:['#ffffff','#252525','#a36f51']};const values=presets[e.target.value];if(values){['background','ink','accent'].forEach((k,i)=>project.theme[k]=values[i]);changed(true);}};
  } else {
    $('#left-content').innerHTML=`<div class="upload-zone" id="upload-zone"><strong>＋</strong>Drop your artwork here<br><br>or click to choose images<input type="file" id="files" multiple accept="image/jpeg,image/png,image/webp" hidden></div><p class="small-note">JPEG, PNG & WebP · up to 60 MB each.<br>Originals stay local. Web copies up to 5,000 px.</p><div class="asset-grid">${project.assets.map(a=>`<div class="asset-card" draggable="true" data-asset-id="${a.id}"><img draggable="false" src="${a.src}" alt="${esc(a.alt)}"><span>${esc(a.name)}</span><small>${a.width} × ${a.height}</small><label style="margin:8px">Alt text<input data-alt="${a.id}" value="${esc(a.alt)}" placeholder="Describe the artwork"></label></div>`).join('')}</div>`;
    document.querySelectorAll('[data-asset-id]').forEach(el=>el.ondragstart=e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','asset:'+el.dataset.assetId);});
    document.querySelectorAll('[data-alt]').forEach(el=>el.oninput=()=>{project.assets.find(a=>a.id===el.dataset.alt).alt=el.value;changed();});
    const zone=$('#upload-zone');zone.onclick=()=>$('#files').click();$('#files').onclick=e=>e.stopPropagation();$('#files').onchange=e=>upload(e.target.files);
    zone.ondragover=e=>{e.preventDefault();zone.classList.add('drop-target');};zone.ondragleave=()=>zone.classList.remove('drop-target');zone.ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files);};
  }
}
function addBlock(type,index=page().blocks.length){const b=makeBlock(type);page().blocks.splice(index,0,b);blockId=b.id;changed(true,true);}
function dropBlock(value,target){if(value.startsWith('new:')&&types[value.slice(4)])return addBlock(value.slice(4),target);if(value.startsWith('block:')){const from=page().blocks.findIndex(b=>b.id===value.slice(6));if(from<0)return;const [b]=page().blocks.splice(from,1);page().blocks.splice(target>from?target-1:target,0,b);blockId=b.id;changed(true,true);}}
function imageSelect(selected, attr){return `<select ${attr}><option value="">Choose artwork…</option>${project.assets.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`;}
function renderInspector(){
  const b=block();if(!b){$('#inspector').innerHTML='<div class="empty-state">Select a block to edit its settings.</div>';return;}
  $('#inspector').innerHTML=`<h2>${types[b.type][1]}</h2><span class="inspector-type">${types[b.type][0]} &nbsp; ${types[b.type][1]} BLOCK</span>${b.type!=='divider'?`<label>Title<input data-field="title" value="${esc(b.title)}"></label><label>Small heading<input data-field="label" value="${esc(b.label)}" placeholder="e.g. From the studio"></label>`:''}${['hero','text','image'].includes(b.type)?`<label>${b.type==='image'?'Caption':'Text'}<textarea data-field="text" rows="5">${esc(b.text)}</textarea></label>`:''}${['image','gallery','carousel'].includes(b.type)?`<label>Image fit<select data-field="fit"><option value="contain" ${b.fit==='contain'?'selected':''}>Show the entire artwork</option><option value="cover" ${b.fit==='cover'?'selected':''}>Fill the frame (crop)</option></select></label><div class="section-title">ARTWORK <button id="go-assets" class="icon-button">Upload ↗</button></div>${b.type==='image'?imageSelect(b.images[0],'id="single-image"'):`<p class="small-note">Click images to add them in selection order. Click a selected image to remove it.</p><div class="asset-grid">${project.assets.map(a=>`<button data-image="${a.id}" class="asset-card ${b.images.includes(a.id)?'selected':''}"><img src="${a.src}" alt="${esc(a.alt)}"><span>${b.images.includes(a.id)?(b.images.indexOf(a.id)+1)+'. ':''}${esc(a.name)}</span></button>`).join('')}</div>`}`:''}${b.type==='sketchbook'?`<div class="section-title">SKETCHBOOK PAGES <button id="go-assets" class="icon-button">Upload ↗</button></div><p class="small-note">Each page has its own artwork, caption, paper color, and cover setting. Two or more pages are needed to flip.</p>${b.spreads.map((s,i)=>`<div class="spread-item"><div class="spread-heading"><strong>Page ${i+1}</strong><button class="icon-button" data-spread-up="${i}" ${i===0?'disabled':''} aria-label="Move page earlier">↑</button><button class="icon-button" data-spread-down="${i}" ${i===b.spreads.length-1?'disabled':''} aria-label="Move page later">↓</button><button class="icon-button danger" data-spread-delete="${i}" aria-label="Delete sketchbook page">×</button></div><label>Artwork${imageSelect(s.image,`data-spread="${i}" data-key="image"`)}</label><label>Title<input data-spread="${i}" data-key="title" value="${esc(s.title)}"></label><label>Caption<textarea data-spread="${i}" data-key="caption" rows="2">${esc(s.caption)}</textarea></label><label>Paper color<input type="color" data-spread="${i}" data-key="background" value="${s.background}"></label><label>Image fit<select data-spread="${i}" data-key="fit"><option value="contain" ${s.fit==='contain'?'selected':''}>Entire artwork</option><option value="cover" ${s.fit==='cover'?'selected':''}>Fill the frame</option></select></label><label class="check"><input type="checkbox" data-spread="${i}" data-key="hard" ${s.hard?'checked':''}>Hard cover page</label></div>`).join('')}<button class="wide-button" id="add-spread">+ Add sketchbook page</button>`:''}<div class="inspector-actions"><button id="duplicate">Duplicate</button><button id="delete-block" class="danger">Delete block</button></div>`;
  document.querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{b[el.dataset.field]=el.value;changed();});
  $('#go-assets')?.addEventListener('click',()=>{tab='assets';renderLeft();});
  $('#single-image')?.addEventListener('change',e=>{b.images=e.target.value?[e.target.value]:[];changed();});
  document.querySelectorAll('[data-image]').forEach(el=>el.onclick=()=>{const uid=el.dataset.image;b.images=b.images.includes(uid)?b.images.filter(i=>i!==uid):[...b.images,uid];changed();renderInspector();});
  document.querySelectorAll('[data-spread]').forEach(el=>el.oninput=()=>{b.spreads[+el.dataset.spread][el.dataset.key]=el.type==='checkbox'?el.checked:el.value;changed();});
  document.querySelectorAll('[data-spread-up],[data-spread-down],[data-spread-delete]').forEach(el=>el.onclick=()=>{const i=+(el.dataset.spreadUp??el.dataset.spreadDown??el.dataset.spreadDelete);if(el.dataset.spreadDelete!==undefined)b.spreads.splice(i,1);else{const j=i+(el.dataset.spreadUp!==undefined?-1:1);[b.spreads[i],b.spreads[j]]=[b.spreads[j],b.spreads[i]];}changed();renderInspector();});
  $('#add-spread')?.addEventListener('click',()=>{b.spreads.push({id:id(),image:'',title:'',caption:'',background:'#faf7ef',hard:false,fit:'contain'});changed();renderInspector();});
  $('#duplicate').onclick=()=>{const clone=structuredClone(b);clone.id=id();clone.spreads.forEach(s=>s.id=id());page().blocks.splice(page().blocks.indexOf(b)+1,0,clone);blockId=clone.id;changed(true);};
  $('#delete-block').onclick=()=>{page().blocks=page().blocks.filter(item=>item.id!==b.id);blockId=page().blocks[0]?.id;changed(true);};
}
async function upload(files){
  for(const file of files){try{toast('Preparing '+file.name+'…');const asset=await api('upload',file,{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)});project.assets.push(asset);changed();}catch(e){toast(e.message);}}
  render();toast('Image import finished. Select a block to use your artwork.');
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderLeft();});
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==$('#preview').contentWindow)return;
  const d=e.data;
  if(d.type==='ready'){preview();return;}
  if(d.type==='preview-error'){toast(d.message);return;}
  if(!project)return;
  if(d.type==='project-inline-edit'&&['name','description'].includes(d.field)&&typeof d.value==='string'&&d.value.length<=5000){project[d.field]=d.value;changed(false,false,true);$('#artist-name').textContent=project.name;}
  const b=page().blocks.find(b=>b.id===d.blockId);
  if(d.type==='select-block'&&b){blockId=b.id;render();preview();}
  if(d.type==='inline-edit'&&b&&editText(b,d.spreadId,d.field,d.value)){
    blockId=b.id;changed(false,false,true);renderLeft();renderInspector();
  }
  if(d.type==='edit-end')preview();
  if(d.type==='resize-image'&&b&&resizeImage(b,d.width,d.height))changed(true);
  if(d.type==='block-action'&&b){
    blockId=b.id;
    const i=page().blocks.indexOf(b);
    if(d.action==='up'&&i>0)[page().blocks[i-1],page().blocks[i]]=[b,page().blocks[i-1]];
    if(d.action==='down'&&i<page().blocks.length-1)[page().blocks[i+1],page().blocks[i]]=[b,page().blocks[i+1]];
    if(d.action==='duplicate'){const clone=structuredClone(b);clone.id=id();clone.spreads.forEach(s=>s.id=id());page().blocks.splice(i+1,0,clone);blockId=clone.id;}
    if(d.action==='fit'){const spread=b.spreads.find(s=>s.id===d.spreadId);const item=spread||b;item.fit=item.fit==='cover'?'contain':'cover';}
    changed(true,true);
  }
  if(d.type==='add-block'&&types[d.blockType])addBlock(d.blockType);
  if(d.type==='drop-block'){const target=d.beforeId===null?page().blocks.length:page().blocks.findIndex(b=>b.id===d.beforeId);if(target>=0)dropBlock(String(d.value),target);}
  if(d.type==='drop-artwork')canvasArtwork(d).catch(err=>toast(err.message));
  if(d.type==='navigate'&&project.pages.some(p=>p.id===d.pageId)){pageId=d.pageId;blockId=page().blocks[0]?.id;render();preview();}
});
async function canvasArtwork(d){
  // Capture the destination before upload; switching pages must not redirect photos.
  const destination=page();
  let target=destination.blocks.find(b=>b.id===d.blockId);
  const ids=[];
  if(d.assetId&&project.assets.some(a=>a.id===d.assetId))ids.push(d.assetId);
  for(const file of d.files||[]){
    if(!(file instanceof Blob))continue;
    try{toast('Preparing '+file.name+'…');const asset=await api('upload',file,{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name)});project.assets.push(asset);ids.push(asset.id);}
    catch(err){toast(err.message);}
  }
  if(!ids.length)return;
  if(!target||!['image','gallery','carousel','sketchbook'].includes(target.type)){
    target=makeBlock(ids.length>1?'gallery':'image');
    const index=d.beforeId===null?destination.blocks.length:destination.blocks.findIndex(b=>b.id===d.beforeId);
    destination.blocks.splice(index<0?destination.blocks.length:index,0,target);
  }
  assignArtwork(target,ids,d.spreadId||target.spreads[0]?.id);
  if(pageId===destination.id)blockId=target.id;
  changed(true,true);toast('Artwork added.');
}
$('#details').onclick=()=>{const expanded=document.querySelector('.workspace').classList.toggle('show-details');$('#details').setAttribute('aria-expanded',String(expanded));};
$('#desktop').onclick=()=>{ $('#preview').classList.remove('mobile');$('#desktop').classList.add('active');$('#mobile').classList.remove('active');};
$('#mobile').onclick=()=>{ $('#preview').classList.add('mobile');$('#mobile').classList.add('active');$('#desktop').classList.remove('active');};
$('#preview').addEventListener('load',()=>preview());
$('#refresh').onclick=()=>{ $('#preview').src='/ui/preview.html?refresh='+Date.now(); };
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$('#settings').onclick=async()=>{try{const c=await api('config'),form=$('#settings-form');for(const key of ['name','description'])form.elements[key].value=project[key];for(const key of ['accountId','projectName'])form.elements[key].value=c[key];form.elements.token.value='';form.elements.token.placeholder=c.hasToken?'Token is already set; leave blank to keep it':'Saved locally in .env';$('#settings-dialog').showModal();}catch(e){toast(e.message);}};
$('#settings-form').onsubmit=async e=>{e.preventDefault();try{const fields=Object.fromEntries(new FormData(e.target));await api('config',fields);project.name=fields.name;project.description=fields.description;changed(true);await save();e.target.elements.token.value='';$('#settings-dialog').close();toast('Settings saved.');}catch(err){toast(err.message);}};
async function runJob(action){try{await save();await api(action,{});$('#job-title').textContent=action==='publish'?'Publishing your portfolio':'Building your portfolio';$('#job-message').textContent='Preparing your site…';$('#job-link').hidden=true;$('#job-dialog').showModal();pollJob();}catch(e){toast(e.message);}}
async function pollJob(){try{const job=await api('job');$('#job-message').textContent=job.message;if(job.state==='running'){setTimeout(pollJob,1000);return;}$('#job-title').textContent=job.state==='error'?'Something needs attention':job.url?.startsWith('https:')?'Your portfolio is live':'Your build is ready';if(job.url){$('#job-link').href=job.url;$('#job-link').hidden=false;}}catch(e){$('#job-message').textContent=e.message;}}
$('#build').onclick=()=>runJob('build');$('#publish').onclick=()=>runJob('publish');
$('#stop-studio').onclick=async()=>{try{await save();await api('shutdown',{});$('#settings-dialog').close();$('#save-status').textContent='Studio closed';toast('The studio has stopped. Use the desktop shortcut to open it again.');}catch(e){toast(e.message);}};
window.addEventListener('beforeunload',e=>{if($('#save-status').textContent!=='All changes saved'){e.preventDefault();e.returnValue='';}});
try{project=await api('project');pageId=project.pages[0].id;blockId=page().blocks[0]?.id;render();preview();$('#save-status').textContent='All changes saved';}catch(e){toast(e.message);}
