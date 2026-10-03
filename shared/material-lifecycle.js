// Pause decorative motion outside the viewport and while the tab is hidden.
export function initMaterials(root){
  const nodes=[...(root.matches?.('.folio-block[data-material-motion]')?[root]:root.querySelectorAll('.folio-block[data-material-motion]'))];
  if(!nodes.length)return()=>{};
  const doc=root.ownerDocument,visible=new Set(nodes);
  const update=()=>nodes.forEach(n=>n.style.setProperty('--material-play',!doc.hidden&&visible.has(n)?'running':'paused'));
  const Observer=doc.defaultView.IntersectionObserver;
  const observer=Observer?new Observer(entries=>{for(const e of entries)e.isIntersecting?visible.add(e.target):visible.delete(e.target);update();}):null;
  nodes.forEach(n=>observer?.observe(n));doc.addEventListener('visibilitychange',update);update();
  return()=>{observer?.disconnect();doc.removeEventListener('visibilitychange',update);};
}
