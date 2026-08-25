const CAMERA_DB_URL="https://raw.githubusercontent.com/BrunoSetTools/BOS-CAMERA-DB/main/cameras.json";
const CAMERA_DB_CACHE_KEY="bos-camera-db-cache-v1";
const DOF_CAMERA_KEY='bos-dof-camera-id-v1';
const DOF_LAST_CAMERA_BY_BRAND_KEY='bos-dof-last-camera-by-brand-v1';
const FALLBACK_CAMERA_DB={"schemaVersion":1,"databaseVersion":"1.0","updated":"2026-08-18","cameras":[{"id":"fx30","name":"Sony FX30","brand":"Sony","group":"SONY","sensorWidthMm":23.3,"dof":{"label":"Super 35 / APS-C","cocMm":0.019,"cropToFF":1.5}},{"id":"fx3","name":"Sony FX3","brand":"Sony","group":"SONY","sensorWidthMm":35.6,"dof":{"label":"Full Frame","cocMm":0.029,"cropToFF":1.0}},{"id":"fx5","name":"Sony FX5","brand":"Sony","group":"SONY","sensorWidthMm":35.9,"dof":{"label":"Full Frame","cocMm":0.029,"cropToFF":1.0}},{"id":"fx6","name":"Sony FX6","brand":"Sony","group":"SONY","sensorWidthMm":35.6,"dof":{"label":"Full Frame","cocMm":0.029,"cropToFF":1.0}},{"id":"vraptor","name":"RED V-RAPTOR VV","brand":"RED","group":"ARRI / RED","sensorWidthMm":40.96,"dof":{"label":"Vista Vision","cocMm":0.033,"cropToFF":0.88}},{"id":"miniLF","name":"ARRI ALEXA Mini LF","brand":"ARRI","group":"ARRI / RED","sensorWidthMm":36.7,"dof":{"label":"Large Format","cocMm":0.03,"cropToFF":0.98}},{"id":"alexa35","name":"ARRI ALEXA 35","brand":"ARRI","group":"ARRI / RED","sensorWidthMm":27.99,"dof":{"label":"Super 35","cocMm":0.023,"cropToFF":1.29}},{"id":"ff","name":"Full Frame 36 mm","brand":"Générique","group":"GÉNÉRIQUE","sensorWidthMm":36.0,"dof":{"label":"Full Frame","cocMm":0.029,"cropToFF":1.0}},{"id":"s35","name":"Super 35","brand":"Générique","group":"GÉNÉRIQUE","sensorWidthMm":24.89,"dof":{"label":"Super 35","cocMm":0.019,"cropToFF":1.5}},{"id":"apsc","name":"APS-C","brand":"Générique","group":"GÉNÉRIQUE","sensorWidthMm":23.5,"dof":{"label":"APS-C","cocMm":0.019,"cropToFF":1.53}},{"id":"mft","name":"Micro 4/3","brand":"Générique","group":"GÉNÉRIQUE","sensorWidthMm":17.3,"dof":{"label":"Micro 4/3","cocMm":0.014,"cropToFF":2.08}},{"id":"oneinch","name":"1 pouce","brand":"Générique","group":"GÉNÉRIQUE","sensorWidthMm":13.2,"dof":{"label":"1 pouce","cocMm":0.011,"cropToFF":2.73}}]};
let cameraDb=FALLBACK_CAMERA_DB;
let cameraPresets=[...FALLBACK_CAMERA_DB.cameras];
let currentCameraId='ff';

function validCameraDb(data){
  return !!(data && Array.isArray(data.cameras) && data.cameras.some(c=>c?.id && c?.dof && Number(c.dof.cocMm)>0));
}
function setCameraDb(data){
  if(!validCameraDb(data)) return false;
  cameraDb=data;
  cameraPresets=data.cameras.filter(c=>c?.id && c?.dof && Number(c.dof.cocMm)>0);
  return !!cameraPresets.length;
}
function loadCachedCameraDb(){
  try{const cached=JSON.parse(localStorage.getItem(CAMERA_DB_CACHE_KEY)||'null');if(cached)setCameraDb(cached)}catch(_ ){}
}
function currentCamera(){return cameraPresets.find(c=>c.id===currentCameraId)||cameraPresets.find(c=>c.id==='ff')||cameraPresets[0];}
function currentFormat(){
  const c=currentCamera();
  return {name:`${c.name} · ${c.dof.label}`,label:c.dof.label,coc:Number(c.dof.cocMm),cropToFF:Number(c.dof.cropToFF)||1};
}
function cameraBrand(c){
  return String(c?.brand || c?.group || 'Autre').trim() || 'Autre';
}
function cameraShortLabel(c){
  const name=String(c?.name || c?.id || '');
  const brand=String(c?.brand || '').trim();
  return brand && name.toLowerCase().startsWith((brand+' ').toLowerCase()) ? name.slice(brand.length+1) : name;
}
function cameraBrands(){
  const seen=new Set(), brands=[];
  cameraPresets.forEach(c=>{const brand=cameraBrand(c);if(!seen.has(brand)){seen.add(brand);brands.push(brand);}});
  return brands;
}
function camerasForBrand(brand){return cameraPresets.filter(c=>cameraBrand(c)===brand);}
function getLastCameraForBrand(brand){
  try{
    const saved=JSON.parse(localStorage.getItem(DOF_LAST_CAMERA_BY_BRAND_KEY)||'{}');
    const id=saved?.[brand];
    return camerasForBrand(brand).some(c=>c.id===id)?id:null;
  }catch(_){return null;}
}
function rememberCameraForBrand(camera){
  if(!camera)return;
  try{
    const saved=JSON.parse(localStorage.getItem(DOF_LAST_CAMERA_BY_BRAND_KEY)||'{}');
    saved[cameraBrand(camera)]=camera.id;
    localStorage.setItem(DOF_LAST_CAMERA_BY_BRAND_KEY,JSON.stringify(saved));
  }catch(_ ){}
}
function setCurrentCamera(id,persist=true){
  if(!cameraPresets.some(c=>c.id===id)) id=cameraPresets.find(c=>c.id==='ff')?.id || cameraPresets[0]?.id;
  currentCameraId=id;
  const c=currentCamera();
  if(c)rememberCameraForBrand(c);
  if(persist){try{localStorage.setItem(DOF_CAMERA_KEY,id)}catch(_ ){}}
  renderCameraSelect();
  calculate();
}
function updateCameraSelector(){
  const c=currentCamera(); if(!c)return;
  const note=$('cameraSelectFormat');
  if(note) note.textContent=`${c.dof.label} · CoC ${Number(c.dof.cocMm).toFixed(3).replace('.',',')} mm`;
  const summary=$('cameraSettingsSummary');
  if(summary) summary.textContent=c.name || cameraShortLabel(c);
}
function renderCameraBrandButtons(){
  const host=$('cameraBrandMode'); if(!host)return;
  const activeBrand=cameraBrand(currentCamera());
  host.innerHTML='';
  cameraBrands().forEach(brand=>{
    const b=document.createElement('button');
    b.type='button'; b.dataset.camerabrand=brand; b.textContent=brand;
    b.className=brand===activeBrand?'active':'';
    host.appendChild(b);
  });
}
function renderCameraSelect(){
  const select=$('cameraSelect'); if(!select)return;
  const active=currentCamera(); if(!active)return;
  const brand=cameraBrand(active);
  const list=camerasForBrand(brand);
  select.innerHTML='';
  list.forEach(c=>{
    const o=document.createElement('option');
    o.value=c.id;o.textContent=cameraShortLabel(c);o.selected=c.id===currentCameraId;
    select.appendChild(o);
  });
  select.value=currentCameraId;
  select.title=select.options[select.selectedIndex]?.textContent || '';
  renderCameraBrandButtons();
  updateCameraSelector();
}
function changeCameraBrand(brand){
  const remembered=getLastCameraForBrand(brand);
  const first=camerasForBrand(brand)[0];
  if(remembered)setCurrentCamera(remembered,true);
  else if(first)setCurrentCamera(first.id,true);
}

