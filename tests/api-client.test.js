import test from 'node:test';
import assert from 'node:assert/strict';
import {createApiClient} from '../ui/api-client.js';
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data,text:async()=>data});
test('a rotated session refreshes the token and retries the same unsaved project once',async()=>{
 let token='old-session';const calls=[];
 const responses=[response(403,{code:'session_expired',error:'Invalid local editor session. Reload the editor.'}),response(200,'fresh-session'),response(200,{ok:true})];
 const api=createApiClient({getToken:()=>token,setToken:value=>{token=value;},parseToken:html=>html,fetchImpl:async(url,options)=>{calls.push({url,options});return responses.shift();}});
 const project={theme:{inkWashStrength:50}};
 assert.deepEqual(await api('project',project),{ok:true});assert.equal(token,'fresh-session');
 assert.deepEqual(calls.map(c=>c.url),['/api/project','/','/api/project']);
 assert.equal(calls[0].options.body,calls[2].options.body);assert.equal(calls[2].options.headers['X-Folio-Token'],'fresh-session');
});
test('validation errors are preserved and unrelated permission errors are not retried',async()=>{
 for(const status of [400,403]){
   let count=0;
   const api=createApiClient({getToken:()=>'',setToken(){throw Error('unexpected');},parseToken(){},fetchImpl:async()=>{count++;return response(status,{error:'Invalid style: inkWashStrength'});}});
   await assert.rejects(api('project',{}),/Invalid style/);assert.equal(count,1);
 }
});
test('failed session renewal stops after one retry and retains the actual error',async()=>{
 let count=0;const api=createApiClient({getToken:()=>'',setToken(){},parseToken:html=>html,fetchImpl:async(url)=>{count++;return url==='/'?response(200,'new-session'):response(403,{code:'session_expired',error:'Invalid local editor session. Reload the editor.'});}});
 await assert.rejects(api('project',{}),/Invalid local editor session/);assert.equal(count,3);
});
