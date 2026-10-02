import test from 'node:test';
import assert from 'node:assert/strict';
import { editText, resizeImage, assignArtwork } from '../ui/canvas-model.js';
import { portfolioMarkup } from '../shared/render.js';

test('inline edits target the correct sketchbook page and keep text literal in exports', () => {
  const b={id:'book',type:'sketchbook',title:'Book',label:'',spreads:[{id:'one',title:'One',caption:'',background:'#ffffff'},{id:'two',title:'Two',caption:'',background:'#ffffff'}]};
  assert.equal(editText(b,'two','caption','<script>alert(1)</script>'),true);
  assert.equal(b.spreads[0].caption,'');
  assert.equal(editText(b,'missing','caption','Oops'),false);
  assert.equal(editText(b,null,'id','changed'),false);
  const html=portfolioMarkup({name:'Artist',description:'',theme:{},assets:[],pages:[{id:'page',blocks:[b]}]},'page').html;
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>|contenteditable|resize-grip/);
});
test('photo assignment replaces a single photo and appends unique gallery photos', () => {
  const b={type:'image',images:['old'],spreads:[]};
  assignArtwork(b,['new','another']);assert.deepEqual(b.images,['new']);
  b.type='gallery';assignArtwork(b,['new','another']);assert.deepEqual(b.images,['new','another']);
  b.type='sketchbook';b.spreads=[{id:'one',image:''},{id:'two',image:''}];
  assert.equal(assignArtwork(b,['scan'],'two'),true);assert.equal(b.spreads[1].image,'scan');assert.equal(b.spreads[0].image,'');
});
test('canvas image sizes are constrained and reach the generated site', () => {
  const b={id:'image',type:'image',text:'',images:[],spreads:[],fit:'contain'};
  assert.equal(resizeImage(b,65,420),true);
  const html=portfolioMarkup({name:'',description:'',theme:{},assets:[],pages:[{id:'p',blocks:[b]}]},'p').html;
  assert.match(html,/width:65%;height:420px/);
  resizeImage(b,5,5000);assert.equal(b.width,20);assert.equal(b.height,1200);
  assert.equal(resizeImage(b,NaN,420),false);
});
