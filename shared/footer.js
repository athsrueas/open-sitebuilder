import {resolveLink} from './links.js';
import {safeUrl} from './blocks.js';

export function footerSettings(project){
  return {enabled:true,showName:true,text:project.description||'',links:[],...project.footer};
}
export function footerMarkup(project,esc){
  const footer=footerSettings(project);
  if(!footer.enabled||project.presentation==='splash')return '';
  const links=footer.links.map(link=>{
    const url=safeUrl(resolveLink(link.url,project));
    return url&&link.title.trim()?`<a href="${esc(url)}">${esc(link.title)}</a>`:'';
  }).join('');
  return `<footer>${footer.showName?`<span>${esc(project.name)}</span>`:''}<p data-footer-edit="text">${esc(footer.text)}</p>${links?`<nav aria-label="Footer links">${links}</nav>`:''}</footer>`;
}
