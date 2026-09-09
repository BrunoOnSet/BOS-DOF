// BOS common database access. Network first; local files are offline fallbacks only.
(function(){
  'use strict';
  const CAMERA_URL='https://raw.githubusercontent.com/BrunoOnSet/BOS-CAMERA-DB/main/cameras.json';
  const PROJECTEURS_URL='https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
  async function fetchJson(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  async function load(remoteUrl,fallbackUrl,validate){
    try{
      const db=await fetchJson(remoteUrl);
      if(!validate(db)) throw new Error('Base distante invalide');
      return {db,source:'remote',url:remoteUrl};
    }catch(remoteError){
      if(!fallbackUrl) throw remoteError;
      const db=await fetchJson(fallbackUrl);
      if(!validate(db)) throw new Error('Fallback local invalide');
      return {db,source:'fallback',url:fallbackUrl,remoteError:String(remoteError)};
    }
  }
  const loadCameraDb=(fallbackUrl='data/cameras.json')=>load(CAMERA_URL,fallbackUrl,db=>!!db&&Array.isArray(db.cameras));
  const loadProjecteursDb=(fallbackUrl='data/lights.json')=>load(PROJECTEURS_URL,fallbackUrl,db=>!!db&&Array.isArray(db.fixtures));
  window.BOSData={CAMERA_URL,PROJECTEURS_URL,loadCameraDb,loadProjecteursDb};
})();
