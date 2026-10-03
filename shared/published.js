// Build-time helpers. No editor catalogue or CSS parser is sent to the browser.
import {siteStyles} from './styles.js';
export function pageFeatures(project,page){
  const base=siteStyles(project.theme);
  const materials=page.blocks.map(b=>({...base,...b.styles}));
  return {books:page.blocks.some(b=>b.type==='sketchbook'),motion:materials.some(v=>v.paperMotion==='soft-light'||['bloom','drift'].includes(v.inkWash)),materials};
}
export function publishedLayers(v){
  const grain=v.paperTexture!=='none'?'<span class="paper-grain"></span>':'';
  const light=v.paperMotion==='soft-light'?'<span class="paper-light"></span>':'';
  const wash=v.inkWash!=='none'?'<span class="ink-wash"><i></i><i></i><i></i></span>':'';
  return grain||light||wash?`<span class="material-layers" aria-hidden="true">${grain}${light}${wash}</span>`:'';
}
export function cleanPublishedHtml(html){
  return html.replace(/<span\b[^>]*class="link-edit-label"[^>]*>[\s\S]*?<\/span>/g,'').replace(/\sdata-([\w-]+)(?:="[^"]*")?/g,(attr,name)=>['book','prev','next','count','density','material-motion'].includes(name)?attr:'')
    .replace(/\sstyle=""/g,'').replace(/<span>\s*<\/span>/g,'')
    .replace(/<(h[123]|p|div)\b([^>]*)>\s*<\/\1>/g,(all,tag,attrs)=>tag==='div'&&!/class="(?:eyebrow|caption)"/.test(attrs)?all:'');
}
function splitSelectors(text){
  const result=[];let start=0,depth=0,quote='';
  for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;if(c===','&&depth===0){result.push(text.slice(start,i));start=i+1;}}
  result.push(text.slice(start));return result;
}
export function prunePublishedCss(css,html){
  const tags=new Set(['html','head','body',...[...html.matchAll(/<([a-z][\w-]*)\b/gi)].map(m=>m[1].toLowerCase())]);
  const classes=new Set([...html.matchAll(/\bclass="([^"]*)"/g)].flatMap(m=>m[1].split(/\s+/)));
  // This parser processes our generated CSS, preserving nested media rules and
  // quoted SVG URLs. Negative selectors do not require a class to be present.
  const matches=selector=>{
    if(selector.includes('[contenteditable]'))return false;
    const positive=selector.replace(/:not\((?:[^()]|\([^()]*\))*\)/g,'');
    const plain=positive.replace(/:[\w-]+\((?:[^()]|\([^()]*\))*\)/g,'');
    return [...positive.matchAll(/\.([a-zA-Z_][\w-]*)/g)].every(m=>classes.has(m[1]))&&
      [...plain.matchAll(/(?:^|[\s>+~])([a-zA-Z][\w-]*)(?=[\s.#[:>+~]|$)/g)].every(m=>tags.has(m[1].toLowerCase()));
  };
  function prune(input){
    let output='',start=0,quote='',depth=0,opening=-1;
    for(let i=0;i<input.length;i++){
      const c=input[i];if(quote){if(c===quote&&input[i-1]!=='\\')quote='';continue;}
      if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='{'){if(depth++===0)opening=i;}
      else if(c==='}'&&--depth===0){
        const selector=input.slice(start,opening).trim(),body=input.slice(opening+1,i);
        if(selector.startsWith('@media')||selector.startsWith('@supports')){const nested=prune(body);if(nested)output+=selector+'{'+nested+'}';}
        else if(selector.startsWith('@keyframes')){const name=selector.split(/\s+/)[1];if((html+css.replace(input.slice(start,i+1),'')).includes(name))output+=selector+'{'+body.trim()+'}';}
        else {const kept=splitSelectors(selector).filter(matches).map(s=>s.trim());if(kept.length)output+=kept.join(',')+'{'+body.trim()+'}';}
        start=i+1;
      }
    }return output;
  }
  return prune(css).replaceAll(':not(.free-edit-desktop)','');
}
