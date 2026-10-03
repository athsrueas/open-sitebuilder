import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioMarkup} from '../shared/render.js';
test('splash uses editable portfolio content and procedural motion without navigation',()=>{
  const project={name:'Miranda Freestone',description:'',presentation:'splash',theme:{background:'#f4f0e7',ink:'#20211f',accent:'#555555',paperTexture:'watercolor',paperMotion:'soft-light',inkWash:'bloom',inkWashColor:'#37383c',inkWashStrength:27,materialDuration:22},assets:[],pages:[{id:'page',blocks:[{id:'hero',type:'hero',label:'Miranda Freestone',title:'Something new\ncoming soon.',text:'',images:[],spreads:[]}]}]};
  const {html,css}=portfolioMarkup(project,'page');
  assert.match(html,/<main class="splash-page">/);assert.match(html,/data-edit="title">Something new\ncoming soon\./);
  assert.doesNotMatch(html,/<header>|<nav>|<footer>/);assert.match(html,/material-layers/);assert.match(css,/--wash-animation:folio-ink-bloom/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/min-height:100svh/);
  delete project.presentation;
  assert.match(portfolioMarkup(project,'page').html,/<header>/);
});
