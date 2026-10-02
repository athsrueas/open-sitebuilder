// Apply canvas changes to the same project model used by the inspector and export.
export function editText(block, spreadId, field, value) {
  const spread = spreadId ? block.spreads.find(s => s.id === spreadId) : null;
  if (spreadId && !spread) return false;
  const allowed = spread ? ['title', 'caption'] : ['title', 'label', 'text'];
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
export function assignArtwork(block, ids, spreadId) {
  if (!ids.length) return false;
  if (block.type === 'sketchbook') {
    const spread = block.spreads.find(s => s.id === spreadId);
    if (!spread) return false;
    spread.image = ids[0];
  } else if (block.type === 'image') block.images = [ids[0]];
  else if (['gallery', 'carousel'].includes(block.type)) block.images.push(...ids.filter(id => !block.images.includes(id)));
  else return false;
  return true;
}
