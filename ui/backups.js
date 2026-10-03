import {escapeHtml as esc} from '/shared/render.js';

export async function openBackups(api) {
  let dialog=document.querySelector('#backups-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='backups-dialog';document.body.append(dialog);}
  dialog.innerHTML='<div class="dialog-heading"><h2>Code backups</h2><button aria-label="Close">×</button></div><p>Backups contain earlier application versions. They do not back up your portfolio, artwork or credentials.</p><label>After a successful update<select id="backup-retention"><option value="1">Keep the latest backup (default)</option><option value="3">Keep the latest three</option><option value="-1">Keep all backups</option><option value="0">Remove all code backups</option></select></label><p class="muted">Apply also removes existing backups beyond this limit. Removed backups go to the Windows Recycle Bin; empty it to reclaim disk space. Failed updates retain their recovery copy.</p><button id="apply-backup-retention">Apply retention</button><p id="backup-status" role="status"></p><div id="backup-list"></div>';
  dialog.querySelector('[aria-label="Close"]').onclick=()=>dialog.close();
  const status=dialog.querySelector('#backup-status'),select=dialog.querySelector('select'),list=dialog.querySelector('#backup-list');
  async function refresh(){const result=await api('backups');select.value=String(result.keep);list.innerHTML=result.items.map(item=>`<article class="backup-row"><p><strong>Version ${esc(item.version)}</strong> · ${esc(item.id)} · ${(item.bytes/1048576).toFixed(2)} MB</p><button data-reveal="${esc(item.id)}">Show in File Explorer</button> <button data-remove="${esc(item.id)}">Remove backup</button></article>`).join('')||'<p>No code backups stored.</p>';
    list.querySelectorAll('[data-reveal]').forEach(button=>button.onclick=()=>action('reveal',{id:button.dataset.reveal}));
    list.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{if(button.dataset.confirmed!=='yes'){button.dataset.confirmed='yes';button.textContent='Confirm removal';return;}action('delete',{id:button.dataset.remove});});
  }
  async function action(name,body){dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{const result=await api('backups/'+name,body);await refresh();status.textContent=result.recoveryFolders?.length?'Removed from the list. Recovery copy retained at '+result.recoveryFolders.join(', '):name==='reveal'?'Opened in File Explorer.':name==='settings'?'Retention saved. Older backups sent to the Recycle Bin.':'Backup sent to the Recycle Bin.';}catch(error){status.textContent=error.message;}finally{dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  dialog.querySelector('#apply-backup-retention').onclick=()=>action('settings',{keep:Number(select.value)});
  dialog.showModal();try{await refresh();}catch(error){status.textContent=error.message;}
}
