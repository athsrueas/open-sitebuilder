import { portfolioMarkup, initPortfolio } from '/shared/render.js';

// Keep unchanged sketchbooks mounted while editing surrounding text.
const root = document.querySelector('#portfolio');
let sections = new Map();
let selectedBlockId;
let pendingRender;
let uploadTarget={};
const editorStyle = document.createElement('style');
editorStyle.textContent = `
  .folio-block{position:relative;scroll-margin-top:30px;cursor:pointer}
  .folio-block.is-selected{outline:2px solid #798269;outline-offset:12px}
  .folio-block.is-selected::before{content:'Editing this block';position:absolute;top:-28px;left:0;background:#354d37;color:white;font:10px Arial,sans-serif;padding:5px 8px;border-radius:4px}
  #drop-marker{position:fixed;height:4px;background:#607b46;z-index:9999;pointer-events:none;display:none}
  #drop-marker::before{content:'Drop block here';position:absolute;top:-25px;left:0;background:#354d37;color:#fff;font:11px Arial,sans-serif;padding:5px 10px;border-radius:4px}
`;
editorStyle.textContent += `
  .folio-block.is-selected::before{display:none}
  [contenteditable]{cursor:text;outline:none;min-height:1.2em;white-space:pre-wrap}
  [contenteditable]:hover{outline:1px dashed #798269;outline-offset:4px}
  [contenteditable]:focus{outline:2px solid #798269;outline-offset:5px}
  [contenteditable]:empty::after{content:attr(data-placeholder);opacity:.45}
  .canvas-tools{position:sticky;top:0;z-index:10000;background:#fcfdfb;border-bottom:1px solid #dce2d2;padding:10px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font:12px Arial,sans-serif;color:#354d37}
  .canvas-tools span{margin-right:auto;color:#798269;font-size:11px}
  .editor-chrome{font:11px Arial,sans-serif;color:#354d37;letter-spacing:0;text-transform:none}
  .editor-chrome button,.canvas-tools button{font:11px Arial,sans-serif;color:#354d37;background:#fcfdfb;border:1px solid #c8d2be;padding:7px 9px;border-radius:5px;cursor:pointer}
  .block-tools{display:flex;gap:5px;align-items:center;background:#f7f9f2;padding:6px;border:1px solid #c8d2be;border-radius:6px;width:fit-content;margin-bottom:14px;position:relative;z-index:10}
  .folio-block:not(.is-selected):not(:hover):not(:focus-within)>.block-tools{opacity:.25}
  .block-tools .grip{cursor:grab}
  .image-drop{outline:3px dashed #607b46!important;background:#e1ead7!important}
  .image-size{display:flex;gap:15px;align-items:center;flex-wrap:wrap;margin-top:12px}
  .image-size label{display:flex;gap:6px;align-items:center}.image-size input{width:100px}
  .single-image{position:relative;min-height:120px}.single-image>.resize-grip{position:absolute;right:-9px;bottom:-9px;width:20px;height:20px;border:2px solid white;border-radius:4px;background:#354d37;cursor:nwse-resize;touch-action:none;z-index:20}
  .book-page [contenteditable]{position:relative;z-index:5}
  .book-page>.page-photo{position:absolute;top:7px;right:7px;z-index:6}
`;
document.head.append(editorStyle);
const tools=document.createElement('div');
tools.className='canvas-tools';
tools.innerHTML='<span>Click text to write · Drop photos anywhere</span><button data-create="text">+ Text</button><button data-create="image">+ Image</button><button data-create="gallery">+ Gallery</button><button data-create="sketchbook">+ Sketchbook</button><button data-photos>Add photos</button>';
document.body.prepend(tools);
const picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='image/jpeg,image/png,image/webp';picker.hidden=true;document.body.append(picker);
tools.addEventListener('click',e=>{if(e.target.dataset.create)send({type:'add-block',blockType:e.target.dataset.create});if(e.target.hasAttribute('data-photos'))choosePhotos({});});
function choosePhotos(target){uploadTarget=target;picker.click();}
picker.onchange=()=>{send({type:'drop-artwork',...uploadTarget,files:[...picker.files],beforeId:null});picker.value='';};

const marker = document.createElement('div');
marker.id = 'drop-marker';
document.body.append(marker);
const send = data => parent.postMessage(data, location.origin);

