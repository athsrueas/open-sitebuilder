import {readFile, writeFile, readdir, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const readJson=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const start='<!-- folio-about:start -->',end='<!-- folio-about:end -->';
const cell=value=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
export function renderAboutMarkdown(about, inventory){
  const lines=[start,'## About, feature history and attributions','',about.description,'','Open **About** in the editor toolbar for these same credits and feature history.','','### Feature history',''];
  for(const item of about.history)lines.push(`- **${item.title}** — ${item.description} <sub>${item.date} · [${item.commit.slice(0,7)}](${about.repository}/commit/${item.commit})</sub>`);
  lines.push('','### Direct libraries','','| Library / version | Feature | Attribution / license |','| --- | --- | --- |');
  for(const lib of about.libraries)lines.push(`| [${cell(lib.name)}](${lib.repository}) · ${cell(lib.version)} | **${cell(lib.feature)}.** ${cell(lib.detail)} | ${cell(lib.license)} · [source and notices](${lib.repository}) |`);
  lines.push('',about.implementationNote,'','Full notices for the bundled image tools: [THIRD-PARTY-IMAGE-LICENSES.md](THIRD-PARTY-IMAGE-LICENSES.md).','',about.inventoryNote,'','<details>','<summary>Installed JavaScript dependency inventory</summary>','','| Package | Version | Declared license |','| --- | --- | --- |');
  for(const pkg of inventory)lines.push(`| ${pkg.repository?`[${cell(pkg.name)}](${pkg.repository})`:cell(pkg.name)} | ${cell(pkg.version)} | ${cell(pkg.license)} |`);
  lines.push('','</details>','','`shared/about.json` is the content source for both screens. After changing history, credits or dependencies, run `node scripts/sync-about.mjs`; `node scripts/sync-about.mjs --check` and the automated suite detect README drift. Setup refreshes the inventory from installed dependencies.','',end);
  return lines.join('\n');
}
export function replaceAboutSection(readme, generated){
  const from=readme.indexOf(start),to=readme.indexOf(end);
  if(from<0&&to<0)return readme.trimEnd()+'\n\n'+generated+'\n';
  if(from<0||to<from)throw new Error('Invalid README About markers.');
  return readme.slice(0,from)+generated+readme.slice(to+end.length);
}
const repositoryUrl=value=>{
  let url=typeof value==='string'?value:value?.url;
  if(!url)return null;
  url=url.replace(/^git\+/,'').replace(/^git:\/\//,'https://').replace(/\.git(?:#.*)?$/,'');
  if(url.startsWith('github:'))url='https://github.com/'+url.slice(7);
  if(/^[\w.-]+\/[\w.-]+(?:#.*)?$/.test(url))url='https://github.com/'+url;
  url=url.replace(/^git@github\.com:/,'https://github.com/').replace(/^ssh:\/\/git@github\.com\//,'https://github.com/');
  return /^https:\/\//.test(url)?url:null;
};
async function installedInventory(){
  const packages=new Map(),seen=new Set();
  async function scanModules(folder){
    let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
    for(const entry of entries){
      if(entry.name==='.pnpm'){
        for(const store of await readdir(path.join(folder,entry.name)))await scanModules(path.join(folder,entry.name,store,'node_modules'));
      }else if(entry.name.startsWith('@')){
        for(const scoped of await readdir(path.join(folder,entry.name)))await scanPackage(path.join(folder,entry.name,scoped));
      }else if(!entry.name.startsWith('.'))await scanPackage(path.join(folder,entry.name));
    }
  }
  async function scanPackage(folder){
    let resolved;try{resolved=await realpath(folder);}catch(e){if(e.code==='ENOENT')return;throw e;}
    if(seen.has(resolved))return;seen.add(resolved);
    let pkg;try{pkg=JSON.parse(await readFile(path.join(resolved,'package.json'),'utf8'));}catch(e){if(['ENOENT','ENOTDIR'].includes(e.code))return;throw e;}
    if(pkg.name&&pkg.version)packages.set(pkg.name+'@'+pkg.version,{name:pkg.name,version:pkg.version,license:typeof pkg.license==='string'?pkg.license:'See upstream notices',repository:repositoryUrl(pkg.repository)||repositoryUrl(pkg.homepage)});
    await scanModules(path.join(resolved,'node_modules'));
  }
  await scanModules(path.join(root,'node_modules'));
  if(!packages.size)throw new Error('Install dependencies before synchronizing About.');
  return [...packages.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
}
export async function syncAbout(check=false){
  const about=await readJson('shared/about.json'),manifest=await readJson('package.json');
  const deps={...manifest.dependencies,...manifest.devDependencies};
  for(const line of (await readFile(path.join(root,'requirements.txt'),'utf8')).split(/\r?\n/)){
    const match=line.match(/^([\w-]+)([<>=!~].*)$/);if(match)deps[match[1]]=match[2];
  }
  for(const lib of about.libraries){if(deps[lib.package]){if(check&&lib.version!==deps[lib.package])throw new Error('About version is stale: '+lib.package);lib.version=deps[lib.package];}}
  const inventory=check?await readJson('shared/dependencies.json'):await installedInventory();
  const readme=(await readFile(path.join(root,'README.md'),'utf8')).replaceAll('\r\n','\n');
  const next=replaceAboutSection(readme,renderAboutMarkdown(about,inventory));
  if(check){if(next!==readme)throw new Error('About and README are out of sync. Run node scripts/sync-about.mjs.');}
  else{await writeFile(path.join(root,'shared/about.json'),JSON.stringify(about,null,2)+'\n');await writeFile(path.join(root,'shared/dependencies.json'),JSON.stringify(inventory,null,2)+'\n');await writeFile(path.join(root,'README.md'),next);}
  return inventory.length;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(`About ${process.argv.includes('--check')?'checked':'synchronized'} (${await syncAbout(process.argv.includes('--check'))} dependency entries).`);}catch(error){console.error(error.message);process.exitCode=1;}
}
