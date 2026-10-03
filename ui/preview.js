import {wireFreeLayout,freeEditorCss} from '/ui/free-layout-editor.js';
import {measure} from '/ui/diagnostics.js';
import {materialTextureCss} from '/shared/materials.js';
import {styleVars} from '/shared/styles.js';
import {styleControls,wireStyleControls} from '/ui/style-controls.js';
import { BLOCKS, IMAGE_TYPES, SINGLE_IMAGE_TYPES } from '/shared/blocks.js';
import { blockLibraryMarkup, wireBlockSearch } from '/ui/block-library.js';
import { escapeHtml as esc } from '/shared/render.js';
import { portfolioMarkup, initPortfolio } from '/shared/render.js';

// Keep unchanged sketchbooks mounted while editing surrounding text.
const root = document.querySelector('#portfolio');
window.matchMedia('(max-width:650px)').addEventListener('change',e=>root.querySelectorAll(e.matches?'[data-mobile-preview]':'[data-mode=desktop]').forEach(button=>button.click()));
let sections = new Map();
const styleContexts=new WeakMap(),stylePanels=new WeakMap();
let selectedBlockId;
let pendingRender;
let uploadTarget={};
const editorStyle = document.createElement('style');
editorStyle.textContent = materialTextureCss(['cotton','watercolor','laid','canvas'].map(paperTexture=>({paperTexture})))+`
  .folio-block{position:relative;scroll-margin-top:30px;cursor:pointer}
  .folio-block.is-selected{outline:2px solid #111111;outline-offset:12px}
  .folio-block.is-selected::before{content:'Editing this block';position:absolute;top:-28px;left:0;background:#111111;color:white;font:10px Arial,sans-serif;padding:5px 8px;border-radius:0}
  #drop-marker{position:fixed;height:4px;background:#111111;z-index:9999;pointer-events:none;display:none}
  #drop-marker::before{content:'Drop block here';position:absolute;top:-25px;left:0;background:#111111;color:#fff;font:11px Arial,sans-serif;padding:5px 10px;border-radius:0}
`;
editorStyle.textContent += `
  .folio-block.is-selected::before{display:none}
  [contenteditable]{cursor:text;outline:none;min-height:1.2em;white-space:pre-wrap}
  [contenteditable]:hover{outline:1px dashed #111111;outline-offset:4px}
  [contenteditable]:focus{outline:2px solid #111111;outline-offset:5px}
  [contenteditable]:empty::after{content:attr(data-placeholder);opacity:.45}
  .canvas-tools{position:sticky;top:0;z-index:10000;background:#ffffff;border-bottom:1px solid #cccccc;padding:10px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font:12px Arial,sans-serif;color:#111111}
  .canvas-library{position:relative}.canvas-library summary{cursor:pointer;padding:8px;border:1px solid #cccccc;border-radius:0}.canvas-library>.block-library{position:absolute;right:0;top:35px;width:320px;max-height:65vh;overflow:auto;background:#ffffff;padding:15px;box-shadow:0 10px 30px #0002}.block-group{border-top:1px solid #cccccc;padding:12px 0}.block-group summary{cursor:pointer}.block-group small{float:right}.palette{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.palette button{min-height:55px;text-align:left}.palette button span{display:block;margin-bottom:6px}.block-search{width:100%;padding:8px;border:1px solid #cccccc;margin-bottom:12px}button[hidden],details[hidden],p[hidden]{display:none}
  .canvas-options,.item-options{display:flex;gap:12px;flex-wrap:wrap;align-items:center;background:#ffffff;padding:12px;margin-top:15px;border:1px solid #cccccc}.canvas-options label,.item-options label{display:flex;flex-direction:column;gap:6px}.canvas-options input,.item-options input,.canvas-styles input,.canvas-styles select{padding:8px;border:1px solid #cccccc;background:white;color:#111111;min-width:180px}.canvas-options input[type=checkbox]{min-width:0}.add-item{margin-top:15px;padding:8px;cursor:pointer}.link-edit-label{display:inline!important}.link-list [data-item-index]>a{display:none}.folio-spacer{border:1px dashed #cccccc}
  .canvas-tools span{margin-right:auto;color:#111111;font-size:11px}
  .editor-chrome{font:11px Arial,sans-serif;color:#111111;letter-spacing:0;text-transform:none}
  .editor-chrome button,.canvas-tools button{font:11px Arial,sans-serif;color:#111111;background:#ffffff;border:1px solid #cccccc;padding:7px 9px;border-radius:0;cursor:pointer}
  .block-tools{display:flex;gap:5px;align-items:center;background:#ffffff;padding:6px;border:1px solid #cccccc;border-radius:0;width:fit-content;margin-bottom:14px;position:relative;z-index:10}
  .folio-block:not(.is-selected):not(:hover):not(:focus-within)>.block-tools{opacity:.25}
  .block-tools .grip{cursor:grab}
  .image-drop{outline:3px dashed #111111!important;background:#cccccc!important}
  .image-size{display:flex;gap:15px;align-items:center;flex-wrap:wrap;margin-top:12px}
  .image-size label{display:flex;gap:6px;align-items:center}.image-size input{width:100px}
  .single-image{position:relative;min-height:120px}.single-image>.resize-grip{position:absolute;right:-9px;bottom:-9px;width:20px;height:20px;border:2px solid white;border-radius:0;background:#111111;cursor:nwse-resize;touch-action:none;z-index:20}
  .book-page [contenteditable]{position:relative;z-index:5}
  .book-page>.page-fill{position:absolute;top:7px;left:7px;z-index:6;display:flex;align-items:center;gap:5px;background:white;color:black;padding:5px;font:11px Arial;margin:0}.page-fill input{width:auto;margin:0}.book-page>.page-photo{position:absolute;top:7px;right:7px;z-index:6}
`;
editorStyle.textContent += `.canvas-styles{position:relative}.canvas-styles>summary{cursor:pointer;padding:7px 9px}.canvas-style-fields{position:absolute;top:32px;left:0;width:275px;max-height:55vh;overflow:auto;background:#ffffff;color:#111111;border:1px solid #cccccc;box-shadow:0 8px 24px #0002;padding:14px;text-align:left;z-index:100}.canvas-style-fields p{font:12px Arial,sans-serif!important}.canvas-style-fields .style-group{border-top:1px solid #cccccc;padding-top:10px;margin-top:10px}.canvas-style-fields summary{padding:7px 0;cursor:pointer}.style-field{margin:12px 0}.style-field label{display:block;margin-bottom:5px}.style-field select,.style-field input:not([type=checkbox]){width:100%;padding:7px;border:1px solid #cccccc;background:white;color:#111111}.style-field input[type=color]{height:34px}.style-field input:disabled,.style-field select:disabled{opacity:.5}.style-override{display:flex!important;align-items:center;gap:6px}.canvas-style-fields input[type=checkbox]{width:auto;min-width:0;margin:0;flex:0 0 auto}.canvas-style-fields input,.canvas-style-fields select{min-width:0;box-sizing:border-box}.canvas-style-fields{max-width:calc(100vw - 100px)}@media(max-width:600px){.block-tools{flex-wrap:wrap;max-width:100%}.canvas-style-fields{position:fixed;top:24%;left:5%;width:90%;max-width:90%;max-height:65vh}}`;
editorStyle.textContent += `.editor-chrome,.canvas-tools{font-family:Arial,Helvetica,sans-serif;color:#111}.editor-chrome button,.canvas-tools button{color:#111;border-color:#bbb;border-radius:0;font-size:12px}.canvas-tools{border-bottom:1px solid #111}.canvas-tools span{color:#555}.block-tools{background:#fff;border-color:#bbb}.block-tools summary{font-size:12px}.canvas-style-fields{color:#111;border-color:#111;border-radius:0}.folio-block:not(.is-selected):not(:hover):not(:focus-within)>.block-tools{opacity:.5}.editor-chrome input,.editor-chrome select{color:#111;accent-color:#111}.editor-chrome button:focus-visible,.canvas-tools button:focus-visible{outline:2px solid #111;outline-offset:2px}`;
editorStyle.textContent += `.editable-artwork{position:relative}.edit-image-context{position:absolute;left:8px;top:8px;z-index:6;padding:7px 9px;background:#fff;color:#111;border:1px solid #111;font:12px Arial,sans-serif;cursor:pointer}.editable-artwork:not(:hover):not(:focus-within) .edit-image-context{opacity:.65}.block-tools>.edit-image-context{position:static}`;
editorStyle.textContent += `.folio-block:has(.canvas-styles[open]){z-index:100}.folio-block:has(.canvas-styles[open])>.block-tools{opacity:1}`;
editorStyle.textContent+=freeEditorCss+`.canvas-tools [data-create="freeLayout"]{background:#111;color:#fff;font-weight:bold}`;
document.head.append(editorStyle);
const tools=document.createElement('div');
tools.className='canvas-tools';
tools.innerHTML='<span>Click text to write · Drop photos anywhere</span><button data-create="freeLayout">+ Free layout</button><button data-create="text">+ Text</button><button data-create="image">+ Image</button><button data-create="gallery">+ Gallery</button><button data-create="sketchbook">+ Sketchbook</button><button data-photos>Add photos</button>';
const library=document.createElement('details');library.className='canvas-library';library.innerHTML='<summary>All blocks</summary>'+blockLibraryMarkup(esc,'data-create');tools.append(library);wireBlockSearch(library);
library.querySelectorAll('[data-create]').forEach(button=>button.ondragstart=e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','new:'+button.dataset.create);});
document.body.prepend(tools);
const picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='image/jpeg,image/png,image/webp';picker.hidden=true;document.body.append(picker);
tools.addEventListener('click',e=>{const create=e.target.closest('[data-create]');if(create){send({type:'add-block',blockType:create.dataset.create});library.open=false;}if(e.target.hasAttribute('data-photos'))choosePhotos({});});
function choosePhotos(target){uploadTarget=target;picker.click();}
picker.onchange=()=>{send({type:'drop-artwork',...uploadTarget,files:[...picker.files],beforeId:null});picker.value='';};

const marker = document.createElement('div');
marker.id = 'drop-marker';
document.body.append(marker);
const send = data => parent.postMessage(data, location.origin);

function render(data) {
  if(document.hasFocus()&&root.contains(document.activeElement)&&(document.activeElement.isContentEditable||document.activeElement.matches('.canvas-options input,.item-options input,.canvas-styles input,.canvas-styles select'))){pendingRender=data;return;}
  pendingRender=null;
  const openStyles=[...root.querySelectorAll('.canvas-styles[open]')].map(el=>({id:el.closest('[data-block]').dataset.block,groups:[...el.querySelectorAll('.style-group[open]')].map(g=>g.dataset.styleGroup)}));
  const scroll = window.scrollY;
  const signatures=new Map(),assets=new Map(data.project.assets.map(a=>[a.id,a]));
  const markup = portfolioMarkup(data.project, data.pageId,{reuseBlock:b=>{
    const ids=new Set([...(b.images||[]),...(b.spreads||[]).map(s=>s.image),...(b.layers||[]).map(l=>l.assetId)]);
    const signature=JSON.stringify({block:b,assets:[...ids].map(id=>assets.get(id))});signatures.set(b.id,signature);
    return sections.get(b.id)?.signature===signature?`<section data-block="${b.id}"></section>`:null;
  }});
  const container = document.createElement('div');
  container.innerHTML = markup.html;
  const page = data.project.pages.find(p => p.id === data.pageId);
  const next = new Map();
  for (const b of page.blocks) {
    const signature = signatures.get(b.id);
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
  decorate(container, page, data.project.theme);
  for(const {id,groups} of openStyles){const el=container.querySelector(`[data-block="${id}"] .canvas-styles`);if(el){el.open=true;stylePanels.get(el.closest("[data-block]"))?.(groups);}}
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

window.addEventListener('blur',()=>{if(pendingRender)requestAnimationFrame(()=>{if(pendingRender)render(pendingRender);});});
window.addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== parent) return;
  if (e.data.type === 'render') {
    try { measure('previewRender',()=>render(e.data)); }
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
  return {blockId:section?.dataset.block,spreadId:spread?.dataset.spreadId,itemIndex:e.target.closest('[data-item-index]')?Number(e.target.closest('[data-item-index]').dataset.itemIndex):undefined,layerId:e.target.closest('[data-layer]')?.dataset.layer,beforeId:insertionPoint(e.clientY)?.dataset.block??null};
}
document.addEventListener('dragover', e => {
  if(![...e.dataTransfer.types].some(t=>t==='text/plain'||t==='Files'))return;
  e.preventDefault();clearDrop();
  const section=e.target.closest('[data-block]');
  if([...e.dataTransfer.types].includes('Files')&&section?.querySelector('.single-image,.gallery,.carousel,.book,.paired-image,.cover-image,.artwork-cards,.free-stage')){
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

function decorate(container,page,theme){
  container.querySelectorAll('[data-project-edit]').forEach(el=>{el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',el.dataset.projectEdit==='name'?'Artist name on page':'Portfolio description on page');});
  for(const b of page.blocks){
    const section=container.querySelector(`[data-block="${b.id}"]`);
    styleContexts.set(section,{b,theme});
    if(section.querySelector(':scope > .block-tools')){if(section.querySelector('.canvas-styles')?.open)stylePanels.get(section)?.();continue;}
    const toolbar=document.createElement('div');toolbar.className='editor-chrome block-tools';
    toolbar.innerHTML='<button class="grip" draggable="true" aria-label="Drag block">⠿</button><button data-action="up" aria-label="Move block up">↑</button><button data-action="down" aria-label="Move block down">↓</button><button data-action="duplicate">Duplicate</button><button data-action="delete" aria-label="Delete block">Delete</button>';
    toolbar.querySelector('.grip').ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','block:'+b.id);};
    toolbar.onclick=e=>{if(e.target.dataset.action)send({type:'block-action',blockId:b.id,action:e.target.dataset.action});};
    if(b.type==='sketchbook'){
      const add=document.createElement('button');add.textContent='+ Add sketchbook page';add.dataset.action='add-spread';toolbar.append(add);
      const count=document.createElement('span');count.textContent=b.spreads.length+' pages';toolbar.append(count);
    }
    if(IMAGE_TYPES.includes(b.type)){
      const photo=document.createElement('button');photo.textContent=SINGLE_IMAGE_TYPES.includes(b.type)?'Replace photo':'Add photos';photo.onclick=()=>choosePhotos({blockId:b.id});toolbar.append(photo);
      const fit=document.createElement('button');fit.textContent=b.fit==='cover'?'Show whole photo':'Crop to fill';fit.onclick=()=>send({type:'block-action',blockId:b.id,action:'fit'});toolbar.append(fit);
    }
    const styles=document.createElement('details');styles.className='editor-chrome canvas-styles';
    styles.innerHTML='<summary>Styles</summary><div class="canvas-style-fields"></div>';
    const refreshStyles=(groups)=>{
      const context=styleContexts.get(section),current=context.b;
      const openGroups=groups||[...styles.querySelectorAll('.style-group[open]')].map(g=>g.dataset.styleGroup);
      const fields=styles.querySelector('.canvas-style-fields');
      fields.innerHTML=`<p>Check a setting to override the site default.</p>${styleControls(context.theme,current.styles||{},esc)}<button data-reset-styles>Reset block styles</button>`;
      if(openGroups.length)fields.querySelectorAll('.style-group').forEach(g=>g.open=openGroups.includes(g.dataset.styleGroup));
      wireStyleControls(fields,context.theme,current.styles||{},(key,value)=>{
        if(value===null){if(current.styles)delete current.styles[key];}else (current.styles??={})[key]=value;
        const play=section.style.getPropertyValue('--material-play');section.setAttribute('style',styleVars(current.styles,true));if(play)section.style.setProperty('--material-play',play);
        send({type:'block-style',blockId:current.id,key,value});
      });
      fields.querySelector('[data-reset-styles]').onclick=()=>send({type:'reset-block-styles',blockId:current.id});
    };
    stylePanels.set(section,refreshStyles);styles.ontoggle=()=>{if(styles.open)refreshStyles();else styles.querySelector('.canvas-style-fields').replaceChildren();};
    toolbar.append(styles);
    section.querySelectorAll('img[data-asset-id]').forEach(img=>{
      const artwork=img.closest('.artwork-view');
      if(!artwork)return; // Free-layout images have their own contextual controls.
      const edit=document.createElement('button');edit.className='editor-chrome edit-image-context';edit.textContent='Edit image';edit.setAttribute('aria-label','Edit artwork image');
      artwork.classList.add('editable-artwork');if(b.type==='cover')toolbar.append(edit);else artwork.append(edit);
      edit.onclick=e=>{e.preventDefault();e.stopPropagation();send({type:'edit-image',blockId:b.id,assetId:img.dataset.assetId,spreadId:img.closest('[data-spread-id]')?.dataset.spreadId,imageIndex:b.images.indexOf(img.dataset.assetId)});};
    });
    section.prepend(toolbar);
    if(b.type==='freeLayout')wireFreeLayout(section,b,{send,choosePhotos,esc});
    section.querySelectorAll('.folio-accordion details').forEach(item=>item.open=true);
    const fields=BLOCKS[b.type]?.fields||[];
    if(fields.length){
      const settings=document.createElement('div');settings.className='editor-chrome canvas-options';
      settings.innerHTML=fields.map(f=>`<label>${esc(f.label)}<input data-option="${f.key}" type="${f.type}" ${f.type==='checkbox'?(b[f.key]?'checked':''):`value="${esc(b[f.key]??'')}"`}></label>`).join('');
      settings.querySelectorAll('[data-option]').forEach(input=>{const update=inline=>send({type:'set-option',blockId:b.id,key:input.dataset.option,value:input.type==='checkbox'?input.checked:input.value,inline});input.oninput=()=>update(true);input.onchange=()=>update(false);});
      section.append(settings);
    }
    if(Array.isArray(b.items)){
      section.querySelectorAll('[data-item-index]').forEach(item=>{
        const i=Number(item.dataset.itemIndex),controls=document.createElement('div');controls.className='editor-chrome item-options';
        if(['cards','links','social'].includes(b.type)){
          controls.innerHTML=`<label>Link URL<input type="text" aria-label="Item link URL" value="${esc(b.items[i].url)}" placeholder="https://… or /page/"></label>`;
          const urlInput=controls.querySelector('input');const update=inline=>send({type:'item-link',blockId:b.id,index:i,value:urlInput.value,inline});urlInput.oninput=()=>update(true);urlInput.onchange=()=>update(false);
        }
        if(b.type==='cards'){const photo=document.createElement('button');photo.textContent='Add / replace photo';photo.onclick=()=>choosePhotos({blockId:b.id,itemIndex:i});controls.append(photo);}
        const remove=document.createElement('button');remove.textContent='Remove item';remove.onclick=()=>send({type:'item-action',blockId:b.id,action:'remove',index:i});controls.append(remove);item.append(controls);
      });
      const add=document.createElement('button');add.className='editor-chrome add-item';add.textContent='+ Add item';add.onclick=()=>send({type:'item-action',blockId:b.id,action:'add'});section.append(add);
    }
    section.querySelectorAll('[data-edit]').forEach(el=>{
      el.contentEditable='true';el.setAttribute('role','textbox');el.setAttribute('aria-label',`${el.dataset.cell?'Table cell '+el.dataset.cell:el.dataset.edit==='attribution'?'Attribution':el.dataset.edit==='text'?'Text':el.dataset.edit==='caption'?'Caption':el.dataset.edit==='label'?'Small heading':'Title'} on page`);
      el.dataset.placeholder=el.dataset.edit==='label'?'Add a small heading…':el.dataset.edit==='attribution'?'Add an attribution…':el.dataset.edit==='text'||el.dataset.edit==='caption'?'Write here…':'Add a title…';
      el.spellcheck=true;
    });
    section.querySelectorAll('[data-spread-id]').forEach((el,index)=>{
      const spread=b.spreads.find(s=>s.id===el.dataset.spreadId);
      const fill=document.createElement('label');fill.className='editor-chrome page-fill';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=!!spread?.fillPage;checkbox.setAttribute('aria-label','Fill sketchbook page '+(index+1)+' with artwork');
      checkbox.onchange=e=>{e.stopPropagation();send({type:'block-action',blockId:b.id,spreadId:el.dataset.spreadId,action:'fill-page'});};
      fill.append(checkbox,document.createTextNode('Fill page'));el.append(fill);
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
function sendText(el){if(el.dataset.projectEdit){send({type:'project-inline-edit',field:el.dataset.projectEdit,value:el.innerText});return;}send({type:'inline-edit',blockId:el.closest('[data-block]').dataset.block,spreadId:el.closest('[data-spread-id]')?.dataset.spreadId,itemIndex:el.closest('[data-item-index]')?Number(el.closest('[data-item-index]').dataset.itemIndex):undefined,field:el.dataset.cell?'cell:'+el.dataset.cell:el.dataset.edit,value:el.innerText.replace(/\r/g,'')});}
root.addEventListener('input',e=>{if(e.target.matches('[contenteditable]'))sendText(e.target);});
root.addEventListener('focusout',e=>{
  if(e.target.matches('.canvas-options input,.item-options input,.canvas-styles input,.canvas-styles select')){send({type:'edit-end'});return;}
  if(!e.target.matches('[contenteditable]'))return;
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
root.addEventListener('click',e=>{if(e.target.closest('a')&&(e.target.closest('[contenteditable],.editor-chrome')||e.target.closest('a').querySelector('img')))e.preventDefault();},true);
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
