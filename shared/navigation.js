// BOS internal navigation — preserves cockpit return position/state handoff.
(function(){
  'use strict';
  const RETURN_SCROLL_KEY='bos-cockpit-return-scroll-v1';
  const RETURNING_KEY='bos-cockpit-returning';
  function rememberCockpitPosition(){
    try{
      sessionStorage.setItem(RETURN_SCROLL_KEY,String(window.scrollY||0));
      sessionStorage.setItem(RETURNING_KEY,'1');
    }catch(_){ }
  }
  function markReturning(){
    try{sessionStorage.setItem(RETURNING_KEY,'1');}catch(_){ }
  }
  function openModule(url,options={}){
    if(!url || url==='#') return false;
    try{options.beforeNavigate?.();}catch(_){ }
    rememberCockpitPosition();
    try{window.BOSAnalytics?.track?.('open_full_tool',{module:options.module||null});}catch(_){ }
    location.href=url;
    return true;
  }
  function bindBackButton(button,options={}){
    const el=typeof button==='string'?document.getElementById(button):button;
    if(!el) return;
    el.addEventListener('click',()=>{
      try{options.beforeNavigate?.();}catch(_){ }
      markReturning();
    });
  }
  function restoreCockpitPosition(){
    let y=null;
    try{
      if(sessionStorage.getItem(RETURNING_KEY)==='1'){
        y=Number(sessionStorage.getItem(RETURN_SCROLL_KEY));
        sessionStorage.removeItem(RETURNING_KEY);
        sessionStorage.removeItem(RETURN_SCROLL_KEY);
      }
    }catch(_){ }
    if(Number.isFinite(y)) requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'instant'})));
  }
  window.BOSNavigation={RETURN_SCROLL_KEY,RETURNING_KEY,rememberCockpitPosition,markReturning,openModule,bindBackButton,restoreCockpitPosition};
})();
