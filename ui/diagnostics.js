// Opt-in local audit only. Nothing is transmitted or included in the Astro site.
const enabled=new URLSearchParams(location.search).has('diagnostics');
const samples={};let output;
if(enabled){output=document.createElement('output');output.id='folio-diagnostics';output.hidden=true;document.documentElement.append(output);}
export function measure(name,action){if(!enabled)return action();const start=performance.now();try{return action();}finally{record(name,performance.now()-start);}}
export function record(name,ms){if(!enabled)return;const list=samples[name]??=[];list.push(ms);if(list.length>200)list.shift();output.textContent=JSON.stringify(Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,{count:v.length,last:+v.at(-1).toFixed(2),max:+Math.max(...v).toFixed(2),mean:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)}])));}
if(enabled&&window.PerformanceObserver){try{new PerformanceObserver(list=>list.getEntries().forEach(e=>record('longTask',e.duration))).observe({type:'longtask',buffered:true});}catch{}}
