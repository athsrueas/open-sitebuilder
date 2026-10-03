import {STYLE_FIELDS,FONTS,siteStyles,normalizeStyleNumber,validStyle} from '../shared/styles.js';
export function styleControls(theme,overrides,esc){
  const defaults=siteStyles(theme),isBlock=overrides!==null;
  return ['Colors','Typography','Layout','Paper & ink'].map(group=>`<details class="style-group" data-style-group="${group}" ${group==='Colors'?'open':''}><summary>${group}</summary>${group==='Paper & ink'?'<p class="small-note">Paper sits behind artwork. Ink finishes affect headings; washes decorate the background. Motion stops for reduced-motion preferences.</p>':''}${Object.entries(STYLE_FIELDS).filter(([,f])=>f.group===group&&!(isBlock&&f.siteOnly)).map(([k,f])=>{
    const custom=isBlock&&Object.hasOwn(overrides,k),v=custom?overrides[k]:defaults[k];
    const attrs=`aria-label="${esc(f.label)}" data-style="${k}" ${isBlock&&!custom?'disabled':''}`;
    const control=f.type==='select'?`<select ${attrs}>${f.options.map(o=>`<option value="${o}" ${v===o?'selected':''}>${esc(f.labels?.[o]||FONTS[o]?.label||o)}</option>`).join('')}</select>`:`<input ${attrs} type="${f.type}" value="${esc(v)}" ${f.type==='number'?`min="${f.min}" max="${f.max}" step="${f.step}"`:''}>`;
    return `<div class="style-field">${isBlock?`<label class="style-override"><input type="checkbox" data-override="${k}" ${custom?'checked':''}>${esc(f.label)}</label>`:`<label>${esc(f.label)}</label>`}${control}${f.type==='number'?`<small class="small-note">${f.min}–${f.max}${f.step!==1?` · steps of ${f.step}`:''}</small>`:''}</div>`;
  }).join('')}</details>`).join('');
}
export function wireStyleControls(root,theme,overrides,onChange){
  const defaults=siteStyles(theme),resets=new WeakMap();
  root.querySelectorAll('[data-style]').forEach(el=>{
    const key=el.dataset.style;let lastValue=Number(el.value);
    resets.set(el,()=>{lastValue=Number(el.value);});
    if(el.type!=='number'){el.oninput=()=>{if(validStyle(key,el.value))onChange(key,el.value);};return;}
    const commit=()=>{
      if(el.disabled)return;
      const value=normalizeStyleNumber(key,el.value,lastValue);
      el.value=String(value);el.setCustomValidity('');
      if(value!==lastValue){lastValue=value;onChange(key,value);}
    };
    el.oninput=()=>{
      const value=el.value.trim()===''?NaN:Number(el.value);
      if(!validStyle(key,value)||Math.abs(normalizeStyleNumber(key,value,lastValue)-value)>1e-7){el.setCustomValidity(`Choose ${STYLE_FIELDS[key].min} to ${STYLE_FIELDS[key].max}, in steps of ${STYLE_FIELDS[key].step}.`);return;}
      el.setCustomValidity('');lastValue=value;onChange(key,value);
    };
    el.onchange=commit;el.onblur=commit;
    el.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();}});
  });
  root.querySelectorAll('[data-override]').forEach(el=>el.onchange=()=>{
    const input=root.querySelector(`[data-style="${el.dataset.override}"]`);input.disabled=!el.checked;
    input.value=defaults[el.dataset.override];resets.get(input)?.();input.setCustomValidity('');onChange(el.dataset.override,el.checked?defaults[el.dataset.override]:null);
  });
}
