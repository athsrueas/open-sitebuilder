import {INTERNAL_LINK,internalLink,resolveLink,pagePath} from '/shared/links.js';
import {BLOCKS} from '/shared/blocks.js';
import {escapeHtml as esc} from '/shared/render.js';
export function linkControlMarkup(project,value='',kind='button'){
  const match=INTERNAL_LINK.exec(value),internal=!!match,resolved=resolveLink(value,project),mode=internal?internalLink({id:match[1]}):value?'external':'none',target=internal?project.pages.find(p=>p.id===match[1]):null;
  const action=kind==='cards'?'The card image and “View artwork” button open this destination.':kind==='download'?'Visitors click the file button to open this destination. To offer a file, paste its hosted HTTPS address.':'Visitors click the button or link text to go to this destination.';
  const choices=project.pages.map(p=>`<option value="${internalLink(p)}" ${mode===internalLink(p)?'selected':''}>Page: ${esc(p.title||'Untitled page')} · ${esc(pagePath(project,p))}</option>`).join('');
  return `<div class="link-control" data-link-control data-link-kind="${esc(kind)}"><p class="small-note">${action} ${kind==='cards'?'Leave empty to use standard artwork viewing.':''} Test navigation in the built site preview; canvas clicks edit.</p><label>Link destination<select data-link-destination><option value="none" ${mode==='none'?'selected':''}>No link</option><option value="external" ${mode==='external'?'selected':''}>Website address or custom link</option>${internal&&!target?`<option value="${esc(mode)}" selected>Missing page — choose another destination</option>`:''}${choices}</select></label><label data-link-block-label ${target?'':'hidden'}>Jump to a block (optional)<select data-link-block>${target?blockOptions(target,value):''}</select></label><label data-link-address ${mode==='external'?'':'hidden'}>Website or custom address<input data-link-url type="text" value="${esc(internal?'':value)}" placeholder="https://example.com, /page/, or #shortcut"></label><p class="small-note" data-link-note>${esc(internal?(resolved?'Goes to '+resolved+' · Tracks page URL changes automatically.':'This page or block was deleted. Choose another destination.'):value?'Goes to '+value:'No link destination selected.')}</p></div>`;
}
function blockOptions(page,value=''){
  return `<option value="${internalLink(page)}" ${value===internalLink(page)?'selected':''}>Whole page (top)</option>${INTERNAL_LINK.test(value)&&value!==internalLink(page)&&!page.blocks.some(b=>internalLink(page,b)===value)?`<option value="${esc(value)}" selected>Missing block — choose another destination</option>`:''}${page.blocks.map((b,i)=>`<option value="${internalLink(page,b)}" ${value===internalLink(page,b)?'selected':''}>${i+1}. ${esc(b.title||BLOCKS[b.type]?.name||'Block')} (block shortcut)</option>`).join('')}`;
}
export function wireLinkControls(root,project,onChange){
  root.querySelectorAll('[data-link-control]').forEach(control=>{
    const select=control.querySelector('[data-link-destination]'),input=control.querySelector('[data-link-url]'),note=control.querySelector('[data-link-note]');
    const explain=value=>{note.textContent=INTERNAL_LINK.test(value)?(resolveLink(value,project)?'Goes to '+resolveLink(value,project)+' · Tracks page URL changes automatically.':'This page or block was deleted. Choose another destination.'):value?'Goes to '+value:'No link destination selected.';};
    const blockSelect=control.querySelector('[data-link-block]'),blockLabel=control.querySelector('[data-link-block-label]');
    blockSelect.onchange=()=>{explain(blockSelect.value);onChange(control,blockSelect.value,false);};
    select.onchange=()=>{const mode=select.value,p=project.pages.find(p=>internalLink(p)===mode);blockLabel.hidden=!p;if(p)blockSelect.innerHTML=blockOptions(p,mode);control.querySelector('[data-link-address]').hidden=mode!=='external';const value=mode==='none'?'':mode==='external'?input.value:mode;explain(value);onChange(control,value,false);if(mode==='external')input.focus();};
    input.oninput=()=>{explain(input.value);onChange(control,input.value,true);};input.onchange=()=>onChange(control,input.value,false);
  });
}
