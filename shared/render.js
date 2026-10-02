export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor = v => /^#[0-9a-f]{6}$/i.test(v) ? v : '#f3eee5';
const image = (id, project, fit='contain') => {
  const asset = project.assets.find(a => a.id === id);
  return asset ? `<a href="${escapeHtml(asset.full)}" target="_blank" rel="noopener"><img src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt)}" loading="lazy" style="object-fit:${fit === 'cover' ? 'cover':'contain'}" /></a>` : '<div class="image-placeholder">Add artwork to this block</div>';
};
export function portfolioMarkup(project, pageId) {
  const page = project.pages.find(p => p.id === pageId) || project.pages[0];
  const t = project.theme;
  const css = `
    *{box-sizing:border-box}body{margin:0;background:${safeColor(t.background)};color:${safeColor(t.ink)};font-family:${t.serif ? 'Georgia,serif':'Arial,sans-serif'}}
    a{color:inherit}header{max-width:1200px;margin:auto;padding:32px 5%;display:flex;justify-content:space-between;gap:24px;align-items:center}header strong{font-size:22px}nav{display:flex;gap:22px;flex-wrap:wrap}nav a{text-decoration:none;font:12px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.4px}nav a.active{border-bottom:2px solid ${safeColor(t.accent)};padding-bottom:6px}
    main{max-width:${t.wide ? '1280':'1000'}px;margin:auto;padding:20px 5% 80px}.folio-block{margin:0 0 ${t.spacious ? '90':'40'}px}h1{font-size:clamp(36px,7vw,82px);font-weight:400;line-height:1.05;max-width:900px;margin:20px 0}h2{font-size:32px;font-weight:400}p{line-height:1.8;white-space:pre-wrap;max-width:700px}.eyebrow{font:11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${safeColor(t.accent)}}
    img{max-width:100%;display:block;width:100%;height:100%;border-radius:${t.rounded ? '12':'0'}px}.single-image{height:auto;max-height:850px}.single-image img{max-height:1200px}.single-image a{display:block;height:100%}.caption{font:12px Arial,sans-serif;margin-top:12px;opacity:.65}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.gallery figure{margin:0}.gallery a{height:400px;display:block}.image-placeholder{background:#00000008;min-height:220px;display:grid;place-items:center;font:14px Arial,sans-serif}.carousel{display:flex;overflow-x:auto;gap:20px;scroll-snap-type:x mandatory;padding-bottom:20px}.carousel figure{flex:0 0 85%;margin:0;scroll-snap-align:start}.carousel a{height:500px;display:block}
    .book-wrap{overflow:hidden;padding:20px 0}.book{margin:auto}.book:not([data-ready]){display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}.book:not([data-ready]) .book-page{height:480px}.book:not([data-ready])+.book-controls{display:none}.book-page{background:var(--paper);padding:24px;overflow:hidden;box-shadow:inset 0 0 25px #00000009}.book-page a{display:block;height:75%}.book-page h3{font-size:18px;font-weight:400}.book-page p{font-size:13px;line-height:1.5}.book-controls{display:flex;justify-content:center;align-items:center;gap:24px;margin-top:20px}.book-controls button{background:transparent;border:1px solid currentColor;padding:10px 16px;color:inherit;cursor:pointer}.rule{border:0;border-top:1px solid #0003}footer{padding:30px 5%;font:12px Arial,sans-serif;border-top:1px solid #0002;text-align:center}@media(max-width:600px){header{align-items:start;flex-direction:column}.gallery{grid-template-columns:1fr}.gallery a,.carousel a{height:320px}.book-page{padding:16px}}
  `;
  const html = `<header><strong data-project-edit="name">${escapeHtml(project.name)}</strong><nav>${project.pages.map((p,i) => `<a class="${p.id===page.id?'active':''}" data-page="${p.id}" href="${i===0?'/':'/'+p.slug+'/'}">${escapeHtml(p.title)}</a>`).join('')}</nav></header><main>${page.blocks.map(b => {
    const heading = `<div class="eyebrow" data-edit="label">${escapeHtml(b.label)}</div><h2 data-edit="title">${escapeHtml(b.title)}</h2>`;
    let content = '';
    if(b.type==='hero') content=`<div class="eyebrow" data-edit="label">${escapeHtml(b.label)}</div><h1 data-edit="title">${escapeHtml(b.title)}</h1><p data-edit="text">${escapeHtml(b.text)}</p>`;
    if(b.type==='text') content=heading+`<p data-edit="text">${escapeHtml(b.text)}</p>`;
    if(b.type==='image') content=`<div class="single-image" style="width:${Math.min(100,Math.max(20,Number(b.width)||100))}%;${b.height ? "height:"+Math.min(1200,Math.max(120,Number(b.height)||500))+"px;" : ""}margin-inline:auto">${image(b.images[0],project,b.fit)}</div><div class="caption" data-edit="text">${escapeHtml(b.text)}</div>`;
    if(b.type==='gallery'||b.type==='carousel') content=heading+`<div class="${b.type}">${b.images.map(id=>`<figure>${image(id,project,b.fit)}</figure>`).join('') || '<div class="image-placeholder">Add images in the editor</div>'}</div>`;
    if(b.type==='divider') content='<hr class="rule" />';
    if(b.type==='sketchbook') content=heading+`<div class="book-wrap"><div class="book" data-book="${b.id}">${b.spreads.map((s,i)=>`<div class="book-page" data-spread-id="${s.id}" style="--paper:${safeColor(s.background)}" data-density="${s.hard?'hard':'soft'}">${image(s.image,project,s.fit)}<h3 data-edit="title">${escapeHtml(s.title)}</h3><p data-edit="caption">${escapeHtml(s.caption)}</p><span class="caption">${i+1}</span></div>`).join('')}</div><div class="book-controls"><button data-prev="${b.id}" aria-label="Previous sketchbook page">← Previous</button><span data-count="${b.id}"></span><button data-next="${b.id}" aria-label="Next sketchbook page">Next →</button></div></div>`;
    return `<section class="folio-block" data-block="${b.id}">${content}</section>`;
  }).join('')}</main><footer>${escapeHtml(project.name)}${project.description ? " · " : ""}<span data-project-edit="description">${escapeHtml(project.description)}</span></footer>`;
  return { css, html };
}
export function renderPortfolio(root, project, pageId, PageFlip, navigate) {
  const { css, html } = portfolioMarkup(project, pageId);
  const style = document.createElement('style');
  style.textContent = css;
  const container = document.createElement('div');
  container.innerHTML = html;
  root.replaceChildren(style, container);
  return initPortfolio(root, PageFlip, navigate);
}
export function initPortfolio(root, PageFlip, navigate) {
  if(navigate) root.querySelectorAll('[data-page]').forEach(a=>a.onclick=e=>{e.preventDefault();navigate(a.dataset.page)});
  const books=[];
  root.querySelectorAll('[data-book]').forEach(el=>{
    if (!PageFlip) return; // Static pages remain visible if the animation library is unavailable.
    const count=el.children.length;
    if(count<2){el.innerHTML='<div class="image-placeholder">Add at least two sketchbook pages</div>';return;}
    el.dataset.ready='true';
    const flip=new PageFlip(el,{width:360,height:480,size:'stretch',minWidth:220,maxWidth:500,minHeight:300,maxHeight:670,showCover:true,startPage:Math.min(count-1,Number(el.dataset.startPage)||0),usePortrait:true, mobileScrollSupport:false});
    const status=root.querySelector(`[data-count="${el.dataset.book}"]`);
    flip.on('flip',e=>status.textContent=`${e.data+1} / ${count}`);
    flip.loadFromHTML(el.querySelectorAll('.book-page'));status.textContent=`${flip.getCurrentPageIndex()+1} / ${count}`;
    root.querySelector(`[data-prev="${el.dataset.book}"]`).onclick=()=>flip.flipPrev();
    root.querySelector(`[data-next="${el.dataset.book}"]`).onclick=()=>flip.flipNext();books.push(flip);
  });
  return ()=>books.forEach(b=>b.destroy());
}
