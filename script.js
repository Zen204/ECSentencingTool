// ── Constants ──────────────────────────────────────────────────────────────

const MAX_YEARS  = 30;
const TOTAL_PAGES = 11; // pages 0–10

// Sentencing grid from guidelines image (values as fractions of MAX_YEARS)
// Rows: Category 1 = Highest, 2 = High, 3 = Lesser
// Cols: Level A = High seriousness, B = Medium, C = Lesser
const GRID = {
  1: { // Highest consequence
    A: { start: 0.75, min: 0.60, max: 0.90 },
    B: { start: 0.65, min: 0.50, max: 0.80 },
    C: { start: 0.50, min: 0.35, max: 0.65 }
  },
  2: { // High consequence
    A: { start: 0.65, min: 0.50, max: 0.80 },
    B: { start: 0.50, min: 0.35, max: 0.65 },
    C: { start: 0.40, min: 0.25, max: 0.55 }
  },
  3: { // Lesser consequence
    A: { start: 0.50, min: 0.35, max: 0.65 },
    B: { start: 0.40, min: 0.25, max: 0.55 },
    C: { start: 0.30, min: 0.00, max: 0.45 } // Non-custodial floor = 0
  }
};

// Map user-facing labels to grid keys
function catKey(cc) {
  if (cc === "Highest") return 1;
  if (cc === "High")    return 2;
  return 3;
}

function srKey(sr) {
  if (sr === "High")   return "A";
  if (sr === "Medium") return "B";
  return "C";
}

// ── Application State ──────────────────────────────────────────────────────

let currentPage = 0;

const data = {
  offence: "",
  cf: [],           cfReason: "",
  cc: "",           ccWeight: 0,  ccReason: "",
  sr: "",           srWeight: 0,  srReason: "",
  aggOff: [],       aggOffReason: "",
  mitOff: [],       mitOffReason: "",
  aggOffender: [],  aggOffenderReason: "",
  mitOffender: [],  mitOffenderReason: "",
  gpLabel: "",      gpDiscount: 0, gpReason: ""
};

// ── Navigation ─────────────────────────────────────────────────────────────

function updateProgress() {
  const bar = document.getElementById('progressBar');
  if (currentPage === 0) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  bar.innerHTML = '';
  for (let i = 1; i < TOTAL_PAGES; i++) {
    const seg = document.createElement('div');
    seg.className = 'seg'
      + (i < currentPage  ? ' done'   : '')
      + (i === currentPage ? ' active' : '');
    bar.appendChild(seg);
  }
}

