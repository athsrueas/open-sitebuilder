// Internal destinations are identities; only resolved public URLs reach exported HTML.
export const INTERNAL_LINK=/^folio:page:([a-f0-9]{32})(?::block:([a-f0-9]{32}))?$/;
export function pagePath(project,page){return project.pages[0]?.id===page.id?'/':'/'+page.slug+'/';}
export function blockAnchor(block){return 'block-'+block.id;}
export function internalLink(page,block){return 'folio:page:'+page.id+(block?':block:'+block.id:'');}
export function resolveLink(value,project){
  const match=INTERNAL_LINK.exec(String(value||''));
  if(!match)return String(value||'');
  const page=project.pages.find(p=>p.id===match[1]);if(!page)return '';
  const block=match[2]?page.blocks.find(b=>b.id===match[2]):null;
  if(match[2]&&!block)return '';
  return pagePath(project,page)+(block?'#'+blockAnchor(block):'');
}
