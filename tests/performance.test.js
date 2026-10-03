import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioMarkup} from '../shared/render.js';
import {STYLE_FIELDS,validStyle,styleVars} from '../shared/styles.js';
const project=()=>({name:'Artist',description:'',assets:[],theme:{},pages:[{id:'p',title:'Work',blocks:[]}]});

test('large portfolios embed each paper texture once rather than once per block',()=>{
  const p=project();p.pages[0].blocks=Array.from({length:200},(_,i)=>({id:String(i),type:'text',title:'Title',label:'',text:'Text',styles:{paperTexture:'cotton'}}));
  const {html,css}=portfolioMarkup(p,'p');
  assert.ok(html.length<200_000,'Repeated block textures must not produce megabytes of HTML');
  assert.equal((css.match(/--material-paper-cotton:/g)||[]).length,1);
  assert.doesNotMatch(html,/data:image\/svg/);
  const reused=portfolioMarkup(p,'p',{reuseBlock:b=>`<section data-block="${b.id}"></section>`});
  assert.doesNotMatch(reused.html,/material-layers/);
  assert.match(reused.html,/<header>/);assert.match(reused.html,/<footer>/);
});

test('every registered style choice and numeric boundary reaches valid CSS',()=>{
  for(const [key,f] of Object.entries(STYLE_FIELDS)){
    const values=f.type==='select'?f.options:f.type==='number'?[f.min,f.max]:['#000000','#ffffff'];
    for(const value of values){assert.equal(validStyle(key,value),true);const css=styleVars({[key]:value});assert.ok(css.length>0);assert.doesNotMatch(css,/NaN|undefined|Infinity/);}
  }
});

test('responsive photos expose correct pixel dimensions and newly added assets render',()=>{
  const p=project();p.assets.push({id:'a',width:4000,height:3000,src:'/media/a.webp',full:'/media/a-full.webp',thumb:'/media/a-thumb.webp',medium:'/media/a-medium.webp',alt:'Artwork'});
  p.pages[0].blocks.push({id:'b',type:'image',images:['a'],text:'',styles:{}});
  const first=portfolioMarkup(p,'p').html;assert.match(first,/width="4000" height="3000"/);assert.match(first,/a-thumb.webp 480w/);assert.match(first,/a-medium.webp 1200w/);
  p.assets.push({id:'new',src:'/media/new.webp',full:'/media/new-full.webp',alt:'New photo'});p.pages[0].blocks[0].images=['new'];
  assert.match(portfolioMarkup(p,'p').html,/New photo/);
});
