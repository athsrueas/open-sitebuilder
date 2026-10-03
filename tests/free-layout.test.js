import test from 'node:test';
import assert from 'node:assert/strict';
import {newLayer,validLayers,freeLayoutMarkup} from '../shared/free-layout.js';
const esc=s=>String(s??'').replaceAll('<','&lt;').replaceAll('"','&quot;');
test('free layers enforce bounds, unique ids and registered image references',()=>{
 const l=newLayer('text');assert.ok(validLayers([l],[]));
 assert.equal(validLayers([l,l],[]),false);
 for(const change of [{x:99},{w:NaN},{color:'red'},{assetId:'missing'},{mobile:{x:90,y:0,w:20,h:20}}])assert.equal(validLayers([{...l,...change}],[]),false);
});
test('export preserves layer order, independent mobile geometry and literal text',()=>{
 const a=newLayer('text');a.text='<script>unsafe</script>';a.mobile={x:5,y:30,w:90,h:20};
 const b=newLayer('image','art');b.mobile={x:5,y:55,w:90,h:40};
 const html=freeLayoutMarkup({layers:[a,b],mobileStack:false},{assets:[{id:'art',src:'/media/art.webp',alt:'Artwork'}]},esc);
 assert.ok(html.includes('z-index:1'));assert.ok(html.includes('z-index:2'));assert.ok(html.includes('--my:30%'));assert.ok(html.includes('&lt;script>'));assert.ok(html.includes('/media/art.webp'));
 assert.ok(freeLayoutMarkup({layers:[newLayer('text')],mobileStack:false},{assets:[]},esc).includes('free-stack'));
 assert.ok(freeLayoutMarkup({layers:[a],mobileStack:true},{assets:[]},esc).includes('free-stack'));
});
