// Procedural, self-contained materials. No photos, remote services or GPU library.
const svgImage = markup => `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
const tile = (frequency, relief, fibers='') => svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" seed="17" stitchTiles="stitch"/><feDiffuseLighting surfaceScale="${relief}" diffuseConstant=".8" lighting-color="white"><feDistantLight azimuth="225" elevation="45"/></feDiffuseLighting><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .22"/></feComponentTransfer></filter><rect width="240" height="240" filter="url(#grain)"/>${fibers}</svg>`);
// Deterministic fibers; the same material always looks the same in preview/export.
let seed=31;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const fibers=Array.from({length:90},()=>{const x=random()*240,y=random()*240;return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}q${(random()*9-4).toFixed(1)} -2 ${(random()*18+3).toFixed(1)} ${(random()*5-2).toFixed(1)}" stroke="#302b22" stroke-opacity=".13" stroke-width=".45" fill="none"/>`;}).join('');
const laid=Array.from({length:60},(_,i)=>`<path d="M0 ${i*4+.5}H240" stroke="#342d23" stroke-opacity="${i%10===0?'.16':'.07'}" stroke-width="${i%10===0?'1':'.6'}"/>`).join('');
export const PAPER_IMAGES={none:'none',cotton:tile('.55',1.4,fibers),watercolor:tile('.085 .12',1.8,fibers),laid:tile('.6',.8,laid),canvas:tile('.35',1.5,`<defs><pattern id="weave" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 1H6M1 0V6" stroke="#302b22" stroke-opacity=".13" stroke-width="1"/><path d="M0 2H6M2 0V6" stroke="white" stroke-opacity=".4" stroke-width="1"/></pattern></defs><rect width="240" height="240" fill="url(#weave)"/>`)};
export const INK_MASK=svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><filter id="edge" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".027" numOctaves="3" seed="41" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="62" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="2"/></filter><g filter="url(#edge)" fill="black"><ellipse cx="255" cy="250" rx="142" ry="156" opacity=".6"/><ellipse cx="219" cy="238" rx="132" ry="145" opacity=".4"/><ellipse cx="281" cy="271" rx="101" ry="115" opacity=".5"/></g></svg>`);
export function materialVars(values,block=false){
  const result=[];
  if(Object.hasOwn(PAPER_IMAGES,values.paperTexture))result.push(`--paper-image:${values.paperTexture==='none'?'none':`var(--material-paper-${values.paperTexture},none)`}`,...(block?[`--block-paper-display:${values.paperTexture==='none'?'none':'block'}`]:[]));
  if(['none','soft-light'].includes(values.paperMotion))result.push(`--paper-light-display:${values.paperMotion==='none'?'none':'block'}`);
  if(['clean','letterpress','dry-ink','bleed'].includes(values.inkFinish))result.push(`--ink-filter:${values.inkFinish==='clean'?'none':`url(#folio-ink-${values.inkFinish})`}`);
  if(['none','still','bloom','drift'].includes(values.inkWash))result.push(`--wash-display:${values.inkWash==='none'?'none':'block'}`,`--wash-animation:${['bloom','drift'].includes(values.inkWash)?'folio-ink-'+values.inkWash:'none'}`);
  return result.join(';');
}
export function materialTextureCss(styles){
  const used=new Set(styles.map(s=>s?.paperTexture).filter(k=>k!=='none'&&Object.hasOwn(PAPER_IMAGES,k)));
  return used.size?`body{${[...used].map(k=>`--material-paper-${k}:${PAPER_IMAGES[k]}`).join(';')}}`:'';
}
export const materialDefs=`<svg class="material-defs" aria-hidden="true" width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs>
<filter id="folio-ink-letterpress" x="-5%" y="-15%" width="110%" height="130%"><feMorphology operator="dilate" radius=".12"/><feDropShadow dx="0" dy=".7" stdDeviation=".2" flood-color="white" flood-opacity=".55"/></filter>
<filter id="folio-ink-dry-ink" x="-5%" y="-15%" width="110%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="9" result="grain"/><feColorMatrix in="grain" type="luminanceToAlpha"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1 1"/></feComponentTransfer><feComposite in="SourceGraphic" operator="in"/></filter>
<filter id="folio-ink-bleed" x="-5%" y="-15%" width="110%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="23" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="1.4" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".18"/></filter>
</defs></svg>`;
export const materialLayers='<span class="material-layers" aria-hidden="true"><span class="paper-grain"></span><span class="paper-light"></span><span class="ink-wash"><i></i><i></i><i></i></span></span>';
export const materialCss=`
body{position:relative;isolation:isolate;--block-paper-display:block;--material-play:running}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:var(--paper-image);background-size:var(--paperScale);opacity:calc(var(--paperStrength)/100);mix-blend-mode:multiply}
.material-defs{position:absolute;pointer-events:none;overflow:hidden}
.folio-block{position:relative;isolation:isolate;background-color:var(--panel,var(--background))}
.material-layers{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:var(--radius);overflow:hidden;contain:paint}
.paper-grain{display:var(--block-paper-display);position:absolute;inset:0;background-image:var(--paper-image);background-size:var(--paperScale);opacity:calc(var(--paperStrength)/100);mix-blend-mode:multiply}
.book-page{isolation:isolate}
.book-page::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:var(--paper-image);background-size:var(--paperScale);opacity:calc(var(--paperStrength)/100);mix-blend-mode:multiply}
.paper-light{display:var(--paper-light-display);position:absolute;inset:-50%;background:linear-gradient(115deg,transparent 25%,#ffffff55 45%,#ffffff77 50%,#0000000a 60%,transparent 75%);animation:folio-paper-light var(--materialDuration) ease-in-out infinite alternate;animation-play-state:var(--material-play)}
.ink-wash{display:var(--wash-display);position:absolute;inset:0;opacity:calc(var(--inkWashStrength)/100)}
.ink-wash i{position:absolute;width:70%;aspect-ratio:1;left:-20%;top:-30%;background:var(--inkWashColor);mask-image:${INK_MASK};mask-size:100% 100%;animation:var(--wash-animation) var(--materialDuration) ease-in-out infinite alternate;animation-play-state:var(--material-play);transform-origin:45% 55%}
.ink-wash i:nth-child(2){width:65%;left:55%;top:25%;animation-delay:calc(var(--materialDuration)*-.35);transform:rotate(75deg)}
.ink-wash i:nth-child(3){width:45%;left:25%;top:65%;animation-delay:calc(var(--materialDuration)*-.7);transform:rotate(150deg)}
.folio-block :is(h1,h2,h3,blockquote){filter:var(--ink-filter)}
.folio-block [contenteditable]:focus{filter:none}
@keyframes folio-paper-light{from{transform:translateX(-12%) rotate(-4deg);opacity:.3}to{transform:translateX(12%) rotate(4deg);opacity:.8}}
@keyframes folio-ink-bloom{from{scale:.65;opacity:.35;rotate:-10deg}to{scale:1.2;opacity:.9;rotate:10deg}}
@keyframes folio-ink-drift{from{translate:-5% -3%;rotate:-8deg}to{translate:8% 6%;rotate:12deg}}
@media(prefers-reduced-motion:reduce){.paper-light,.ink-wash i{animation:none!important}}
@media print{.paper-light,.ink-wash i{animation:none!important}}
`;
