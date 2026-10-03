import test from 'node:test';
import assert from 'node:assert/strict';
import {footerSettings} from '../shared/footer.js';
import {portfolioMarkup} from '../shared/render.js';
import {moveBlockToPage} from '../ui/canvas-model.js';
const project=()=>({name:'Artist',description:'Legacy description',theme:{},assets:[],pages:[{id:'a'.repeat(32),title:'Work',slug:'work',blocks:[]},{id:'b'.repeat(32),title:'Statement',slug:'statement',blocks:[]}]});
test('existing portfolios retain their footer content, and hiding removes the whole footer',()=>{
  const p=project();assert.equal(footerSettings(p).text,p.description);
  assert.match(portfolioMarkup(p,p.pages[0].id).html,/<footer>.*Legacy description.*<\/footer>/);
  p.footer={enabled:false,showName:true,text:'Preserved',links:[]};
  for(const published of [false,true])assert.doesNotMatch(portfolioMarkup(p,p.pages[0].id,{published}).html,/<footer|Preserved/);
  assert.equal(p.footer.text,'Preserved');
});
test('footer text is literal, links resolve internally, and public HTML omits editor metadata',()=>{
  const p=project();p.footer={enabled:true,showName:false,text:'<script>example</script>\nContact',links:[{title:'Statement',url:'folio:page:'+p.pages[1].id},{title:'Unsafe',url:'javascript:alert(1)'},{title:'Social',url:'https://example.com'}]};
  const html=portfolioMarkup(p,p.pages[0].id,{published:true}).html,footer=html.slice(html.indexOf('<footer>'));
  assert.match(footer,/&lt;script&gt;/);assert.match(footer,/href="\/statement\/"/);assert.match(footer,/href="https:\/\/example.com\/"/);
  assert.doesNotMatch(footer,/javascript:|Unsafe|data-footer-edit|Artist|Legacy description/);
  p.presentation='splash';assert.doesNotMatch(portfolioMarkup(p,p.pages[0].id).html,/<footer/);
});
test('footer block shortcuts follow blocks moved to a different page',()=>{
  const p=project(),block={id:'c'.repeat(32)};p.pages[0].blocks.push(block);
  p.footer={enabled:true,showName:false,text:'',links:[{title:'Artwork',url:'folio:page:'+p.pages[0].id+':block:'+block.id}]};
  assert.equal(moveBlockToPage(p,block.id,p.pages[1].id),true);
  assert.equal(p.footer.links[0].url,'folio:page:'+p.pages[1].id+':block:'+block.id);
});
