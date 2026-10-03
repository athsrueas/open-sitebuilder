import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {renderAboutMarkdown,replaceAboutSection,syncAbout} from '../scripts/sync-about.mjs';
const json=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
test('About credits cover all direct dependencies and link to real feature commits',async()=>{
  const about=await json('shared/about.json'),manifest=await json('package.json');
  const packages=new Set(about.libraries.map(p=>p.package));
  for(const name of Object.keys({...manifest.dependencies,...manifest.devDependencies}))assert.ok(packages.has(name),name);
  const requirements=await readFile(new URL('../requirements.txt',import.meta.url),'utf8');
  for(const line of requirements.trim().split(/\r?\n/)){const [name]=line.split(/[<>=]/);assert.ok(packages.has(name),name);assert.equal(about.libraries.find(p=>p.package===name).version,line.slice(name.length));}
  for(const lib of about.libraries){assert.match(lib.repository,/^https:\/\/github\.com\//);assert.ok(lib.feature&&lib.detail&&lib.license);}
  for(const item of about.history){assert.match(item.commit,/^[a-f0-9]{40}$/);execFileSync('git',['cat-file','-e',item.commit+'^{commit}']);}
  await syncAbout(true);
});
test('README synchronization is repeatable and preserves unrelated documentation',async()=>{
  const about=await json('shared/about.json'),inventory=await json('shared/dependencies.json');
  const section=renderAboutMarkdown(about,inventory),first=replaceAboutSection('Existing guide\n',section);
  assert.ok(first.startsWith('Existing guide\n'));assert.equal(replaceAboutSection(first,section),first);
  assert.throws(()=>replaceAboutSection('<!-- folio-about:start -->',section));
  for(const lib of about.libraries.filter(p=>!['Pillow','python-dotenv'].includes(p.package)))assert.ok(inventory.some(p=>p.name===lib.package&&p.version===lib.version));
});
