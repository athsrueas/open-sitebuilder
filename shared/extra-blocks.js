import {freeLayoutMarkup,freeLayoutCss} from './free-layout.js';
import { safeUrl, videoEmbed } from './blocks.js';
export function extraBlockMarkup(b, project, {esc,image}) {
  const title=`<div class="eyebrow" data-edit="label">${esc(b.label)}</div><h2 data-edit="title">${esc(b.title)}</h2>`;
  const text=`<p data-edit="text">${esc(b.text)}</p>`;
  const link=(url,label,cls='')=>{const href=safeUrl(url);return href?`<a class="${cls}" href="${esc(href)}">${esc(label)}</a>`:`<span class="${cls}">${esc(label)}</span>`;};
  const items=(b.items||[]).map((item,i)=>{
    const heading=`<span data-edit="title">${esc(item.title)}</span>`;
    const body=`<p data-edit="text">${esc(item.text)}</p>`;
    const attr=`data-item-index="${i}"`;
    if(b.type==='accordion')return `<details ${attr}><summary>${heading}</summary>${body}</details>`;
    if(['links','social'].includes(b.type))return `<li ${attr}>${link(item.url,item.title)}<span data-edit="title" class="link-edit-label">${esc(item.title)}</span></li>`;
    if(b.type==='cards')return `<article ${attr}>${image(b.images[i],project,b.fit)}<h3>${heading}</h3>${body}${item.url?link(item.url,'View artwork','folio-button'):''}</article>`;
    return `<article ${attr}><h3>${heading}</h3>${body}</article>`;
  }).join('');
  switch(b.type){
    case 'freeLayout':return freeLayoutMarkup(b,project,esc);
    case 'heading':return title;
    case 'quote':return `<blockquote>${text}<cite data-edit="attribution">${esc(b.attribution)}</cite></blockquote>`;
    case 'list':return title+`<${b.ordered?'ol':'ul'} data-edit="text" class="folio-list">${String(b.text||'').split('\n').map(line=>`<li>${esc(line)}</li>`).join('')}</${b.ordered?'ol':'ul'}>`;
    case 'table':return title+`<div class="table-wrap"><table>${String(b.text||'').split('\n').map((row,r)=>`<tr>${row.split('|').map((cell,c)=>`<${r?'td':'th'} data-edit="text" data-cell="${r}:${c}">${esc(cell.trim())}</${r?'td':'th'}>`).join('')}</tr>`).join('')}</table></div>`;
    case 'code':return title+`<pre class="folio-code" data-edit="text"><code>${esc(b.text)}</code></pre>`;
    case 'accordion':return title+`<div class="folio-accordion">${items}</div>`;
    case 'columns':return title+`<div class="text-columns" style="--columns:${Math.min(4,Math.max(2,Number(b.columns)||2))}">${items}</div>`;
    case 'cards':return title+`<div class="artwork-cards">${items}</div>`;
    case 'imageText':return `<div class="image-text ${b.reverse?'reverse':''}"><div class="paired-image">${image(b.images[0],project,b.fit)}</div><div>${title}${text}</div></div>`;
    case 'cover':return `<div class="cover-image">${image(b.images[0],project,b.fit)}<div class="cover-text">${title}${text}</div></div>`;
    case 'video':{
      const embed=videoEmbed(b.url),url=safeUrl(b.url,true);
      return title+(embed?`<iframe class="folio-video" src="${esc(embed)}" title="${esc(b.title||'Video')}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`:url?`<video class="folio-video" controls preload="metadata" src="${esc(url)}"></video>`:'<div class="media-placeholder">Add a video URL</div>');
    }
    case 'audio':return title+(safeUrl(b.url,true)?`<audio controls preload="metadata" src="${esc(safeUrl(b.url,true))}"></audio>`:'<div class="media-placeholder">Add an audio file URL</div>');
    case 'button':case 'download':return link(b.url,b.buttonText||b.title,'folio-button');
    case 'links':case 'social':return title+`<ul class="link-list ${b.type==='social'?'social-links':''}">${items}</ul>`;
    case 'contact':return title+text+(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(b.email||'')?`<a href="mailto:${esc(encodeURIComponent(b.email))}">${esc(b.email)}</a>`:'');
    case 'spacer':return `<div class="folio-spacer" style="height:${Math.min(600,Math.max(0,Number(b.space)||0))}px"></div>`;
    default:return '';
  }
}
export const extraBlockCss=freeLayoutCss+`
  blockquote{border-left:3px solid currentColor;margin:0;padding:8px 24px;font-size:24px}cite{font:14px Arial,sans-serif}
  .folio-list{line-height:1.9;white-space:pre-wrap}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;text-align:left}td,th{border:1px solid #8885;padding:12px;min-width:100px}
  .folio-code{white-space:pre-wrap;overflow:auto;padding:20px;background:#8881;font:14px monospace}
  .folio-accordion details{border-bottom:1px solid #8885;padding:16px 0}.folio-accordion summary{cursor:pointer;font-size:20px}.folio-accordion p{margin-left:20px}
  .text-columns,.artwork-cards{display:grid;grid-template-columns:repeat(var(--columns,3),minmax(0,1fr));gap:24px}.artwork-cards article>a:first-child{height:300px;display:block}.artwork-cards h3{font-size:22px;font-weight:400}.artwork-cards .image-placeholder{height:300px}
  .image-text{display:grid;grid-template-columns:1fr 1fr;gap:35px;align-items:center}.image-text.reverse .paired-image{order:2}.paired-image>a{height:450px;display:block}
  .cover-image{position:relative;min-height:400px;isolation:isolate}.cover-image>a,.cover-image>.image-placeholder{position:absolute;inset:0;width:100%;height:100%;z-index:-2}.cover-image::before{content:'';position:absolute;inset:0;background:#0007;z-index:-1}.cover-text{padding:60px 8%;color:white;min-height:400px;display:flex;flex-direction:column;justify-content:center}
  .folio-video{width:100%;aspect-ratio:16/9;border:0;display:block;background:#000}.media-placeholder{padding:60px 20px;background:#8881;text-align:center}audio{width:100%}
  .folio-button{display:inline-block;padding:12px 22px;border:1px solid currentColor;border-radius:4px;text-decoration:none}.link-list{padding:0;list-style:none;line-height:2.2}.social-links{display:flex;gap:20px;flex-wrap:wrap}.link-edit-label{display:none}
  @media(max-width:650px){.text-columns,.artwork-cards,.image-text{grid-template-columns:1fr}.image-text.reverse .paired-image{order:0}}
`;
