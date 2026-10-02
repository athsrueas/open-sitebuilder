import {STYLE_FIELDS,FONTS,siteStyles} from '/shared/styles.js';
export function styleControls(theme,overrides,esc){
  const defaults=siteStyles(theme),isBlock=overrides!==null;
  return ['Colors','Typography','Layout','Paper & ink'].map(group=>`<details class="style-group" data-style-group="${group}" ${group==='Colors'?'open':''}><summary>${group}</summary>${group==='Paper & ink'?'<p class="small-note">Paper sits behind artwork. Ink finishes affect headings; washes decorate the background. Motion stops for reduced-motion preferences.</p>':''}${Object.entries(STYLE_FIELDS).filter(([,f])=>f.group===group&&!(isBlock&&f.siteOnly)).map(([k,f])=>{
    const custom=isBlock&&Object.hasOwn(overrides,k),v=custom?overrides[k]:defaults[k];
    const attrs=`aria-label="${esc(f.label)}" data-style="${k}" ${isBlock&&!custom?'disabled':''}`;
    const control=f.type==='select'?`<select ${attrs}>${f.options.map(o=>`<option value="${o}" ${v===o?'selected':''}>${esc(f.labels?.[o]||FONTS[o]?.label||o)}</option>`).join('')}</select>`:`<input ${attrs} type="${f.type}" value="${esc(v)}" ${f.type==='number'?`min="${f.min}" max="${f.max}" step="${f.step}"`:''}>`;
    return `<div class="style-field">${isBlock?`<label class="style-override"><input type="checkbox" data-override="${k}" ${custom?'checked':''}>${esc(f.label)}</label>`:`<label>${esc(f.label)}</label>`}${control}</div>`;
  }).join('')}</details>`).join('');
}
export function wireStyleControls(root,theme,overrides,onChange){
  const defaults=siteStyles(theme);
  root.querySelectorAll('[data-style]').forEach(el=>el.oninput=()=>onChange(el.dataset.style,el.type==='number'?Number(el.value):el.value));
  root.querySelectorAll('[data-override]').forEach(el=>el.onchange=()=>{
    const input=root.querySelector(`[data-style="${el.dataset.override}"]`);input.disabled=!el.checked;
    input.value=defaults[el.dataset.override];onChange(el.dataset.override,el.checked?defaults[el.dataset.override]:null);
  });
}
