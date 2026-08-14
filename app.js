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
  distance: $("distance")
};

let currentSensor = "ff";

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

function updateActiveChips() {
  document.querySelectorAll(".chips[data-target]").forEach(group => {
    const target = group.dataset.target;
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

  const f = parseFR(inputs.focal.value);        // mm
  const N = parseFR(inputs.aperture.value);
  const sM = parseFR(inputs.distance.value);    // m

  $("formatBadge").textContent = fmt.name;
  $("footerText").textContent = `Cercle de confusion : ${fmt.coc.toFixed(3).replace(".", ",")} mm · préréglage ${fmt.name.toLowerCase()}`;

  if (!(f > 0 && N > 0 && sM > 0)) {
    ["dof","range","near","far","front","back","hyper","frontLabel","backLabel","ffEquivalent","ffDistanceSameFocal"].forEach(id => $(id).textContent = "—");
    return;
  }

  updateEquivalentInfo(f, sM);

  const s = sM * 1000; // mm
  const H = (f * f) / (N * COC) + f;

  const near = (H * s) / (H + (s - f));
  let far = Infinity;
  if (H > (s - f)) {
    far = (H * s) / (H - (s - f));
  }

  const nearM = near / 1000;
  const farM = Number.isFinite(far) ? far / 1000 : Infinity;
  const frontM = Math.max(0, sM - nearM);
  const backM = Number.isFinite(farM) ? Math.max(0, farM - sM) : Infinity;
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

  updateActiveChips();
}

document.querySelectorAll(".chips[data-target] button").forEach(btn => {
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

calculate();
