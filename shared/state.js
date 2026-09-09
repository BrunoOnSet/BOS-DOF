// BOS shared state — single storage mechanism for global BOS values.
(function(){
  'use strict';
  const KEY='bos-shared-state-v1';
  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'null');
      return value&&typeof value==='object'?value:null;
    }catch(_){ return null; }
  }
  function patch(values={},source){
    try{
      const previous=read()||{};
      const next={...previous,...values,updatedAt:Date.now(),source:source||values.source||previous.source||'bos'};
      localStorage.setItem(KEY,JSON.stringify(next));
      try{window.dispatchEvent(new CustomEvent('bos:shared-state',{detail:next}));}catch(_){ }
      return next;
    }catch(_){ return null; }
  }
  function subscribe(handler){
    if(typeof handler!=='function') return ()=>{};
    const onLocal=e=>handler(e.detail||read(),{external:false});
    const onStorage=e=>{ if(e.key===KEY) handler(read(),{external:true}); };
    window.addEventListener('bos:shared-state',onLocal);
    window.addEventListener('storage',onStorage);
    return ()=>{window.removeEventListener('bos:shared-state',onLocal);window.removeEventListener('storage',onStorage);};
  }
  window.BOSSharedState={KEY,read,patch,subscribe};
})();
