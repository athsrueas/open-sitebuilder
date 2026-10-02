import test from 'node:test';
import assert from 'node:assert/strict';
import { editText, resizeImage, assignArtwork } from '../ui/canvas-model.js';
import { portfolioMarkup } from '../shared/render.js';
import { BLOCKS, safeUrl, videoEmbed } from '../shared/blocks.js';

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

test('every registered block renders content and exports without editor controls', () => {
  const blocks=Object.entries(BLOCKS).map(([type,definition])=>({id:type,type,title:definition.name,label:'',text:'Example',images:[],spreads:[],fit:'contain',...structuredClone(definition.defaults)}));
  const html=portfolioMarkup({name:'Artist',description:'',theme:{},assets:[],pages:[{id:'all',blocks}]},'all').html;
  for(const block of blocks){
    assert.ok(html.includes(`data-block="${block.id}"`),block.type);
    assert.ok(!html.includes(`data-block="${block.id}"></section>`),block.type);
  }
  assert.doesNotMatch(html,/contenteditable|canvas-options|item-options|<script/);
});
test('URLs reject script schemes and video embeds recognize supported providers', () => {
  for(const url of ['javascript:alert(1)','data:text/html,test','//evil.example','/\\evil.example'])assert.equal(safeUrl(url),'');
  assert.equal(safeUrl('/about/'),'/about/');
  assert.equal(safeUrl('/video.mp4',true),'');
  assert.equal(videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(videoEmbed('https://vimeo.com/123456'),'https://player.vimeo.com/video/123456');
  assert.equal(videoEmbed('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'),'');
});
test('table and item editing preserve their neighbors and card replacements preserve order', () => {
  const b={type:'table',text:'A | B\nOne | Two',spreads:[]};
  editText(b,null,'cell:1:0','Changed');assert.equal(b.text,'A | B\nChanged | Two');
  b.type='columns';b.items=[{title:'A',text:'one'},{title:'B',text:'two'}];
  editText(b,null,'text','edited',1);assert.equal(b.items[0].text,'one');assert.equal(b.items[1].text,'edited');
  b.type='cards';b.images=[];assignArtwork(b,['photo'],null,1);assert.deepEqual(b.images,['','photo']);
});