async function refreshCameraDb(){
  try{
    const res=await fetch(CAMERA_DB_URL,{cache:'no-store'});if(!res.ok)throw new Error(String(res.status));const data=await res.json();if(!setCameraDb(data))throw new Error('invalid');
    try{localStorage.setItem(CAMERA_DB_CACHE_KEY,JSON.stringify(data))}catch(_ ){}
    if(!cameraPresets.some(c=>c.id===currentCameraId)) currentCameraId='ff';
    renderCameraSelect();calculate();
  }catch(_ ){}
}

const $ = (id) => document.getElementById(id);
const inputs = {
  focal: $("focal"),
  aperture: $("aperture"),
  distance: $("distance"),
  subject2Distance: $("subject2Distance"),
  interviewFocal: $("interviewFocal"),
  interviewDepth: $("interviewDepth")
};
const apertureStops = [1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const rangeInputs = {
  focal: $("focalSlider"),
  aperture: $("apertureSlider"),
  distance: $("distanceSlider"),
  subject2Distance: $("subject2DistanceSlider"),
  interviewFocal: $("interviewFocalSlider"),
  interviewDepth: $("interviewDepthSlider")
};

let subject2Enabled = true;
let focusMode = "optimal";
let focusSafetyM = 0;
let interviewShot = "chest";

const practicalStops = [0.7,0.8,0.9,1,1.1,1.2,1.4,1.6,1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22,25,29,32];
const interviewShots = {
  full:{label:"Pied",heightRatio:1,frameFill:.82},
  american:{label:"Américain",heightRatio:.74,frameFill:.82},
  waist:{label:"Taille",heightRatio:.52,frameFill:.82},
  chest:{label:"Poitrine",heightRatio:.34,frameFill:.82},
  face:{label:"Serré visage",heightRatio:.16,frameFill:.78}
};

function parseFR(v) {
  return Number(String(v).replace(",", ".").trim());
}

function roundSmart(value) {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

function formatM(m) {
  if (!Number.isFinite(m)) return "∞";
  if (m < 1) return `${Math.round(m * 100)} cm`;
  if (m < 10) return `${m.toFixed(2).replace(".", ",")} m`;
  return `${m.toFixed(1).replace(".", ",")} m`;
}

function formatDepth(m) {
  if (!Number.isFinite(m)) return "∞";
  if (m < 0.01) return `${Math.round(m * 1000)} mm`;
  if (m < 1) return `${Math.round(m * 100)} cm`;
  if (m < 10) return `${m.toFixed(2).replace(".", ",")} m`;
  return `${m.toFixed(1).replace(".", ",")} m`;
}

function formatFocal(mm) {
  const value = roundSmart(mm).toString().replace(".", ",");
  return `${value} mm`;
}

function solverInterval(s1M,s2M,safetyM=focusSafetyM){
  return {
    nearM:Math.max(.05,Math.min(s1M,s2M)-safetyM),
    farM:Math.max(s1M,s2M)+safetyM
  };
}

function optimalFocusForPair(s1M,s2M,safetyM=focusSafetyM){
  const interval=solverInterval(s1M,s2M,safetyM);
  if(!(interval.nearM>0 && interval.farM>0)) return NaN;
  if(Math.abs(interval.farM-interval.nearM)<1e-9) return interval.nearM;
  return (2*interval.nearM*interval.farM)/(interval.nearM+interval.farM);
}

function requiredApertureForPair(focalMm,cocMm,s1M,s2M,safetyM=focusSafetyM){
  const interval=solverInterval(s1M,s2M,safetyM);
  const nearMm=interval.nearM*1000,farMm=interval.farM*1000;
  const focusMm=optimalFocusForPair(s1M,s2M,safetyM)*1000;
  if(!(focalMm>0 && cocMm>0 && nearMm>focalMm && farMm>=nearMm && focusMm>focalMm)) return Infinity;
  if(Math.abs(farMm-nearMm)<1e-6) return 0;
  const nearCap=nearMm*(focusMm-focalMm)/(focusMm-nearMm);
  const farCap=farMm*(focusMm-focalMm)/(farMm-focusMm);
  const hCap=Math.min(nearCap,farCap);
  const denominator=cocMm*(hCap-focalMm);
  return denominator>0 ? (focalMm*focalMm)/denominator : Infinity;
}

function dofBounds(focalMm,aperture,cocMm,focusM){
  const s=focusM*1000;
  const H=(focalMm*focalMm)/(aperture*cocMm)+focalMm;
  const nearMm=(H*s)/(H+(s-focalMm));
  const farMm=H>(s-focalMm)?(H*s)/(H-(s-focalMm)):Infinity;
  return {nearM:nearMm/1000,farM:Number.isFinite(farMm)?farMm/1000:Infinity};
}

function interviewDistanceForFrame(focalMm,personHeightM,shot,camera){
  const widthMm=Number(camera?.sensorWidthMm)||36;
  const nativeHeightMm=Number(camera?.sensorHeightMm||camera?.sensor?.heightMm)||0;
  const sixteenNineHeight=widthMm*9/16;
  const activeHeightMm=nativeHeightMm>0?Math.min(nativeHeightMm,sixteenNineHeight):sixteenNineHeight;
  const visiblePersonM=personHeightM*shot.heightRatio;
  const imageHeightMm=activeHeightMm*shot.frameFill;
  const distanceMm=focalMm+(focalMm*visiblePersonM*1000)/imageHeightMm;
  return {distanceM:distanceMm/1000,activeHeightMm,visiblePersonM};
}

function requiredApertureAtFocus(focalMm,cocMm,focusM,depthM){
  const wantedNear=Math.max(.05,focusM-depthM/2);
  const wantedFar=focusM+depthM/2;
  const fits=aperture=>{
    const bounds=dofBounds(focalMm,aperture,cocMm,focusM);
    return bounds.nearM<=wantedNear+1e-9 && bounds.farM+1e-9>=wantedFar;
  };
  if(fits(.5)) return .5;
  let high=1;
  while(high<128 && !fits(high)) high*=2;
  if(high>=128 && !fits(high)) return Infinity;
  let low=.5;
  for(let i=0;i<60;i++){
    const mid=(low+high)/2;
    if(fits(mid)) high=mid; else low=mid;
  }
  return high;
}

function renderInterviewPlanner(){
  const focal=parseFR(inputs.interviewFocal.value);
  const depthCm=parseFR(inputs.interviewDepth.value);
  const shot=interviewShots[interviewShot]||interviewShots.chest;
  const camera=currentCamera();
  const coc=currentFormat().coc;

  if(!(focal>0 && depthCm>0 && camera)){
    $("interviewDistance160").textContent="≈ —";
    $("interviewDistance180").textContent="≈ —";
    $("interviewApertureResult").textContent="—";
    $("interviewResultDetail").textContent="Réglages incomplets.";
    return;
  }

  const framing160=interviewDistanceForFrame(focal,1.60,shot,camera);
  const framing180=interviewDistanceForFrame(focal,1.80,shot,camera);
  const depthM=depthCm/100;
  // Le sujet de 1,60 m impose la caméra la plus proche : c'est le cas prudent
  // retenu pour afficher un seul diaphragme minimum valable pour les deux repères.
  const exactAperture=requiredApertureAtFocus(focal,coc,framing160.distanceM,depthM);
  const practicalAperture=nextPracticalStop(exactAperture);
  const halfDepth=depthM/2;

  $("interviewDistance160").textContent=`≈ ${formatM(framing160.distanceM)}`;
  $("interviewDistance180").textContent=`≈ ${formatM(framing180.distanceM)}`;
  $("interviewApertureResult").textContent=Number.isFinite(practicalAperture)?`f/${String(practicalAperture).replace(".",",")}`:"> f/32";
  $("interviewResultDetail").textContent=Number.isFinite(practicalAperture)
    ? `Minimum prudent calculé au repère 1,60 m · zone utile ± ${formatDepth(halfDepth)} autour de la personne.`
    : "La zone nette demandée nécessite de fermer au-delà de f/32 avec ce cadre.";
  $("interviewSummary").textContent=`${String(roundSmart(focal)).replace(".",",")} mm · ${shot.label} · PDC ${String(roundSmart(depthCm)).replace(".",",")} cm`;
  $("interviewNote").textContent=`Distances approximatives en 16:9 · hauteur active ${framing160.activeHeightMm.toFixed(1).replace(".",",")} mm · ${camera.name}. Confirmer le cadre exact dans FRAME.`;
}
function nextPracticalStop(value){
  if(!Number.isFinite(value)) return Infinity;
  return practicalStops.find(stop=>stop+1e-8>=value) ?? Infinity;
}

function minimumRetreat(focalMm,aperture,cocMm,s1M,s2M,safetyM){
  const fits=r=>requiredApertureForPair(focalMm,cocMm,s1M+r,s2M+r,safetyM)<=aperture+1e-9;
  if(fits(0)) return 0;
  let high=.25;
  while(high<=50 && !fits(high)) high*=2;
  if(high>50) return Infinity;
  let low=0;
  for(let i=0;i<60;i++){
    const mid=(low+high)/2;
    if(fits(mid)) high=mid; else low=mid;
  }
  return high;
}

function maximumUsableFocal(focalMm,aperture,cocMm,s1M,s2M,safetyM){
  const fits=f=>requiredApertureForPair(f,cocMm,s1M,s2M,safetyM)<=aperture+1e-9;
  if(fits(focalMm)) return focalMm;
  const minimum=9;
  if(!fits(minimum)) return NaN;
  let low=minimum,high=focalMm;
  for(let i=0;i<60;i++){
    const mid=(low+high)/2;
    if(fits(mid)) low=mid; else high=mid;
  }
  return low;
}

function stagingTargetForSubject2(focalMm,aperture,cocMm,s1M,s2M,safetyM){
  const fits=target=>requiredApertureForPair(focalMm,cocMm,s1M,target,safetyM)<=aperture+1e-9;
  if(fits(s2M)) return s2M;
  if(!fits(s1M)) return NaN;
  let low=0,high=1;
  for(let i=0;i<60;i++){
    const mid=(low+high)/2;
    const target=s1M+(s2M-s1M)*mid;
    if(fits(target)) low=mid; else high=mid;
  }
  return s1M+(s2M-s1M)*low;
}

function focusDistanceForSubjects(s1, s2) {
  if (!subject2Enabled || !(s2 > 0)) return s1;
  if (focusMode === "optimal") return optimalFocusForPair(s1,s2);
  if (focusMode === "s2") return s2;
  if (focusMode === "mid") return (s1 + s2) / 2;
  return s1;
}

function isInsideDof(distanceM, nearM, farM) {
  if (!(distanceM > 0 && nearM > 0)) return false;
  const epsilon = 0.0005;
  return distanceM + epsilon >= nearM && (!Number.isFinite(farM) || distanceM - epsilon <= farM);
}

function focusModeName() {
  if (focusMode === "optimal") return "MAP optimale";
  if (focusMode === "s2") return "Sujet 2";
  if (focusMode === "mid") return "Entre les deux";
  return "Sujet 1";
}

function setStatus(card, label, isNet) {
  card.classList.toggle("is-net", isNet);
  card.classList.toggle("is-out", !isNet);
  label.textContent = isNet ? "NET" : "HORS PDC";
}


function setSvgX(id, x, attrs = ["x1", "x2"]) {
  const el = $(id);
  if (!el) return;
  attrs.forEach(attr => el.setAttribute(attr, x.toFixed(1)));
}

function setSubjectTopView(groupId, prefix, x, y, distanceM, isNet, upper = true) {
  const group = $(groupId);
  if (!group) return;
  group.classList.toggle("is-net", isNet);
  group.classList.toggle("is-out", !isNet);

  const dot = $(`${prefix}Dot`);
  const stem = $(`${prefix}Stem`);
  const number = $(`${prefix}Number`);
  const label = $(`${prefix}Label`);

  dot.setAttribute("cx", x.toFixed(1));
  dot.setAttribute("cy", y.toFixed(1));
  number.setAttribute("x", x.toFixed(1));
  number.setAttribute("y", (y + 4).toFixed(1));
  label.setAttribute("x", x.toFixed(1));
  label.setAttribute("y", upper ? "24" : "145");
  label.textContent = `${prefix === "tvSubject1" ? "S1" : "S2"} · ${formatM(distanceM)}`;

  stem.setAttribute("x1", x.toFixed(1));
  stem.setAttribute("x2", x.toFixed(1));
  stem.setAttribute("y1", upper ? (y + 15).toFixed(1) : "80");
  stem.setAttribute("y2", upper ? "80" : (y - 15).toFixed(1));
}

function clearTopView() {
  const zone = $("tvDofZone");
  if (zone) zone.setAttribute("width", "0");
  const blurBefore = $("tvBlurZoneBefore");
  const blurAfter = $("tvBlurZoneAfter");
  if (blurBefore) blurBefore.setAttribute("width", "0");
  if (blurAfter) blurAfter.setAttribute("width", "0");
  $("topViewCaption").textContent = "Réglages incomplets";
  if($("topViewSummary")) $("topViewSummary").textContent = "Réglages incomplets";
  $("tvSubject1Label").textContent = "S1 · —";
  $("tvSubject2Label").textContent = "S2 · —";
}

function updateTopView(s1M, s2M, focusM, nearM, farM) {
  const x0 = 58;
  const x1 = 528;
  const width = x1 - x0;

  const values = [s1M, focusM, nearM].filter(v => Number.isFinite(v) && v > 0);
  if (subject2Enabled && Number.isFinite(s2M) && s2M > 0) values.push(s2M);
  if (Number.isFinite(farM) && farM > 0) values.push(farM);

  let maxView = Math.max(1, ...values);
  if (Number.isFinite(farM)) {
    maxView *= 1.12;
  } else {
    maxView = Math.max(maxView * 1.25, focusM * 1.8, s1M * 1.35);
  }

  const px = (distanceM) => {
    const normalized = Math.max(0, Math.min(1, distanceM / maxView));
    return x0 + normalized * width;
  };

  const nearX = px(nearM);
  const farX = Number.isFinite(farM) ? px(farM) : x1;
  const focusX = px(focusM);
  const s1X = px(s1M);
  const s2X = px(s2M);

  const zone = $("tvDofZone");
  zone.setAttribute("x", nearX.toFixed(1));
  zone.setAttribute("width", Math.max(2, farX - nearX).toFixed(1));

  const blurBefore = $("tvBlurZoneBefore");
  const blurAfter = $("tvBlurZoneAfter");
  if (blurBefore) {
    blurBefore.setAttribute("x", x0.toFixed(1));
    blurBefore.setAttribute("width", Math.max(0, nearX - x0).toFixed(1));
  }
  if (blurAfter) {
    blurAfter.setAttribute("x", farX.toFixed(1));
    blurAfter.setAttribute("width", Number.isFinite(farM) ? Math.max(0, x1 - farX).toFixed(1) : "0");
  }

  setSvgX("tvNearMark", nearX);
  setSvgX("tvFarMark", farX);
  setSvgX("tvFocusMark", focusX);

  $("tvNearLabel").setAttribute("x", nearX.toFixed(1));
  $("tvFarLabel").setAttribute("x", farX.toFixed(1));
  $("tvMapLabel").setAttribute("x", focusX.toFixed(1));
  $("tvFarLabel").textContent = Number.isFinite(farM) ? "LOINTAINE" : "∞";

  const s1Net = isInsideDof(s1M, nearM, farM);
  const s2Net = subject2Enabled ? isInsideDof(s2M, nearM, farM) : false;
  setSubjectTopView("tvSubject1", "tvSubject1", s1X, 45, s1M, s1Net, true);

  const s2Group = $("tvSubject2");
  s2Group.style.display = subject2Enabled ? "" : "none";
  if (subject2Enabled) {
    setSubjectTopView("tvSubject2", "tvSubject2", s2X, 112, s2M, s2Net, false);
  }

  $("topViewCaption").textContent = `MAP ${formatM(focusM)} · ZONE NETTE ${formatM(nearM)} → ${formatM(farM)}`;
  const tvSummary=$("topViewSummary");
  if(tvSummary) tvSummary.textContent = `PDC ${formatM(nearM)} → ${formatM(farM)}`;
}

function setPreviewSubjectState(el, badge, label, isNet) {
  if (!el || !badge) return;
  el.classList.toggle("is-net", isNet);
  el.classList.toggle("is-out", !isNet);
  badge.textContent = `${label} · ${isNet ? "NET" : "HORS PDC"}`;
}

function updatePeoplePreview(s1M, s2M, focusM, nearM, farM) {
  const stage = $("dofPreviewStage");
  if (!stage) return;
  const s1El = $("dofPreviewSubject1");
  const s2El = $("dofPreviewSubject2");
  if (!stage || !s1El || !s2El) return;

  const s1Valid = Number.isFinite(s1M) && s1M > 0;
  const s2Valid = Number.isFinite(s2M) && s2M > 0;
  const boundsValid = Number.isFinite(nearM) && nearM > 0 && (Number.isFinite(farM) || farM === Infinity);

  s2El.hidden = !subject2Enabled;
  s1El.style.left = subject2Enabled ? "35%" : "50%";
  s2El.style.left = "67%";

  // S1 reste la référence visuelle. S2 traduit seulement son écart de distance caméra.
  // La perspective est volontairement adoucie pour rester lisible dans DOF :
  // on compresse le rapport de distance afin que S2 rétrécisse moins vite qu'en V5.18.
  // Surtout, la réduction se fait autour du CENTRE du mannequin : quand S2 est derrière,
  // sa tête descend légèrement ET ses pieds remontent au lieu de rester collés au sol.
  const baseHeight = stage.clientWidth <= 440 ? 180 : 201;
  const baseWidth = baseHeight * (310 / 1300);
  const baseBottom = 15;
  s1El.style.height = `${baseHeight}px`;
  s1El.style.width = `${baseWidth}px`;
  s1El.style.bottom = `${baseBottom}px`;

  if (subject2Enabled && s1Valid && s2Valid) {
    const distanceRatio = s1M / s2M;
    const softenedScale = Math.pow(distanceRatio, 0.55);
    const relativeScale = Math.max(0.68, Math.min(1.35, softenedScale));
    const scaledHeight = baseHeight * relativeScale;
    const scaledWidth = baseWidth * relativeScale;
    const centeredBottom = baseBottom + (baseHeight - scaledHeight) / 2;

    s2El.style.height = `${scaledHeight}px`;
    s2El.style.width = `${scaledWidth}px`;
    s2El.style.bottom = `${centeredBottom}px`;
    s2El.style.zIndex = s2M < s1M ? "4" : "3";
    s1El.style.zIndex = s2M < s1M ? "3" : "4";
  } else {
    s2El.style.height = `${baseHeight}px`;
    s2El.style.width = `${baseWidth}px`;
    s2El.style.bottom = `${baseBottom}px`;
  }

  if (boundsValid && s1Valid) {
    setPreviewSubjectState(s1El, $("dofPreviewBadge1"), "S1", isInsideDof(s1M, nearM, farM));
  } else {
    $("dofPreviewBadge1").textContent = "S1";
    s1El.classList.remove("is-out");
  }

  if (subject2Enabled) {
    if (boundsValid && s2Valid) {
      setPreviewSubjectState(s2El, $("dofPreviewBadge2"), "S2", isInsideDof(s2M, nearM, farM));
    } else {
      $("dofPreviewBadge2").textContent = "S2";
      s2El.classList.remove("is-out");
    }
  }

  const focusText = subject2Enabled ? focusModeName().replace("Sujet ", "S") : "S1";
  $("dofPreviewFocus").textContent = `MAP · ${focusText.toUpperCase()}`;
  $("dofPreviewDistance").textContent = subject2Enabled
    ? `S1 · ${formatM(s1M)}   /   S2 · ${formatM(s2M)} · écart ${formatM(Math.abs(s2M - s1M))}`
    : `S1 · ${formatM(s1M)}`;
}

function updateSubjectUI(s1, s2, focusM, nearM, farM) {
  const summary = $("subject2Summary");
  if (!subject2Enabled) {
    if (summary) summary.textContent = "Non activé";
    $("focusDistanceLabel").textContent = `MAP auto · ${formatM(s1)}`;
    return;
  }

  const s2Valid = Number.isFinite(s2) && s2 > 0;
  const s2Net = s2Valid && Number.isFinite(nearM) && nearM > 0 ? isInsideDof(s2, nearM, farM) : false;
  $("focusDistanceLabel").textContent = `${focusModeName()} · ${formatM(focusM)}`;
  if (summary) {
    summary.textContent = s2Valid
      ? `S2 · ${formatM(s2)} · ${s2Net ? "NET" : "HORS PDC"}`
      : "S2 · distance invalide";
    summary.classList.toggle("is-net", s2Valid && s2Net);
    summary.classList.toggle("is-out", s2Valid && !s2Net);
  }
}

function setSolverOption(cardId,titleId,detailId,buttonId,title,detail,action,value,available=true){
  const card=$(cardId),button=$(buttonId);
  $(titleId).textContent=title;
  $(detailId).textContent=detail;
  card.classList.toggle("is-unavailable",!available);
  button.disabled=!available;
  button.dataset.solverAction=available?action:"";
  button.dataset.solverValue=available?String(value):"";
}

function renderFocusSolver(focal,aperture,coc,s1M,s2M,focusM,nearM,farM){
  const solver=$("focusSolver");
  if(!solver || !subject2Enabled) return;
  const interval=solverInterval(s1M,s2M);
  const currentSafe=isInsideDof(interval.nearM,nearM,farM) && isInsideDof(interval.farM,nearM,farM);
  const optimalFocus=optimalFocusForPair(s1M,s2M);
  const required=requiredApertureForPair(focal,coc,s1M,s2M);
  const recommendedStop=nextPracticalStop(required);
  const primaryApply=$("solverPrimaryApply");

  solver.classList.toggle("is-ok",currentSafe);
  solver.classList.toggle("needs-solution",!currentSafe);
  $("solverStatus").textContent=currentSafe
    ? `Les deux sujets sont nets${focusSafetyM?` avec ${Math.round(focusSafetyM*100)} cm de marge`:""}`
    : `Une correction est nécessaire${focusSafetyM?` pour garder ${Math.round(focusSafetyM*100)} cm de marge`:""}`;

  let primaryTitle="",primaryDetail="",primaryAvailable=true;
  if(currentSafe){
    primaryTitle=`Réglage actuel validé`;
    primaryDetail=`MAP ${formatM(focusM)} · zone utile ${formatM(interval.nearM)} → ${formatM(interval.farM)}`;
    primaryApply.textContent="OPTIMISER LA MAP";
    primaryApply.dataset.solverAction="optimal";
    primaryApply.dataset.solverValue=String(aperture);
  }else if(required<=aperture+1e-9){
    primaryTitle=`Placer la MAP à ${formatM(optimalFocus)}`;
    primaryDetail=`Le diaphragme f/${String(roundSmart(aperture)).replace(".",",")} suffit : aucun autre réglage à modifier.`;
    primaryApply.textContent="APPLIQUER";
    primaryApply.dataset.solverAction="optimal";
    primaryApply.dataset.solverValue=String(aperture);
  }else if(Number.isFinite(recommendedStop)){
    const loss=Math.max(0,2*Math.log2(recommendedStop/aperture));
    primaryTitle=`Fermer à f/${String(recommendedStop).replace(".",",")}`;
    primaryDetail=`MAP ${formatM(optimalFocus)} · perte de lumière ${loss.toFixed(1).replace(".",",")} stop${loss>=1.05?"s":""}.`;
    primaryApply.textContent="APPLIQUER";
    primaryApply.dataset.solverAction="aperture";
    primaryApply.dataset.solverValue=String(recommendedStop);
  }else{
    primaryTitle="Solution au-delà de f/32";
    primaryDetail="Choisir une des alternatives ci-dessous.";
    primaryAvailable=false;
    primaryApply.textContent="INDISPONIBLE";
    primaryApply.dataset.solverAction="";
    primaryApply.dataset.solverValue="";
  }
  $("solverPrimaryTitle").textContent=primaryTitle;
  $("solverPrimaryDetail").textContent=primaryDetail;
  primaryApply.disabled=!primaryAvailable;

  if(currentSafe){
    setSolverOption("solverRetreatCard","solverRetreatTitle","solverRetreatDetail","solverRetreatApply","Aucun recul nécessaire","Les réglages actuels couvrent déjà les deux sujets.","retreat",0,false);
    setSolverOption("solverFocalCard","solverFocalTitle","solverFocalDetail","solverFocalApply","Focale actuelle compatible","Aucun changement de focale nécessaire.","focal",focal,false);
    setSolverOption("solverStagingCard","solverStagingTitle","solverStagingDetail","solverStagingApply","Positions actuelles compatibles","Aucun déplacement de comédien nécessaire.","staging",s2M,false);
  }else if(required<=aperture+1e-9){
    setSolverOption("solverRetreatCard","solverRetreatTitle","solverRetreatDetail","solverRetreatApply","Aucun recul nécessaire","Déplacer uniquement la mise au point suffit.","retreat",0,false);
    setSolverOption("solverFocalCard","solverFocalTitle","solverFocalDetail","solverFocalApply","Conserver la focale","La focale actuelle convient avec la MAP optimale.","focal",focal,false);
    setSolverOption("solverStagingCard","solverStagingTitle","solverStagingDetail","solverStagingApply","Conserver les positions","Aucun déplacement des sujets n’est nécessaire.","staging",s2M,false);
  }else{
    const retreat=minimumRetreat(focal,aperture,coc,s1M,s2M,focusSafetyM);
    if(Number.isFinite(retreat)){
      const safeRetreat=Math.ceil((retreat+0.0001)*100)/100;
      setSolverOption("solverRetreatCard","solverRetreatTitle","solverRetreatDetail","solverRetreatApply",`Reculer la caméra de ${formatM(safeRetreat)}`,`Nouvelles distances : S1 ${formatM(s1M+safeRetreat)} · S2 ${formatM(s2M+safeRetreat)}. Le cadre sera plus large.`,"retreat",safeRetreat,true);
    }else{
      setSolverOption("solverRetreatCard","solverRetreatTitle","solverRetreatDetail","solverRetreatApply","Recul insuffisant","Aucune solution raisonnable avec le diaphragme actuel.","retreat",0,false);
    }

    const focalLimit=maximumUsableFocal(focal,aperture,coc,s1M,s2M,focusSafetyM);
    if(Number.isFinite(focalLimit) && focalLimit<focal-.05){
      const safeFocal=Math.max(9,Math.floor((focalLimit-0.001)*10)/10);
      setSolverOption("solverFocalCard","solverFocalTitle","solverFocalDetail","solverFocalApply",`Passer à ${String(roundSmart(safeFocal)).replace(".",",")} mm maximum`,`Le cadre sera plus large ; le diaphragme reste à f/${String(roundSmart(aperture)).replace(".",",")}.`,"focal",safeFocal,true);
    }else{
      setSolverOption("solverFocalCard","solverFocalTitle","solverFocalDetail","solverFocalApply","Pas de focale compatible","Il faudrait descendre sous 9 mm avec les contraintes actuelles.","focal",0,false);
    }

    const stagingTarget=stagingTargetForSubject2(focal,aperture,coc,s1M,s2M,focusSafetyM);
    if(Number.isFinite(stagingTarget) && Math.abs(stagingTarget-s2M)>.005){
      const towardS1=s2M>s1M
        ? Math.max(s1M,Math.floor((stagingTarget+1e-9)*100)/100)
        : Math.min(s1M,Math.ceil((stagingTarget-1e-9)*100)/100);
      const movement=Math.abs(s2M-towardS1);
      const verb=s2M>s1M?"Avancer":"Reculer";
      setSolverOption("solverStagingCard","solverStagingTitle","solverStagingDetail","solverStagingApply",`${verb} S2 de ${formatM(movement)}`,`Placer S2 à ${formatM(towardS1)} de la caméra, plus près du plan de S1.`,"staging",towardS1,true);
    }else{
      setSolverOption("solverStagingCard","solverStagingTitle","solverStagingDetail","solverStagingApply","Placement seul insuffisant","La marge demandée nécessite aussi un autre changement.","staging",0,false);
    }
  }

  $("solverNote").textContent=`Calcul selon le CoC ${coc.toFixed(3).replace(".",",")} mm · MAP optimale ${formatM(optimalFocus)}${focusSafetyM?` · marge ${Math.round(focusSafetyM*100)} cm autour de chaque sujet`:""}.`;
}

function updateActiveChips() {
  document.querySelectorAll(".chips[data-target]").forEach(group => {
    const target = group.dataset.target;
    if (!inputs[target]) return;

    const val = parseFR(inputs[target].value);
    let presetMatched = false;
    group.querySelectorAll("button").forEach(btn => {
      const active = Math.abs(parseFR(btn.textContent) - val) < 0.0001;
      btn.classList.toggle("active", active);
      if(active) presetMatched = true;
    });
    const libre = document.querySelector(`.free-value-btn[data-custom-target="${target}"]`);
    if(libre) libre.classList.toggle("active", !presetMatched);
  });

  const f=parseFR(inputs.focal.value), a=parseFR(inputs.aperture.value), d=parseFR(inputs.distance.value), d2=parseFR(inputs.subject2Distance.value);
  const itwF=parseFR(inputs.interviewFocal.value),itwDepth=parseFR(inputs.interviewDepth.value);
  if($("focalCurrentValue")) $("focalCurrentValue").textContent = Number.isFinite(f) ? `${String(roundSmart(f)).replace(".",",")} mm` : "—";
  if($("apertureCurrentValue")) $("apertureCurrentValue").textContent = Number.isFinite(a) ? `f/${String(roundSmart(a)).replace(".",",")}` : "—";
  if($("distanceCurrentValue")) $("distanceCurrentValue").textContent = Number.isFinite(d) ? formatM(d) : "—";
  if($("subject2DistanceReadout")) $("subject2DistanceReadout").textContent = Number.isFinite(d2) ? formatM(d2) : "—";
  if($("interviewFocalReadout")) $("interviewFocalReadout").textContent = Number.isFinite(itwF) ? `${String(roundSmart(itwF)).replace(".",",")} mm` : "—";
  if($("interviewDepthReadout")) $("interviewDepthReadout").textContent = Number.isFinite(itwDepth) ? `${String(roundSmart(itwDepth)).replace(".",",")} cm` : "—";
  if($("solverFocalReadout")) $("solverFocalReadout").textContent = Number.isFinite(f) ? `${String(roundSmart(f)).replace(".",",")} mm` : "—";
  if($("solverApertureReadout")) $("solverApertureReadout").textContent = Number.isFinite(a) ? `f/${String(roundSmart(a)).replace(".",",")}` : "—";
  if($("solverDistance1Readout")) $("solverDistance1Readout").textContent = Number.isFinite(d) ? formatM(d) : "—";
  if($("pdcSummary")) $("pdcSummary").textContent = Number.isFinite(f)&&Number.isFinite(a)&&Number.isFinite(d) ? `${String(roundSmart(f)).replace(".",",")} mm · f/${String(roundSmart(a)).replace(".",",")} · ${formatM(d)}` : "Réglages incomplets";
  if($("twoSubjectsSummary")) $("twoSubjectsSummary").textContent = Number.isFinite(f)&&Number.isFinite(a)&&Number.isFinite(d)&&Number.isFinite(d2) ? `${String(roundSmart(f)).replace(".",",")} mm · f/${String(roundSmart(a)).replace(".",",")} · S1 ${formatM(d)} · S2 ${formatM(d2)}` : "Réglages incomplets";

  if(rangeInputs.focal && Number.isFinite(f)) rangeInputs.focal.value=String(Math.max(9,Math.min(200,f)));
  if(rangeInputs.distance && Number.isFinite(d)) rangeInputs.distance.value=String(Math.max(.3,Math.min(15,d)));
  if(rangeInputs.subject2Distance && Number.isFinite(d2)) rangeInputs.subject2Distance.value=String(Math.max(.3,Math.min(15,d2)));
  if(rangeInputs.interviewFocal && Number.isFinite(itwF)) rangeInputs.interviewFocal.value=String(Math.max(9,Math.min(200,itwF)));
  if(rangeInputs.interviewDepth && Number.isFinite(itwDepth)) rangeInputs.interviewDepth.value=String(Math.max(10,Math.min(60,itwDepth)));
  if($("solverFocalSlider") && Number.isFinite(f)) $("solverFocalSlider").value=String(Math.max(9,Math.min(200,f)));
  if($("solverDistance1Slider") && Number.isFinite(d)) $("solverDistance1Slider").value=String(Math.max(.3,Math.min(15,d)));
  if(rangeInputs.aperture && Number.isFinite(a)){
    let nearest=0;
    apertureStops.forEach((stop,index)=>{
      if(Math.abs(stop-a)<Math.abs(apertureStops[nearest]-a)) nearest=index;
    });
    rangeInputs.aperture.value=String(nearest);
    if($("solverApertureSlider")) $("solverApertureSlider").value=String(nearest);
  }
}

function updateEquivalentInfo(focal, distanceM) {
  const crop = currentFormat().cropToFF;
  const ffFocal = focal * crop;
  const ffDistanceSameFocal = distanceM / crop;

  $("ffEquivalent").textContent = formatFocal(ffFocal);
  $("ffDistanceSameFocal").textContent = formatM(ffDistanceSameFocal);
}

function calculate() {
  const fmt=currentFormat();
  const COC=fmt.coc;
  const f=parseFR(inputs.focal.value);
  const N=parseFR(inputs.aperture.value);
  const s1M=parseFR(inputs.distance.value);
  const s2M=parseFR(inputs.subject2Distance.value);

  $("formatBadge").textContent=fmt.name;
  $("footerText").textContent=`Cercle de confusion : ${fmt.coc.toFixed(3).replace(".",",")} mm · ${fmt.name}`;
  updateActiveChips();
  renderInterviewPlanner();

  if(!(f>0 && N>0 && s1M>0)){
    ["dof","range","heroHyper","frontLabel","backLabel","ffEquivalent","ffDistanceSameFocal"]
      .forEach(id=>{const el=$(id);if(el)el.textContent="—";});
    clearTopView();
    return;
  }

  updateEquivalentInfo(f,s1M);

  // Bulle PDC : calcul volontairement limité au Sujet 1.
  const mainBounds=dofBounds(f,N,COC,s1M);
  const nearM=mainBounds.nearM;
  const farM=mainBounds.farM;
  const frontM=Math.max(0,s1M-nearM);
  const backM=Number.isFinite(farM)?Math.max(0,farM-s1M):Infinity;
  const dofM=Number.isFinite(farM)?Math.max(0,farM-nearM):Infinity;
  const hyperM=((f*f)/(N*COC)+f)/1000;

  $("dof").textContent=formatDepth(dofM);
  $("range").textContent=`${formatM(nearM)} → ${formatM(farM)}`;
  $("heroHyper").textContent=`Hyperfocale ${formatM(hyperM)}`;
  $("frontLabel").textContent=`− ${formatDepth(frontM)}`;
  $("backLabel").textContent=`+ ${formatDepth(backM)}`;

  // Bulle 2 Sujets : calcul indépendant de l'affichage PDC, avec ses propres choix de MAP.
  if(s2M>0){
    const focusM=focusDistanceForSubjects(s1M,s2M);
    const subjectBounds=dofBounds(f,N,COC,focusM);
    updateSubjectUI(s1M,s2M,focusM,subjectBounds.nearM,subjectBounds.farM);
    renderFocusSolver(f,N,COC,s1M,s2M,focusM,subjectBounds.nearM,subjectBounds.farM);
    updatePeoplePreview(s1M,s2M,focusM,subjectBounds.nearM,subjectBounds.farM);
    updateTopView(s1M,s2M,focusM,subjectBounds.nearM,subjectBounds.farM);
  }else{
    if($("focusDistanceLabel")) $("focusDistanceLabel").textContent="Distance S2 invalide";
    if($("solverStatus")) $("solverStatus").textContent="Distance Sujet 2 incomplète";
    clearTopView();
  }
  updateActiveChips();
}
document.querySelectorAll(".chips[data-target]:not(.sensor-chips) button").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".chips");
    const target = group.dataset.target;
    inputs[target].value = btn.textContent.trim();

    // Feedback immédiat : la sélection bleue suit le bouton touché.
    group.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));
    const libre = document.querySelector(`.free-value-btn[data-custom-target="${target}"]`);
    if (libre) libre.classList.remove("active");

    calculate();
  });
});

