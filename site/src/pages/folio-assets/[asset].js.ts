import protectionSource from '../../../../shared/image-protection.js?raw';
import materialSource from '../../../../shared/material-lifecycle.js?raw';
import runtimeSource from '../../../../shared/runtime.js?raw';
import pageFlipSource from '../../../../node_modules/page-flip/dist/js/page-flip.browser.js?raw';
import project from '../../project.json';
import {pageFeatures} from '../../../../shared/published.js';

export function getStaticPaths(){
  const features=project.pages.map(page=>pageFeatures(project,page));
  const paths=[];
  if(features.some(f=>f.protection))paths.push('image-protection');
  if(features.some(f=>f.books))paths.push('page-flip','books');
  if(features.some(f=>f.motion&&!f.books))paths.push('materials');
  return paths.map(asset=>({params:{asset}}));
}
export async function GET({params}){
  let source;
  if(params.asset==='image-protection')source=protectionSource;
  else if(params.asset==='page-flip')source=pageFlipSource;
  else {
    const materials=materialSource.replace('export function','function');
    if(params.asset==='materials')source=materials+'\ninitMaterials(document.querySelector("#portfolio"));';
    else {
      const runtime=runtimeSource.replace(/^import[^\n]+\n/,'').replace('export function','function');
      source=materials+'\n'+runtime+'\ninitPortfolio(document.querySelector("#portfolio"),window.St?.PageFlip);';
    }
  }
  return new Response(source,{headers:{'Content-Type':'application/javascript; charset=utf-8'}});
}
