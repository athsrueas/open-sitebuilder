// Workspace preferences stay in this browser and never enter the portfolio project.
const KEY='folio-workspace-v1';
const icons=['FS','✳','✦','◉','◇','☻','🌷','🐈','🍓','🎨','🦋','🌙'];
const stickers=['🌷','🐈','🍓','🦋','🌙','⭐','🌼','🍒','🐸','🎨','🧷','🎀'];
let state={icon:'FS',visible:true,stickers:[]};
try{
  const saved=JSON.parse(localStorage.getItem(KEY));
  if(saved&&icons.includes(saved.icon)&&Array.isArray(saved.stickers))state={icon:saved.icon,visible:saved.visible!==false,stickers:saved.stickers.filter(s=>stickers.includes(s.symbol)&&Number.isFinite(s.x)&&Number.isFinite(s.y)).slice(0,30).map(s=>({...s,x:Math.max(0,Math.min(94,s.x)),y:Math.max(0,Math.min(90,s.y))}))};
}catch{}
const workspace=document.querySelector('.workspace');
const layer=document.createElement('div');layer.className='workspace-stickers';layer.setAttribute('aria-label','Workspace stickers');workspace.append(layer);
const dialog=document.createElement('dialog');dialog.id='workspace-dialog';
dialog.innerHTML=`<div class="dialog-heading"><h2>Workspace appearance</h2><button aria-label="Close workspace appearance">×</button></div><p class="muted">Decorations are saved in this browser. They decorate the editor only.</p><h3>Studio icon</h3><div class="decoration-palette" id="studio-icons"></div><h3>Stickers</h3><p class="muted">Add a sticker, then drag it around the workspace. Use its Remove button below to delete it.</p><div class="decoration-palette" id="sticker-palette"></div><label class="check"><input type="checkbox" id="show-stickers">Show workspace stickers</label><div id="placed-stickers"></div><p id="decor-status" role="status" class="small-note"></p>`;
document.body.append(dialog);
dialog.querySelector('.dialog-heading button').onclick=()=>dialog.close();
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));dialog.querySelector('#decor-status').textContent='Workspace preferences saved.';}catch{dialog.querySelector('#decor-status').textContent='Browser storage is unavailable. Changes will last until this window closes.';}};
function render(){
  const mark=document.querySelector('.brand-mark');mark.textContent=state.icon;mark.classList.toggle('decorated',state.icon!=='FS');
  layer.hidden=!state.visible;
  layer.replaceChildren();
  state.stickers.forEach((s,i)=>{
    const el=document.createElement('button');el.className='workspace-sticker';el.textContent=s.symbol;el.setAttribute('aria-label',`Move ${s.symbol} sticker`);el.title='Drag to move. Arrow keys move; Delete removes.';el.style.left=s.x+'%';el.style.top=s.y+'%';
    el.onpointerdown=e=>{
      if(e.button!==0)return;e.preventDefault();el.focus();el.setPointerCapture(e.pointerId);
      const rect=layer.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,x=s.x,y=s.y;
      el.onpointermove=event=>{s.x=Math.max(0,Math.min(100-60/rect.width*100,x+(event.clientX-startX)/rect.width*100));s.y=Math.max(0,Math.min(100-60/rect.height*100,y+(event.clientY-startY)/rect.height*100));el.style.left=s.x+'%';el.style.top=s.y+'%';};
      const done=()=>{el.onpointermove=null;el.onpointerup=null;el.onpointercancel=null;persist();};el.onpointerup=done;el.onpointercancel=done;
    };
    el.onkeydown=e=>{const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[e.key]){e.preventDefault();s.x=Math.max(0,Math.min(90,s.x+moves[e.key][0]));s.y=Math.max(0,Math.min(90,s.y+moves[e.key][1]));el.style.left=s.x+'%';el.style.top=s.y+'%';persist();}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();state.stickers.splice(i,1);persist();render();}};
    layer.append(el);
  });
  dialog.querySelector('#studio-icons').replaceChildren(...icons.map(symbol=>{
    const b=document.createElement('button');b.textContent=symbol;b.setAttribute('aria-label','Studio icon '+symbol);b.setAttribute('aria-pressed',String(symbol===state.icon));b.onclick=()=>{state.icon=symbol;persist();render();};return b;
  }));
  dialog.querySelector('#sticker-palette').replaceChildren(...stickers.map(symbol=>{
    const b=document.createElement('button');b.textContent=symbol;b.setAttribute('aria-label','Add '+symbol+' sticker');b.disabled=state.stickers.length>=30;b.onclick=()=>{state.stickers.push({symbol,x:78+(state.stickers.length%3)*5,y:83-(state.stickers.length%4)*8});state.visible=true;persist();render();};return b;
  }));
  dialog.querySelector('#show-stickers').checked=state.visible;
  const list=dialog.querySelector('#placed-stickers');list.replaceChildren();
  state.stickers.forEach((s,i)=>{const row=document.createElement('div');row.className='placed-sticker';const label=document.createElement('span');label.textContent=s.symbol+' Sticker '+(i+1);const remove=document.createElement('button');remove.textContent='Remove';remove.setAttribute('aria-label','Remove sticker '+(i+1));remove.onclick=()=>{state.stickers.splice(i,1);persist();render();};row.append(label,remove);list.append(row);});
}
dialog.querySelector('#show-stickers').onchange=e=>{state.visible=e.target.checked;persist();render();};
document.querySelector('#workspace-appearance').onclick=()=>{render();dialog.showModal();};
render();
