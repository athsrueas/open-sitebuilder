import test from 'node:test';
import assert from 'node:assert/strict';
import {setTextVisibility,setAllTextVisibility,allTextRemoved} from '../shared/text-visibility.js';
import {portfolioMarkup} from '../shared/render.js';
const block=type=>({id:'b'.repeat(32),type,title:'Block heading',label:'Small heading',text:'Description',images:['art'],spreads:[],fit:'contain',items:[{title:'Card heading',text:'Card description',url:'https://example.com'}]});
const render=b=>portfolioMarkup({name:'Artist',description:'',theme:{},assets:[{id:'art',src:'/art.webp',full:'/art-full.webp',alt:'Artwork'}],pages:[{id:'p',title:'Home',slug:'home',blocks:[b]}]},'p',{published:true});
test('card text removal removes wrappers and button spacing but preserves linked artwork and stored wording',()=>{
 const b=block('cards'),original=structuredClone(b);
 assert.match(render(b).html,/<h3>/);
 setAllTextVisibility(b,false);assert.equal(allTextRemoved(b),true);
 const html=render(b).html;assert.doesNotMatch(html,/<h[23]|<p|eyebrow|View artwork|Card description|Block heading/);
 assert.match(html,/href="https:\/\/example.com\/"/);assert.match(html,/<img/);
 assert.equal(b.items[0].text,original.items[0].text);assert.equal(b.items[0].url,original.items[0].url);
 setAllTextVisibility(b,true);assert.deepEqual(b,original);
});
test('individual card fields are independent and bad indices cannot change other items',()=>{
 const b=block('cards');b.items.push({title:'Second card',text:'Second description',url:''});
 assert.equal(setTextVisibility(b,'title',false,0),true);
 assert.doesNotMatch(render(b).html,/Card heading/);assert.match(render(b).html,/Card description|Second card/);
 assert.equal(setTextVisibility(b,'text',false,-1),false);assert.equal(setTextVisibility(b,'url',false,0),false);
 setTextVisibility(b,'title',true,0);assert.match(render(b).html,/Card heading/);
});
test('image and text layouts collapse the vacated column and cover overlay without hiding artwork',()=>{
 for(const type of ['imageText','cover','image','gallery','carousel']){
  const b=block(type);assert.equal(setAllTextVisibility(b,false),true);
  const {html,css}=render(b);assert.match(html,/<img/);assert.doesNotMatch(html,/<h[23]|<p|class="caption"|class="eyebrow"/);
  if(type==='imageText'){assert.match(html,/image-only/);assert.match(css,/image-only\{grid-template-columns:1fr/);}
  if(type==='cover'){assert.doesNotMatch(html,/class="cover-text"/);assert.match(html,/cover-art-only/);}
 }
});