function goToPage(n) {
  document.getElementById('page' + currentPage).classList.remove('active');
  currentPage = n;
  document.getElementById('page' + currentPage).classList.add('active');
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Shared Card Helpers ────────────────────────────────────────────────────

// Toggle a plain checkbox card (no range input)
function toggleCheckCard(uid) {
  const inp = document.getElementById(uid);
  inp.checked = !inp.checked;
  document.getElementById('card_' + uid).classList.toggle('selected', inp.checked);
}

// Toggle a checkbox card that reveals a range input when checked
function toggleCheckCardRange(uid, wrapId) {
  const inp = document.getElementById(uid);
  inp.checked = !inp.checked;
  document.getElementById('card_' + uid).classList.toggle('selected', inp.checked);
  document.getElementById(wrapId).classList.toggle('visible', inp.checked);
}

// ── PAGE 0: Welcome ────────────────────────────────────────────────────────

function startTool() {
  goToPage(1);
}

// ── PAGE 1: Select Offence ─────────────────────────────────────────────────

function saveOffence() {
  const v = document.getElementById('offenceSelect').value;
  if (!v) return alert("Please select an offence before continuing.");
  data.offence = v;
  buildConsequenceFactorsPage();
  goToPage(2);
}

// ── PAGE 2: Consequence Factors ────────────────────────────────────────────

const CF_ITEMS = [
  { label: "Causing or intending to cause injury or damage to property (or persons) with a firearm", fixed: true,  weight: 7 },
  { label: "Discharging a firearm to cause terror",                                                  fixed: true,  weight: 7 },
  { label: "Threatening with a firearm to cause fear or intimidation in others",                     fixed: true,  weight: 6 },
  { label: "Showing a firearm to be assertive",                                                      fixed: true,  weight: 5 },
  { label: "The number of firearms",                                                                 fixed: false, min: 4, max: 8 },
  { label: "Dealing in firearms",                                                                    fixed: false, min: 3, max: 8 },
  { label: "Different quantities and types of ammunition",                                           fixed: false, min: 3, max: 8 }
];

function buildConsequenceFactorsPage() {
  const c = document.getElementById('consequenceFactorsContainer');
  c.innerHTML = '';
  CF_ITEMS.forEach((item, i) => {
    const uid = 'cf_' + i;
    if (item.fixed) {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="toggleCheckCard('${uid}')">
          <input type="checkbox" id="${uid}">
          <label for="${uid}">${item.label}</label>
          <span class="weight-badge">W: ${item.weight}</span>
        </div>`;
    } else {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="toggleCheckCardRange('${uid}','wrap_${uid}')">
          <div style="flex:1">
            <input type="checkbox" id="${uid}" style="pointer-events:none">
            <label>${item.label}</label>
            <div class="range-input-wrap" id="wrap_${uid}">
              <label>Enter weighting (${item.min}–${item.max}):</label>
              <input type="number" id="val_${uid}" min="${item.min}" max="${item.max}"
                     placeholder="${item.min}–${item.max}" onclick="event.stopPropagation()">
            </div>
          </div>
          <span class="weight-badge">W: ${item.min}–${item.max}</span>
        </div>`;
    }
  });
}

function saveConsequenceFactors() {
  data.cf = [];
  let valid = true;
  CF_ITEMS.forEach((item, i) => {
    const uid = 'cf_' + i;
    const inp = document.getElementById(uid);
    if (inp && inp.checked) {
      let w = item.fixed ? item.weight : null;
      if (!item.fixed) {
        const v = parseFloat(document.getElementById('val_' + uid)?.value);
        if (isNaN(v) || v < item.min || v > item.max) {
          alert(`Please enter a valid weighting (${item.min}–${item.max}) for:\n${item.label}`);
          valid = false;
          return;
        }
        w = v;
      }
      data.cf.push({ label: item.label, weight: w });
    }
  });
  if (!valid) return;
  data.cfReason = document.getElementById('cfReason').value;
  buildConsequenceCategoryPage();
  goToPage(3);
}

// ── PAGE 3: Consequence Category ───────────────────────────────────────────

const CC_ITEMS = [
  {
    label: "Highest",
    bullets: [
      "Causing or attempting injury with a firearm",
      "Discharging a firearm to cause terror",
      "Renting or supplying or dealing or trafficking in five or more firearms",
      "The firearm is particularly dangerous (e.g. is an assault rifle or submachine gun)"
    ],
    min: 7, max: 10
  },
  {
    label: "High",
    bullets: [
      "There is more than one concealed firearm",
      "Renting or supplying or dealing or trafficking in less than five firearms",
      "Causing extensive damage to property with a firearm",
      "Carrying a firearm openly",
      "Presence of a firearm during the commission of an offence"
    ],
    min: 5, max: 6
  },
  {
    label: "Lesser",
    bullets: [
      "The firearm is at all times concealed",
      "Ammunition not in a firearm",
      "None of categories 1 and 2 applies"
    ],
    min: 1, max: 4
  }
];

function buildConsequenceCategoryPage() {
  const c = document.getElementById('consequenceCategoryContainer');
  c.innerHTML = '';
  CC_ITEMS.forEach((item, i) => {
    const uid = 'cc_' + i;
    c.innerHTML += `
      <div class="option-card" id="card_${uid}" onclick="selectCategoryCard(${i})">
        <div style="flex:1">
          <input type="radio" name="cc" id="${uid}" style="pointer-events:none">
          <label style="font-weight:700">${item.label}</label>
          <ul style="margin:6px 0 0 18px;font-size:0.82rem;color:var(--muted);font-style:italic">
            ${item.bullets.map(b => `<li>${b}</li>`).join('')}
          </ul>
          <div class="range-input-wrap" id="wrap_${uid}">
            <label>Enter weighting (${item.min}–${item.max}):</label>
            <input type="number" id="val_${uid}" min="${item.min}" max="${item.max}"
                   placeholder="${item.min}–${item.max}" onclick="event.stopPropagation()">
          </div>
        </div>
        <span class="weight-badge">W: ${item.min}–${item.max}</span>
      </div>`;
  });
}

function selectCategoryCard(idx) {
  CC_ITEMS.forEach((_, i) => {
    const uid = 'cc_' + i;
    const sel = i === idx;
    document.getElementById(uid).checked = sel;
    document.getElementById('card_' + uid).classList.toggle('selected', sel);
    document.getElementById('wrap_' + uid).classList.toggle('visible', sel);
  });
}

function saveConsequenceCategory() {
  const checked = document.querySelector('input[name="cc"]:checked');
  if (!checked) return alert("Please select a consequence category.");
  const idx  = parseInt(checked.id.split('_')[1]);
  const item = CC_ITEMS[idx];
  const uid  = 'cc_' + idx;
  const v    = parseFloat(document.getElementById('val_' + uid)?.value);
  if (isNaN(v) || v < item.min || v > item.max)
    return alert(`Please enter a valid weighting (${item.min}–${item.max}) for ${item.label}.`);
  data.cc       = item.label;
  data.ccWeight = v;
  data.ccReason = document.getElementById('ccReason').value;
  buildSeriousnessPage();
  goToPage(4);
}

// ── PAGE 4: Seriousness Level ──────────────────────────────────────────────

const SR_ITEMS = [
  { label: "High",   min: 7, max: 10 },
  { label: "Medium", min: 5, max: 7  },
  { label: "Lesser", min: 2, max: 5  }
];

function buildSeriousnessPage() {
  const c = document.getElementById('seriousnessContainer');
  c.innerHTML = '';
  SR_ITEMS.forEach((item, i) => {
    const uid = 'sr_' + i;
    c.innerHTML += `
      <div class="option-card" id="card_${uid}" onclick="selectSRCard(${i})">
        <div style="flex:1">
          <input type="radio" name="sr" id="${uid}" style="pointer-events:none">
          <label style="font-weight:700">${item.label}</label>
          <div class="range-input-wrap" id="wrap_${uid}">
            <label>Enter rating (${item.min}–${item.max}):</label>
            <input type="number" id="val_${uid}" min="${item.min}" max="${item.max}"
                   placeholder="${item.min}–${item.max}" onclick="event.stopPropagation()">
          </div>
        </div>
        <span class="weight-badge">W: ${item.min}–${item.max}</span>
      </div>`;
  });
}

function selectSRCard(idx) {
  SR_ITEMS.forEach((_, i) => {
    const uid = 'sr_' + i;
    const sel = i === idx;
    document.getElementById(uid).checked = sel;
    document.getElementById('card_' + uid).classList.toggle('selected', sel);
    document.getElementById('wrap_' + uid).classList.toggle('visible', sel);
  });
}

function saveSeriousness() {
  const checked = document.querySelector('input[name="sr"]:checked');
  if (!checked) return alert("Please select a seriousness level.");
  const idx  = parseInt(checked.id.split('_')[1]);
  const item = SR_ITEMS[idx];
  const uid  = 'sr_' + idx;
  const v    = parseFloat(document.getElementById('val_' + uid)?.value);
  if (isNaN(v) || v < item.min || v > item.max)
    return alert(`Please enter a valid rating (${item.min}–${item.max}).`);
  data.sr       = item.label;
  data.srWeight = v;
  data.srReason = document.getElementById('srReason').value;
  buildAggOffencePage();
  goToPage(5);
}

// ── PAGE 5: Aggravating Factors (Offence) ─────────────────────────────────

const AGG_OFF_ITEMS = [
  { label: "Firearm is modified to make it more dangerous",     weight: 7 },
  { label: "Being in a position of authority",                  weight: 6 },
  { label: "Steps taken to prevent the victim reporting",       weight: 7 },
  { label: "Possession motivated by revenge",                   weight: 7 },
  { label: "Possession committed over sustained period of time",weight: 7 },
  { label: "Attempts to conceal/dispose of evidence",           weight: 6 },
  { label: "The firearm is unrecovered and still at large",     weight: 7 }
];

function buildAggOffencePage() {
  const c = document.getElementById('aggOffenceContainer');
  c.innerHTML = '';
  AGG_OFF_ITEMS.forEach((item, i) => {
    const uid = 'ao_' + i;
    c.innerHTML += `
      <div class="option-card" id="card_${uid}" onclick="toggleCheckCard('${uid}')">
        <input type="checkbox" id="${uid}">
        <label for="${uid}">${item.label}</label>
        <span class="weight-badge">W: ${item.weight}</span>
      </div>`;
  });
}

function saveAggOffence() {
  data.aggOff = [];
  AGG_OFF_ITEMS.forEach((item, i) => {
    const inp = document.getElementById('ao_' + i);
    if (inp && inp.checked) data.aggOff.push({ label: item.label, weight: item.weight });
  });
  data.aggOffReason = document.getElementById('aggOffReason').value;
  buildMitOffencePage();
  goToPage(6);
}

// ── PAGE 6: Mitigating Factors (Offence) ──────────────────────────────────

const MIT_OFF_ITEMS = [
  { label: "Voluntary surrender of firearm and/or ammunition",                           weight: 8 },
  { label: "Genuine belief firearm did not require a licence (e.g. is an antique)",      weight: 7 },
  { label: "Genuine mistaken belief item is not a firearm",                              weight: 8 },
  { label: "Possession as a result of coercion, intimidation or exploitation",           weight: 7 },
  { label: "Serious medical condition if it helps to explain why the offence occurred",  weight: 7 }
];

function buildMitOffencePage() {
  const c = document.getElementById('mitOffenceContainer');
  c.innerHTML = '';
  MIT_OFF_ITEMS.forEach((item, i) => {
    const uid = 'mo_' + i;
    c.innerHTML += `
      <div class="option-card" id="card_${uid}" onclick="toggleCheckCard('${uid}')">
        <input type="checkbox" id="${uid}">
        <label for="${uid}">${item.label}</label>
        <span class="weight-badge">W: ${item.weight}</span>
      </div>`;
  });
}

function saveMitOffence() {
  data.mitOff = [];
  MIT_OFF_ITEMS.forEach((item, i) => {
    const inp = document.getElementById('mo_' + i);
    if (inp && inp.checked) data.mitOff.push({ label: item.label, weight: item.weight });
  });
  data.mitOffReason = document.getElementById('mitOffReason').value;
  buildAggOffenderPage();
  goToPage(7);
}

// ── PAGE 7: Aggravating Factors (Offender) ────────────────────────────────

const AGG_OFFENDER_ITEMS = [
  { label: "Previous convictions for firearm offences",    fixed: true,  weight: 8 },
  { label: "Relevant convictions for other offences",      fixed: false, min: 6, max: 7 },
  { label: "Offence committed while on bail for other offence", fixed: true, weight: 7 }
];

function buildAggOffenderPage() {
  const c = document.getElementById('aggOffenderContainer');
  c.innerHTML = '';
  AGG_OFFENDER_ITEMS.forEach((item, i) => {
    const uid = 'aof_' + i;
    if (item.fixed) {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="toggleCheckCard('${uid}')">
          <input type="checkbox" id="${uid}">
          <label for="${uid}">${item.label}</label>
          <span class="weight-badge">W: ${item.weight}</span>
        </div>`;
    } else {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="toggleCheckCardRange('${uid}','wrap_${uid}')">
          <div style="flex:1">
            <input type="checkbox" id="${uid}" style="pointer-events:none">
            <label>${item.label}</label>
            <div class="range-input-wrap" id="wrap_${uid}">
              <label>Enter weighting (${item.min}–${item.max}):</label>
              <input type="number" id="val_${uid}" min="${item.min}" max="${item.max}"
                     placeholder="${item.min}–${item.max}" onclick="event.stopPropagation()">
            </div>
          </div>
          <span class="weight-badge">W: ${item.min}–${item.max}</span>
        </div>`;
    }
  });
}

function saveAggOffender() {
  data.aggOffender = [];
  let valid = true;
  AGG_OFFENDER_ITEMS.forEach((item, i) => {
    const uid = 'aof_' + i;
    const inp = document.getElementById(uid);
    if (inp && inp.checked) {
      let w = item.fixed ? item.weight : null;
      if (!item.fixed) {
        const v = parseFloat(document.getElementById('val_' + uid)?.value);
        if (isNaN(v) || v < item.min || v > item.max) {
          alert(`Please enter a valid weighting (${item.min}–${item.max}) for:\n${item.label}`);
          valid = false;
          return;
        }
        w = v;
      }
      data.aggOffender.push({ label: item.label, weight: w });
    }
  });
  if (!valid) return;
  data.aggOffenderReason = document.getElementById('aggOffenderReason').value;
  buildMitOffenderPage();
  goToPage(8);
}

// ── PAGE 8: Mitigating Factors (Offender) ────────────────────────────────

const MIT_OFFENDER_ITEMS = [
  { label: "Positive good character",                                              fixed: true,  weight: 7 },
  { label: "Genuine remorse",                                                      fixed: true,  weight: 7 },
  { label: "Disability or ill-health",                                             fixed: true,  weight: 7 },
  { label: "Steps taken to address offending behaviour",                           fixed: true,  weight: 7 },
  { label: "Youth and/or lack of maturity where it explains offending",            fixed: false, min: 7, max: 8 },
  { label: "Assistance given to the authorities",                                  fixed: false, min: 7, max: 9 },
  { label: "No previous convictions",                                              fixed: true,  weight: 6 }
];

function buildMitOffenderPage() {
  const c = document.getElementById('mitOffenderContainer');
  c.innerHTML = '';
  MIT_OFFENDER_ITEMS.forEach((item, i) => {
    const uid = 'mof_' + i;
    if (item.fixed) {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="toggleCheckCard('${uid}')">
          <input type="checkbox" id="${uid}">
          <label for="${uid}">${item.label}</label>
          <span class="weight-badge">W: ${item.weight}</span>
        </div>`;
    } else {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="toggleCheckCardRange('${uid}','wrap_${uid}')">
          <div style="flex:1">
            <input type="checkbox" id="${uid}" style="pointer-events:none">
            <label>${item.label}</label>
            <div class="range-input-wrap" id="wrap_${uid}">
              <label>Enter weighting (${item.min}–${item.max}):</label>
              <input type="number" id="val_${uid}" min="${item.min}" max="${item.max}"
                     placeholder="${item.min}–${item.max}" onclick="event.stopPropagation()">
            </div>
          </div>
          <span class="weight-badge">W: ${item.min}–${item.max}</span>
        </div>`;
    }
  });
}

function saveMitOffender() {
  data.mitOffender = [];
  let valid = true;
  MIT_OFFENDER_ITEMS.forEach((item, i) => {
    const uid = 'mof_' + i;
    const inp = document.getElementById(uid);
    if (inp && inp.checked) {
      let w = item.fixed ? item.weight : null;
      if (!item.fixed) {
        const v = parseFloat(document.getElementById('val_' + uid)?.value);
        if (isNaN(v) || v < item.min || v > item.max) {
          alert(`Please enter a valid weighting (${item.min}–${item.max}) for:\n${item.label}`);
          valid = false;
          return;
        }
        w = v;
      }
      data.mitOffender.push({ label: item.label, weight: w });
    }
  });
  if (!valid) return;
  data.mitOffenderReason = document.getElementById('mitOffenderReason').value;
  buildGuiltyPleaPage();
  goToPage(9);
}

// ── PAGE 9: Guilty Plea ────────────────────────────────────────────────────

const GP_ITEMS = [
  { label: "Earliest available opportunity",                                                                          fixed: true,  discount: 33.33 },
  { label: "Not earliest available opportunity but before pretrial review conference or firm trial date fixtures",    fixed: false, min: 25, max: 30 },
  { label: "After final case management conferences and after trial date fixed",                                      fixed: false, min: 15, max: 20 },
  { label: "Before trial but after case management conferences and pre-trial review dates",                           fixed: false, min: 10, max: 15 },
  { label: "On eve of, or at trial",                                                                                  fixed: false, min: 5,  max: 10 },
  { label: "No guilty plea",                                                                                          fixed: true,  discount: 0 }
];

function buildGuiltyPleaPage() {
  const c = document.getElementById('guiltyPleaContainer');
  c.innerHTML = '';
  GP_ITEMS.forEach((item, i) => {
    const uid = 'gp_' + i;
    if (item.fixed) {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="selectGPCard(${i})">
          <input type="radio" name="gp" id="${uid}" style="pointer-events:none">
          <label for="${uid}">${item.label}</label>
          <span class="weight-badge">${item.discount}%</span>
        </div>`;
    } else {
      c.innerHTML += `
        <div class="option-card" id="card_${uid}" onclick="selectGPCard(${i})">
          <div style="flex:1">
            <input type="radio" name="gp" id="${uid}" style="pointer-events:none">
            <label>${item.label}</label>
            <div class="range-input-wrap" id="wrap_${uid}">
              <label>Enter discount % (${item.min}–${item.max}):</label>
              <input type="number" id="val_${uid}" min="${item.min}" max="${item.max}"
                     placeholder="${item.min}–${item.max}" onclick="event.stopPropagation()">
            </div>
          </div>
          <span class="weight-badge">${item.min}–${item.max}%</span>
        </div>`;
    }
  });
}

function selectGPCard(idx) {
  GP_ITEMS.forEach((_, i) => {
    const uid  = 'gp_' + i;
    const sel  = i === idx;
    document.getElementById(uid).checked = sel;
    document.getElementById('card_' + uid).classList.toggle('selected', sel);
    const wrap = document.getElementById('wrap_' + uid);
    if (wrap) wrap.classList.toggle('visible', sel);
  });
}

function saveGuiltyPlea() {
  const checked = document.querySelector('input[name="gp"]:checked');
  if (!checked) return alert("Please select a guilty plea option.");
  const idx  = parseInt(checked.id.split('_')[1]);
  const item = GP_ITEMS[idx];
  let discount = item.fixed ? item.discount : null;
  if (!item.fixed) {
    const v = parseFloat(document.getElementById('val_gp_' + idx)?.value);
    if (isNaN(v) || v < item.min || v > item.max)
      return alert(`Please enter a valid discount (${item.min}–${item.max}%).`);
    discount = v;
  }
  data.gpLabel    = item.label;
  data.gpDiscount = discount;
  data.gpReason   = document.getElementById('gpReason').value;
  calculateResult();
  goToPage(10);
}

// ── Calculation & Result ───────────────────────────────────────────────────
// Steps:
//  1. Look up starting point and range from the grid using consequence category + seriousness level.
//  2. Apply aggravating/mitigating adjustments: each weight point shifts the sentence by 0.5%
//     of the starting point (keeps adjustments meaningful but bounded within range).
//  3. Clamp adjusted sentence to the guideline range.
//  4. Apply guilty plea discount.

function calculateResult() {
  const cat  = catKey(data.cc);
  const sr   = srKey(data.sr);
  const cell = GRID[cat][sr];

  const startYears = cell.start * MAX_YEARS;
  const minYears   = cell.min   * MAX_YEARS;
  const maxYears   = cell.max   * MAX_YEARS;

  const aggTotal = [...data.aggOff, ...data.aggOffender].reduce((s, x) => s + x.weight, 0);
  const mitTotal = [...data.mitOff, ...data.mitOffender].reduce((s, x) => s + x.weight, 0);

  const SHIFT_PER_POINT = 0.005; // 0.5% of starting point per weight unit
  let sentence = startYears
    + startYears * aggTotal * SHIFT_PER_POINT
    - startYears * mitTotal * SHIFT_PER_POINT;

  sentence = Math.max(minYears, Math.min(maxYears, sentence));
  const prePlea = sentence;

  if (data.gpDiscount > 0) sentence = sentence * (1 - data.gpDiscount / 100);
  sentence = Math.max(0, sentence);

  // Helper: render a factor list or a "none selected" row
  const factorList = (arr) => arr.length
    ? arr.map(x =>
        `<div class="result-row">
           <span class="rr-label">${x.label}</span>
           <span class="rr-val">W: ${x.weight}</span>
         </div>`).join('')
    : `<div class="result-row">
         <span class="rr-label" style="color:var(--muted);font-style:italic">None selected</span>
         <span></span>
       </div>`;

  const pct = (v) => (v * 100).toFixed(0);

  document.getElementById('resultContent').innerHTML = `
    <div class="result-block">
      <div class="final-label">Indicative Sentence</div>
      <div class="final-years">${sentence.toFixed(2)} years</div>
      <div class="final-range">Guideline range: ${minYears.toFixed(2)} – ${maxYears.toFixed(2)} years</div>
    </div>

    <div class="calc-steps">
      <h3>Calculation Breakdown</h3>
      <div class="calc-step">Consequence category: <span class="op">${data.cc} (Category ${cat})</span></div>
      <div class="calc-step">Seriousness level: <span class="op">${data.sr} (Level ${sr})</span></div>
      <div class="calc-step">Starting point: ${pct(cell.start)}% × 30 = <span class="op">${startYears.toFixed(2)} years</span></div>
      <div class="calc-step">Guideline range: ${pct(cell.min)}%–${pct(cell.max)}% × 30 = <span class="op">${minYears.toFixed(2)}–${maxYears.toFixed(2)} years</span></div>
      <div class="calc-step">Aggravating total weight: <span class="op">+${aggTotal}</span> → +${(startYears * aggTotal * SHIFT_PER_POINT).toFixed(2)} yrs</div>
      <div class="calc-step">Mitigating total weight: <span class="op">−${mitTotal}</span> → −${(startYears * mitTotal * SHIFT_PER_POINT).toFixed(2)} yrs</div>
      <div class="calc-step">Adjusted sentence (clamped to range): <span class="op">${prePlea.toFixed(2)} years</span></div>
      <div class="calc-step">Guilty plea discount: <span class="op">−${data.gpDiscount}%</span></div>
      <div class="calc-step">Final indicative sentence: <span class="op">${sentence.toFixed(2)} years</span></div>
    </div>

    <div class="result-section">
      <h3>Offence</h3>
      <div class="result-row"><span class="rr-label">Offence type</span><span class="rr-val">${data.offence}</span></div>
    </div>

    <div class="result-section">
      <h3>Consequence Factors</h3>
      ${factorList(data.cf)}
      ${data.cfReason ? `<p class="result-note">${data.cfReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Consequence Category</h3>
      <div class="result-row"><span class="rr-label">${data.cc}</span><span class="rr-val">W: ${data.ccWeight}/10</span></div>
      ${data.ccReason ? `<p class="result-note">${data.ccReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Seriousness Level</h3>
      <div class="result-row"><span class="rr-label">${data.sr}</span><span class="rr-val">W: ${data.srWeight}/10</span></div>
      ${data.srReason ? `<p class="result-note">${data.srReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Aggravating Factors — Offence</h3>
      ${factorList(data.aggOff)}
      ${data.aggOffReason ? `<p class="result-note">${data.aggOffReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Mitigating Factors — Offence</h3>
      ${factorList(data.mitOff)}
      ${data.mitOffReason ? `<p class="result-note">${data.mitOffReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Aggravating Factors — Offender</h3>
      ${factorList(data.aggOffender)}
      ${data.aggOffenderReason ? `<p class="result-note">${data.aggOffenderReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Mitigating Factors — Offender</h3>
      ${factorList(data.mitOffender)}
      ${data.mitOffenderReason ? `<p class="result-note">${data.mitOffenderReason}</p>` : ''}
    </div>

    <div class="result-section">
      <h3>Guilty Plea</h3>
      <div class="result-row"><span class="rr-label">${data.gpLabel}</span><span class="rr-val">−${data.gpDiscount}%</span></div>
      ${data.gpReason ? `<p class="result-note">${data.gpReason}</p>` : ''}
    </div>

    <button class="btn-next" style="margin-top:8px" onclick="location.reload()">← Start Over</button>
  `;
}

// ── Initialise ─────────────────────────────────────────────────────────────
updateProgress();
