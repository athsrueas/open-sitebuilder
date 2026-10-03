import {escapeHtml as esc} from '/shared/render.js';
export function openMediaLibrary({getProject,upload,edit,onChange,addToPage,deleteImage,revealImage}){
  const dialog=document.createElement('dialog');dialog.className='media-library-dialog';
  dialog.innerHTML=`<div class="media-heading"><div><h2>Media library</h2><p class="small-note">Import artwork, edit copies, and manage image versions.</p></div><button aria-label="Close media library">×</button></div><div class="media-library-toolbar"><label>Search images<input type="search" placeholder="Name or description" data-media-search></label><label class="check"><input type="checkbox" data-show-archived>Show archived</label><button data-import class="primary">Import images</button><input type="file" data-media-files multiple accept="image/jpeg,image/png,image/webp" hidden></div><div class="media-drop"><strong>Drop JPEG, PNG, or WebP files here</strong><span>Up to 60 MB per file. Transparent images keep their transparency.</span></div><div class="media-library-layout"><div class="media-library-grid"></div><aside class="media-library-details"></aside></div><p class="small-note" data-media-status role="status"></p>`;
  document.body.append(dialog);dialog.showModal();const $=s=>dialog.querySelector(s);let selected=getProject().assets.filter(a=>!a.archived).at(-1)?.id,importing=false;
  const usedCount=id=>getProject().pages.reduce((n,p)=>n+p.blocks.reduce((sum,b)=>sum+b.images.filter(i=>i===id).length+b.spreads.filter(s=>s.image===id).length+(b.layers||[]).filter(l=>l.assetId===id).length,0),0);
  function render(){
    const project=getProject(),query=$('[data-media-search]').value.toLowerCase(),showArchived=$('[data-show-archived]').checked;
    const assets=[...project.assets].reverse().filter(a=>(showArchived||!a.archived)&&(a.name+' '+a.alt).toLowerCase().includes(query));
    $('.media-library-grid').innerHTML=assets.length?assets.map(a=>`<button class="media-library-card ${a.id===selected?'selected':''}" data-media-asset="${a.id}"><img loading="lazy" decoding="async" src="${esc(a.thumb||`/media/${a.id}-thumb.webp`)}" alt="${esc(a.alt)}"><strong>${esc(a.name)}</strong><span>${a.width} × ${a.height} px${a.parentId?' · Edited version':''}${a.archived?' · Archived':''}</span></button>`).join(''):'<p class="empty-state">No images match. Import artwork or change the filters.</p>';
    dialog.querySelectorAll('[data-media-asset]').forEach(b=>b.onclick=()=>{selected=b.dataset.mediaAsset;render();});
    const a=project.assets.find(a=>a.id===selected),details=$('.media-library-details');
    if(!a){details.innerHTML='<p class="small-note">Select an image to view details.</p>';return;}
    const parent=project.assets.find(s=>s.id===a.parentId);
    details.innerHTML=`<img class="media-detail-image" src="${esc(a.thumb||`/media/${a.id}-thumb.webp`)}" alt="${esc(a.alt)}"><label>File name<input data-media-name maxlength="200" value="${esc(a.name)}"></label><label>Alt text<textarea data-media-alt maxlength="1000" rows="3">${esc(a.alt)}</textarea></label><p class="small-note">${a.width} × ${a.height} px · Used ${usedCount(a.id)} time(s)${parent?'<br>Source: '+esc(parent.name):''}</p><div class="media-detail-actions"><button data-media-edit class="primary">Edit image</button><button data-media-add>Add to current page</button><a href="/api/original/${a.id}" download="${esc(a.name)}">Download original file</a><button data-media-reveal>Show in File Explorer</button><button data-media-archive>${a.archived?'Restore to library':'Archive image'}</button><button data-media-delete class="danger">Delete image</button></div><div data-delete-confirm hidden role="alert" aria-label="Confirm image deletion"></div><p class="small-note">Deleting removes this image from blocks and sends its local files to the Windows Recycle Bin. Other edited versions stay in the library. Publish again to update the live site.</p><p class="small-note">Archiving hides an image from the library. Existing pages keep it, and it can be restored.</p>`;
    $('[data-media-name]').onchange=e=>{a.name=e.target.value;onChange();render();};$('[data-media-alt]').onchange=e=>{a.alt=e.target.value;onChange();};
    $('[data-media-edit]').onclick=async()=>{await edit(a.id,null,edited=>{selected=edited.id;render();});};
    $('[data-media-add]').onclick=()=>{addToPage(a.id);$('[data-media-status]').textContent='Image added to the current page.';render();};
    $('[data-media-reveal]').onclick=async()=>{try{await revealImage(a.id);$('[data-media-status]').textContent='Opened File Explorer with the original selected.';}catch(error){$('[data-media-status]').textContent=error.message;}};
    $('[data-media-delete]').onclick=()=>{
      if(importing){$('[data-media-status]').textContent='Wait for image imports to finish before deleting.';return;}
      const confirmation=$('[data-delete-confirm]');confirmation.hidden=false;
      confirmation.innerHTML=`<p>Delete <strong>${esc(a.name)}</strong>? This removes the original and web copies from this library and ${usedCount(a.id)} image placement(s). Local files go to the Windows Recycle Bin. Other edited versions are kept.</p><button data-cancel-delete>Cancel</button> <button data-confirm-delete class="danger">Delete image</button>`;
      $('[data-media-delete]').disabled=true;
      $('[data-cancel-delete]').onclick=()=>{confirmation.hidden=true;confirmation.innerHTML='';$('[data-media-delete]').disabled=false;};
      $('[data-confirm-delete]').onclick=async()=>{
        const controls=[...dialog.querySelectorAll('button,input,textarea')];controls.forEach(el=>el.disabled=true);
        try{const result=await deleteImage(a.id);selected=getProject().assets.filter(a=>!a.archived).at(-1)?.id;render();$('[data-media-status]').textContent=result.message;}
        catch(error){$('[data-media-status]').textContent=error.message;}
        finally{controls.forEach(el=>el.disabled=false);}
      };
      $('[data-cancel-delete]').focus();
    };
    $('[data-media-archive]').onclick=()=>{a.archived=!a.archived;onChange();render();};
  }
  async function importFiles(files){if(importing)return;importing=true;$('[data-import]').disabled=true;try{$('[data-media-status]').textContent='Importing images…';await upload(files);selected=getProject().assets.at(-1)?.id;render();$('[data-media-status]').textContent='Import complete.';}catch(e){$('[data-media-status]').textContent=e.message;}finally{importing=false;$('[data-import]').disabled=false;$('[data-media-files]').value='';}}
  $('.media-heading>button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
  $('[data-media-search]').oninput=render;$('[data-show-archived]').onchange=render;$('[data-import]').onclick=()=>$('[data-media-files]').click();$('[data-media-files]').onchange=e=>importFiles([...e.target.files]);
  const drop=$('.media-drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('drop-target');};drop.ondragleave=()=>drop.classList.remove('drop-target');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drop-target');importFiles([...e.dataTransfer.files]);};
  render();return dialog;
}
