import {materialVars,materialCss} from './materials.js';
import catalog from './styles.json' with {type:'json'};
export const {fonts:FONTS,fields:STYLE_FIELDS,presets:THEMES}=catalog;
export function validStyle(key,value,block=false){
  const f=STYLE_FIELDS[key];if(!f||(block&&f.siteOnly))return false;
  if(f.type==='color')return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
  if(f.type==='select')return f.options.includes(value);
  return typeof value==='number'&&Number.isFinite(value)&&value>=f.min&&value<=f.max;
}
export function siteStyles(theme){
  const values=Object.fromEntries(Object.entries(STYLE_FIELDS).map(([k,f])=>[k,f.default]));
  Object.assign(values,{bodyFont:theme.serif?'serif':'sans',headingFont:theme.serif?'serif':'sans',contentWidth:theme.wide?1280:1000,blockGap:theme.spacious?90:40,radius:theme.rounded?12:0});
  for(const [k,v] of Object.entries(theme))if(validStyle(k,v))values[k]=v;
  if(!theme.headingInk)values.headingInk=values.ink;
  return values;
}
export function styleVars(values,block=false){
  const result=[];
  for(const [k,v] of Object.entries(values||{})){
    if(!validStyle(k,v,block))continue;
    const f=STYLE_FIELDS[k],value=k.endsWith('Font')?FONTS[v].css:f.type==='number'&&!['lineHeight','galleryColumns'].includes(k)?v+(f.unit??'px'):v;
    result.push(`--${k==='background'&&block?'panel':k}:${value}`);
  }
  if(block&&validStyle('ink',values?.ink)&&!values.headingInk)result.push(`--headingInk:${values.ink}`);
  if(block&&validStyle('ink',values?.ink))result.push(`--coverInk:${values.ink}`);
  if(block&&validStyle('headingInk',values?.headingInk||values?.ink))result.push(`--coverHeadingInk:${values.headingInk||values.ink}`);
  const materials=materialVars(values||{},block);if(materials)result.push(materials);
  return result.join(';');
}
export function applyTheme(project,id){
  const preset=THEMES.find(t=>t.id===id);if(!preset)return false;
  project.theme={...project.theme,...preset.values,preset:id};return true;
}
export function setBlockStyle(block,key,value){
  if(value===null){if(block.styles)delete block.styles[key];return true;}
  if(!validStyle(key,value,true))return false;
  (block.styles??={})[key]=value;return true;
}
export function portfolioStyleCss(theme){return `
body{${styleVars(siteStyles(theme))};font-family:var(--bodyFont);font-size:var(--bodySize);color:var(--ink);background:var(--background)}
main,header{max-width:var(--contentWidth)}
.folio-block{background:var(--panel,transparent);color:var(--ink);font-family:var(--bodyFont);font-size:var(--bodySize);text-align:var(--align);padding:var(--padding);margin-bottom:var(--blockGap);letter-spacing:var(--letterSpacing)}
.folio-block h1,.folio-block h2,.folio-block h3{font-family:var(--headingFont);font-weight:var(--headingWeight);color:var(--headingInk)}
.folio-block h1{font-size:clamp(24px,8vw,var(--heroSize));max-width:none}
.folio-block h2{font-size:clamp(16px,5vw,var(--headingSize))}
.folio-block h3{font-size:calc(var(--headingSize)*.65)}
.folio-block p,.folio-block li,.folio-block td,.folio-block th,.folio-block blockquote{line-height:var(--lineHeight)}
.folio-block p{max-width:none;font-size:var(--bodySize)}
.folio-block .caption,.folio-block figcaption{font-family:var(--bodyFont);font-size:var(--captionSize)}
.folio-block .eyebrow{color:var(--accent);font-family:var(--bodyFont)}
.folio-block .folio-button,.folio-block .link-list a,.folio-block .social-links a{color:var(--accent)}
.folio-block .cover-text{--ink:var(--coverInk,#ffffff);--headingInk:var(--coverHeadingInk,#ffffff);color:var(--ink)}
.folio-block img{border-radius:var(--radius)}
.folio-block .gallery{grid-template-columns:repeat(var(--galleryColumns),minmax(0,1fr));gap:var(--gridGap)}
.folio-block .gallery a,.folio-block .carousel a{height:var(--imageHeight)}
.folio-block .carousel,.folio-block .artwork-cards,.folio-block .text-columns{gap:var(--gridGap)}
.folio-block .artwork-cards img{height:var(--imageHeight)}
.folio-block .folio-accordion summary{font-family:var(--headingFont);font-size:var(--headingSize)}
.folio-block .rule,footer{border-color:currentColor}
.book-page{color:#292d29;--ink:#292d29;--headingInk:#292d29}
.folio-block .book-page p{font-size:13px}
nav a.active{border-color:var(--accent)}
@media(max-width:600px){.folio-block .gallery{grid-template-columns:1fr}.folio-block .gallery a,.folio-block .carousel a,.folio-block .artwork-cards img{height:min(var(--imageHeight),400px)}.folio-block{padding:min(var(--padding),24px)}}
${materialCss}`;}
