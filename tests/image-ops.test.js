import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustPixels,applyMask,resizeDimensions} from '../ui/image-ops.js';
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
