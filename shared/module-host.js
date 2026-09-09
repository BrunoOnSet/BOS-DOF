// BOS module host — adapter boundary between an extractable tool core and its environment.
// The module core sees this interface; it does not need to know whether it runs inside Bruno OnSet or standalone.
(function(){
  'use strict';
  const cfg=window.BOS_MODULE_CONFIG||{};
  const moduleId=String(cfg.module||document.documentElement.dataset.bosModule||'module').toLowerCase();
  const mode=String(cfg.mode||document.documentElement.dataset.bosMode||'standalone').toLowerCase()==='integrated'?'integrated':'standalone';
  const root=String(cfg.root|| (mode==='integrated'?'../../':'./'));
  const build=Number(cfg.bosBuild)||79;
  let unsubscribe=null;

  function isIntegrated(){ return mode==='integrated'; }
  function isStandalone(){ return !isIntegrated(); }
  function rootPath(path=''){
    const clean=String(path||'').replace(/^\/+/, '');
    return `${root}${clean}`;
  }
  function assetPath(path=''){
    return isIntegrated()?rootPath(path):String(path||'').replace(/^\/+/, '');
  }
  function readShared(){
    if(!isIntegrated()) return null;
    try{return window.BOSSharedState?.read?.()||null;}catch(_){return null;}
  }
  function patchShared(values={},source=moduleId){
    if(!isIntegrated()) return null;
    try{return window.BOSSharedState?.patch?.(values,source)||null;}catch(_){return null;}
  }
  function subscribeShared(handler){
    if(!isIntegrated() || typeof handler!=='function' || !window.BOSSharedState?.subscribe) return ()=>{};
    try{
      unsubscribe=window.BOSSharedState.subscribe((state,meta)=>{
        if(!state || state.source===moduleId) return;
        handler(state,meta||{});
      });
      return unsubscribe;
    }catch(_){return ()=>{};}
  }
  function markReturning(){
    if(!isIntegrated()) return;
    try{
      if(window.BOSNavigation?.markReturning) window.BOSNavigation.markReturning();
      else sessionStorage.setItem('bos-cockpit-returning','1');
    }catch(_){ }
  }
  function applyModeUi(){
    document.documentElement.dataset.bosMode=mode;
    document.documentElement.dataset.bosModule=moduleId;
    const back=document.getElementById('bosBackBtn');
    const row=back?.closest?.('[data-bos-return]')||back?.parentElement;
    if(isStandalone()){
      if(row) row.hidden=true;
      if(back){back.hidden=true;back.setAttribute('aria-hidden','true');back.tabIndex=-1;}
    }else if(row){row.hidden=false;}
  }
  function bindBack(button='bosBackBtn',beforeNavigate){
    const el=typeof button==='string'?document.getElementById(button):button;
    if(!el) return;
    if(isStandalone()){
      const row=el.closest?.('[data-bos-return]')||el.parentElement;
      if(row) row.hidden=true;
      el.hidden=true;
      return;
    }
    el.addEventListener('click',()=>{
      try{beforeNavigate?.();}catch(_){ }
      markReturning();
    });
  }
  function track(event,meta={}){
    const detail={module:moduleId,...meta};
    if(isIntegrated()){
      try{return window.BOSAnalytics?.track?.(event,detail)||detail;}catch(_){return detail;}
    }
    // Standalone: local event only. No collector, network request or persistence.
    const payload={event:String(event||''),...detail,timestamp:Date.now()};
    try{window.dispatchEvent(new CustomEvent('bos:analytics-event',{detail:payload}));}catch(_){ }
    return payload;
  }
  function trackOpen(){ return track('module_open'); }
  async function registerServiceWorker(){
    if(!('serviceWorker' in navigator) || location.protocol==='file:') return null;
    const url=isIntegrated()?rootPath(`sw.js?v=${build}`):'./sw.js';
    try{
      const reg=await navigator.serviceWorker.register(url,{updateViaCache:'none'});
      if(isIntegrated()) try{await reg.update();}catch(_){ }
      return reg;
    }catch(_){return null;}
  }
  async function fetchJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  async function loadCameraDb(fallback='data/cameras.json'){
    if(isIntegrated() && window.BOSData?.loadCameraDb){
      return window.BOSData.loadCameraDb(assetPath(fallback));
    }
    const remote='https://raw.githubusercontent.com/BrunoOnSet/BOS-CAMERA-DB/main/cameras.json';
    try{
      const db=await fetchJson(remote);
      if(!db||!Array.isArray(db.cameras)) throw new Error('Camera DB invalide');
      return {db,source:'remote',url:remote};
    }catch(remoteError){
      const local=assetPath(fallback);
      const db=await fetchJson(local);
      if(!db||!Array.isArray(db.cameras)) throw new Error('Fallback Camera DB invalide');
      return {db,source:'fallback',url:local,remoteError:String(remoteError)};
    }
  }
  async function loadProjecteursDb(fallback='data/lights.json'){
    if(isIntegrated() && window.BOSData?.loadProjecteursDb){
      return window.BOSData.loadProjecteursDb(assetPath(fallback));
    }
    const remote='https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
    try{
      const db=await fetchJson(remote);
      if(!db||!Array.isArray(db.fixtures)) throw new Error('Projecteurs DB invalide');
      return {db,source:'remote',url:remote};
    }catch(remoteError){
      const local=assetPath(fallback);
      const db=await fetchJson(local);
      if(!db||!Array.isArray(db.fixtures)) throw new Error('Fallback Projecteurs DB invalide');
      return {db,source:'fallback',url:local,remoteError:String(remoteError)};
    }
  }
  function destroy(){try{unsubscribe?.();}catch(_){ }unsubscribe=null;}

  window.BOSModuleHost={
    moduleId,mode,build,isIntegrated,isStandalone,rootPath,assetPath,
    readShared,patchShared,subscribeShared,markReturning,applyModeUi,
    bindBack,track,trackOpen,registerServiceWorker,loadCameraDb,loadProjecteursDb,destroy
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyModeUi,{once:true});
  else applyModeUi();
})();