function render(data) {
  if(root.contains(document.activeElement)&&document.activeElement.isContentEditable){pendingRender=data;return;}
  pendingRender=null;
  const scroll = window.scrollY;
  const markup = portfolioMarkup(data.project, data.pageId);
  const container = document.createElement('div');
  container.innerHTML = markup.html;
  const page = data.project.pages.find(p => p.id === data.pageId);
  const next = new Map();
  for (const b of page.blocks) {
    const signature = JSON.stringify({block:b, assets:data.project.assets});
    const old = sections.get(b.id);
    const fresh = container.querySelector(`[data-block="${b.id}"]`);
    if (old?.signature === signature) {
      fresh.replaceWith(old.node);
      next.set(b.id, old);
    } else {
      const index=Number(old?.node.querySelector('[data-count]')?.textContent.split(' / ')[0])-1;
      if(Number.isFinite(index)&&fresh.querySelector('[data-book]'))fresh.querySelector('[data-book]').dataset.startPage=String(index);
      old?.cleanup?.();
      next.set(b.id, {signature, node:fresh});
    }
  }
  for (const [id, old] of sections) if (!next.has(id)) old.cleanup?.();
  const style = document.createElement('style');
  style.textContent = markup.css;
  root.replaceChildren(style, container);
  decorate(container, page);
  for (const item of next.values()) {
    if (!item.cleanup) item.cleanup = initPortfolio(item.node, window.St?.PageFlip);
  }
  sections = next;
  root.querySelectorAll('[data-page]').forEach(a => a.onclick = e => {
    e.preventDefault();send({type:'navigate', pageId:a.dataset.page});
  });
  selectedBlockId = data.blockId;
  root.querySelectorAll('[data-block]').forEach(el => el.classList.toggle('is-selected', el.dataset.block === selectedBlockId));
  const selected = root.querySelector(`[data-block="${selectedBlockId}"]`);
  if (data.focus && selected) selected.scrollIntoView({block:'start'});
  else window.scrollTo(0, scroll);
}

window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== parent) return;
  if (e.data.type === 'render') {
    try { render(e.data); }
    catch (error) { console.error(error);send({type:'preview-error', message:'The preview could not update. Use Refresh preview to retry.'}); }
  }
});
root.addEventListener('click', e => {
  if (e.target.closest('nav, .book-controls, .book-page, .editor-chrome, [contenteditable]')) return;
  const section = e.target.closest('[data-block]');
  if (section) {
    e.preventDefault();send({type:'select-block', blockId:section.dataset.block});
  }
});

function insertionPoint(y) {
  return [...root.querySelectorAll('[data-block]')].find(el => {
    const r = el.getBoundingClientRect();return y < r.top + r.height / 2;
  });
}
function clearDrop(){marker.style.display='none';root.querySelectorAll('.image-drop').forEach(el=>el.classList.remove('image-drop'));}
function dropDestination(e){
  const section=e.target.closest('[data-block]');
  const spread=e.target.closest('[data-spread-id]');
  return {blockId:section?.dataset.block,spreadId:spread?.dataset.spreadId,beforeId:insertionPoint(e.clientY)?.dataset.block??null};
}
document.addEventListener('dragover', e => {
  if(![...e.dataTransfer.types].some(t=>t==='text/plain'||t==='Files'))return;
  e.preventDefault();clearDrop();
  const section=e.target.closest('[data-block]');
  if([...e.dataTransfer.types].includes('Files')&&section?.querySelector('.single-image,.gallery,.carousel,.book')){
    (e.target.closest('[data-spread-id]')||section).classList.add('image-drop');return;
  }
  const next=insertionPoint(e.clientY), main=root.querySelector('main');
  if(!main)return;
  const rect=main.getBoundingClientRect(),last=main.lastElementChild?.getBoundingClientRect();
  marker.style.cssText=`display:block;left:${rect.left+20}px;width:${Math.max(0,rect.width-40)}px;top:${Math.max(40,Math.min(window.innerHeight-10,next?.getBoundingClientRect().top??last?.bottom??rect.top))}px`;
});
document.addEventListener('drop',e=>{
  e.preventDefault();clearDrop();
  const destination=dropDestination(e), value=e.dataTransfer.getData('text/plain');
  if(value.startsWith('asset:'))send({type:'drop-artwork',...destination,assetId:value.slice(6)});
  else if(e.dataTransfer.files.length)send({type:'drop-artwork',...destination,files:[...e.dataTransfer.files]});
  else send({type:'drop-block',value,beforeId:destination.beforeId});
});
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)clearDrop();});
document.addEventListener('dragend',clearDrop);