if(rangeInputs.focal) rangeInputs.focal.addEventListener("input",()=>{
  inputs.focal.value=rangeInputs.focal.value;
  calculate();
});
if(rangeInputs.aperture) rangeInputs.aperture.addEventListener("input",()=>{
  inputs.aperture.value=String(apertureStops[Number(rangeInputs.aperture.value)] ?? 2.8);
  calculate();
});
if(rangeInputs.distance) rangeInputs.distance.addEventListener("input",()=>{
  inputs.distance.value=rangeInputs.distance.value;
  calculate();
});
if(rangeInputs.subject2Distance) rangeInputs.subject2Distance.addEventListener("input",()=>{
  inputs.subject2Distance.value=rangeInputs.subject2Distance.value;
  calculate();
});
if(rangeInputs.interviewFocal) rangeInputs.interviewFocal.addEventListener("input",()=>{
  inputs.interviewFocal.value=rangeInputs.interviewFocal.value;
  calculate();
});
if(rangeInputs.interviewDepth) rangeInputs.interviewDepth.addEventListener("input",()=>{
  inputs.interviewDepth.value=rangeInputs.interviewDepth.value;
  calculate();
});
$("solverFocalSlider").addEventListener("input",event=>{
  inputs.focal.value=event.target.value;
  calculate();
});
$("solverApertureSlider").addEventListener("input",event=>{
  inputs.aperture.value=String(apertureStops[Number(event.target.value)]??2.8);
  calculate();
});
$("solverDistance1Slider").addEventListener("input",event=>{
  inputs.distance.value=event.target.value;
  calculate();
});


