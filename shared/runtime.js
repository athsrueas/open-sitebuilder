import {initMaterials} from './material-lifecycle.js';
export function initPortfolio(root, PageFlip, navigate) {
  if(navigate) root.querySelectorAll('[data-page]').forEach(a=>a.onclick=e=>{e.preventDefault();navigate(a.dataset.page)});
  const stopMaterials=initMaterials(root);
  const books=[],resizes=[];
  root.querySelectorAll('[data-book]').forEach(el=>{
    if (!PageFlip) return; // Static pages remain visible if the animation library is unavailable.
    const count=el.children.length;
    if(count<2){el.innerHTML='<div class="image-placeholder">Add at least two sketchbook pages</div>';return;}
    el.dataset.ready='true';
    const flip=new PageFlip(el,{width:360,height:480,size:'stretch',minWidth:220,maxWidth:500,minHeight:300,maxHeight:670,showCover:true,startPage:Math.min(count-1,Number(el.dataset.startPage)||0),usePortrait:true, mobileScrollSupport:false});
    const status=root.querySelector(`[data-count="${el.dataset.book}"]`);
    flip.on('flip',e=>status.textContent=`${e.data+1} / ${count}`);
    flip.loadFromHTML(el.querySelectorAll('.book-page'));status.textContent=`${flip.getCurrentPageIndex()+1} / ${count}`;
    root.querySelector(`[data-prev="${el.dataset.book}"]`).onclick=()=>flip.flipPrev();
    root.querySelector(`[data-next="${el.dataset.book}"]`).onclick=()=>flip.flipNext();books.push(flip);
    const Observer=el.ownerDocument.defaultView.ResizeObserver;
    if(Observer){let width=0;const observer=new Observer(entries=>{const next=entries[0].contentRect.width;if(Math.abs(next-width)>.5){width=next;flip.update();}});observer.observe(el.parentElement);resizes.push(observer);}
  });
  return ()=>{stopMaterials();resizes.forEach(o=>o.disconnect());books.forEach(b=>b.destroy());};
}
