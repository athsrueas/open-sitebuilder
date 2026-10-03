// Recover a rotated local session without discarding the editor's unsaved state.
export function createApiClient({getToken,setToken,parseToken,fetchImpl=(...args)=>fetch(...args)}){
  return async function api(path,value,extra={}){
    const send=()=>fetchImpl('/api/'+path,value===undefined?{}:{method:'POST',headers:{'X-Folio-Token':getToken(),'Content-Type':'application/json',...extra},body:typeof Blob!=='undefined'&&value instanceof Blob?value:JSON.stringify(value)});
    let response=await send(),data=await response.json();
    if(value!==undefined&&response.status===403&&(data.code==='session_expired'||data.error==='Invalid local editor session. Reload the editor.')){
      const fresh=await fetchImpl('/',{cache:'no-store'});
      if(fresh.ok){
        const token=parseToken(await fresh.text());
        if(token){setToken(token);response=await send();data=await response.json();}
      }
    }
    if(!response.ok)throw new Error(data.error||'Operation failed');
    return data;
  };
}