Object.values(inputs).forEach(input => {
  input.addEventListener("input", calculate);
  if(input.type !== "hidden") input.addEventListener("focus", () => input.select());
});

const dialog = $("infoDialog");
$("infoBtn").addEventListener("click", () => dialog.showModal());
$("closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

$("cameraBrandMode").addEventListener("click",(event)=>{
  const btn=event.target.closest("button[data-camerabrand]");
  if(!btn)return;
  changeCameraBrand(btn.dataset.camerabrand);
});
$("cameraSelect").addEventListener("change",(event)=>setCurrentCamera(event.target.value,true));





// Two-subject workflow — dedicated independent panel
const focusModeGroup=$("focusMode");

focusModeGroup.addEventListener("click",event=>{
  const btn=event.target.closest("button[data-focus]");
  if(!btn) return;
  focusMode=btn.dataset.focus;
  focusModeGroup.querySelectorAll("button").forEach(button=>button.classList.toggle("active",button===btn));
  calculate();
});

function activateOptimalFocus(){
  focusMode="optimal";
  focusModeGroup.querySelectorAll("button").forEach(button=>button.classList.toggle("active",button.dataset.focus==="optimal"));
}

$("solverSafety").addEventListener("click",event=>{
  const button=event.target.closest("button[data-safety]");
  if(!button) return;
  focusSafetyM=Number(button.dataset.safety)||0;
  $("solverSafety").querySelectorAll("button").forEach(item=>item.classList.toggle("active",item===button));
  calculate();
});

$("focusSolver").addEventListener("click",event=>{
  const button=event.target.closest("button[data-solver-action]");
  if(!button||button.disabled) return;
  const action=button.dataset.solverAction;
  const value=Number(button.dataset.solverValue);
  if(!action||!Number.isFinite(value)) return;

  if(action==="aperture") inputs.aperture.value=String(value);
  if(action==="retreat"){
    const s1=parseFR(inputs.distance.value),s2=parseFR(inputs.subject2Distance.value);
    inputs.distance.value=(s1+value).toFixed(2);
    inputs.subject2Distance.value=(s2+value).toFixed(2).replace(".",",");
  }
  if(action==="focal") inputs.focal.value=String(value);
  if(action==="staging") inputs.subject2Distance.value=value.toFixed(2).replace(".",",");

  activateOptimalFocus();
  updateActiveChips();
  calculate();
});

// V5.23 — saisie libre en fenêtre pour garder une seule ligne par réglage.
const customValueDialog = $("customValueDialog");
const customValueForm = $("customValueForm");
const customValueInput = $("customValueInput");
const customValueTitle = $("customValueTitle");
const customValueUnit = $("customValueUnit");
let customValueTarget = null;
const customMeta = {
  focal:{title:"Focale libre",unit:"mm",min:1},
  aperture:{title:"Diaph libre",unit:"f/",min:0.1},
  distance:{title:"Distance Sujet 1",unit:"m",min:0.1},
  subject2Distance:{title:"Distance Sujet 2",unit:"m",min:0.1},
  interviewFocal:{title:"Focale ITW",unit:"mm",min:1},
  interviewDepth:{title:"Zone nette minimale",unit:"cm",min:1}
};

document.querySelectorAll("[data-custom-target]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const target=btn.dataset.customTarget;
    if(!inputs[target]) return;
    customValueTarget=target;
    const meta=customMeta[target];
    customValueTitle.textContent=meta.title;
    customValueUnit.textContent=meta.unit;
    customValueInput.value=String(inputs[target].value).replace(".",",");
    customValueDialog.showModal();
    setTimeout(()=>{customValueInput.focus();customValueInput.select();},40);
  });
});
$("customValueClose").addEventListener("click",()=>customValueDialog.close());
customValueDialog.addEventListener("click",e=>{if(e.target===customValueDialog)customValueDialog.close();});
customValueForm.addEventListener("submit",e=>{
  e.preventDefault();
  if(!customValueTarget) return;
  const value=parseFR(customValueInput.value);
  const meta=customMeta[customValueTarget];
  if(!(value>=meta.min)){customValueInput.focus();return;}
  inputs[customValueTarget].value=String(value);
  customValueDialog.close();
  updateActiveChips();
  calculate();
});

