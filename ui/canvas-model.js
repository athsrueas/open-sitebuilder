// Apply canvas changes to the same project model used by the inspector and export.
export function editText(block, spreadId, field, value, itemIndex) {
  if(typeof value!=='string'||value.length>20000)return false;
  if(field.startsWith('cell:')&&block.type==='table'){
    const match=field.match(/^cell:(\d+):(\d+)$/);if(!match)return false;
    const rows=block.text.split('\n').map(row=>row.split('|').map(cell=>cell.trim()));
    const r=Number(match[1]),c=Number(match[2]);if(!rows[r]||c>=rows[r].length)return false;
    rows[r][c]=value.replace(/[|\r\n]/g,' ');
    block.text=rows.map(row=>row.join(' | ')).join('\n');return true;
  }
  if(itemIndex!==undefined){
    if(!Number.isInteger(itemIndex)||!block.items?.[itemIndex]||!['title','text'].includes(field))return false;
    block.items[itemIndex][field]=value;return true;
  }
  const spread = spreadId ? block.spreads.find(s => s.id === spreadId) : null;
  if (spreadId && !spread) return false;
  const allowed = spread ? ['title', 'caption'] : ['title', 'label', 'text', 'attribution'];
  if (!allowed.includes(field) || typeof value !== 'string' || value.length > 20000) return false;
  (spread || block)[field] = value;
  return true;
}
export function resizeImage(block, width, height) {
  if (block.type !== 'image' || !Number.isFinite(width) || !Number.isFinite(height)) return false;
  block.width = Math.round(Math.min(100, Math.max(20, width)));
  block.height = Math.round(Math.min(1200, Math.max(120, height)));
  return true;
}
export function assignArtwork(block, ids, spreadId, itemIndex) {
  if (!ids.length) return false;
  if (block.type === 'sketchbook') {
    const spread = block.spreads.find(s => s.id === spreadId);
    if (!spread) return false;
    spread.image = ids[0];
  } else if (['image','imageText','cover'].includes(block.type)) block.images = [ids[0]];
  else if(block.type==='cards'){
    if(Number.isInteger(itemIndex)&&itemIndex>=0&&itemIndex<block.items.length){while(block.images.length<=itemIndex)block.images.push('');block.images[itemIndex]=ids[0];}
    else for(const id of ids){const index=block.images.length;if(!block.items[index])block.items.push({title:'',text:'',url:''});block.images.push(id);}
  }
  else if (['gallery', 'carousel'].includes(block.type)) block.images.push(...ids.filter(id => !block.images.includes(id)));
  else return false;
  return true;
}