function decorate(container,page){
  container.querySelectorAll('[data-project-edit]').forEach(el=>{el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',el.dataset.projectEdit==='name'?'Artist name on page':'Portfolio description on page');});
  for(const b of page.blocks){
    const section=container.querySelector(`[data-block="${b.id}"]`);
    if(section.querySelector(':scope > .block-tools'))continue;
    const toolbar=document.createElement('div');toolbar.className='editor-chrome block-tools';
    toolbar.innerHTML='<button class="grip" draggable="true" aria-label="Drag block">⠿</button><button data-action="up" aria-label="Move block up">↑</button><button data-action="down" aria-label="Move block down">↓</button><button data-action="duplicate">Duplicate</button>';
    toolbar.querySelector('.grip').ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','block:'+b.id);};
    toolbar.onclick=e=>{if(e.target.dataset.action)send({type:'block-action',blockId:b.id,action:e.target.dataset.action});};
    if(['image','gallery','carousel'].includes(b.type)){
      const photo=document.createElement('button');photo.textContent=b.type==='image'?'Replace photo':'Add photos';photo.onclick=()=>choosePhotos({blockId:b.id});toolbar.append(photo);
      const fit=document.createElement('button');fit.textContent=b.fit==='cover'?'Show whole photo':'Crop to fill';fit.onclick=()=>send({type:'block-action',blockId:b.id,action:'fit'});toolbar.append(fit);
    }
    section.prepend(toolbar);
    section.querySelectorAll('[data-edit]').forEach(el=>{
      el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',`${el.dataset.edit==='text'?'Text':el.dataset.edit==='caption'?'Caption':el.dataset.edit==='label'?'Small heading':'Title'} on page`);
      el.dataset.placeholder=el.dataset.edit==='label'?'Add a small heading…':el.dataset.edit==='text'||el.dataset.edit==='caption'?'Write here…':'Add a title…';
      el.spellcheck=true;
    });
    section.querySelectorAll('[data-spread-id]').forEach(el=>{
      const photo=document.createElement('button');photo.className='editor-chrome page-photo';photo.textContent='Add / replace photo';photo.setAttribute('aria-label','Replace photo on sketchbook page');
      photo.onclick=e=>{e.stopPropagation();choosePhotos({blockId:b.id,spreadId:el.dataset.spreadId});};el.append(photo);
    });
    if(b.type==='image')addResize(section,b);
  }
}
root.addEventListener('focusin',e=>{
  if(!e.target.matches('[contenteditable]'))return;
  e.target.dataset.original=e.target.innerText;
  selectedBlockId=e.target.closest('[data-block]')?.dataset.block;
  root.querySelectorAll('[data-block]').forEach(el=>el.classList.toggle('is-selected',el.dataset.block===selectedBlockId));
});
function sendText(el){if(el.dataset.projectEdit){send({type:'project-inline-edit',field:el.dataset.projectEdit,value:el.innerText});return;}send({type:'inline-edit',blockId:el.closest('[data-block]').dataset.block,spreadId:el.closest('[data-spread-id]')?.dataset.spreadId,field:el.dataset.edit,value:el.innerText.replace(/\r/g,'')});}
root.addEventListener('input',e=>{if(e.target.matches('[contenteditable]'))sendText(e.target);});
root.addEventListener('focusout',e=>{
  if(!e.target.matches('[contenteditable]'))return;
  sendText(e.target);
  queueMicrotask(()=>{if(pendingRender)render(pendingRender);send({type:'edit-end'});});
});
root.addEventListener('keydown',e=>{
  if(!e.target.matches('[contenteditable]'))return;
  if(e.key==='Escape'){e.preventDefault();e.target.innerText=e.target.dataset.original;sendText(e.target);e.target.blur();}
  if(e.key==='Enter'&&['title','label'].includes(e.target.dataset.edit)){e.preventDefault();e.target.blur();}
});
root.addEventListener('paste',e=>{if(e.target.matches('[contenteditable]')){e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));}});
// Keep sketchbook page-turn gestures from taking over editable captions and controls.
for(const name of ['pointerdown','mousedown','touchstart'])root.addEventListener(name,e=>{if(e.target.closest('.book-page')&&e.target.closest('[contenteditable],.editor-chrome'))e.stopPropagation();},true);
root.addEventListener('click',e=>{if(e.target.closest('[contenteditable],.editor-chrome')||e.target.closest('a')?.querySelector('img'))e.preventDefault();},true);
function addResize(section,b){
  const frame=section.querySelector('.single-image');
  const controls=document.createElement('div');controls.className='editor-chrome image-size';
  const width=b.width||100,height=b.height||500;
  controls.innerHTML=`<label>Width <input type="range" aria-label="Image width" min="20" max="100" value="${width}"></label><label>Height <input type="range" aria-label="Image height" min="120" max="1200" value="${height}"></label><output>${width}% × ${height}px</output>`;
  const [w,h]=controls.querySelectorAll('input');
  function update(){frame.style.width=w.value+'%';frame.style.height=h.value+'px';controls.querySelector('output').textContent=w.value+'% × '+h.value+'px';}
  const commit=()=>send({type:'resize-image',blockId:b.id,width:Number(w.value),height:Number(h.value)});
  w.oninput=h.oninput=update;w.onchange=h.onchange=commit;section.append(controls);
  if(!b.height){const img=frame.querySelector('img');const measure=()=>{h.value=Math.min(1200,Math.max(120,Math.round(frame.getBoundingClientRect().height)));controls.querySelector('output').textContent=w.value+'% × '+h.value+'px';};if(img?.complete)measure();else img?.addEventListener('load',measure,{once:true});}
  const grip=document.createElement('div');grip.className='editor-chrome resize-grip';grip.title='Drag to resize photo';frame.append(grip);
  grip.onpointerdown=e=>{
    e.preventDefault();grip.setPointerCapture(e.pointerId);
    const x=e.clientX,y=e.clientY,rect=frame.getBoundingClientRect(),available=section.getBoundingClientRect().width;
    grip.onpointermove=move=>{w.value=Math.min(100,Math.max(20,(rect.width+move.clientX-x)/available*100));h.value=Math.min(1200,Math.max(120,rect.height+move.clientY-y));update();};
    grip.onpointerup=()=>{grip.onpointermove=null;commit();};
    grip.onpointercancel=()=>{grip.onpointermove=null;commit();};
  };
}
send({type:'ready'});
