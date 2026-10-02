import { BLOCKS, GROUPS } from '../shared/blocks.js';
const openGroups=new Map();
let searchText='';
export function blockLibraryMarkup(esc, attribute='data-add') {
  return `<div class="block-library"><input class="block-search" type="search" aria-label="Search blocks" placeholder="Search blocks"><div class="block-groups">${GROUPS.map(group=>`<details class="block-group" data-group="${esc(group)}" open><summary>${esc(group)} <small>${Object.values(BLOCKS).filter(b=>b.group===group).length}</small></summary><div class="palette">${Object.entries(BLOCKS).filter(([,b])=>b.group===group).map(([key,b])=>`<button draggable="true" ${attribute}="${key}" data-search="${esc((b.name+' '+b.description).toLowerCase())}" title="${esc(b.description)}"><span>${b.icon}</span>${esc(b.name)}</button>`).join('')}</div></details>`).join('')}</div><p class="no-block-results" hidden>No matching blocks.</p></div>`;
}
export function wireBlockSearch(root) {
  const input=root.querySelector('.block-search');
  if(!input)return;
  root.querySelectorAll('.block-group').forEach(group=>{
    if(openGroups.has(group.dataset.group))group.open=openGroups.get(group.dataset.group);
    group.addEventListener('toggle',()=>{if(!input.value)openGroups.set(group.dataset.group,group.open);});
  });
  input.value=searchText;
  const filter=()=>{
    searchText=input.value;
    const query=input.value.toLowerCase().trim();let count=0;
    root.querySelectorAll('.block-group').forEach(group=>{
      let matches=0;
      group.querySelectorAll('[data-search]').forEach(button=>{button.hidden=!query.split(/\s+/).every(token=>button.dataset.search.split(/[^a-z0-9]+/).some(word=>word.startsWith(token)));if(!button.hidden)matches++;});
      group.hidden=!matches;if(query&&matches)group.open=true;count+=matches;
    });
    root.querySelector('.no-block-results').hidden=Boolean(count);
  };
  input.addEventListener('input',filter);filter();
}
