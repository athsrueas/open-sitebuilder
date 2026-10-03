import test from 'node:test';
import assert from 'node:assert/strict';
import { editText, resizeImage, assignArtwork, removeBlock, restoreBlock } from '../ui/canvas-model.js';
import { portfolioMarkup } from '../shared/render.js';
import { BLOCKS, safeUrl, videoEmbed } from '../shared/blocks.js';
test('block deletion and undo preserve order, sketchbook pages and artwork references',()=>{
  const page={blocks:[{id:'one'},{id:'book',spreads:[{id:'sheet',image:'art',caption:'Original'}],styles:{paperTexture:'cotton'}},{id:'three'}]};
  const snapshot=structuredClone(page),removed=removeBlock(page,'book');assert.deepEqual(page.blocks.map(b=>b.id),['one','three']);
  assert.equal(restoreBlock(page,removed),true);assert.deepEqual(page,snapshot);assert.equal(restoreBlock(page,removed),false);
  assert.equal(removeBlock(page,'missing'),null);
  const only={blocks:[{id:'only'}]},last=removeBlock(only,'only');assert.equal(only.blocks.length,0);assert.equal(restoreBlock(only,last),true);
  assert.equal(restoreBlock({blocks:Array.from({length:200},(_,i)=>({id:String(i)}))},last),false);
});

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
test('large sketchbooks export every page in order without truncation',()=>{
  const spreads=Array.from({length:1000},(_,i)=>({id:'sheet'+i,title:'Page '+(i+1),caption:'Caption '+(i+1),background:'#ffffff',fit:'contain',hard:false,image:''}));
  const book={id:'book',type:'sketchbook',title:'Book',label:'',text:'',images:[],spreads,fit:'contain'};
  const html=portfolioMarkup({name:'Artist',description:'',theme:{},assets:[],pages:[{id:'page',blocks:[book]}]},'page').html;
  assert.equal((html.match(/class="book-page"/g)||[]).length,1000);
  assert.ok(html.indexOf('data-spread-id="sheet999"')>html.indexOf('data-spread-id="sheet998"'));
  assert.match(html,/Caption 1000/);
});
test('fill-page sketchbook artwork hides text without discarding it and exports with download deterrence',()=>{
  const spread={id:'sheet',title:'Saved page title',caption:'Saved page caption',background:'#ffffff',fit:'contain',hard:false,image:'art',fillPage:true};
  const book={id:'book',type:'sketchbook',title:'Book',label:'',text:'',images:[],spreads:[spread],fit:'contain'};
  const project={name:'Artist',description:'',theme:{},assets:[{id:'art',src:'/media/art.webp',full:'/media/art-full.webp',alt:'Artwork'}],pages:[{id:'page',blocks:[book]}]};
  for(const discourageImageDownloads of [false,true]){
    project.discourageImageDownloads=discourageImageDownloads;
    const output=portfolioMarkup(project,'page',{published:true});
    assert.match(output.html,/book-page-fill/);
    assert.match(output.html,/object-fit:cover/);
    assert.doesNotMatch(output.html,/Saved page title|Saved page caption|data-edit="title"/);
    assert.match(output.css,/\.book-page\.book-page-fill\{padding:0\}/);
  }
  spread.fillPage=false;
  const html=portfolioMarkup(project,'page').html;
  assert.match(html,/Saved page title/);assert.match(html,/Saved page caption/);assert.match(html,/object-fit:contain/);
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
