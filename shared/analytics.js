// BOS analytics hook — intentionally no collector, no network, no persistence.
(function(){
  'use strict';
  function track(event,meta={}){
    const detail={event:String(event||''),module:meta.module||null,action:meta.action||null,timestamp:Date.now()};
    try{window.dispatchEvent(new CustomEvent('bos:analytics-event',{detail}));}catch(_){ }
    return detail;
  }
  window.BOSAnalytics={track,collector:null};
})();
