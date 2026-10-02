import { portfolioMarkup, initPortfolio } from '/shared/render.js';

// Keep unchanged sketchbooks mounted while editing surrounding text.
const root = document.querySelector('#portfolio');
let sections = new Map();
let selectedBlockId;
const editorStyle = document.createElement('style');
editorStyle.textContent = `
  .folio-block{position:relative;scroll-margin-top:30px;cursor:pointer}
  .folio-block.is-selected{outline:2px solid #798269;outline-offset:12px}
  .folio-block.is-selected::before{content:'Editing this block';position:absolute;top:-28px;left:0;background:#354d37;color:white;font:10px Arial,sans-serif;padding:5px 8px;border-radius:4px}
  #drop-marker{position:fixed;height:4px;background:#607b46;z-index:9999;pointer-events:none;display:none}
  #drop-marker::before{content:'Drop block here';position:absolute;top:-25px;left:0;background:#354d37;color:#fff;font:11px Arial,sans-serif;padding:5px 10px;border-radius:4px}
`;
document.head.append(editorStyle);
const marker = document.createElement('div');
marker.id = 'drop-marker';
document.body.append(marker);
const send = data => parent.postMessage(data, location.origin);

function render(data) {
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
      old?.cleanup?.();
      next.set(b.id, {signature, node:fresh});
    }
  }
  for (const [id, old] of sections) if (!next.has(id)) old.cleanup?.();
  const style = document.createElement('style');
  style.textContent = markup.css;
  root.replaceChildren(style, container);
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
  if (e.target.closest('nav, .book-controls, .book-page')) return;
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
document.addEventListener('dragover', e => {
  if (!e.dataTransfer.types.includes('text/plain')) return;
  e.preventDefault();
  const next = insertionPoint(e.clientY);
  const main = root.querySelector('main');
  if (!main) return;
  const rect = main.getBoundingClientRect();
  const last = main.lastElementChild?.getBoundingClientRect();
  marker.style.cssText = `display:block;left:${rect.left+20}px;width:${Math.max(0,rect.width-40)}px;top:${Math.max(28,Math.min(window.innerHeight-10,next?.getBoundingClientRect().top ?? last?.bottom ?? rect.top))}px`;
});
document.addEventListener('drop', e => {
  e.preventDefault();marker.style.display='none';
  send({type:'drop-block', value:e.dataTransfer.getData('text/plain'), beforeId:insertionPoint(e.clientY)?.dataset.block ?? null});
});
document.addEventListener('dragleave', e => {if (!e.relatedTarget) marker.style.display='none';});
send({type:'ready'});
