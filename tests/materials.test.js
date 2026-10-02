import test from 'node:test';
import assert from 'node:assert/strict';
import {styleVars,siteStyles,validStyle} from '../shared/styles.js';
import {portfolioMarkup} from '../shared/render.js';
import {initMaterials} from '../shared/materials.js';

test('material overrides are validated, inherit and can explicitly disable site materials',()=>{
  const defaults=siteStyles({});
  assert.equal(defaults.paperTexture,'none');assert.equal(defaults.inkWash,'none');
  assert.equal(validStyle('paperTexture','url(https://evil)'),false);
  assert.equal(validStyle('paperStrength',101),false);assert.equal(validStyle('materialDuration',Infinity),false);
  assert.match(styleVars({paperStrength:60,materialDuration:12},true),/--paperStrength:60;--materialDuration:12s/);
  assert.match(styleVars({paperTexture:'none',inkWash:'none',inkFinish:'clean'},true),/--block-paper-display:none/);
  assert.match(styleVars({paperTexture:'none',inkWash:'none',inkFinish:'clean'},true),/--wash-display:none/);
  assert.match(styleVars({inkFinish:'clean'},true),/--ink-filter:none/);
  assert.doesNotMatch(styleVars({},true),/--paper-image|--ink-filter/);
});

test('export has self-contained materials, accessible decorative layers and motion fallback',()=>{
  const p={name:'Artist',description:'',theme:{paperTexture:'cotton',inkFinish:'dry-ink',inkWash:'bloom'},assets:[],pages:[{id:'p',blocks:[{id:'b',type:'text',title:'Title',text:'Body',label:''}]}]};
  const out=portfolioMarkup(p,'p');
  assert.match(out.css,/data:image\/svg\+xml/);assert.match(out.html,/class="material-layers" aria-hidden="true"/);
  assert.match(out.html,/id="folio-ink-dry-ink"/);assert.match(out.css,/prefers-reduced-motion:reduce/);
  assert.match(out.css,/\.folio-block :is\(h1,h2,h3,blockquote\)/);
  assert.doesNotMatch(out.css,/img\s*\{[^}]*filter:/);
});

test('motion pauses offscreen and hidden; cleanup removes observers and listeners',()=>{
  let handler,intersection,disconnected=false,removed=false;
  const styles=new Map();const node={style:{setProperty:(k,v)=>styles.set(k,v)}};
  const doc={hidden:false,defaultView:{IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}disconnect(){disconnected=true;}}},addEventListener:(_,fn)=>handler=fn,removeEventListener:(_,fn)=>removed=fn===handler};
  const stop=initMaterials({ownerDocument:doc,querySelectorAll:()=>[node]});
  assert.equal(styles.get('--material-play'),'running');
  intersection([{target:node,isIntersecting:false}]);assert.equal(styles.get('--material-play'),'paused');
  intersection([{target:node,isIntersecting:true}]);doc.hidden=true;handler();assert.equal(styles.get('--material-play'),'paused');
  doc.hidden=false;handler();assert.equal(styles.get('--material-play'),'running');stop();assert.ok(disconnected&&removed);
});
