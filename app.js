const FORMATS = {
  ff: {
    name: "Full Frame",
    coc: 0.029,
    cropToFF: 1
  },
  s35: {
    name: "Super 35",
    coc: 0.019,
    cropToFF: 1.5
  }
};

const $ = (id) => document.getElementById(id);
const inputs = {
  focal: $("focal"),
  aperture: $("aperture"),
  distance: $("distance"),
  subject2Distance: $("subject2Distance")
};

let currentSensor = "ff";
let subject2Enabled = false;
let focusMode = "s1";

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

function focusDistanceForSubjects(s1, s2) {
  if (!subject2Enabled || !(s2 > 0)) return s1;
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
  $("topViewCaption").textContent = "Réglages incomplets";
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

  $("topViewCaption").textContent = `MAP ${formatM(focusM)} · PDC ${formatM(nearM)} → ${formatM(farM)}`;
}

function updateSubjectUI(s1, s2, focusM, nearM, farM) {
  const result = $("subjectsResult");
  if (!subject2Enabled) {
    result.hidden = true;
    $("focusDistanceLabel").textContent = `MAP auto · ${formatM(s1)}`;
    return;
  }

  result.hidden = false;
  const s1Net = isInsideDof(s1, nearM, farM);
  const s2Net = isInsideDof(s2, nearM, farM);

  $("subject1DistanceReadout").textContent = formatM(s1);
  $("subject2DistanceReadout").textContent = formatM(s2);
  $("focusReadout").textContent = `MAP ${formatM(focusM)}`;
  $("focusDistanceLabel").textContent = `${focusModeName()} · ${formatM(focusM)}`;
  $("subjectsRangeNote").textContent = `PDC : ${formatM(nearM)} → ${formatM(farM)}`;

  setStatus($("subject1StatusCard"), $("subject1Status"), s1Net);
  setStatus($("subject2StatusCard"), $("subject2Status"), s2Net);

  if (s1Net && s2Net) {
    $("subjectsSummary").textContent = "LES DEUX SONT NETS";
    result.classList.add("both-net");
    result.classList.remove("not-both-net");
  } else {
    $("subjectsSummary").textContent = "LES DEUX NE TIENNENT PAS DANS LA PDC";
    result.classList.remove("both-net");
    result.classList.add("not-both-net");
  }
}

function updateActiveChips() {
  document.querySelectorAll(".chips[data-target]:not(.sensor-chips)").forEach(group => {
    const target = group.dataset.target;
    if (!inputs[target]) return;

    const val = parseFR(inputs[target].value);
    group.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("active", Math.abs(parseFR(btn.textContent) - val) < 0.0001);
    });
  });

  document.querySelectorAll(".sensor-chips button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === currentSensor);
  });
}

function updateEquivalentInfo(focal, distanceM) {
  const crop = FORMATS[currentSensor].cropToFF;
  const ffFocal = focal * crop;
  const ffDistanceSameFocal = distanceM / crop;

  $("ffEquivalent").textContent = formatFocal(ffFocal);
  $("ffDistanceSameFocal").textContent = formatM(ffDistanceSameFocal);
}

function calculate() {
  const fmt = FORMATS[currentSensor];
  const COC = fmt.coc;

  const f = parseFR(inputs.focal.value);
  const N = parseFR(inputs.aperture.value);
  const s1M = parseFR(inputs.distance.value);
  const s2M = parseFR(inputs.subject2Distance.value);
  const focusM = focusDistanceForSubjects(s1M, s2M);

  $("formatBadge").textContent = fmt.name;
  $("footerText").textContent =
    `Cercle de confusion : ${fmt.coc.toFixed(3).replace(".", ",")} mm · ${fmt.name}`;

  if (!(f > 0 && N > 0 && s1M > 0 && focusM > 0) || (subject2Enabled && !(s2M > 0))) {
    ["dof","range","near","far","front","back","hyper","frontLabel","backLabel","ffEquivalent","ffDistanceSameFocal"]
      .forEach(id => $(id).textContent = "—");
    if (subject2Enabled) {
      $("subjectsSummary").textContent = "DISTANCE SUJET INVALIDE";
    }
    clearTopView();
    return;
  }

  // Full-frame framing references remain attached to Subject 1, our main subject.
  updateEquivalentInfo(f, s1M);

  const s = focusM * 1000;
  const H = (f * f) / (N * COC) + f;

  const near = (H * s) / (H + (s - f));
  let far = Infinity;
  if (H > (s - f)) {
    far = (H * s) / (H - (s - f));
  }

  const nearM = near / 1000;
  const farM = Number.isFinite(far) ? far / 1000 : Infinity;
  const frontM = Math.max(0, focusM - nearM);
  const backM = Number.isFinite(farM) ? Math.max(0, farM - focusM) : Infinity;
  const dofM = Number.isFinite(farM) ? Math.max(0, farM - nearM) : Infinity;
  const hyperM = H / 1000;

  $("dof").textContent = formatDepth(dofM);
  $("range").textContent = `${formatM(nearM)} → ${formatM(farM)}`;
  $("near").textContent = formatM(nearM);
  $("far").textContent = formatM(farM);
  $("front").textContent = formatDepth(frontM);
  $("back").textContent = formatDepth(backM);
  $("hyper").textContent = formatM(hyperM);
  $("frontLabel").textContent = `− ${formatDepth(frontM)}`;
  $("backLabel").textContent = `+ ${formatDepth(backM)}`;

  updateSubjectUI(s1M, s2M, focusM, nearM, farM);
  updateTopView(s1M, s2M, focusM, nearM, farM);
  updateActiveChips();
}

document.querySelectorAll(".chips[data-target]:not(.sensor-chips) button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.closest(".chips").dataset.target;
    inputs[target].value = btn.textContent;
    calculate();
  });
});

document.querySelectorAll(".sensor-chips button").forEach(btn => {
  btn.addEventListener("click", () => {
    currentSensor = btn.dataset.value;
    calculate();
  });
});

Object.values(inputs).forEach(input => {
  input.addEventListener("input", calculate);
  input.addEventListener("focus", () => input.select());
});

const dialog = $("infoDialog");
$("infoBtn").addEventListener("click", () => dialog.showModal());
$("closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});




// Two-subject workflow
const subject2Toggle = $("subject2Toggle");
const subject2Controls = $("subject2Controls");
const focusModeGroup = $("focusMode");

function setSubject2Enabled(enabled) {
  subject2Enabled = enabled;
  subject2Controls.hidden = !enabled;
  subject2Toggle.setAttribute("aria-expanded", enabled ? "true" : "false");
  subject2Toggle.textContent = enabled ? "− SUJET 2" : "+ SUJET 2";
  subject2Toggle.classList.toggle("active", enabled);
  if (!enabled) focusMode = "s1";
  focusModeGroup.querySelectorAll("button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.focus === focusMode);
  });
  calculate();
}

subject2Toggle.addEventListener("click", () => setSubject2Enabled(!subject2Enabled));

$("subject2Nudges").addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-delta]");
  if (!btn) return;
  const current = parseFR(inputs.subject2Distance.value);
  const base = current > 0 ? current : parseFR(inputs.distance.value);
  const next = Math.max(0.1, base + Number(btn.dataset.delta));
  inputs.subject2Distance.value = next.toFixed(2).replace(".", ",");
  calculate();
});

focusModeGroup.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-focus]");
  if (!btn) return;
  focusMode = btn.dataset.focus;
  focusModeGroup.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));
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

calculate();
