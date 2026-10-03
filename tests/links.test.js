import test from 'node:test';
import assert from 'node:assert/strict';
import {internalLink,resolveLink,blockAnchor} from '../shared/links.js';
import {safeUrl} from '../shared/blocks.js';
import {portfolioMarkup} from '../shared/render.js';
const a='a'.repeat(32),b='b'.repeat(32),c='c'.repeat(32),d='d'.repeat(32);
const fixture=()=>({name:'Artist',description:'',theme:{},assets:[{id:d,src:'/art.webp',full:'/art-full.webp',alt:'Art',width:800,height:600}],pages:[{id:a,slug:'home',title:'Home',blocks:[]},{id:b,slug:'statement',title:'Artist statement',blocks:[{id:c,type:'text',title:'Statement',label:'',text:'Statement text',images:[],spreads:[]}]}]});
test('internal destinations follow URL changes and page reordering, and deleted targets become inert',()=>{
 const p=fixture(),page=p.pages[1],block=page.blocks[0],link=internalLink(page,block);
 assert.equal(resolveLink(link,p),'/statement/#'+blockAnchor(block));
 page.slug='artist-statement';assert.equal(resolveLink(link,p),'/artist-statement/#'+blockAnchor(block));
 p.pages.reverse();assert.equal(resolveLink(link,p),'/#'+blockAnchor(block));
 page.blocks=[];assert.equal(resolveLink(link,p),'');assert.equal(resolveLink(internalLink(page),p),'/');
 p.pages.shift();assert.equal(resolveLink(internalLink(page),p),'');
});
test('published card image and button share the destination and target anchors survive export',()=>{
 const p=fixture();p.discourageImageDownloads=true;p.pages[0].blocks=[{id:d,type:'cards',title:'Work',label:'',images:[d],spreads:[],fit:'contain',items:[{title:'About this work',text:'',url:internalLink(p.pages[1],p.pages[1].blocks[0])}]}];
 const html=portfolioMarkup(p,a,{published:true}).html;
 assert.equal((html.match(new RegExp('href="/statement/#block-'+c+'"','g'))||[]).length,2);
 assert.doesNotMatch(html,/folio:page:|art-full.webp|data-link-/);
 assert.match(portfolioMarkup(p,b,{published:true}).html,new RegExp('id="block-'+c+'"'));
 p.pages[1].blocks=[];assert.doesNotMatch(portfolioMarkup(p,a,{published:true}).html,/href="\/statement\/#/);
});
test('custom fragment and internal navigation links are accepted but never media sources',()=>{
 assert.equal(safeUrl('#block-'+c),'#block-'+c);assert.equal(safeUrl('#block-'+c,true),'');
 const ref='folio:page:'+a;assert.equal(safeUrl(ref),ref);assert.equal(safeUrl(ref,true),'');
 for(const url of ['javascript:alert(1)','folio:page:invalid','#bad space','#bad\\path'])assert.equal(safeUrl(url),'');
});

test('hidden pages keep their routes and link destinations while leaving site navigation',()=>{
 const p=fixture();p.pages[1].hideFromNavigation=true;
 p.pages[0].blocks=[{id:d,type:'button',buttonText:'Read statement',url:internalLink(p.pages[1]),images:[],spreads:[]}];
 const html=portfolioMarkup(p,a,{published:true}).html;
 const nav=html.match(/<nav>([\s\S]*?)<\/nav>/)[1];
 assert.doesNotMatch(nav,/statement/);assert.match(nav,/href="\/"/);
 assert.match(html,/href="\/statement\/"/);
 assert.match(portfolioMarkup(p,b,{published:true}).html,/Statement text/);
 p.pages[0].hideFromNavigation=true;p.pages[1].hideFromNavigation=false;
 assert.match(portfolioMarkup(p,b,{published:true}).html,/<nav><a[^>]*href="\/statement\/"/);
});
