import {pageFeatures,publishedLayers,cleanPublishedHtml,prunePublishedCss} from './published.js';
import {initPortfolio} from './runtime.js';
export {initPortfolio} from './runtime.js';
import {materialDefs,materialLayers} from './materials.js';
import {portfolioStyleCss,styleVars} from './styles.js';
import { extraBlockMarkup, extraBlockCss } from './extra-blocks.js';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor = v => /^#[0-9a-f]{6}$/i.test(v) ? v : '#f3eee5';
const assetIndexes=new WeakMap();
const image = (id, project, fit='contain') => {
  let index=assetIndexes.get(project.assets);if(!index||index.size!==project.assets.length){index=new Map(project.assets.map(a=>[a.id,a]));assetIndexes.set(project.assets,index);}
  const asset = index.get(id);
  const widths=new Set(),srcset=asset?[['thumb',480],['medium',1200],['src',2400]].filter(([key])=>asset[key]).map(([key,size])=>{const width=Math.round(asset.width*Math.min(1,size/Math.max(asset.width,asset.height)));if(!width||widths.has(width))return '';widths.add(width);return `${asset[key]} ${width}w`;}).filter(Boolean).join(', '):'';
  return asset ? `<${project.discourageImageDownloads?'span':'a'} class="artwork-view" ${project.discourageImageDownloads?'':`href="${escapeHtml(asset.full)}" target="_blank" rel="noopener"`}><img data-asset-id="${escapeHtml(asset.id)}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt)}" loading="lazy" decoding="async" ${asset.width&&asset.height?`width="${asset.width}" height="${asset.height}"`:''} ${srcset?`srcset="${escapeHtml(srcset)}" sizes="(max-width:600px) 100vw, 1000px"`:''} style="object-fit:${fit === 'cover' ? 'cover':'contain'}" draggable="false" /></${project.discourageImageDownloads?'span':'a'}>` : '<div class="image-placeholder">Add artwork to this block</div>';
};
export function portfolioMarkup(project, pageId, options={}) {
  const page = project.pages.find(p => p.id === pageId) || project.pages[0];
  const t = project.theme;
  const splash=project.presentation==='splash';
  const features=pageFeatures(project,page);
  const css = extraBlockCss + `
    *{box-sizing:border-box}body{margin:0;background:${safeColor(t.background)};color:${safeColor(t.ink)};font-family:${t.serif ? 'Georgia,serif':'Arial,sans-serif'}}
    a{color:inherit}header{max-width:1200px;margin:auto;padding:32px 5%;display:flex;justify-content:space-between;gap:24px;align-items:center}header strong{font-size:22px}nav{display:flex;gap:22px;flex-wrap:wrap}nav a{text-decoration:none;font:12px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.4px}nav a.active{border-bottom:2px solid ${safeColor(t.accent)};padding-bottom:6px}
    main{max-width:${t.wide ? '1280':'1000'}px;margin:auto;padding:20px 5% 80px}.folio-block{margin:0 0 ${t.spacious ? '90':'40'}px}h1{font-size:clamp(36px,7vw,82px);font-weight:400;line-height:1.05;max-width:900px;margin:20px 0}h2{font-size:32px;font-weight:400}p{line-height:1.8;white-space:pre-wrap;max-width:700px}.eyebrow{font:11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${safeColor(t.accent)}}
    img{max-width:100%;display:block;width:100%;height:100%;border-radius:${t.rounded ? '12':'0'}px}.single-image{height:auto;max-height:850px}.single-image img{max-height:1200px}.single-image .artwork-view{display:block;height:100%}.caption{font:12px Arial,sans-serif;margin-top:12px;opacity:.65}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.gallery figure{margin:0}.gallery .artwork-view{height:400px;display:block}.image-placeholder{background:#00000008;min-height:220px;display:grid;place-items:center;font:14px Arial,sans-serif}.carousel{display:flex;overflow-x:auto;gap:20px;scroll-snap-type:x mandatory;padding-bottom:20px}.carousel figure{flex:0 0 85%;margin:0;scroll-snap-align:start}.carousel .artwork-view{height:500px;display:block}
    .book-wrap{overflow:hidden;padding:20px 0}.book{margin:auto}.book:not([data-ready]){display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}.book:not([data-ready]) .book-page{height:480px}.book:not([data-ready])+.book-controls{display:none}.book-page{background:var(--paper);padding:24px;overflow:hidden;box-shadow:inset 0 0 25px #00000009}.book-page .artwork-view{display:block;height:75%}.book-page h3{font-size:18px;font-weight:400}.book-page p{font-size:13px;line-height:1.5}.book-controls{display:flex;justify-content:center;align-items:center;gap:24px;margin-top:20px}.book-controls button{background:transparent;border:1px solid currentColor;padding:10px 16px;color:inherit;cursor:pointer}.rule{border:0;border-top:1px solid #0003}footer{padding:30px 5%;font:12px Arial,sans-serif;border-top:1px solid #0002;text-align:center}@media(max-width:600px){header{align-items:start;flex-direction:column}.gallery{grid-template-columns:1fr}.gallery .artwork-view,.carousel .artwork-view{height:320px}.book-page{padding:16px}}
  `;
  const styledCss = css + (project.discourageImageDownloads?'img{-webkit-touch-callout:none;user-select:none;-webkit-user-drag:none}':'') + portfolioStyleCss(t,page.blocks)+(splash?`
    main.splash-page{max-width:none;padding:0;min-height:100svh}
    .splash-page .folio-block{min-height:100svh;margin:0;padding:80px max(24px,8vw);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
    .splash-page h1{font-size:clamp(42px,8.5vw,var(--heroSize));line-height:1.04;max-width:1000px;white-space:pre-line;margin:26px 0;letter-spacing:-.035em;text-wrap:balance}
    .splash-page .eyebrow{font-size:12px;letter-spacing:.18em}.splash-page p{max-width:620px}
    .splash-page p:empty,.splash-page .eyebrow:empty{display:none}
    .splash-page .ink-wash i{width:85%;left:-28%;top:-40%}.splash-page .ink-wash i:nth-child(2){width:85%;left:50%;top:18%}.splash-page .ink-wash i:nth-child(3){width:50%;left:28%;top:72%}
  `:'');
  let html = (options.published?publishedDefs(features.materials):materialDefs)+(splash?'':`<header><strong data-project-edit="name">${escapeHtml(project.name)}</strong><nav>${project.pages.map((p,i) => `<a class="${p.id===page.id?'active':''}" data-page="${p.id}" href="${i===0?'/':'/'+p.slug+'/'}">${escapeHtml(p.title)}</a>`).join('')}</nav></header>`)+`<main${splash?' class="splash-page"':''}>${page.blocks.map((b,blockIndex) => {
    const reused=options.reuseBlock?.(b);if(reused)return reused;
    const heading = `<div class="eyebrow" data-edit="label">${escapeHtml(b.label)}</div><h2 data-edit="title">${escapeHtml(b.title)}</h2>`;
    let content = extraBlockMarkup(b,project,{esc:escapeHtml,image});
    if(b.type==='hero') content=`<div class="eyebrow" data-edit="label">${escapeHtml(b.label)}</div><h1 data-edit="title">${escapeHtml(b.title)}</h1><p data-edit="text">${escapeHtml(b.text)}</p>`;
    if(b.type==='text') content=heading+`<p data-edit="text">${escapeHtml(b.text)}</p>`;
    if(b.type==='image') content=`<div class="single-image" style="width:${Math.min(100,Math.max(20,Number(b.width)||100))}%;${b.height ? "height:"+Math.min(1200,Math.max(120,Number(b.height)||500))+"px;" : ""}margin-inline:auto">${image(b.images[0],project,b.fit)}</div><div class="caption" data-edit="text">${escapeHtml(b.text)}</div>`;
    if(b.type==='gallery'||b.type==='carousel') content=heading+`<div class="${b.type}">${b.images.map(id=>`<figure>${image(id,project,b.fit)}</figure>`).join('') || '<div class="image-placeholder">Add images in the editor</div>'}</div>`;
    if(b.type==='divider') content='<hr class="rule" />';
    if(b.type==='sketchbook') content=heading+`<div class="book-wrap"><div class="book" data-book="${b.id}">${b.spreads.map((s,i)=>`<div class="book-page" data-spread-id="${s.id}" style="--paper:${safeColor(s.background)}" data-density="${s.hard?'hard':'soft'}">${image(s.image,project,s.fit)}<h3 data-edit="title">${escapeHtml(s.title)}</h3><p data-edit="caption">${escapeHtml(s.caption)}</p><span class="caption">${i+1}</span></div>`).join('')}</div><div class="book-controls"><button data-prev="${b.id}" aria-label="Previous sketchbook page">← Previous</button><span data-count="${b.id}"></span><button data-next="${b.id}" aria-label="Next sketchbook page">Next →</button></div></div>`;
    return `<section class="folio-block" ${features.materials[blockIndex].paperMotion==='soft-light'||['bloom','drift'].includes(features.materials[blockIndex].inkWash)?'data-material-motion="true"':''} data-block="${b.id}" style="${escapeHtml(styleVars(b.styles,true))}">${options.published?publishedLayers(features.materials[blockIndex]):materialLayers}${content}</section>`;
  }).join('')}</main>`+(splash?'':`<footer>${escapeHtml(project.name)}${project.description ? " · " : ""}<span data-project-edit="description">${escapeHtml(project.description)}</span></footer>`);
  if(options.published){html=cleanPublishedHtml(html);return {css:prunePublishedCss(styledCss,html),html,features};}
  return { css:styledCss, html,features };
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

function publishedDefs(materials){
  const used=new Set(materials.map(v=>v.inkFinish).filter(v=>v!=='clean'));
  if(!used.size)return '';
  return materialDefs.replace(/<filter id="folio-ink-([^"]+)"[\s\S]*?<\/filter>/g,(markup,name)=>used.has(name)?markup:'');
}