// V5.23 — panneau caméra repliable + contrôles ultra compacts + schéma repliable.
const dofCameraSettingsPanel = document.getElementById("dofCameraSettingsPanel");
const dofCameraSettingsToggle = document.getElementById("dofCameraSettingsToggle");
const dofCameraSettingsContent = document.getElementById("dofCameraSettingsContent");
if (dofCameraSettingsPanel && dofCameraSettingsToggle && dofCameraSettingsContent) {
  dofCameraSettingsToggle.addEventListener("click", () => {
    const willOpen = dofCameraSettingsPanel.classList.contains("collapsed");
    dofCameraSettingsPanel.classList.toggle("collapsed", !willOpen);
    dofCameraSettingsContent.hidden = !willOpen;
    dofCameraSettingsToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });
}

function bindModePanel(panelId,toggleId,contentId){
  const panel=$(panelId),toggle=$(toggleId),content=$(contentId);
  toggle.addEventListener("click",()=>{
    const isOpen=!content.hidden;
    content.hidden=isOpen;
    panel.classList.toggle("collapsed",isOpen);
    toggle.setAttribute("aria-expanded",isOpen?"false":"true");
  });
}
bindModePanel("pdcPanel","pdcToggle","pdcContent");
bindModePanel("twoSubjectsPanel","twoSubjectsToggle","twoSubjectsContent");

