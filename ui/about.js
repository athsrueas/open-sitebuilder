import {escapeHtml as esc} from '/shared/render.js';
let dialog, content;
const link=(url,label,cls='')=>`<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
export async function openAbout(){
  if(dialog?.isConnected){dialog.showModal();return;}
  content??=fetch('/shared/about.json').then(r=>{if(!r.ok)throw new Error('About information is unavailable.');return r.json();}).catch(error=>{content=null;throw error;});
  const about=await content;
  dialog=document.createElement('dialog');dialog.className='about-dialog';dialog.setAttribute('aria-labelledby','about-title');
  dialog.innerHTML=`<div class="dialog-heading"><div><h2 id="about-title">About ${esc(about.name)}</h2><p>${esc(about.description)}</p></div><button data-about-close aria-label="Close About">×</button></div><nav class="about-nav" aria-label="About sections"><a href="#about-history">Feature history</a><a href="#about-credits">Library credits</a><a href="#about-dependencies">Dependency inventory</a>${link(about.repository+'/blob/main/README.md','README')}</nav><section id="about-history"><h3>Feature history</h3><ol class="about-history">${about.history.map(item=>`<li><h4>${esc(item.title)}</h4><p>${esc(item.description)}</p><small><time datetime="${esc(item.date)}">${esc(item.date)}</time> · ${link(about.repository+'/commit/'+item.commit,item.commit.slice(0,7),'about-commit')}</small></li>`).join('')}</ol></section><section id="about-credits"><h3>Library credits</h3><div class="about-libraries">${about.libraries.map(lib=>`<article><h4>${link(lib.repository,lib.name)}</h4><small>${esc(lib.version)} · ${esc(lib.license)}</small><p><strong>${esc(lib.feature)}</strong></p><p>${esc(lib.detail)}</p></article>`).join('')}</div><p>${esc(about.implementationNote)}</p><p>${link(about.repository+'/blob/main/THIRD-PARTY-IMAGE-LICENSES.md','Full image library license notices')}</p></section><section id="about-dependencies"><h3>Dependency inventory</h3><p>${esc(about.inventoryNote)}</p><details><summary>Installed JavaScript packages</summary><div data-inventory><p>Loading inventory…</p></div></details></section>`;
  const close=()=>{dialog.close();dialog.remove();};
  dialog.querySelector('[data-about-close]').onclick=close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.querySelectorAll('.about-nav a[href^="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();dialog.querySelector(a.getAttribute('href')).scrollIntoView({block:'start'});});
  dialog.querySelector('details').addEventListener('toggle',async e=>{
    if(!e.target.open||e.target.dataset.loaded)return;e.target.dataset.loaded='true';
    const host=dialog.querySelector('[data-inventory]');
    try{
      const response=await fetch('/shared/dependencies.json');if(!response.ok)throw new Error('Dependency inventory unavailable.');const packages=await response.json();
      host.innerHTML='<label>Search dependencies<input type="search" placeholder="Package or license" aria-label="Search dependencies"></label><p data-inventory-count></p><ul class="about-package-list"></ul><button data-more>Show more</button>';
      let limit=50;
      const render=()=>{const q=host.querySelector('input').value.toLowerCase(),matches=packages.filter(p=>(p.name+' '+p.license).toLowerCase().includes(q));host.querySelector('[data-inventory-count]').textContent=`${Math.min(limit,matches.length)} of ${matches.length} packages`;host.querySelector('ul').innerHTML=matches.slice(0,limit).map(p=>`<li>${p.repository?link(p.repository,p.name):esc(p.name)}<small>${esc(p.version)} · ${esc(p.license)}</small></li>`).join('');host.querySelector('[data-more]').hidden=limit>=matches.length;};
      host.querySelector('input').oninput=()=>{limit=50;render();};host.querySelector('[data-more]').onclick=()=>{limit+=50;render();};render();
    }catch(error){e.target.dataset.loaded='';host.textContent=error.message;}
  });
  document.body.append(dialog);dialog.showModal();
}
