import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {portfolioMarkup} from '../shared/render.js';
import {newLayer} from '../shared/free-layout.js';
const file='site/src/project.json',original=await readFile(file);
const block=(type,extra={})=>({id:crypto.randomUUID().replaceAll('-',''),type,title:'Portfolio work',label:'',text:'Artist notes',images:[],spreads:[],fit:'contain',...extra});
const fixture={name:'Build verification',description:'',assets:[],theme:{},pages:[
 {id:'plain',title:'Plain',slug:'plain',blocks:[block('text'),block('freeLayout',{layers:[newLayer('text')],mobileStack:true})]},
 {id:'paper',title:'Paper',slug:'paper',blocks:[block('text',{styles:{paperTexture:'cotton'}})]},
 {id:'motion',title:'Motion',slug:'motion',blocks:[block('text',{styles:{inkWash:'bloom'}})]},
 {id:'book',title:'Book',slug:'book',blocks:[block('sketchbook',{spreads:Array.from({length:3},(_,i)=>({id:'s'+i,image:'',title:'Page '+(i+1),caption:'Notes',background:'#ffffff',fit:'contain',hard:false}))})]}
]};
const output=resolve('data/published-build-test');
async function build(project){
 await writeFile(file,JSON.stringify(project));
 const result=spawnSync(process.execPath,['node_modules/astro/bin/astro.mjs','build','--root','site','--outDir',output],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
}
async function files(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]))).flat();}
try{
 await build(fixture);
 const plain=await readFile(resolve(output,'index.html'),'utf8'),paper=await readFile(resolve(output,'paper/index.html'),'utf8'),motion=await readFile(resolve(output,'motion/index.html'),'utf8'),book=await readFile(resolve(output,'book/index.html'),'utf8');
 assert.doesNotMatch(plain,/<script|data-edit|data-block|paper-grain|ink-wash/);
 assert.doesNotMatch(paper,/<script|ink-wash/);assert.match(paper,/paper-grain/);
 assert.match(motion,/folio-assets\/materials.js/);assert.doesNotMatch(motion,/page-flip.js/);
 assert.match(book,/folio-assets\/page-flip.js/);assert.match(book,/folio-assets\/books.js/);
 assert.match(await readFile(resolve(output,'folio-assets/page-flip.js'),'utf8'),/PageFlip/);
 for(const name of ['books','materials']){const source=await readFile(resolve(output,'folio-assets/'+name+'.js'),'utf8');assert.doesNotMatch(source,/^import |export function/m);assert.doesNotMatch(source,/blocks.json|styles.json|Cropper|magic-wand|Wrangler/);}
 const untrimmed=portfolioMarkup(fixture,'plain'),trimmed=portfolioMarkup(fixture,'plain',{published:true});
 const before=Buffer.byteLength(untrimmed.html+untrimmed.css),after=Buffer.byteLength(trimmed.html+trimmed.css);
 // Retain the mixed output for browser verification, then verify a pure static build.
 const plainOutput=resolve('data/published-static-test');
 await writeFile(file,JSON.stringify({...fixture,pages:[fixture.pages[0]]}));
 const result=spawnSync(process.execPath,['node_modules/astro/bin/astro.mjs','build','--root','site','--outDir',plainOutput],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);
 assert.equal((await files(plainOutput)).filter(p=>p.endsWith('.js')).length,0,'Static export should contain zero JS files');
 const report={beforeBytes:before,afterBytes:after,reductionPercent:Math.round((1-after/before)*100),plainJavaScriptFiles:0,verifiedPages:['plain + free layout','static paper','animated ink','sketchbook']};
 await mkdir('data',{recursive:true});await writeFile('data/published-build-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await writeFile(file,original);}
