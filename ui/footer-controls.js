import {footerSettings} from '/shared/footer.js';
import {escapeHtml as esc} from '/shared/render.js';
import {safeUrl} from '/shared/blocks.js';
import {linkControlMarkup,wireLinkControls} from '/ui/link-controls.js';

export function openFooterEditor(project,onSave){
  const draft=structuredClone(footerSettings(project)),dialog=document.createElement('dialog');
  dialog.className='footer-dialog';
  document.body.append(dialog);
  function paint(){
    dialog.innerHTML=`<form><div class="dialog-heading"><h2>Site footer</h2><button type="button" data-cancel aria-label="Close footer settings">×</button></div><p class="muted">Applies to every portfolio page. Splash pages always hide the footer.</p><label class="check"><input data-enabled type="checkbox" ${draft.enabled?'checked':''}>Show footer</label><label class="check"><input data-name type="checkbox" ${draft.showName?'checked':''}>Show artist / studio name</label><label>Footer text<textarea data-text rows="3" maxlength="5000">${esc(draft.text)}</textarea></label><p class="muted">You can also click footer text directly in the canvas to edit it. Hiding the footer keeps its content for later.</p><h3>Footer links</h3>${draft.links.map((link,i)=>`<div class="footer-link" data-index="${i}"><label>Link label<input data-title maxlength="200" value="${esc(link.title)}" placeholder="Artist statement, Contact, Instagram…"></label>${linkControlMarkup(project,link.url,'links')}<button type="button" data-remove="${i}">Remove link</button></div>`).join('')}<button type="button" data-add ${draft.links.length>=30?'disabled':''}>+ Add footer link</button><p data-error role="alert"></p><button type="submit" class="primary">Save footer</button></form>`;
    dialog.querySelector('[data-enabled]').onchange=e=>draft.enabled=e.target.checked;
    dialog.querySelector('[data-name]').onchange=e=>draft.showName=e.target.checked;
    dialog.querySelector('[data-text]').oninput=e=>draft.text=e.target.value;
    dialog.querySelectorAll('[data-title]').forEach(el=>el.oninput=()=>draft.links[Number(el.closest('[data-index]').dataset.index)].title=el.value);
    wireLinkControls(dialog,project,(control,url)=>draft.links[Number(control.closest('[data-index]').dataset.index)].url=url);
    dialog.querySelector('[data-add]').onclick=()=>{draft.links.push({title:'',url:''});paint();dialog.querySelector('.footer-link:last-of-type [data-title]')?.focus();};
    dialog.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{draft.links.splice(Number(el.dataset.remove),1);paint();});
    dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();draft.links=draft.links.map(l=>({title:l.title.trim(),url:l.url.trim()}));if(draft.links.some(l=>!l.title.trim()||!l.url||l.url.length>20000||!safeUrl(l.url))){dialog.querySelector('[data-error]').textContent='Each link needs a label and a valid destination, or remove the unused link.';return;}onSave(draft);dialog.close();};
  }
  dialog.onclose=()=>dialog.remove();paint();dialog.showModal();
}