const interviewPanel=$("interviewPanel");
const interviewToggle=$("interviewToggle");
const interviewContent=$("interviewContent");
interviewToggle.addEventListener("click",()=>{
  const willOpen=interviewPanel.classList.contains("collapsed");
  interviewPanel.classList.toggle("collapsed",!willOpen);
  interviewContent.hidden=!willOpen;
  interviewToggle.setAttribute("aria-expanded",willOpen?"true":"false");
});

$("interviewShotMode").addEventListener("click",event=>{
  const button=event.target.closest("button[data-interview-shot]");
  if(!button) return;
  interviewShot=button.dataset.interviewShot;
  $("interviewShotMode").querySelectorAll("button").forEach(item=>item.classList.toggle("active",item===button));
  calculate();
});

// Theme: light by default, dark on demand.
const themeToggle = document.getElementById("themeToggle");
const themeColorMeta = document.getElementById("themeColor");

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "LIGHT" : "DARK";
  themeToggle.setAttribute("aria-label", isDark ? "Passer en mode clair" : "Passer en mode sombre");
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", isDark ? "#0B0C0E" : "#F3F1EC");
  }
}

const savedTheme = localStorage.getItem("bg-set-tools-theme") || "light";
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("bg-set-tools-theme", nextTheme);
  applyTheme(nextTheme);
});

// TIPS page navigation
const tipsPage = document.getElementById("tipsPage");
const mainApp = document.getElementById("mainApp");
const tipsBtn = document.getElementById("tipsBtn");
const tipsBackBtn = document.getElementById("tipsBackBtn");

function openTips() {
  mainApp.hidden = true;
  tipsPage.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function closeTips() {
  tipsPage.hidden = true;
  mainApp.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

tipsBtn.addEventListener("click", openTips);
tipsBackBtn.addEventListener("click", closeTips);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

loadCachedCameraDb();
try{currentCameraId=localStorage.getItem(DOF_CAMERA_KEY)||"ff";}catch(_){currentCameraId="ff";}
if(!cameraPresets.some(c=>c.id===currentCameraId)) currentCameraId="ff";
renderCameraSelect();
calculate();
refreshCameraDb();
