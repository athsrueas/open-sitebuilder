import {TEXT_FIELDS,textVisible} from '/shared/text-visibility.js';
const names={label:'small heading',title:'title',text:'description / caption'};
export function textControlsMarkup(block,itemIndex){
 const fields=itemIndex===undefined?TEXT_FIELDS[block.type]:block.type==='cards'?['title','text']:null;
 if(!fields)return '';
 const object=itemIndex===undefined?block:block.items[itemIndex];
 return `<div class="text-area-controls"><p class="small-note">Removed text leaves no empty box or reserved space. Wording is kept for restoration.</p>${fields.map(field=>`<label class="check"><input type="checkbox" data-text-visible="${field}" ${itemIndex===undefined?'':`data-text-item="${itemIndex}"`} ${textVisible(object,field)?'checked':''}>Show ${itemIndex===undefined?'block':'card'} ${names[field]}</label>`).join('')}</div>`;
}
export function wireTextControls(root,onChange){root.querySelectorAll('[data-text-visible]').forEach(input=>input.onchange=()=>onChange(input.dataset.textVisible,input.checked,input.dataset.textItem===undefined?undefined:Number(input.dataset.textItem)));}
