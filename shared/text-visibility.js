export const TEXT_FIELDS={image:['text'],gallery:['label','title'],carousel:['label','title'],cards:['label','title'],imageText:['label','title','text'],cover:['label','title','text'],sketchbook:['label','title'],video:['label','title'],audio:['label','title']};
export const textVisible=(object,field)=>!object.hiddenText?.includes(field);
export function setTextVisibility(block,field,visible,itemIndex){
  const item=itemIndex===undefined?block:Number.isInteger(itemIndex)&&block.type==='cards'?block.items?.[itemIndex]:null;
  const allowed=itemIndex===undefined?TEXT_FIELDS[block.type]:['title','text'];
  if(!item||!allowed?.includes(field)||typeof visible!=='boolean')return false;
  const hidden=new Set(item.hiddenText||[]);visible?hidden.delete(field):hidden.add(field);
  if(hidden.size)item.hiddenText=[...hidden];else delete item.hiddenText;
  return true;
}
export function setAllTextVisibility(block,visible){
  if(!TEXT_FIELDS[block.type])return false;
  TEXT_FIELDS[block.type].forEach(field=>setTextVisibility(block,field,visible));
  if(block.type==='cards')(block.items||[]).forEach((_,index)=>['title','text'].forEach(field=>setTextVisibility(block,field,visible,index)));
  return true;
}
export function allTextRemoved(block){return !!TEXT_FIELDS[block.type]&&TEXT_FIELDS[block.type].every(field=>!textVisible(block,field))&&(block.type!=='cards'||(block.items||[]).every(item=>['title','text'].every(field=>!textVisible(item,field))));}
