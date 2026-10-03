import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustPixels,applyMask,resizeDimensions,boundedCrop,cropRatio} from '../ui/image-ops.js';
test('color adjustments preserve alpha and do not mutate source pixels',()=>{
  const pixels={data:new Uint8ClampedArray([255,0,0,64,0,120,200,0])};
  const gray=adjustPixels(pixels,{grayscale:true});assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);assert.equal(gray[3],64);assert.equal(gray[7],0);assert.equal(adjustPixels(pixels,{opacity:50})[3],32);
  assert.deepEqual([...pixels.data],[255,0,0,64,0,120,200,0]);
  assert.equal(adjustPixels(pixels,{brightness:-100})[0],0);
});
test('cutout changes only selected alpha and resizing enforces useful limits',()=>{
  const data=new Uint8ClampedArray([10,20,30,255,40,50,60,128]);applyMask(data,new Uint8Array([1,0]));
  assert.deepEqual([...data],[10,20,30,0,40,50,60,128]);
  assert.throws(()=>applyMask(data,new Uint8Array(3)));
  assert.deepEqual(resizeDimensions(200,50,true,400,300),{width:200,height:150});
  assert.throws(()=>resizeDimensions(6000,6000,false,40,30));assert.throws(()=>resizeDimensions(NaN,3,false,40,30));
});
test('crop ratios fit inside source image bounds without enlarging the selection',()=>{
  const bounds={x:50,y:20,width:200,height:150};
  for(const ratio of [NaN,1,2/3,3/2,4/3,16/9,3/4,4/5,5/4,9/16]){
    const crop=boundedCrop({x:0,y:0,width:400,height:500},bounds,ratio);
    assert.ok(crop.x>=bounds.x&&crop.y>=bounds.y);
    assert.ok(crop.x+crop.width<=bounds.x+bounds.width+.001);
    assert.ok(crop.y+crop.height<=bounds.y+bounds.height+.001);
    if(Number.isFinite(ratio))assert.ok(Math.abs(crop.width/crop.height-ratio)<.001);
  }
  assert.throws(()=>boundedCrop({x:400,y:400,width:10,height:10},bounds,1));
});

test('original and preset crop ratios preserve portrait and landscape proportions',()=>{
  assert.equal(cropRatio('original',1200,800),1.5);
  assert.equal(cropRatio('original',800,1200),2/3);
  assert.equal(cropRatio('2:3',1200,800),2/3);
  assert.equal(cropRatio('3:2',800,1200),1.5);
  assert.equal(cropRatio('current',1200,800,{width:300,height:200}),1.5);
  assert.ok(Number.isNaN(cropRatio('free',1200,800)));
  for(const value of ['0:3','3:0','bad'])assert.throws(()=>cropRatio(value,1200,800));
  assert.throws(()=>boundedCrop({x:NaN,y:0,width:10,height:10},{x:0,y:0,width:100,height:100},1));
});
