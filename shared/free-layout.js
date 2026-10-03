export const clamp = (value,min,max) => Math.min(max,Math.max(min,Number(value)||0));
export function newLayer(kind,assetId='') {
  return {id:crypto.randomUUID().replaceAll('-',''),kind,assetId,text:kind==='text'?'Write here':'',x:10,y:10,w:kind==='text'?45:40,h:kind==='text'?25:50,fontSize:32,color:'#111111',background:'#ffffff',opaque:false,fit:'contain'};
}
export function validLayers(layers,assets) {
  return Array.isArray(layers)&&layers.length<=100&&new Set(layers.map(l=>l.id)).size===layers.length&&layers.every(l=>
    /^[a-f0-9]{32}$/.test(l.id)&&['image','text'].includes(l.kind)&&typeof l.text==='string'&&l.text.length<=20000&&
    (l.assetId===''||assets.some(a=>a.id===l.assetId))&&['contain','cover'].includes(l.fit)&&typeof l.opaque==='boolean'&&
    [l.color,l.background].every(c=>/^#[a-f0-9]{6}$/i.test(c))&&Number.isFinite(l.fontSize)&&l.fontSize>=8&&l.fontSize<=160&&
    [l,...(l.mobile?[l.mobile]:[])].every(g=>['x','y','w','h'].every(k=>Number.isFinite(g[k]))&&g.x>=0&&g.y>=0&&g.w>=5&&g.h>=5&&g.x+g.w<=100.01&&g.y+g.h<=100.01)&&l.x>=0&&l.y>=0&&l.w>=5&&l.h>=5&&l.x+l.w<=100.01&&l.y+l.h<=100.01);
}
export function freeLayoutMarkup(block,project,esc) {
  return `<div class="free-stage ${block.mobileStack||(block.layers||[]).some(l=>!l.mobile)?'free-stack':''}" aria-label="Free layout">${(block.layers||[]).map((l,i)=>{
    const asset=project.assets.find(a=>a.id===l.assetId);
    const m=l.mobile||{x:5,y:Math.min(80,i*20+5),w:90,h:18};
    const content=l.kind==='text'?`<div class="free-text" data-layer-text>${esc(l.text)}</div>`:asset?`<img draggable="false" src="${esc(asset.src)}" width="${Number(asset.width)||1000}" height="${Number(asset.height)||700}" alt="${esc(asset.alt)}" loading="lazy" decoding="async" style="object-fit:${l.fit}">`:'<div class="free-missing">Add an image</div>';
    return `<div class="free-layer" data-layer="${esc(l.id)}" style="--layer-font:${clamp(l.fontSize,8,160)}px;--mx:${clamp(m.x,0,95)}%;--my:${clamp(m.y,0,95)}%;--mw:${clamp(m.w,5,100)}%;--mh:${clamp(m.h,5,100)}%;left:${clamp(l.x,0,95)}%;top:${clamp(l.y,0,95)}%;width:${clamp(l.w,5,100)}%;height:${clamp(l.h,5,100)}%;z-index:${i+1};font-size:${clamp(l.fontSize,8,160)/10}cqw;color:${esc(l.color)};background:${l.opaque?esc(l.background):'transparent'}">${content}</div>`;
  }).join('')}</div>`;
}
export const freeLayoutCss=`
 .free-stage{position:relative;aspect-ratio:10/7;container-type:inline-size;isolation:isolate}
 .free-layer{position:absolute;box-sizing:border-box;overflow:hidden;min-width:0}
 .free-layer img{width:100%;height:100%;display:block}
 .free-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.25;height:100%;font:inherit;color:inherit}
 .free-missing{height:100%;display:grid;place-items:center;border:1px dashed #888;font:14px Arial}
 @media(max-width:650px){.free-stage:not(.free-stack):not(.free-edit-desktop){aspect-ratio:2/3}.free-stage:not(.free-stack):not(.free-edit-desktop)>.free-layer{left:var(--mx)!important;top:var(--my)!important;width:var(--mw)!important;height:var(--mh)!important;font-size:clamp(16px,var(--layer-font),80px)}.free-stack{aspect-ratio:auto;display:flex;flex-direction:column;gap:20px}.free-stack>.free-layer{position:relative!important;inset:auto!important;width:100%!important;height:auto!important;font-size:clamp(18px,5cqw,32px)!important}.free-stack .free-layer img{height:auto;max-height:80vh;object-fit:contain!important}}
`;
