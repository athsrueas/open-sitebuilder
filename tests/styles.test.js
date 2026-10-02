import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,siteStyles,applyTheme,setBlockStyle,styleVars} from '../shared/styles.js';
import {portfolioMarkup} from '../shared/render.js';
test('themes preserve content and overrides, and exports inherit site defaults',()=>{
  const b={id:'b',type:'text',title:'Artist',label:'',text:'Keep this',styles:{bodySize:24}};
  const p={name:'Artist',description:'',theme:{serif:true,wide:false,spacious:true,rounded:false},assets:[],pages:[{id:'p',blocks:[b]}]};
  for(const t of THEMES){assert.equal(applyTheme(p,t.id),true);assert.equal(b.text,'Keep this');assert.equal(b.styles.bodySize,24);const out=portfolioMarkup(p,'p');assert.match(out.html,/--bodySize:24px/);assert.ok(out.css.includes('--bodyFont:'));}
  assert.equal(setBlockStyle(b,'bodySize',null),true);assert.equal(Object.hasOwn(b.styles,'bodySize'),false);
  assert.doesNotMatch(portfolioMarkup(p,'p').html,/--bodySize/);
  assert.equal(siteStyles({ink:'#ffffff',serif:false}).headingInk,'#ffffff');
});
test('style values reject CSS injection, nonfinite sizes and site-only overrides',()=>{
  const b={};assert.equal(setBlockStyle(b,'bodyFont','evil;font-family:x'),false);
  assert.equal(setBlockStyle(b,'bodySize',Infinity),false);assert.equal(setBlockStyle(b,'contentWidth',900),false);
  assert.equal(styleVars({ink:'red;background:url(evil)'},true),'');
  assert.ok(styleVars({ink:'#ffffff'},true).includes('--headingInk:#ffffff'));
});
