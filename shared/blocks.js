import {INTERNAL_LINK} from './links.js';
import blocks from './blocks.json' with { type: 'json' };
export const BLOCKS = blocks;
export const GROUPS = [...new Set(Object.values(blocks).map(b => b.group))];
export const IMAGE_TYPES = ['image','imageText','cover','gallery','carousel','cards'];
export const SINGLE_IMAGE_TYPES = ['image','imageText','cover'];
export function safeUrl(value, media=false) {
  const text=String(value??'').trim();
  if (!media && (INTERNAL_LINK.test(text)||/^#[a-zA-Z0-9_-]+$/.test(text)))return text;
  if (!media && /^\/(?!\/)[^\s\\]*$/.test(text)) return text;
  try { const url=new URL(text);return url.protocol==='https:' ? url.href : ''; }
  catch { return ''; }
}
export function videoEmbed(value) {
  const safe=safeUrl(value,true);if(!safe)return '';
  const url=new URL(safe);
  let id;
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname)){
    id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if(/^[\w-]{11}$/.test(id??''))return 'https://www.youtube-nocookie.com/embed/'+id;
  }
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname)){
    id=url.pathname.match(/(?:\/video)?\/(\d+)(?:\/|$)/)?.[1];
    if(id)return 'https://player.vimeo.com/video/'+id;
  }
  return '';
}
