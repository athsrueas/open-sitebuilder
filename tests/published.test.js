import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioMarkup} from '../shared/render.js';
import {prunePublishedCss,pageFeatures} from '../shared/published.js';
import {BLOCKS} from '../shared/blocks.js';
import {newLayer} from '../shared/free-layout.js';
const project=()=>({name:'Artist',description:'',theme:{},assets:[],pages:[{id:'p',title:'Work',slug:'work',blocks:[{id:'b',type:'text',title:'Title',text:'Body',label:'',styles:{}}]}]});
test('static exports discard editor metadata, materials and unused block CSS',()=>{
 const p=project(),editor=portfolioMarkup(p,'p'),out=portfolioMarkup(p,'p',{published:true});
 assert.doesNotMatch(out.html,/data-edit|data-block|data-project-edit|material-layers|material-defs/);
 assert.doesNotMatch(out.css,/\.gallery|\.book|\.free-stage|\.folio-video|\.ink-wash|contenteditable|data:image/);
 assert.match(out.css,/\.folio-block/);assert.match(out.html,/Title/);
 assert.ok(out.html.length+out.css.length<(editor.html.length+editor.css.length)*.5);
 assert.equal(out.features.motion,false);assert.equal(out.features.books,false);
});
test('CSS pruning preserves nesting, negative selectors and quoted braces',()=>{
 const css='.used{content:"}"}.missing{color:red}@media(max-width:600px){.used:not(.absent){color:blue}.missing{color:red}}';
 assert.equal(prunePublishedCss(css,'<div class="used"></div>'),'.used{content:"}"}@media(max-width:600px){.used:not(.absent){color:blue}}');
});
test('each supported block retains its used layout CSS in published mode',()=>{
 for(const [type,definition] of Object.entries(BLOCKS)){
   const p=project(),b={id:'b',type,title:'Title',label:'',text:'Text',images:[],spreads:[],fit:'contain',...structuredClone(definition.defaults)};
   if(type==='freeLayout')b.layers=[newLayer('text')];
   p.pages[0].blocks=[b];const out=portfolioMarkup(p,'p',{published:true});
   const expected={freeLayout:'.free-stage',imageText:'.image-text',gallery:'.gallery',sketchbook:'.book',carousel:'.carousel',columns:'.text-columns',cards:'.artwork-cards',accordion:'.folio-accordion',cover:'.cover-image'}[type];
   if(expected)assert.ok(out.css.includes(expected),type+' layout retained');
   assert.doesNotMatch(out.html,/data-edit|data-layer|data-item-index/);
 }
});
test('materials retain only selected effects and expose runtime requirements',()=>{
 const p=project();p.theme={paperTexture:'cotton',inkFinish:'dry-ink',inkWash:'still'};
 const out=portfolioMarkup(p,'p',{published:true});
 assert.match(out.html,/paper-grain|ink-wash|folio-ink-dry-ink/);assert.doesNotMatch(out.html,/paper-light|folio-ink-letterpress|folio-ink-bleed/);
 assert.equal(out.features.motion,false);assert.match(out.css,/mask-image/);
 p.theme.inkWash='bloom';assert.equal(pageFeatures(p,p.pages[0]).motion,true);
 p.pages[0].blocks[0].styles={inkWash:'none',paperMotion:'none'};assert.equal(pageFeatures(p,p.pages[0]).motion,false);
});
