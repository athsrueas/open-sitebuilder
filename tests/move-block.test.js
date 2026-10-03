import test from 'node:test';
import assert from 'node:assert/strict';
import {moveBlockToPage} from '../ui/canvas-model.js';
import {internalLink,resolveLink} from '../shared/links.js';

const id=n=>String(n).padStart(32,'0');
function fixture(){
  const block={id:id(3),type:'sketchbook',images:['art'],spreads:[{id:id(4),image:'scan',fillPage:true,caption:'Kept'}],styles:{inkDarkness:25},hiddenText:['title'],layers:[{id:id(5),x:12,mobile:{x:2}}]};
  return {assets:[{id:'art'},{id:'scan'}],pages:[{id:id(1),slug:'home',blocks:[block]},{id:id(2),slug:'archive',hideFromNavigation:true,blocks:[]}]};
}
test('moving to a hidden page keeps the complete block and assets, appends and updates destinations',()=>{
  const project=fixture(),[source,target]=project.pages,block=source.blocks[0],original=structuredClone(block),assets=structuredClone(project.assets);
  const oldLink=internalLink(source,block),wholePage=internalLink(source);
  source.blocks.push({id:id(6),url:oldLink,items:[{url:oldLink},{url:wholePage},{url:'/manual/#anchor'},{url:'https://example.com'}]});
  target.blocks.push({id:id(7),url:oldLink});
  assert.equal(moveBlockToPage(project,block.id,target.id),true);
  assert.strictEqual(target.blocks.at(-1),block);assert.deepEqual(block,original);assert.deepEqual(project.assets,assets);
  assert.equal(project.pages.flatMap(p=>p.blocks).filter(b=>b.id===block.id).length,1);
  const expected=internalLink(target,block);
  assert.equal(source.blocks[0].url,expected);assert.equal(source.blocks[0].items[0].url,expected);assert.equal(target.blocks[0].url,expected);
  assert.equal(source.blocks[0].items[1].url,wholePage);assert.equal(source.blocks[0].items[2].url,'/manual/#anchor');assert.equal(source.blocks[0].items[3].url,'https://example.com');
  assert.equal(resolveLink(expected,project),'/archive/#block-'+block.id);
  assert.equal(moveBlockToPage(project,block.id,source.id),true);assert.equal(resolveLink(source.blocks[0].url,project),'/#block-'+block.id);
});
test('invalid destinations, same-page moves and full pages never remove a block',()=>{
  const project=fixture(),before=structuredClone(project);
  for(const [block,target] of [[id(3),id(1)],[id(3),id(9)],[id(9),id(2)]])assert.equal(moveBlockToPage(project,block,target),false);
  assert.deepEqual(project,before);
  project.pages[1].blocks=Array.from({length:200},(_,i)=>({id:'full'+i}));const full=structuredClone(project);
  assert.equal(moveBlockToPage(project,id(3),id(2)),false);assert.deepEqual(project,full);
});
