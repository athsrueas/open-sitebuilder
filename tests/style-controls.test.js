import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_FIELDS,normalizeStyleNumber,validStyle} from '../shared/styles.js';
import {wireStyleControls} from '../ui/style-controls.js';

function inputHarness(key,initial){
 const input={dataset:{style:key},type:'number',value:String(initial),disabled:false,validityMessage:'',setCustomValidity(message){this.validityMessage=message;},addEventListener(event,handler){this[event]=handler;}};
 const changes=[];
 wireStyleControls({querySelectorAll:selector=>selector==='[data-style]'?[input]:[]},{},null,(...args)=>changes.push(args));
 return {input,changes};
}
test('ink input clamps excessive and negative numbers immediately, before saving',()=>{
 const {input,changes}=inputHarness('inkWashStrength',12);
 input.value='999';input.oninput();assert.equal(input.value,'50');assert.equal(input.validityMessage,'');assert.deepEqual(changes,[['inkWashStrength',50]]);
 input.onchange();assert.equal(changes.length,1);
 input.onblur();assert.equal(changes.length,1);
 input.value='-4';input.oninput();assert.equal(input.value,'0');assert.equal(changes.at(-1)[1],0);input.onblur();
 input.value='';input.oninput();input.onblur();assert.equal(input.value,'0');assert.equal(changes.length,2);
});
test('multi-digit input can be completed without prematurely applying its minimum',()=>{
 const {input,changes}=inputHarness('paperScale',240);
 input.value='1';input.oninput();input.value='18';input.oninput();assert.deepEqual(changes,[]);
 input.value='180';input.oninput();assert.deepEqual(changes,[['paperScale',180]]);
 input.value='181';input.oninput();input.keydown({key:'Enter',preventDefault(){}});assert.equal(input.value,'180');
 input.value='';input.oninput();input.onblur();assert.equal(input.value,'180');
});
test('normalization keeps all numeric style fields finite and inside supported boundaries',()=>{
 for(const [key,field] of Object.entries(STYLE_FIELDS).filter(([,f])=>f.type==='number')){
   for(const raw of ['', 'invalid', Infinity, -Infinity, field.min-100, field.max+100, field.default]){
     const value=normalizeStyleNumber(key,raw,field.default);assert.equal(validStyle(key,value),true,key);
   }
 }
});
