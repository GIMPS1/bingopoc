
function __getImgProps(img) {
  // In this project we treat Alt1 captures and loaded templates as ImageData-like objects.
  // They already expose { width, height, data (RGBA) }.
  if (!img) return null;
  if (img.data && (img.width != null) && (img.height != null)) return img;
  return null;
}

/* IRB v2026-02-28-barrows-iconmatch2-chestscan-v5p2 (BARROWS ICONS)
   Fixes:
   - Manual-submit icon templates now load from /assets/barrows
   - Adds assets/barrows_icon_map.json and robust asset URL resolution
*/
(async function () {

  const BUILD_VERSION = "v2026-02-28--v2";


  // ---------------------------------------------------------------------------
  // Icon match configuration (used by both manual icon matching and chest scan)
  // NOTE: Keeping acceptScore low (0.20) per your request for manual acceptance.
  // Chest UI detection has its own separate threshold.
  // ---------------------------------------------------------------------------
  const ICON_MATCH = {
    // Downsample size for template matching (higher = slower but more accurate)
    sampleSize: 16,
    // Edge-assisted matching (helps discriminate similar icons)
    useEdges: true,
    edgeWeight: 0.65,

    // Base acceptance for icon matches (manual/chest). Adaptive rules may tighten.
    acceptScore: 0.20,

    // Ambiguity guards
    minGap: 0.04,
    minRatio: 1.08,

    // For hover-snap/manual selection searches
    searchRadius: 18
  }

  // Debug: enable icon match debug arrays (used by chest scanning + manual top-10)
  // Set to false to disable heavy console.table output.
  var DEBUG_ICON_MATCH = true;
;
  console.log("IRB v2026-02-27-barrows-iconmatch2 ✅");
  try {
    const sub = document.querySelector(".subtitle");
    if (sub) sub.textContent = `Drop auto-submit • v2026-02-27--v2`;
  } catch (e) {}
  const $ = (id) => document.getElementById(id);

  const ui = {
    alt1Pill: $("alt1Pill"),
    apiPill: $("apiPill"),
    chatPill: $("chatPill"),

    apiBase: $("apiBase"),
    bingoId: $("bingoId"),
    teamNumber: $("teamNumber"),

    // Premium selects (custom dropdown)
    bingoSelectWrap: $("bingoSelectWrap"),
    bingoBtn: $("bingoSelectBtn"),
    bingoValue: $("bingoSelectValue"),
    bingoMenu: $("bingoSelectMenu"),

    teamSelectWrap: $("teamSelectWrap"),
    teamBtn: $("teamSelectBtn"),
    teamValue: $("teamSelectValue"),
    teamMenu: $("teamSelectMenu"),

    ign: $("ign"),
        btnAutoLocateChat: $("btnAutoLocateChat"),
    autoChatWrap: $("autoChatWrap"),
    autoChatHint: $("autoChatHint"),
    autoChatPill: $("autoChatPill"),
ignHint: $("ignHint"),
    btnLockIgn: $("btnLockIgn"),

    btnLockSetup: $("btnLockSetup"),
    setupBlock: $("setupBlock"),
    setupHint: $("setupHint"),
    setupSummary: $("setupSummary"),
    setupPanelWrap: $("setupPanelWrap"),
    summaryMeta: $("summaryMeta"),
    btnOpenSettings2: $("btnOpenSettings2"),

    // Drop history
    toggleHistory: $("toggleHistory"),
    historyBody: $("historyBody"),
    historyList: $("historyList"),
    historyMeta: $("historyMeta"),
    historyHint: $("historyHint"),
    btnRefreshHistory: $("btnRefreshHistory"),

    // Drawer
    drawer: $("settingsDrawer"),
    backdrop: $("drawerBackdrop"),
        guidePanel: $("guidePanel"),
btnOpenSettings: $("btnOpenSettings"),
        btnOpenGuide: $("btnOpenGuide"),
btnCloseSettings: $("btnCloseSettings"),

        btnCloseGuide: $("btnCloseGuide"),
// Settings - setup
    setupState: $("setupState"),
    btnUnlockSetup: $("btnUnlockSetup"),
    btnResetIgn: $("btnResetIgn"),
    btnResetBarrowsLock: $("btnResetBarrowsLock"),

    // Settings - chat
    btnScanChats: $("btnScanChats"),
    chatSelect: $("chatSelect"),
    btnLockChat: $("btnLockChat"),
    btnHighlightChat: $("btnHighlightChat"),
    btnRecalibrate: $("btnRecalibrate"),
    optAutoDetect: $("optAutoDetect"),
    optHighlight: $("optHighlight"),
    optStrictDrops: $("optStrictDrops"),
    optUseWikiCanonical: $("optUseWikiCanonical"),
    btnUnlockChat: $("btnUnlockChat"),

    // Runtime// Feed
    feed: $("feed"),
    feedMeta: $("feedMeta"),

    // Premium event line
    eventLine: $("eventLine"),
    eventTitle: $("eventTitle"),
    eventSub: $("eventSub"),
};

  // ---------- settings popup mode ----------
  const __params = new URLSearchParams(location.search);
  const __settingsOnly = __params.get("settings") === "1";
  const __guideOnly = __params.get("guide") === "1";

  function buildSettingsUrl() {
    const base = location.href.split("#")[0].split("?")[0];
    return `${base}?settings=1`;
  }
  function openSettingsPopup() {
  const url = buildSettingsUrl();
  const w = 356;
  const h = 560;

  if (window.alt1 && typeof alt1.openPopup === "function") {
    try { alt1.openPopup(url, w, h); return; } catch (e) {}
  }
  window.open(url, "irb_settings", `width=${w},height=${h},resizable=yes`);
}

  // ---------- storage ----------
  const LS = {
    apiBase: "irb.apiBase",
    bingoId: "irb.bingoId",
    team: "irb.team",
    setupLocked: "irb.setupLocked",
    ign: "irb.ign",
    ignLocked: "irb.ignLocked",
    chatPos: "irb.chatPos",
    settings: "irb.settings",
    historyOpen: "irb.historyOpen",
  };

  // API base is locked (hidden in UI)
  const LOCKED_API_BASE = (ui.apiBase && ui.apiBase.value) ? ui.apiBase.value : "";
  const getApiBase = () => LOCKED_API_BASE;

  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS.settings) || "{}"); } catch (e) {}
    return {
      autoDetect: s.autoDetect !== false,
      highlight: s.highlight === true,
      strictDrops: s.strictDrops !== false,
      useWikiCanonical: s.useWikiCanonical !== false,
    };
  }
  function saveSettings(patch) {
    const current = loadSettings();
    const next = { ...current, ...patch };
    localStorage.setItem(LS.settings, JSON.stringify(next));
    return next;
  }

  // ---------- UI helpers ----------
  const FEED_MAX = 3;
  const feedItems = [];

  let __lastNonIdleEventAt = Date.now();
  let __idleModeOn = false;
  let __idleDotsTimer = null;
  let __idleDotsPhase = 0;
  function nowTs() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  function tagForLevel(level) {
    if (level === "ok") return "ok";
    if (level === "bad") return "bad";
    return "warn";
  }

  let _audioCtx = null;
  function playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!_audioCtx) _audioCtx = new AudioCtx();
      const ctx = _audioCtx;

      const now = ctx.currentTime;
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = "sine";
      o1.frequency.setValueAtTime(880, now);
      o1.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      g1.gain.setValueAtTime(0.0001, now);
      g1.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      o1.connect(g1).connect(ctx.destination);
      o1.start(now);
      o1.stop(now + 0.13);

      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(660, now + 0.10);
      o2.frequency.exponentialRampToValueAtTime(990, now + 0.18);
      g2.gain.setValueAtTime(0.0001, now + 0.10);
      g2.gain.exponentialRampToValueAtTime(0.10, now + 0.11);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      o2.connect(g2).connect(ctx.destination);
      o2.start(now + 0.10);
      o2.stop(now + 0.25);
    } catch (e) {}
  }

  function showEvent(title, subtitle, level = "ok", flash = true, sound = false, isIdle = false) {
    if (!ui.eventLine || !ui.eventTitle || !ui.eventSub) return;

    // Idle handling:
    // - Any non-idle event exits idle mode and resets the idle timer.
    // - Idle events keep idle mode on and animate the subtitle via idle dots.
    if (isIdle) {
      __idleModeOn = true;
      if (ui.eventLine) ui.eventLine.classList.add("idle");
      if (ui.eventTitle) ui.eventTitle.textContent = title;
      if (ui.eventSub) ui.eventSub.textContent = subtitle;
      __startIdleDots();
      // Keep styling consistent
      ui.eventLine.classList.remove("ok","bad","warn","flash");
      ui.eventLine.classList.add(level);
      return;
    }

    // Leaving idle mode
    __idleModeOn = false;
    __lastNonIdleEventAt = Date.now();
    __stopIdleDots();
    try { ui.eventLine && ui.eventLine.classList.remove("idle"); } catch (e) {}

    ui.eventTitle.textContent = title;
    ui.eventSub.textContent = subtitle;

    ui.eventLine.classList.remove("ok","bad","warn","flash");
    ui.eventLine.classList.add(level);

    if (flash) {
      void ui.eventLine.offsetWidth;
      ui.eventLine.classList.add("flash");
    }
    if (sound) playChime();
  }


  

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  function loadSavedNames() {
    return {
      bingoName: localStorage.getItem("irb.bingoName") || "",
      teamName: localStorage.getItem("irb.teamName") || "",
    };
  }

  function addFeed(msg, level = "warn") {
    const isSubmitOk = level === "ok" && /^Submitted ✅/.test(msg);
    const title = msg.replace(/^Submitted ✅\s*/,"").replace(/^Drop:\s*/,"").trim();
    const subtitle = isSubmitOk ? "Submitted" : (level === "bad" ? "Error" : "Status");
    showEvent(title || msg, subtitle, level, true, isSubmitOk);

    feedItems.unshift({ ts: nowTs(), msg, level });
    while (feedItems.length > FEED_MAX) feedItems.pop();

    if (ui.feed) {
      ui.feed.innerHTML = feedItems.map(it => {
        const tag = tagForLevel(it.level);
        const label = it.level === "ok" ? "OK" : it.level === "bad" ? "ERR" : "INFO";
        return `
        <div class="feedItem">
          <div class="ts">${it.ts}</div>
          <div class="msg">${escapeHtml(it.msg)}</div>
          <div class="tag ${tag}">${label}</div>
        </div>`;
      }).join("");
    }
    if (ui.feedMeta) ui.feedMeta.textContent = `${feedItems.length} events`;
  }


function __stopIdleDots() {
  if (__idleDotsTimer) { try { clearInterval(__idleDotsTimer); } catch (e) {} }
  __idleDotsTimer = null;
  __idleDotsPhase = 0;
}

function __startIdleDots() {
  __stopIdleDots();
  __idleDotsTimer = setInterval(() => {
    try {
      if (!__idleModeOn || !ui.eventSub) { __stopIdleDots(); return; }
      __idleDotsPhase = (__idleDotsPhase + 1) % 4; // 0..3
      const dots = ".".repeat(__idleDotsPhase);
      ui.eventSub.textContent = "Waiting for drops" + dots;
    } catch (e) {}
  }, 650);
}

function showIdleRunning() {
  // Only show idle when setup is ready (otherwise setup hints should stay visible)
  try { if (typeof isSetupReady === "function" && !isSetupReady()) return; } catch (e) {}
  if (__idleModeOn) return;
  __idleModeOn = true;
  if (ui.eventLine) ui.eventLine.classList.add("idle");
  if (ui.eventTitle) ui.eventTitle.textContent = "Running";
  if (ui.eventSub) ui.eventSub.textContent = "Waiting for drops";
  __startIdleDots();
}

function startIdleTicker() {
  const idleMs = 12000;
  setInterval(() => {
    try {
      const now = Date.now();
      if (__idleModeOn) return;
      if ((now - __lastNonIdleEventAt) >= idleMs) showIdleRunning();
    } catch (e) {}
  }, 700);
}

  function getMousePos() {
    try {
      if (window.A1lib && typeof A1lib.mousePosition === "function") {
        return A1lib.mousePosition();
      }
    } catch (e) {}

    try {
      const packed = alt1 && alt1.mousePosition;
      if (typeof packed === "number") {
        return { x: (packed >> 16), y: (packed & 0xFFFF) };
      }
    } catch (e) {}
    return null;
  }

  async function ocrRegionAroundMouse(size) {
    if (!window.alt1) return { ok: false, reason: "Alt1 not available." };
    if (!alt1.permissionPixel) return { ok: false, reason: "No Pixel permission." };

    const pos = getMousePos();
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") {
      return { ok: false, reason: "Mouse position unavailable." };
    }

    const w = (size | 0), h = (size | 0);
    const half = (w / 2) | 0;
    const x = Math.max(0, (pos.x | 0) - half) | 0;
    const y = Math.max(0, (pos.y | 0) - half) | 0;

    let id;
    try {
      id = alt1.bindRegion(x, y, w, h);
    } catch (e) {
      return { ok: false, reason: "bindRegion failed: " + (e && e.message ? e.message : String(e)) };
    }

    // Brute-force scan for tooltip text baseline; this is manual so a few thousand calls is acceptable.
    const fonts = ["chat", "chatmono", "xpcounter"];
    const argsBase = { allowgap: true };

    // Optional: prefer bright tooltip-ish colors if mixcolor exists
    try {
      if (window.A1lib && typeof A1lib.mixcolor === "function") {
        argsBase.colors = [
          A1lib.mixcolor(255,255,255), // white
          A1lib.mixcolor(255,255,0),   // yellow
          A1lib.mixcolor(255,200,80),  // gold-ish
          A1lib.mixcolor(200,255,200)  // pale green
        ];
      }
    } catch (e) {}

    const found = [];
    const seen = {};
    const yStep = 2;
    const xStep = 10;

    for (let fi = 0; fi < fonts.length; fi++) {
      const font = fonts[fi];
      const args = JSON.stringify((function(){var o={fontname:font,allowgap:true}; try{ if(argsBase && argsBase.colors){o.colors=argsBase.colors;} }catch(e){} return o;})());

      for (let yy = 0; yy < h; yy += yStep) {
        for (let xx = 0; xx < w; xx += xStep) {
          let s = "";
          try {
            s = alt1.bindReadStringEx(id, xx, yy, args) || "";
          } catch (e) {
            // If Ex fails, fallback to basic reader (much less flexible)
            try { s = alt1.bindReadString(id, font, xx, yy) || ""; } catch (e2) { s = ""; }
          }
          s = String(s).trim();
          if (!s) continue;

          // De-dup
          const k = s.toLowerCase();
          if (seen[k]) continue;
          seen[k] = true;
          found.push(s);

          // Early exit if we already see a likely tooltip/menu verb
          if (/(^|\b)(take|withdraw|withdraw-all|open|search|claim|collect|pick up|loot)\b/i.test(s)) {
            // grab a few more lines around for context by continuing small amount, then stop
          }
          if (found.length >= 30) break;
        }
        if (found.length >= 30) break;
      }
      if (found.length) break;
    }

    const text = found.join("\n").trim();
    if (!text) return { ok: false, reason: "No text detected in 300x300 region." };

    return { ok: true, text: text, x: x, y: y, w: w, h: h };
  }

  function extractDropCandidatesFromOcr(text) {
    const t = (text || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return [];

    const out = [];
    // Handle patterns like: "Take Uncut onyx", "Withdraw-All X", "Withdraw-1 X", etc.
    const re1 = /\b(?:Take|Open|Search|Claim|Collect|Withdraw(?:-All|-1|-5|-10|-X)?|Pick up|Loot)\s+([A-Za-z0-9'’:\-(),. ]{2,80})/gi;
    let m;
    while ((m = re1.exec(t))) {
      let name = (m[1] || "").trim();
      name = name.replace(/\s+(?:x|\*)\s*\d+$/i, "").trim();
      name = name.replace(/[\.,;:]+$/g, "").trim();
      if (name && out.indexOf(name) === -1) out.push(name);
    }
    return out;
  }

  
  // ---------- Icon template matching for manual submit ----------
  function assetUrl(relPath) {
    try { return new URL(relPath, document.baseURI).toString(); }
    catch (e) { return relPath; }
  }

  const WIKI_ICON_MAP_URL = assetUrl("assets/barrows_icon_map.json");
  const ICON_TEMPLATE_SIZES = [32, 48]; // barrows set is mostly 32px; keep 48px support

  let __iconItems = null; // array of names
  let __iconTemplates = null; // array of { name, size, img }
  let __iconTemplatesLoading = null;

  function __sanitizeIconFileName(itemName) {
    // Keep consistent with generated icon map filenames
    return String(itemName || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\w\d]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function __localIconUrl(itemName, size) {
    const base = assetUrl("assets/barrows");
    const base2 = String(base).replace(/\/$/, "");
    const plain = `${__sanitizeIconFileName(itemName)}.png`;
    // Allow optional size-suffixed future naming, fall back to plain
    const sized = size ? `${__sanitizeIconFileName(itemName)}_${size}.png` : null;
    return sized ? `${base2}/${sized}` : `${base2}/${plain}`;
  }

  async function ensureIconTemplatesLoaded() {
    if (__iconTemplates) return __iconTemplates;
    if (__iconTemplatesLoading) return __iconTemplatesLoading;

    __iconTemplatesLoading = (async () => {
      if (!window.A1lib || !A1lib.ImageDetect || typeof A1lib.ImageDetect.imageDataFromUrl !== "function") {
        console.warn("[icon] A1lib.ImageDetect.imageDataFromUrl not available; icon matching disabled.");
        __iconTemplates = [];
        return __iconTemplates;
      }

      // Load bundled icon map (name/size/file). Icons live in ./assets/barrows/
      let iconMap = [];
      try {
        const res = await fetch(WIKI_ICON_MAP_URL, { cache: "no-store" });
        iconMap = await res.json();
        if (!Array.isArray(iconMap)) throw new Error("barrows_icon_map.json must be an array");
      } catch (e) {
        console.warn("[icon] failed to load assets/barrows_icon_map.json", e);
        __iconTemplates = [];
        return __iconTemplates;
      }

      const templates = [];
      for (const entry of iconMap) {
        if (!entry || !entry.name) continue;
        const name = String(entry.name);
        const size = (entry.size | 0) || 32;
        // Prefer explicit file from map, otherwise derive
        const url = entry.file ? assetUrl(`assets/barrows/${entry.file}`) : __localIconUrl(name, size);

        try {
          const img = await A1lib.ImageDetect.imageDataFromUrl(url);
          if (!img || !img.data || !img.width || !img.height) continue;
          templates.push({ name, size: img.width | 0, img });
        } catch (e) {
          // ignore missing files; keep going
        }
      }

      __iconTemplates = templates;
      console.log(`[icon] templates loaded: ${templates.length}`);
      return __iconTemplates;
    })();

    return __iconTemplatesLoading;
  }

// -------- Barrows Chest UI detection (TEST TOOL) --------
// Uses UI template matching (no OCR) against a cropped top-bar image.
const CHEST_TEST = {
  enabled: true,              // keep as a separate automated testing tool
  captureSize: 760,           // square capture around mouse for detection
  cooldownMs: 1200,           // throttle to avoid freezes
  coarseStepX: 12,
  coarseStepY: 4,
  refineRadius: 14,
  refineStep: 2,
  featW: 128,                  // downsampled feature width
  featH: 16,                  // downsampled feature height
  acceptScore: 0.78,          // UI match threshold
  // Chest geometry relative to the matched topbar crop
  chestWidth: 560,
  chestHeight: 312,
  topbarInsetX: 38,           // (560 - templateW) / 2, templateW=485
  topbarInsetY: 0,
  debug: true,
};

const BARROWS_TOPBAR_URL = assetUrl("assets/ui/barrows_topbar.png");
const BARROWS_CLOSE_URL = assetUrl("assets/ui/offsets.png"); // close button crop (anchor)
const BARROWS_CLOSE_PAD_R = 3;  // px from chest right edge to close template right edge
const BARROWS_CLOSE_PAD_T = 4;  // px from chest top edge to close template top edge
const BARROWS_CLOSE_ACCEPT = 0.90;
const BARROWS_CLOSE_FEAT_W = 48;
const BARROWS_CLOSE_FEAT_H = 52;


// Auto-detect: full-screen search uses a smaller feature map for coarse scanning, then refines.
const BARROWS_CLOSE_COARSE_FEAT_W = 24;
const BARROWS_CLOSE_COARSE_FEAT_H = 26;

// Multi-scale support (UI scaling)
const BARROWS_CHEST_SCALES = [0.85, 0.92, 1.0, 1.08, 1.15, 1.25, 1.35];

// Auto-locate throttling
const BARROWS_AUTOLOCATE = {
  enabled: true,
  cooldownMs: 1400,
  maxMsPerTick: 18,
  coarseStrideFrac: 0.33, // stride = max(8, tw*frac)
  accept: 0.90,
  refineAccept: 0.92,
  validateTopbarAccept: 0.78,
};


 const BARROWS_LOCK_DEBUG_OVERLAY = true; // draw anchor + chest rect on lock/validate (debug)

let __debugChestOverlayEnabled = false;

function __setDebugChestOverlayEnabled(v) {
  __debugChestOverlayEnabled = !!v;
  try {
    const btn = document.getElementById("btnToggleBarrowsDebug");
    if (btn) btn.textContent = `Debug chest overlay: ${__debugChestOverlayEnabled ? "ON" : "OFF"}`;
  } catch (e) {}
}



// --- Barrows Chest: user-locate via Alt+1, cache, validate, and scan (TEST) ---
const BARROWS_CHEST_LOCK_KEY = "irb_barrowsChestLock_v1";

// Slot/grid assumptions inside the chest window (can be tuned later)
const BARROWS_CHEST_SLOTS = {
  iconSz: 32,
  max: 8,
  // relative to chest top-left (at scale=1.0):
  // These values are derived from the actual Barrows chest layout and then
  // scaled from the topbar match scale to keep placement exact.
  rowY: 40,          // y of icon row (top-left of icon)
  startX: 27,        // x of first icon (top-left of icon)
  spacing: 52,       // horizontal step between icons
};
// --- Barrows chest scaling helpers (prevents drift across templates/scales) ---
function __chestScale(lock) {
  if (lock && typeof lock.scale === "number" && lock.scale > 0) return lock.scale;
  if (lock && typeof lock.w === "number" && lock.w > 0) return lock.w / CHEST_TEST.chestWidth;
  return 1.0;
}


// === Deterministic Slot Anchor (grid from pixels) ===
function __irb_clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

function __irb_luma(data, idx) {
  const r = data[idx], g = data[idx + 1], b = data[idx + 2];
  return (r * 3 + g * 6 + b) / 10;
}

// Score how “slot-like” a slot box looks at (x,y) within an ImageData-like {data,width,height}.
function __irb_scoreSlotAt(img, x, y, side) {
  const { data, width, height } = img;
  if (x < 2 || y < 2 || x + side + 2 >= width || y + side + 2 >= height) return -1e9;

  const s = side | 0;
  const borderPts = [
    [x + 2, y + 2], [x + s - 3, y + 2], [x + 2, y + s - 3], [x + s - 3, y + s - 3],
    [x + (s >> 1), y + 1], [x + (s >> 1), y + s - 2], [x + 1, y + (s >> 1)], [x + s - 2, y + (s >> 1)],
  ];
  const innerPts = [
    [x + (s >> 1), y + (s >> 1)],
    [x + (s / 3), y + (s / 3)], [x + (2 * s / 3), y + (s / 3)],
    [x + (s / 3), y + (2 * s / 3)], [x + (2 * s / 3), y + (2 * s / 3)],
  ];

  let bSum = 0, iSum = 0;
  for (const [px, py] of borderPts) {
    const idx = ((py | 0) * width + (px | 0)) * 4;
    bSum += __irb_luma(data, idx);
  }
  for (const [px, py] of innerPts) {
    const idx = ((py | 0) * width + (px | 0)) * 4;
    iSum += __irb_luma(data, idx);
  }

  const bAvg = bSum / borderPts.length;
  const iAvg = iSum / innerPts.length;
  const contrast = bAvg - iAvg;

  // Penalise if inside is too bright (usually means it's not a slot background)
  const insidePenalty = (iAvg > 140 ? (iAvg - 140) : 0);

  return contrast * 4 - insidePenalty;
}

function __irb_scoreGridRow(img, ox, oy, side, spacing, count) {
  let score = 0;
  for (let i = 0; i < count; i++) {
    const sx = ox + i * spacing;
    const sy = oy;
    score += __irb_scoreSlotAt(img, sx, sy, side);
  }
  return score;
}

// Find the *actual* first loot slot (grid origin) inside the locked chest rect.
// Returns absolute screen coords {x,y,score} or null.
function __irb_findBarrowsSlotGrid(lockRect) {
  try {
    const cap = __captureRect(lockRect.x, lockRect.y, lockRect.w, lockRect.h);
    if (!cap || !cap.data || !cap.width) return null;

    const img = { data: cap.data, width: cap.width, height: cap.height };

    const side = BARROWS_CHEST_SLOTS.iconSz | 0;
    const spacing = BARROWS_CHEST_SLOTS.spacing | 0;
    const count = BARROWS_CHEST_SLOTS.max | 0;

    const xMin = 0;
    const xMax = img.width - (side + (count - 1) * spacing) - 2;

    // Barrows icon row is near the top portion of the window.
    const yMin = __irb_clamp(Math.floor(img.height * 0.06), 6, img.height - 64);
    const yMax = __irb_clamp(Math.floor(img.height * 0.35), yMin + 16, img.height - 40);

    let best = { score: -1e18, x: 0, y: 0 };

    for (let y = yMin; y <= yMax; y += 2) {
      // Coarse x scan
      let coarse = { score: -1e18, x: 0 };
      for (let x = xMin; x <= xMax; x += 4) {
        const s = __irb_scoreGridRow(img, x, y, side, spacing, count);
        if (s > coarse.score) coarse = { score: s, x };
      }
      // Fine around coarse best
      const fx0 = __irb_clamp(coarse.x - 8, xMin, xMax);
      const fx1 = __irb_clamp(coarse.x + 8, xMin, xMax);
      for (let x = fx0; x <= fx1; x += 1) {
        const s = __irb_scoreGridRow(img, x, y, side, spacing, count);
        if (s > best.score) best = { score: s, x, y };
      }
    }

    // Threshold depends on count; be conservative to avoid false anchors.
    const minScore = 8 * count; // heuristic
    if (best.score < minScore) return null;

    return { x: (lockRect.x + best.x) | 0, y: (lockRect.y + best.y) | 0, score: best.score };
  } catch (e) {
    console.warn("[IRB] grid anchor failed:", e);
    return null;
  }
}
function __scaledChestInsets(scale) {
  return {
    insetX: Math.round(CHEST_TEST.topbarInsetX * scale),
    insetY: Math.round(CHEST_TEST.topbarInsetY * scale),
  };
}
function __scaledChestSize(scale) {
  return {
    w: Math.round(CHEST_TEST.chestWidth * scale),
    h: Math.round(CHEST_TEST.chestHeight * scale),
  };
}
function __barrowsSlotRects(lock) {
  const s = __chestScale(lock);
  const icon = Math.round(BARROWS_CHEST_SLOTS.iconSz * s);
  const dx   = Math.round(BARROWS_CHEST_SLOTS.spacing * s);

  // Prefer pixel-detected grid origin if present (absolute coords), else fall back to constants.
  let x0, y0;
  if (lock && lock.grid && typeof lock.grid.x === "number" && typeof lock.grid.y === "number") {
    x0 = Math.round((lock.grid.x - lock.x) * 1); // already in lock space at 100% scaling
    y0 = Math.round((lock.grid.y - lock.y) * 1);
  } else {
    x0 = Math.round(BARROWS_CHEST_SLOTS.startX * s);
    y0 = Math.round(BARROWS_CHEST_SLOTS.rowY * s);
  }

  const rects = [];
  for (let i = 0; i < BARROWS_CHEST_SLOTS.max; i++) rects.push({ x: x0 + i * dx, y: y0, w: icon, h: icon });
  return rects;
}
// Barrows chest scan debug
const CHEST_SCAN_DEBUG_OVERLAY = true;   // draw boxes over each scanned slot
const CHEST_SCAN_DEBUG_TABLE = true;     // console.table per-slot results
let __lastChestScanDebugAt = 0;

// Best UX: scan once per chest open, with a short timeout.
const CHEST_SCAN_TIMEOUT_MS = 3000;
const CHEST_SCAN_INTERVAL_MS = 800;

// Chest-specific matching thresholds (stricter than manual to avoid false positives)
const CHEST_ICON_MATCH_OVERRIDES = {
  acceptScore: 0.70,     // require strong match for auto chest scan
  minGap: 0.04,
  minRatio: 1.08,
  searchRadius: 30,   // allow local snap to the real icon center
};

function __mixColorSafe(r, g, b) {
  if (window.A1lib && typeof A1lib.mixColor === "function") return A1lib.mixColor(r, g, b);
  // ARGB fallback (opaque)
  return (255 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
}

function __overlayRectAbs(x, y, w, h, rgb, ms = 400) {
  if (!(window.alt1 && typeof alt1.overLayRect === "function")) return;
  const color = __mixColorSafe(rgb[0], rgb[1], rgb[2]);
  const t = 2;
  try {
    alt1.overLayRect(color, x, y, w, t, ms, 2);
    alt1.overLayRect(color, x, y + h - t, w, t, ms, 2);
    alt1.overLayRect(color, x, y, t, h, ms, 2);
    alt1.overLayRect(color, x + w - t, y, t, h, ms, 2);
  } catch (e) {}
}


let __barrowsChestLock = null;   // { x,y,w,h, scale, savedAt }
let __barrowsChestSeen = false;
let __barrowsChestLastScanKey = "";
let __barrowsChestLastScanMs = 0;
let __barrowsChestScanStartMs = 0;
let __barrowsChestScanDone = false;

function __loadBarrowsChestLock() {
  if (__barrowsChestLock) return __barrowsChestLock;
  try {
    const raw = localStorage.getItem(BARROWS_CHEST_LOCK_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.x !== "number" || typeof obj.y !== "number") return null;
    __barrowsChestLock = obj;
    return __barrowsChestLock;
  } catch (e) { return null; }
}

function __saveBarrowsChestLock(lock) {
  __barrowsChestLock = lock || null;
  try {
    if (!lock) localStorage.removeItem(BARROWS_CHEST_LOCK_KEY);
    else localStorage.setItem(BARROWS_CHEST_LOCK_KEY, JSON.stringify(lock));
  } catch (e) {}
}

function __statusChest(msg, kind="info") {
  try { showEvent("Barrows chest", msg, kind, true, true); } catch (e) {}
}

function __captureRect(x, y, w, h) {
  try {
    if (!(window.A1lib && typeof A1lib.capture === "function")) return null;
    const img = A1lib.capture(x|0, y|0, w|0, h|0);
    return __getImgProps(img);
  } catch (e) { return null; }
}


function __locateBarrowsChestFromMouse() {
  // Ultra-simple deterministic lock:
  // 1) Match the close button (offsets.png) around the mouse.
  // 2) Compute chest top-left from fixed chest geometry (100% UI scaling).
  const mp = getMousePos && getMousePos();
  if (!mp) { __statusChest("Mouse position unavailable. Try again.", "warn"); return null; }

  const scanW = 900, scanH = 420;
  const sx = Math.max(0, (mp.x - (scanW>>1))|0);
  const sy = Math.max(0, (mp.y - (scanH>>1))|0);
  const cap = __captureRect(sx, sy, scanW, scanH);
  if (!cap) { __statusChest("Capture failed. Try again.", "warn"); return null; }

  if (!__barrowsCloseT) { __statusChest("Close template not loaded yet.", "warn"); return null; }

  const tw = __barrowsCloseT.w|0;
  const th = __barrowsCloseT.h|0;
  if (tw >= cap.width || th >= cap.height) { __statusChest("Capture too small for close template.", "warn"); return null; }

  // Coarse scan
  const step = 6;
  let best = null;
  for (let y = 0; y <= cap.height - th; y += step) {
    for (let x = 0; x <= cap.width - tw; x += step) {
      const gray = __downsampleCapToGrayRect(cap, x, y, tw, th, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
      const feat = __centerAndInvStd(gray);
      const score = __znccScore(__barrowsCloseT.feat, feat);
      const eps = 0.002;
      if (!best || score > best.score + eps || (Math.abs(score - best.score) <= eps && (x < best.x || (x === best.x && y < best.y)))) {
        best = { x, y, score };
      }
    }
  }
  if (!best) { __statusChest("Unable to search capture area.", "warn"); return null; }

  // Refine locally around best for 1px accuracy
  const rx0 = Math.max(0, best.x - 10), ry0 = Math.max(0, best.y - 10);
  const rx1 = Math.min(cap.width - tw, best.x + 10);
  const ry1 = Math.min(cap.height - th, best.y + 10);
  let refined = best;
  for (let y = ry0; y <= ry1; y++) {
    for (let x = rx0; x <= rx1; x++) {
      const gray = __downsampleCapToGrayRect(cap, x, y, tw, th, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
      const feat = __centerAndInvStd(gray);
      const score = __znccScore(__barrowsCloseT.feat, feat);
      if (score > refined.score) refined = { x, y, score };
    }
  }

  if (refined.score < BARROWS_CLOSE_ACCEPT) {
    __statusChest(`Not confident enough (close score ${refined.score.toFixed(3)}). Hover the close button and try again.`, "warn");
    if (CHEST_TEST.debug) console.log("[BARROWS CHEST] close match failed best:", { ...refined, tw, th });
    return null;
  }

  const absCloseX = (sx + refined.x) | 0;
  const absCloseY = (sy + refined.y) | 0;
  // Debug: show what we anchored to (close match) and the resulting chest rect
  if (BARROWS_LOCK_DEBUG_OVERLAY || __debugChestOverlayEnabled) {
    try {
      __overlayRectAbs(absCloseX, absCloseY, tw, th, [0, 200, 255], 1200); // cyan = close anchor
    } catch (e) {}
  }

  // Close template top-left is at (chestX + (W - tw - padR), chestY + padT)
  const chestX = (absCloseX - (CHEST_TEST.chestWidth - tw - BARROWS_CLOSE_PAD_R)) | 0;
  const chestY = (absCloseY - BARROWS_CLOSE_PAD_T) | 0;

  const lock = {
    x: Math.max(0, chestX),
    y: Math.max(0, chestY),
    w: CHEST_TEST.chestWidth|0,
    h: CHEST_TEST.chestHeight|0,
    scale: 1.0,
    savedAt: Date.now()
  };
  // Pixel-find the actual first loot slot inside the locked rect (optional but improves determinism).
  lock.grid = __irb_findBarrowsSlotGrid(lock);



  if (BARROWS_LOCK_DEBUG_OVERLAY || __debugChestOverlayEnabled) {
    try {
      __overlayRectAbs(lock.x, lock.y, lock.w, lock.h, [255, 200, 0], 1200); // yellow = chest rect
// Also draw expected icon slots so you can visually confirm alignment.
const icon = BARROWS_CHEST_SLOTS.iconSz | 0;
const absGX = (lock.grid && typeof lock.grid.x === "number") ? (lock.grid.x | 0) : ((lock.x + BARROWS_CHEST_SLOTS.startX) | 0);
const absGY = (lock.grid && typeof lock.grid.y === "number") ? (lock.grid.y | 0) : ((lock.y + BARROWS_CHEST_SLOTS.rowY) | 0);
for (let i = 0; i < BARROWS_CHEST_SLOTS.max; i++) {
  const sx = (absGX + i * (BARROWS_CHEST_SLOTS.spacing | 0)) | 0;
  const sy = absGY;
  __overlayRectAbs(sx, sy, icon, icon, [255, 80, 80], 1200); // red = slot boxes
}
    } catch (e) {}
  }

  try {
    console.groupCollapsed(`[BARROWS CHEST] lock debug (close-only) score ${refined.score.toFixed(3)}`);
    console.log("close match abs:", { x: absCloseX, y: absCloseY, tw, th });
    console.log("pads:", { padR: BARROWS_CLOSE_PAD_R, padT: BARROWS_CLOSE_PAD_T, chestW: lock.w, chestH: lock.h });
    console.log("computed chest top-left:", { x: lock.x, y: lock.y });
    console.log("expected close (from chest):", {
      x: (lock.x + (lock.w - tw - BARROWS_CLOSE_PAD_R)) | 0,
      y: (lock.y + BARROWS_CLOSE_PAD_T) | 0
    });
    console.groupEnd();
  } catch (e) {}


  __saveBarrowsChestLock(lock);
  __statusChest(`Saved chest position at (${lock.x}, ${lock.y}) close score ${refined.score.toFixed(3)}`, "ok");
  if (CHEST_TEST.debug) console.log("[BARROWS CHEST] locked (close-only):", lock, "refined:", { ...refined, tw, th, absCloseX, absCloseY });

  return lock;
}


let __barrowsAutoLocateLastMs = 0;

function __validateChestTopbarAt(lock) {
  try {
    const s = __chestScale(lock);
    const topbarT = __getBarrowsTopbarTemplateScaled(s);
    if (!topbarT) return 0;

    const insetX = Math.round(CHEST_TEST.topbarInsetX * s) | 0;
    const insetY = Math.round(CHEST_TEST.topbarInsetY * s) | 0;
    const topX = (lock.x + insetX) | 0;
    const topY = (lock.y + insetY) | 0;

    const capTop = __captureRect(topX, topY, topbarT.w|0, topbarT.h|0);
    if (!capTop) return 0;

    const gray = __downsampleCapToGrayRect(capTop, 0, 0, topbarT.w|0, topbarT.h|0, CHEST_TEST.featW, CHEST_TEST.featH);
    const feat = __centerAndInvStd(gray);
    return __znccScore(topbarT.feat, feat);
  } catch (e) { return 0; }
}

function __locateBarrowsChestAuto() {
  if (!BARROWS_AUTOLOCATE.enabled) return null;
  const now = Date.now();
  if (now - __barrowsAutoLocateLastMs < BARROWS_AUTOLOCATE.cooldownMs) return null;
  __barrowsAutoLocateLastMs = now;

  if (!__barrowsCloseImgData || !__barrowsTopbarImgData) return null;

  const gf = __captureGameFrame();
  if (!gf) return null;
  const { capProps, rx, ry } = gf;

  const started = performance && performance.now ? performance.now() : Date.now();

  let best = null;

  for (const s of BARROWS_CHEST_SCALES) {
    const closeCoarse = __getBarrowsCloseTemplateScaled(s, BARROWS_CLOSE_COARSE_FEAT_W, BARROWS_CLOSE_COARSE_FEAT_H);
    if (!closeCoarse) continue;

    const tw = closeCoarse.w|0;
    const th = closeCoarse.h|0;
    if (tw <= 10 || th <= 10) continue;
    if (tw >= capProps.width || th >= capProps.height) continue;

    const stride = Math.max(8, Math.round(tw * BARROWS_AUTOLOCATE.coarseStrideFrac)) | 0;

    for (let y = 0; y <= capProps.height - th; y += stride) {
      for (let x = 0; x <= capProps.width - tw; x += stride) {
        const gray = __downsampleCapToGrayRect(capProps, x, y, tw, th, BARROWS_CLOSE_COARSE_FEAT_W, BARROWS_CLOSE_COARSE_FEAT_H);
        const feat = __centerAndInvStd(gray);
        const score = __znccScore(closeCoarse.feat, feat);

        if (!best || score > best.score) best = { x, y, score, s, tw, th };

        const elapsed = (performance && performance.now ? performance.now() : Date.now()) - started;
        if (elapsed > BARROWS_AUTOLOCATE.maxMsPerTick) break;
      }
      const elapsed = (performance && performance.now ? performance.now() : Date.now()) - started;
      if (elapsed > BARROWS_AUTOLOCATE.maxMsPerTick) break;
    }
    const elapsed = (performance && performance.now ? performance.now() : Date.now()) - started;
    if (elapsed > BARROWS_AUTOLOCATE.maxMsPerTick) break;
  }

  if (!best || best.score < BARROWS_AUTOLOCATE.accept) return null;

  // Refine around best at higher-res features
  const s = best.s;
  const closeFine = __getBarrowsCloseTemplateScaled(s, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
  if (!closeFine) return null;

  const tw = closeFine.w|0;
  const th = closeFine.h|0;

  const r0x = Math.max(0, best.x - 2 * Math.max(6, Math.round(tw*0.15)));
  const r0y = Math.max(0, best.y - 2 * Math.max(6, Math.round(th*0.15)));
  const r1x = Math.min(capProps.width - tw, best.x + 2 * Math.max(6, Math.round(tw*0.15)));
  const r1y = Math.min(capProps.height - th, best.y + 2 * Math.max(6, Math.round(th*0.15)));

  let refined = { ...best, score: -1 };

  for (let y = r0y; y <= r1y; y += 2) {
    for (let x = r0x; x <= r1x; x += 2) {
      const gray = __downsampleCapToGrayRect(capProps, x, y, tw, th, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
      const feat = __centerAndInvStd(gray);
      const score = __znccScore(closeFine.feat, feat);
      if (score > refined.score) refined = { x, y, score, s, tw, th };
    }
  }

  if (refined.score < BARROWS_AUTOLOCATE.refineAccept) return null;

  const absCloseX = (rx + refined.x) | 0;
  const absCloseY = (ry + refined.y) | 0;

  const padR = Math.round(BARROWS_CLOSE_PAD_R * s) | 0;
  const padT = Math.round(BARROWS_CLOSE_PAD_T * s) | 0;

  const chestW = Math.round(CHEST_TEST.chestWidth * s) | 0;
  const chestH = Math.round(CHEST_TEST.chestHeight * s) | 0;

  const chestX = (absCloseX - (chestW - tw - padR)) | 0;
  const chestY = (absCloseY - padT) | 0;

  const lock = {
    x: Math.max(0, chestX),
    y: Math.max(0, chestY),
    w: chestW,
    h: chestH,
    scale: s,
    savedAt: Date.now(),
  };

  const topbarScore = __validateChestTopbarAt(lock);
  if (topbarScore < BARROWS_AUTOLOCATE.validateTopbarAccept) return null;

  lock.grid = __irb_findBarrowsSlotGrid(lock);

  if (BARROWS_LOCK_DEBUG_OVERLAY || __debugChestOverlayEnabled) {
    try {
      __overlayRectAbs(absCloseX, absCloseY, tw, th, [0, 200, 255], 900);
      __overlayRectAbs(lock.x, lock.y, lock.w, lock.h, [255, 200, 0], 900);
    } catch (e) {}
  }

  return lock;
}



function __validateBarrowsChestLock(lock) {
  if (!lock || !__barrowsCloseT) return { ok:false, score:0 };

  const tw = __barrowsCloseT.w|0;
  const th = __barrowsCloseT.h|0;

  const expCloseX = (lock.x + (lock.w - tw - BARROWS_CLOSE_PAD_R)) | 0;
  if (BARROWS_LOCK_DEBUG_OVERLAY || __debugChestOverlayEnabled) {
    try {
      __overlayRectAbs(expCloseX, expCloseY, tw, th, [0, 200, 255], 400); // cyan expected close
      __overlayRectAbs(lock.x|0, lock.y|0, lock.w|0, lock.h|0, [255, 200, 0], 400); // yellow chest
    } catch (e) {}
  }

  const expCloseY = (lock.y + BARROWS_CLOSE_PAD_T) | 0;

  const cap = __captureRect(expCloseX, expCloseY, tw, th);
  if (!cap) return { ok:false, score:0 };

  const gray = __downsampleCapToGrayRect(cap, 0, 0, tw, th, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
  const feat = __centerAndInvStd(gray);
  const score = __znccScore(__barrowsCloseT.feat, feat);

  // Slightly softer threshold for validation than for initial lock
  return { ok: score >= (BARROWS_CLOSE_ACCEPT - 0.04), score };
}

// Chest scan slot occupancy + color logic
const CHEST_SLOT_OCCUPANCY = {
  featW: 16,
  featH: 16,
  // variance threshold for "icon present" (tuned for Barrows chest dark background)
  minVar: 55,
  // edge energy threshold (backup)
  minEdge: 1200,
  // score at/above which we consider a near-miss worthy of red highlight
  nearMissScore: 0.55,
};

function __isChestSlotOccupied(capProps, x, y, w, h) {
  try {
    const g = __downsampleCapToGrayRect(capProps, x, y, w, h, CHEST_SLOT_OCCUPANCY.featW, CHEST_SLOT_OCCUPANCY.featH);
    let sum = 0;
    for (let i = 0; i < g.length; i++) sum += g[i];
    const mean = sum / g.length;
    let v = 0;
    for (let i = 0; i < g.length; i++) { const d = g[i] - mean; v += d*d; }
    const varr = v / g.length;

    // simple edge energy
    let edge = 0;
    const W = CHEST_SLOT_OCCUPANCY.featW|0;
    const H = CHEST_SLOT_OCCUPANCY.featH|0;
    for (let yy = 0; yy < H; yy++) {
      const row = yy * W;
      for (let xx = 0; xx < W; xx++) {
        const p = g[row + xx];
        if (xx+1 < W) edge += Math.abs(p - g[row + xx + 1]);
        if (yy+1 < H) edge += Math.abs(p - g[row + xx + W]);
      }
    }
    return { occupied: (varr >= CHEST_SLOT_OCCUPANCY.minVar) || (edge >= CHEST_SLOT_OCCUPANCY.minEdge), varr, edge, mean };
  } catch (e) {
    return { occupied: true, varr: 0, edge: 0, mean: 0 };
  }
}


// --- Barrows Chest: box-scan (gridless) ---
// Slides an icon-sized window across the loot band and matches against the iconset.
// This avoids relying on fixed grid geometry when the chest is moved or UI scale changes.
const CHEST_BOX_SCAN = {
  enabled: true,
  // Band inside the chest window that contains loot icons (relative to chest, scale=1)
  band: { x: 8, y: 24, w: 544, h: 92 },
  step: 4,
  sizes: [32, 48],
  maxMatchAttempts: 900,
  nmsDist: 20,
  debugOverlay: false,
  debugOverlayMs: 260,
};

function __nmsByDistance(matches, distPx) {
  const kept = [];
  const d2 = distPx * distPx;
  const sorted = [...matches].sort((a, b) => (b.score - a.score));
  for (const m of sorted) {
    let ok = true;
    for (const k of kept) {
      const dx = (m.cx - k.cx);
      const dy = (m.cy - k.cy);
      if ((dx*dx + dy*dy) <= d2) { ok = false; break; }
    }
    if (ok) kept.push(m);
  }
  return kept;
}

function __scanBarrowsChestForDrops_Box(lock, cap) {
  const s = __chestScale(lock);
  const band = {
    x: Math.round(CHEST_BOX_SCAN.band.x * s),
    y: Math.round(CHEST_BOX_SCAN.band.y * s),
    w: Math.round(CHEST_BOX_SCAN.band.w * s),
    h: Math.round(CHEST_BOX_SCAN.band.h * s),
  };

  const x0 = Math.max(0, Math.min(cap.width - 1, band.x | 0));
  const y0 = Math.max(0, Math.min(cap.height - 1, band.y | 0));
  const x1 = Math.max(0, Math.min(cap.width, (band.x + band.w) | 0));
  const y1 = Math.max(0, Math.min(cap.height, (band.y + band.h) | 0));

  const step = Math.max(1, Math.round(CHEST_BOX_SCAN.step * s)) | 0;

  const raw = [];
  let attempts = 0;

  for (const size0 of CHEST_BOX_SCAN.sizes) {
    const iconSz = Math.max(18, Math.round(size0 * s)) | 0;
    if (iconSz >= cap.width || iconSz >= cap.height) continue;

    for (let yy = y0; yy <= (y1 - iconSz); yy += step) {
      for (let xx = x0; xx <= (x1 - iconSz); xx += step) {
        const occ = __isChestSlotOccupied(cap, xx, yy, iconSz, iconSz);
        if (!occ || !occ.occupied) continue;

        attempts++;
        if (attempts > CHEST_BOX_SCAN.maxMatchAttempts) break;

        const selection = { capProps: cap, rect: { x: xx, y: yy, w: iconSz, h: iconSz } };
        const best = matchIconFromSelection(selection, __iconTemplates);
        if (!best || !best.accepted) continue;
        if (!validateDropName(best.name)) continue;

        const dx = (typeof best.dx === "number" ? best.dx : 0) | 0;
        const dy = (typeof best.dy === "number" ? best.dy : 0) | 0;
        const ax = (xx + dx) | 0;
        const ay = (yy + dy) | 0;
        const cx = (ax + (iconSz >> 1)) | 0;
        const cy = (ay + (iconSz >> 1)) | 0;

        raw.push({ name: best.name, score: best.score, ax, ay, iconSz, cx, cy });
      }
      if (attempts > CHEST_BOX_SCAN.maxMatchAttempts) break;
    }
    if (attempts > CHEST_BOX_SCAN.maxMatchAttempts) break;
  }

  const clustered = __nmsByDistance(raw, Math.round(CHEST_BOX_SCAN.nmsDist * s));
  const byName = new Map();
  for (const m of clustered) {
    const prev = byName.get(m.name);
    if (!prev || m.score > prev.score) byName.set(m.name, m);
  }
  const final = [...byName.values()].sort((a, b) => b.score - a.score);

  if (__debugChestOverlayEnabled && final.length) {
    for (const m of final) {
      __overlayRectAbs((lock.x + m.ax) | 0, (lock.y + m.ay) | 0, m.iconSz, m.iconSz, [0, 220, 0], CHEST_BOX_SCAN.debugOverlayMs);
    }
  }

  return final.map(m => ({ name: m.name, score: m.score }));
}

function __scanBarrowsChestForDrops(lock) {
  if (!lock) return [];
  if (!__iconTemplates) {
    // Kick off async load; scan will run on next tick once templates are available.
    try { ensureIconTemplatesLoaded(); } catch (e) {}
    return [];
  }

  const cap = __captureRect(lock.x, lock.y, lock.w, lock.h);
  if (!cap) return [];

  // Temporarily tighten thresholds for chest scanning (do not affect manual mode)
  const __savedIconMatch = { ...ICON_MATCH };
  try {
    ICON_MATCH.acceptScore = CHEST_ICON_MATCH_OVERRIDES.acceptScore;
    ICON_MATCH.minGap = CHEST_ICON_MATCH_OVERRIDES.minGap;
    ICON_MATCH.minRatio = CHEST_ICON_MATCH_OVERRIDES.minRatio;
    ICON_MATCH.searchRadius = CHEST_ICON_MATCH_OVERRIDES.searchRadius;
  } catch (e) {}

  try {
    if (CHEST_BOX_SCAN.enabled) {
      return __scanBarrowsChestForDrops_Box(lock, cap);
    }

    // Fallback: grid slots (legacy)
    const hits = [];
    const slots = __barrowsSlotRects(lock);

    for (let i = 0; i < slots.length; i++) {
      const x = slots[i].x | 0;
      const y = slots[i].y | 0;
      const iconSz = slots[i].w | 0;

      if (x < 0 || y < 0 || (x + iconSz) > cap.width || (y + iconSz) > cap.height) continue;

      const occ = __isChestSlotOccupied(cap, x, y, iconSz, iconSz);
      if (!occ || !occ.occupied) continue;

      const selection = { capProps: cap, rect: { x, y, w: iconSz, h: iconSz } };
      const best = matchIconFromSelection(selection, __iconTemplates);
      if (!best || !best.accepted) continue;
      if (!validateDropName(best.name)) continue;

      hits.push({ name: best.name, score: best.score });
    }

    const seen = new Set();
    return hits.filter(h => (seen.has(h.name) ? false : (seen.add(h.name), true)));
  } finally {
    try { Object.assign(ICON_MATCH, __savedIconMatch); } catch (e) {}
  }
}


    // Record per-slot debug even if not accepted
    if (CHEST_SCAN_DEBUG_TABLE) {
      rows.push({
        slot: i,
        occupied: !!occ.occupied,
        var: Number((occ.varr ?? 0).toFixed(1)),
        edge: Number((occ.edge ?? 0).toFixed(0)),
        best: best ? best.name : "",
        score: best ? Number(best.score.toFixed(4)) : 0,
        accepted: !!(best && best.accepted),
        isBarrows: !!(best && best.accepted && validateDropName(best.name)),
        nearMiss: !!(occ.occupied && best && !(best.accepted && validateDropName(best.name)) && best.score >= CHEST_SLOT_OCCUPANCY.nearMissScore),
        gap: best ? Number((best.gap ?? 0).toFixed(4)) : 0,
        ratio: best ? Number((best.ratio ?? 0).toFixed(4)) : 0,
        dx: best ? (best.dx|0) : 0,
        dy: best ? (best.dy|0) : 0,
      });
    }

    if (!best || !best.accepted) continue;

    // Only include actual Barrows list drops (validateDropName handles allowlist)
    if (!validateDropName(best.name)) continue;
    hits.push({ name: best.name, score: best.score });
  }

  // Console proof: print one table per ~1s to avoid spam
  if (CHEST_SCAN_DEBUG_TABLE) {
    const now = Date.now();
    if ((now - __lastChestScanDebugAt) > 900) {
      __lastChestScanDebugAt = now;
      try {
        console.group("[CHEST SCAN] slot results");
        console.table(rows);
        console.groupEnd();
      } catch (e) {}
    }
  }

  // De-dupe same icon detected multiple slots (rare but possible with noise)
  const seen = new Set();
  const uniq = [];
  for (const h of hits) {
    if (seen.has(h.name)) continue;
    seen.add(h.name);
    uniq.push(h);
  }
  // Restore ICON_MATCH to avoid affecting manual submit
  try { Object.assign(ICON_MATCH, __savedIconMatch); } catch (e) {}

  return uniq;
}

function __formatBarrowsHits(hits) {
  if (!hits || !hits.length) return "No valid Barrows drops detected!";
  return "Found: " + hits.map(h => h.name).join(", ");
}


let __barrowsTopbarT = null;          // { w,h, feat }
let __barrowsTopbarTLoading = null;

__validateBarrowsChestLock(lock) {
  if (!lock) return { ok:false, score:0, topbar:0 };
  const s = __chestScale(lock);

  const closeT = __getBarrowsCloseTemplateScaled(s, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
  if (!closeT) return { ok:false, score:0, topbar:0 };

  const tw = closeT.w | 0;
  const th = closeT.h | 0;

  const padR = Math.round(BARROWS_CLOSE_PAD_R * s) | 0;
  const padT = Math.round(BARROWS_CLOSE_PAD_T * s) | 0;

  const expCloseX = (lock.x + (lock.w - tw - padR)) | 0;
  const expCloseY = (lock.y + padT) | 0;

  if (BARROWS_LOCK_DEBUG_OVERLAY || __debugChestOverlayEnabled) {
    try {
      __overlayRectAbs(expCloseX, expCloseY, tw, th, [0, 200, 255], 220); // cyan expected close
      __overlayRectAbs(lock.x|0, lock.y|0, lock.w|0, lock.h|0, [255, 200, 0], 220); // yellow chest
    } catch (e) {}
  }

  const capClose = __captureRect(expCloseX, expCloseY, tw, th);
  if (!capClose) return { ok:false, score:0, topbar:0 };

  const grayClose = __downsampleCapToGrayRect(capClose, 0, 0, tw, th, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
  const featClose = __centerAndInvStd(grayClose);
  const closeScore = __znccScore(closeT.feat, featClose);

  if (closeScore < (BARROWS_CLOSE_ACCEPT - 0.05)) return { ok:false, score:closeScore, topbar:0 };

  // Optional: validate topbar to reduce false positives when scanning full-screen
  const topbarT = __getBarrowsTopbarTemplateScaled(s);
  if (!topbarT) return { ok:true, score:closeScore, topbar:0 };

  const insetX = Math.round(CHEST_TEST.topbarInsetX * s) | 0;
  const insetY = Math.round(CHEST_TEST.topbarInsetY * s) | 0;

  const topX = (lock.x + insetX) | 0;
  const topY = (lock.y + insetY) | 0;

  const capTop = __captureRect(topX, topY, topbarT.w|0, topbarT.h|0);
  if (!capTop) return { ok:true, score:closeScore, topbar:0 };

  const grayTop = __downsampleCapToGrayRect(capTop, 0, 0, topbarT.w|0, topbarT.h|0, CHEST_TEST.featW, CHEST_TEST.featH);
  const featTop = __centerAndInvStd(grayTop);
  const topbarScore = __znccScore(topbarT.feat, featTop);

  return { ok: topbarScore >= (BARROWS_AUTOLOCATE.validateTopbarAccept - 0.03), score: closeScore, topbar: topbarScore };
}


let __barrowsCloseImgData = null;     // ImageData for base template
const __barrowsCloseCache = new Map(); // key: `${scale}|${featW}x${featH}` -> { w,h, feat }

let __barrowsTopbarImgData = null;    // ImageData for base topbar
const __barrowsTopbarCache = new Map(); // key: `${scale}` -> { w,h, feat }

let __lastChestTestMs = 0;
let __lastChestSeenMs = 0;
let __lastChestRect = null;

async function ensureBarrowsTopbarTemplateLoaded() {
  if (__barrowsTopbarT) return __barrowsTopbarT;
  if (__barrowsTopbarTLoading) return __barrowsTopbarTLoading;

  __barrowsTopbarTLoading = (async () => {
    const img = await __loadImageToCanvasImageData(BARROWS_TOPBAR_URL);
    console.log("[topbar] loaded template:",
  img ? img.width : null,
  img ? img.height : null,
  BARROWS_TOPBAR_URL
);
    if (!img) throw new Error("Failed to load barrows_topbar.png");
    const featGray = __downsampleImageDataToGrayRect(img, 0, 0, img.width, img.height, CHEST_TEST.featW, CHEST_TEST.featH);
    const feat = __centerAndInvStd(featGray);
    __barrowsTopbarImgData = img;
    __barrowsTopbarT = { w: img.width, h: img.height, feat };
    return __barrowsTopbarT;
  })().finally(() => { __barrowsTopbarTLoading = null; });

  return __barrowsTopbarTLoading;
}


async function ensureBarrowsCloseTemplateLoaded() {
  if (__barrowsCloseT) return __barrowsCloseT;
  if (__barrowsCloseTLoading) return __barrowsCloseTLoading;

  __barrowsCloseTLoading = (async () => {
    const img = await __loadImageToCanvasImageData(BARROWS_CLOSE_URL);
    if (!img) throw new Error("Failed to load offsets.png");
    const featGray = __downsampleImageDataToGrayRect(img, 0, 0, img.width, img.height, BARROWS_CLOSE_FEAT_W, BARROWS_CLOSE_FEAT_H);
    const feat = __centerAndInvStd(featGray);
    __barrowsCloseImgData = img;
    __barrowsCloseCache.clear();
    __barrowsCloseT = { w: img.width, h: img.height, feat };
    console.log(`[barrows-close] template loaded: ${img.width}x${img.height} ${BARROWS_CLOSE_URL}`);
    return __barrowsCloseT;
  })().finally(() => { __barrowsCloseTLoading = null; });

  return __barrowsCloseTLoading;
}

async function __loadImageToCanvasImageData(url) {
  return new Promise((resolve) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth || im.width;
        c.height = im.naturalHeight || im.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(im, 0, 0);
        const id = ctx.getImageData(0, 0, c.width, c.height);
        resolve(id);
      } catch (e) { resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = url;
  });
}

function __downsampleImageDataToGrayRect(imgData, sx, sy, sw, sh, outW, outH) {
  // Returns Uint8Array length outW*outH (0..255)
  const out = new Uint8Array((outW | 0) * (outH | 0));
  const src = imgData.data;
  const W = imgData.width | 0;
  const H = imgData.height | 0;

  const x0 = sx | 0, y0 = sy | 0, w0 = sw | 0, h0 = sh | 0;
  for (let oy = 0; oy < outH; oy++) {
    const fy = (oy + 0.5) / outH;
    const y = (y0 + fy * h0) | 0;
    const yy = (y < 0 ? 0 : (y >= H ? H - 1 : y));
    for (let ox = 0; ox < outW; ox++) {
      const fx = (ox + 0.5) / outW;
      const x = (x0 + fx * w0) | 0;
      const xx = (x < 0 ? 0 : (x >= W ? W - 1 : x));
      const i = (yy * W + xx) * 4;
      const r = src[i] | 0, g = src[i + 1] | 0, b = src[i + 2] | 0;
      out[oy * outW + ox] = (r * 3 + g * 6 + b) / 10;
    }
  }
  return out;
}

function __downsampleCapToGrayRect(capProps, sx, sy, sw, sh, outW, outH) {
  // capProps is from __getImgProps (data is RGBA)
  const out = new Uint8Array((outW | 0) * (outH | 0));
  const src = capProps.data;
  const W = capProps.width | 0;
  const H = capProps.height | 0;

  const x0 = sx | 0, y0 = sy | 0, w0 = sw | 0, h0 = sh | 0;
  for (let oy = 0; oy < outH; oy++) {
    const fy = (oy + 0.5) / outH;
    const y = (y0 + fy * h0) | 0;
    const yy = (y < 0 ? 0 : (y >= H ? H - 1 : y));
    for (let ox = 0; ox < outW; ox++) {
      const fx = (ox + 0.5) / outW;
      const x = (x0 + fx * w0) | 0;
      const xx = (x < 0 ? 0 : (x >= W ? W - 1 : x));
      const i = (yy * W + xx) * 4;
      const r = src[i] | 0, g = src[i + 1] | 0, b = src[i + 2] | 0;
      out[oy * outW + ox] = (r * 3 + g * 6 + b) / 10;
    }
  }
  return out;
}

// --- compat shim: some modules expect __downsampleToGray16(...) ---
function __downsampleToGray16(capProps, sx, sy, sw, sh, outSz) {
  // Wrapper around __downsampleCapToGrayRect; returns Uint8Array(outSz*outSz)
  return __downsampleCapToGrayRect(capProps, sx, sy, sw, sh, outSz, outSz);
}


function __whitenGray(gray, size) {
  // Simple local-contrast whitening to reduce UI background influence.
  // Returns a Uint8Array of same length as input (size*size).
  const n = gray.length | 0;
  const out = new Uint8Array(n);
  const w = size | 0;

  // 3x3 box blur high-pass: out = clamp(gray - blur + 128)
  for (let y = 0; y < w; y++) {
    const y0 = (y - 1 < 0 ? 0 : y - 1);
    const y1 = y;
    const y2 = (y + 1 >= w ? w - 1 : y + 1);
    for (let x = 0; x < w; x++) {
      const x0 = (x - 1 < 0 ? 0 : x - 1);
      const x1 = x;
      const x2 = (x + 1 >= w ? w - 1 : x + 1);

      let sum = 0;
      sum += gray[y0 * w + x0]; sum += gray[y0 * w + x1]; sum += gray[y0 * w + x2];
      sum += gray[y1 * w + x0]; sum += gray[y1 * w + x1]; sum += gray[y1 * w + x2];
      sum += gray[y2 * w + x0]; sum += gray[y2 * w + x1]; sum += gray[y2 * w + x2];

      const blur = (sum / 9) | 0;
      const v = (gray[y * w + x] | 0) - blur + 128;
      out[y * w + x] = (v < 0 ? 0 : (v > 255 ? 255 : v));
    }
  }
  return out;
}


function __edgeMag(gray, size) {
  // Sobel magnitude on grayscale Uint8Array(size*size). Returns Uint8Array(size*size).
  const w = size | 0;
  const n = gray.length | 0;
  const out = new Uint8Array(n);

  for (let y = 0; y < w; y++) {
    const y0 = (y - 1 < 0 ? 0 : y - 1);
    const y2 = (y + 1 >= w ? w - 1 : y + 1);
    for (let x = 0; x < w; x++) {
      const x0 = (x - 1 < 0 ? 0 : x - 1);
      const x2 = (x + 1 >= w ? w - 1 : x + 1);

      const a00 = gray[y0 * w + x0] | 0, a01 = gray[y0 * w + x] | 0, a02 = gray[y0 * w + x2] | 0;
      const a10 = gray[y  * w + x0] | 0, /*a11*/             a12 = gray[y  * w + x2] | 0;
      const a20 = gray[y2 * w + x0] | 0, a21 = gray[y2 * w + x] | 0, a22 = gray[y2 * w + x2] | 0;

      const gx = (-a00 + a02) + (-2 * a10 + 2 * a12) + (-a20 + a22);
      const gy = (-a00 - 2 * a01 - a02) + (a20 + 2 * a21 + a22);
      const mag = Math.min(255, (Math.abs(gx) + Math.abs(gy)) >> 1);
      out[y * w + x] = mag;
    }
  }
  return out;
}

function __computeTemplateAmbiguity(templates) {
  // Compute nearest-neighbor similarity for each template. Used by adaptive thresholds.
  if (!templates || templates.length < 2) return;
  for (let i = 0; i < templates.length; i++) {
    const ti = templates[i];
    let best = -1;
    if (!ti || !ti._feat) { ti._nnScore = null; continue; }
    for (let j = 0; j < templates.length; j++) {
      if (i === j) continue;
      const tj = templates[j];
      if (!tj || !tj._feat) continue;
      const s = __znccScore(ti._feat, tj._feat);
      if (s > best) best = s;
    }
    ti._nnScore = (best >= 0 ? best : null);
  }
}



function __detectBarrowsChestTopbarInCapture(cap, topT) {
  // Returns { score, x, y } in capture-local coords, or null.
  const capProps = cap.capProps;
  const tW = topT.w | 0, tH = topT.h | 0;
  if (capProps.width < tW || capProps.height < tH) return null;

  const outW = CHEST_TEST.featW | 0;
  const outH = CHEST_TEST.featH | 0;

  let best = null;

  const maxX = (capProps.width - tW) | 0;
  const maxY = (capProps.height - tH) | 0;

  // Coarse pass
  for (let y = 0; y <= maxY; y += CHEST_TEST.coarseStepY) {
    for (let x = 0; x <= maxX; x += CHEST_TEST.coarseStepX) {
      const gray = __downsampleCapToGrayRect(capProps, x, y, tW, tH, outW, outH);
      const feat = __centerAndInvStd(gray);
      const score = __znccScore(topT.feat, feat);
      if (!best || score > best.score) best = { score, x, y };
    }
  }

  if (!best) return null;

  // Refine around best
  let rb = best;
  const rr = CHEST_TEST.refineRadius | 0;
  for (let dy = -rr; dy <= rr; dy += CHEST_TEST.refineStep) {
    const y = rb.y + dy;
    if (y < 0 || y > maxY) continue;
    for (let dx = -rr; dx <= rr; dx += CHEST_TEST.refineStep) {
      const x = rb.x + dx;
      if (x < 0 || x > maxX) continue;
      const gray = __downsampleCapToGrayRect(capProps, x, y, tW, tH, outW, outH);
      const feat = __centerAndInvStd(gray);
      const score = __znccScore(topT.feat, feat);
      if (score > rb.score) rb = { score, x, y };
    }
  }

  return rb;
}

// --- Barrows chest detector (TEST TOOL) ---
// Global one-time scan + cache + lightweight validation (no mouse dependency).
let __barrowsChestCache = null; // { x,y,w,h, score, lastSeenMs }
let __lastChestScanMs = 0;
let __lastChestValidateMs = 0;

function __captureFullRs() {
  if (!(window.A1lib && typeof A1lib.capture === "function")) return null;
  if (!window.alt1 || !alt1.permissionPixel) return null;

  // Prefer rsX/rsY/rsWidth/rsHeight if available; fall back to 0,0 + rs dimensions.
  const rx = (typeof alt1.rsX === "number" ? alt1.rsX : 0) | 0;
  const ry = (typeof alt1.rsY === "number" ? alt1.rsY : 0) | 0;
  const rw = (typeof alt1.rsWidth === "number" ? alt1.rsWidth : (typeof alt1.width === "number" ? alt1.width : 0)) | 0;
  const rh = (typeof alt1.rsHeight === "number" ? alt1.rsHeight : (typeof alt1.height === "number" ? alt1.height : 0)) | 0;

  if (rw <= 0 || rh <= 0) return null;

  let capImg = null;
  try { capImg = A1lib.capture(rx, ry, rw, rh); } catch (e) {}
  if (!capImg) return null;

  const capProps = __getImgProps(capImg);
  if (!capProps) return null;

  return { capImg, capProps, rx, ry };
}

function __captureRegion(rx, ry, rw, rh) {
  if (!(window.A1lib && typeof A1lib.capture === "function")) return null;
  if (!window.alt1 || !alt1.permissionPixel) return null;
  if (rw <= 0 || rh <= 0) return null;

  let capImg = null;
  try { capImg = A1lib.capture(rx | 0, ry | 0, rw | 0, rh | 0); } catch (e) {}
  if (!capImg) return null;

  const capProps = __getImgProps(capImg);
  if (!capProps) return null;

  return { capImg, capProps, rx: rx | 0, ry: ry | 0 };
}

function __loadChestCacheFromLocalStorage() {
  try {
    const raw = localStorage.getItem("irb_barrowsChestRect");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.x !== "number" || typeof obj.y !== "number" || typeof obj.w !== "number" || typeof obj.h !== "number") return null;
    return { x: obj.x | 0, y: obj.y | 0, w: obj.w | 0, h: obj.h | 0, score: +obj.score || 0, lastSeenMs: Date.now() };
  } catch (e) {
    return null;
  }
}

function __saveChestCacheToLocalStorage(cache) {
  try {
    if (!cache) { localStorage.removeItem("irb_barrowsChestRect"); return; }
    localStorage.setItem("irb_barrowsChestRect", JSON.stringify({ x: cache.x, y: cache.y, w: cache.w, h: cache.h, score: cache.score }));
  } catch (e) {}
}

function __validateChestCache(cache, topT) {
  // Validate by matching the topbar template at the expected inset location (no scanning).
  // Returns { ok:boolean, score:number }
  const insetX = CHEST_TEST.topbarInsetX | 0;
  const insetY = CHEST_TEST.topbarInsetY | 0;

  const rx = (cache.x + insetX) | 0;
  const ry = (cache.y + insetY) | 0;
  const rw = topT.w | 0;
  const rh = topT.h | 0;

  const cap = __captureRegion(rx, ry, rw, rh);
  if (!cap) return { ok: false, score: 0 };

  const gray = __downsampleCapToGrayRect(cap.capProps, 0, 0, rw, rh, CHEST_TEST.featW | 0, CHEST_TEST.featH | 0);
  const feat = __centerAndInvStd(gray);
  const score = __znccScore(topT.feat, feat);

  // Slightly lower threshold for validation to avoid flicker due to capture noise.
  const ok = score >= Math.max(0.70, (CHEST_TEST.acceptScore - 0.06));
  return { ok, score };
}

function __detectChestGlobalOnce() {
  // One-time global scan of the full RS viewport.
  const cap = __captureFullRs();
  if (!cap) return null;

  const hit = __detectBarrowsChestTopbarInCapture(cap, __barrowsTopbarT);
  if (!hit || !(hit.score >= CHEST_TEST.acceptScore)) return null;

  // Convert capture-local to screen coords and expand to full chest rect.
  const chestLeft = (cap.rx + hit.x - (CHEST_TEST.topbarInsetX | 0)) | 0;
  const chestTop  = (cap.ry + hit.y - (CHEST_TEST.topbarInsetY | 0)) | 0;
  const chestW    = (CHEST_TEST.chestWidth | 0);
  const chestH    = (CHEST_TEST.chestHeight | 0);

  return { x: chestLeft, y: chestTop, w: chestW, h: chestH, score: hit.score, lastSeenMs: Date.now() };
}

function __drawChestRect(cache, good) {
  try {
    if (!cache) return;
    const col = good ? [0, 255, 0] : [255, 180, 0];
    // Uses overlay canvas helper already in file.
    tryOverlayRect({ x: cache.x, y: cache.y, w: cache.w, h: cache.h }, true);
  } catch (e) {}
}


function __forceBarrowsChestScanNow() {
  // Alt+1 when chest is already located: run a single scan immediately and report results.
  __loadBarrowsChestLock();
  if (!__barrowsChestLock) {
    __statusChest("No chest position saved. Hover the chest window and press Alt+1 to locate.", "warn");
    return;
  }
  const v = __validateBarrowsChestLock(__barrowsChestLock);
  if (!v.ok) {
    __statusChest("Saved chest not present. Open the Barrows chest and press Alt+1 to re-locate.", "warn");
    return;
  }
  const hits = __scanBarrowsChestForDrops(__barrowsChestLock);
  __barrowsChestLastScanKey = hits.map(h=>h.name).sort().join("|");
  const msg = __formatBarrowsHits(hits);
  __statusChest(msg, hits.length ? "ok" : "warn");
  if (CHEST_TEST.debug) {
    try { console.log("[BARROWS CHEST] manual scan hits:", hits); } catch (e) {}
  }
}

async function __chestTestTick() {
if (!CHEST_TEST.enabled) return;
if (!__barrowsTopbarT) return; // not loaded yet

// Load cached lock once per session
__loadBarrowsChestLock();

const now = Date.now();

// If no lock yet, try auto-locate (full-screen)
if (!__barrowsChestLock) {
  const auto = __locateBarrowsChestAuto();
  if (auto) {
    __saveBarrowsChestLock(auto);
    __statusChest("Chest lock acquired (auto).", "ok");
  } else {
    return;
  }
}

// Validate cached lock; if invalid, try to re-acquire (chest can be moved)
let v = __validateBarrowsChestLock(__barrowsChestLock);
if (!v.ok) {
  const auto = __locateBarrowsChestAuto();
  if (auto) {
    __saveBarrowsChestLock(auto);
    v = __validateBarrowsChestLock(__barrowsChestLock);
  }
}
if (!v.ok) {
  if (__barrowsChestSeen) {
    __barrowsChestSeen = false;
    __barrowsChestLastScanKey = "";
    __barrowsChestScanDone = false;
    __statusChest("Chest not present.", "info");
  }
  return;
}

// Chest present
if (!__barrowsChestSeen) {
  __barrowsChestSeen = true;
  __barrowsChestScanStartMs = now;
  __barrowsChestScanDone = false;
  __barrowsChestLastScanKey = "";
  __statusChest(`Chest detected (score ${v.score.toFixed(3)}). Scanning...`, "ok");
}

// If we already finished scanning this chest-open (either found drops or timed out), do nothing until chest closes.
if (__barrowsChestScanDone) return;

// Throttle scans to avoid spam / heavy CPU
if (now - __barrowsChestLastScanMs < CHEST_SCAN_INTERVAL_MS) return;
__barrowsChestLastScanMs = now;

const hits = __scanBarrowsChestForDrops(__barrowsChestLock);
const key = hits.map(h=>h.name).sort().join("|");

// If we found any valid Barrows items, report once and stop scanning until chest closes.
if (hits.length) {
  __barrowsChestLastScanKey = key;

  // Always show what we found
  __statusChest(__formatBarrowsHits(hits), "ok");
  if (CHEST_TEST.debug) console.log("[BARROWS CHEST] hits:", hits);

  // Only submit if setup is ready (IGN + Bingo/Team locked)
  try {
    if (!isSetupReady || !isSetupReady()) {
      __statusChest("Setup not ready — detected but not submitted.", "warn");
      __barrowsChestScanDone = true;
      return;
    }
  } catch (e) {
    __statusChest("Setup check failed — detected but not submitted.", "warn");
    __barrowsChestScanDone = true;
    return;
  }

  // Submit each detected Barrows item (qty 1)
  for (const h of hits) {
    const vName = validateDropName(h.name);
    const canonical = (vName && vName.valid && vName.canonical) ? vName.canonical : h.name;

    // De-dupe with the same recent-key mechanism used elsewhere, when available
    try {
      const k = String(canonical).toLowerCase().trim() + "||1";
      if (typeof seenRecently === "function" && seenRecently(k, 8000)) continue;
    } catch (e) {}

    try {
      await submitDrop({ drop_name: canonical, amount: "1" });
      addFeed(`Submitted ✅ ${canonical} x1`, "ok");
    } catch (e) {
      addFeed(`Submit failed ❌ (${canonical}): ${e.message}`, "bad");
    }
  }

  __barrowsChestScanDone = true;
  return;
}

// No hits yet — if timeout reached, report once and stop scanning until chest closes.
if ((now - __barrowsChestScanStartMs) >= CHEST_SCAN_TIMEOUT_MS) {
  __barrowsChestLastScanKey = "";
  __statusChest("No valid Barrows drops detected!", "warn");
  __barrowsChestScanDone = true;
  return;
}

// Otherwise: keep scanning quietly (but update status text occasionally if desired)

}

function __adaptiveThresholds(bestName) {
  const baseAcc = (ICON_MATCH.acceptScore == null ? 0.20 : ICON_MATCH.acceptScore);
  const baseGap = (ICON_MATCH.minGap == null ? 0.0 : ICON_MATCH.minGap);
  const baseRatio = (ICON_MATCH.minRatio == null ? 1.0 : ICON_MATCH.minRatio);

  if (!ICON_MATCH.adaptive || !__templateByName || !bestName) {
    return { accept: baseAcc, minGap: baseGap, minRatio: baseRatio, nn: null, boost: 0 };
  }
  const t = __templateByName.get(String(bestName));
  const nn = (t && typeof t._nnScore === "number") ? t._nnScore : null;
  if (nn == null || !isFinite(nn)) return { accept: baseAcc, minGap: baseGap, minRatio: baseRatio, nn: null, boost: 0 };

  // Ambiguity model:
  // nn is the *most similar other template* (ZNCC 0..1). High nn => ambiguous icon.
  // IMPORTANT: to avoid misses, we mostly tighten separation (gap/ratio), not the raw acceptScore.
  const x = Math.max(0, nn - 0.96);            // only start tightening when templates are extremely similar
  const accBoost = Math.min(0.03, x * 0.6);    // tiny accept boost at most (+0.03)
  const gapBoost = Math.min(0.05, x * 1.6);    // stronger gap requirement for ambiguous icons
  const ratioBoost = Math.min(0.10, x * 3.0);  // stronger ratio requirement for ambiguous icons

  return {
    accept: baseAcc + accBoost,
    minGap: baseGap + gapBoost,
    minRatio: baseRatio + ratioBoost,
    nn,
    boost: accBoost
  };
}


function __debugGrayToDataURL(gray, size) {
  // gray: Uint8Array length size*size
  try {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(size, size);
    const d = img.data;
    let k = 0;
    for (let i = 0; i < gray.length; i++) {
      const v = gray[i] | 0;
      d[k++] = v;
      d[k++] = v;
      d[k++] = v;
      d[k++] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  } catch (e) {
    return null;
  }
}

  function __centerAndInvStd(gray) {
    // Returns { centered:Int16Array, invStd:number } with std computed over centered values.
    const n = gray.length | 0;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += gray[i];
    const mean = sum / n;

    const centered = new Int16Array(n);
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const v = (gray[i] - mean);
      const iv = v | 0;
      centered[i] = iv;
      ss += v * v;
    }
    // Avoid div-by-zero on flat images.
    const std = Math.sqrt(ss) || 1e-9;
    return { centered, invStd: 1 / std };
  }

  function __znccScore(templateFeat, candFeat) {
    const a = templateFeat.centered;
    const b = candFeat.centered;
    let dot = 0;
    // 256-length; keep as number (safe)
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot * templateFeat.invStd * candFeat.invStd;
  }

  function __buildTemplateFeatures(templates) {
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      if (t && !t._feat) {
        const props = __getImgProps(t.img);
        if (!props) continue;

        const grayRaw = __downsampleToGray16(props, 0, 0, props.width, props.height, ICON_MATCH.sampleSize);
        const gray = (ICON_MATCH.whiten === false) ? grayRaw : __whitenGray(grayRaw, ICON_MATCH.sampleSize);
        t._feat = __centerAndInvStd(gray);

        if (ICON_MATCH.useEdges) {
          const edges = __edgeMag(gray, ICON_MATCH.sampleSize);
          t._featEdge = __centerAndInvStd(edges);
        }
      }
    }
    __computeTemplateAmbiguity(templates);
    return templates;
  }

  function findBestIconMatch(captureImg, templates) {
    if (!templates || !templates.length || !captureImg) return null;

    const cap = __getImgProps(captureImg);
    if (!cap) return null;

    __buildTemplateFeatures(templates);

    const iconSz = ICON_MATCH.iconSize;
    const outSz = ICON_MATCH.sampleSize;

    // Search a small window around capture center.
    const cx = (cap.width >> 1) - (iconSz >> 1);
    const cy = (cap.height >> 1) - (iconSz >> 1);

    const r = ICON_MATCH.searchRadius | 0;
    const step = ICON_MATCH.step | 0;

    let best = null;

    const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));

    for (let dy = -r; dy <= r; dy += step) {
      const y = clamp(cy + dy, 0, cap.height - iconSz);
      for (let dx = -r; dx <= r; dx += step) {
        const x = clamp(cx + dx, 0, cap.width - iconSz);

        const gray = __downsampleToGray16(cap, x, y, iconSz, iconSz, outSz);
        const candFeat = __centerAndInvStd(gray);

        // Compare against all templates (small N). Track best.
        for (let i = 0; i < templates.length; i++) {
          const t = templates[i];
          if (!t || !t._feat) continue;

          const score = __znccScore(t._feat, candFeat);

          if (!best || score > best.score) {
            best = { name: t.name, size: t.size, x, y, score };
            // Early accept if extremely strong match.
            if (score >= 0.985) return best;
          }
        }
      }
    }

    if (best && best.score >= ICON_MATCH.acceptScore) return best;
    return null;
  }


// -------- Manual submit selection overlay (required every Alt+1) --------
// We deliberately require the user to draw a box around the icon every time.
// This removes ambiguity around capture offsets / UI scaling and makes matching stable.
function __createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "irbSelectOverlay";
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.background = "rgba(0,0,0,0.35)";
  overlay.style.cursor = "crosshair";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.boxShadow = "0 8px 30px rgba(0,0,0,0.6)";
  wrap.style.border = "1px solid rgba(255,255,255,0.15)";
  wrap.style.background = "rgba(0,0,0,0.35)";

  const canvas = document.createElement("canvas");
  canvas.id = "irbSelectCanvas";
  canvas.style.display = "block";

  const label = document.createElement("div");
  label.style.position = "absolute";
  label.style.left = "0";
  label.style.top = "0";
  label.style.right = "0";
  label.style.padding = "8px 10px";
  label.style.font = "12px/1.2 sans-serif";
  label.style.color = "rgba(255,255,255,0.92)";
  label.style.background = "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0))";
  label.textContent = "Drag a box tightly around the item icon (Esc to cancel)";

  wrap.appendChild(canvas);
  wrap.appendChild(label);
  overlay.appendChild(wrap);

  document.body.appendChild(overlay);
  return { overlay, canvas, wrap };
}

function __drawSelection(ctx, x0, y0, x1, y1) {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  // Darken outside selection
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.clearRect(x, y, w, h);
  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
  ctx.restore();
}

async function __selectIconRegionAroundMouse(captureSize) {
  if (!(window.A1lib && typeof A1lib.capture === "function")) return null;
  const pos = getMousePos();
  const mx = pos ? pos.x : 0;
  const my = pos ? pos.y : 0;
  const capW = captureSize | 0, capH = captureSize | 0;
  const rx = Math.max(0, mx - (capW >> 1));
  const ry = Math.max(0, my - (capH >> 1));

  let capImg = null;
  try { capImg = A1lib.capture(rx, ry, capW, capH); } catch (e) {}
  if (!capImg) return null;

  const cap = __getImgProps(capImg);
  if (!cap) return null;

  const { overlay, canvas } = __createOverlay();
  canvas.width = cap.width;
  canvas.height = cap.height;
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });

  // Render capture to canvas
  const idata = new ImageData(new Uint8ClampedArray(cap.data), cap.width, cap.height);
  ctx.putImageData(idata, 0, 0);

  let start = null;
  let end = null;
  let done = false;

  function cleanup() {
    if (done) return;
    done = true;
    try { overlay.remove(); } catch (e) {}
    window.removeEventListener("keydown", onKey, true);
  }

  let resolve;

function onKey(ev) {
  if (ev.key === "Escape") {
    cleanup();
    if (resolve) resolve(null);
  }
}

window.addEventListener("keydown", onKey, true);

  const prom = new Promise((r) => { resolve = r; });

  const baseImage = ctx.getImageData(0, 0, cap.width, cap.height);

  function redraw() {
    ctx.putImageData(baseImage, 0, 0);
    if (start && end) __drawSelection(ctx, start.x, start.y, end.x, end.y);
  }

  canvas.addEventListener("mousedown", (ev) => {
    const rect = canvas.getBoundingClientRect();
    start = { x: Math.max(0, Math.min(cap.width - 1, Math.round(ev.clientX - rect.left))),
              y: Math.max(0, Math.min(cap.height - 1, Math.round(ev.clientY - rect.top))) };
    end = { ...start };
    redraw();
  });

  canvas.addEventListener("mousemove", (ev) => {
    if (!start) return;
    const rect = canvas.getBoundingClientRect();
    end = { x: Math.max(0, Math.min(cap.width - 1, Math.round(ev.clientX - rect.left))),
            y: Math.max(0, Math.min(cap.height - 1, Math.round(ev.clientY - rect.top))) };
    redraw();
  });

  canvas.addEventListener("mouseup", () => {
    if (!start || !end) return;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    cleanup();
    // Require a reasonable selection size
    if (w < 20 || h < 20) return resolve(null);
    resolve({ capImg, capProps: cap, rx, ry, rect: { x, y, w, h } });
  });

  return await prom;
}


function matchIconFromSelection(selection, templates) {
  if (!selection || !selection.capProps || !selection.rect) return null;
  if (!templates || !templates.length) return null;

  __buildTemplateFeatures(templates); // also computes ambiguity map

  const cap = selection.capProps;
  const r = selection.rect;

  const side0 = Math.max(r.w, r.h);
  const cx = r.x + (r.w >> 1);
  const cy = r.y + (r.h >> 1);

  const sSize = ICON_MATCH.sampleSize | 0;

  const snapR = (ICON_MATCH.snapRadius == null ? 0 : ICON_MATCH.snapRadius) | 0;
  const snapStep = (ICON_MATCH.snapStep == null ? 1 : ICON_MATCH.snapStep) | 0;

  let best = null;
  let second = null;

  const debug = (DEBUG_ICON_MATCH === true) ? [] : null;

  const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));

  for (let dy = -snapR; dy <= snapR; dy += snapStep) {
    for (let dx = -snapR; dx <= snapR; dx += snapStep) {
      const side = side0;

      const sx = clamp((cx - (side >> 1) + dx) | 0, 0, (cap.width - side) | 0);
      const sy = clamp((cy - (side >> 1) + dy) | 0, 0, (cap.height - side) | 0);

      const grayRaw = __downsampleToGray16(cap, sx, sy, side, side, sSize);
      const gray = (ICON_MATCH.whiten === false) ? grayRaw : __whitenGray(grayRaw, sSize);
      const candFeat = __centerAndInvStd(gray);

      const useEdges = ICON_MATCH.useEdges === true;
      const ew = (ICON_MATCH.edgeWeight === undefined ? 0.65 : ICON_MATCH.edgeWeight);

      const candEdgeFeat = useEdges ? __centerAndInvStd(__edgeMag(gray, sSize)) : null;

      for (let i = 0; i < templates.length; i++) {
        const t = templates[i];
        if (!t || !t._feat) continue;

        const grayScore = __znccScore(t._feat, candFeat);

        let score = grayScore;
        if (useEdges && t._featEdge && candEdgeFeat) {
          const edgeScore = __znccScore(t._featEdge, candEdgeFeat);
          score = edgeScore * ew + grayScore * (1 - ew);
        }

        if (!best || score > best.score) {
          second = best;
          best = { name: t.name, size: t.size, score, sx, sy, side, dx, dy };
        } else if (!second || score > second.score) {
          second = { name: t.name, size: t.size, score, sx, sy, side, dx, dy };
        }

        if (debug) debug.push({ name: t.name, score, dx, dy });
      }
    }
  }

  if (!best) return null;
  best.second = second;

  const thr = __adaptiveThresholds(best.name);
  const secondScore = second ? second.score : -1;
  const gap = best.score - secondScore;
  const ratio = (secondScore > 0) ? (best.score / secondScore) : Infinity;

  if (debug) {
    try {
      debug.sort((a, b) => b.score - a.score);
      console.group("[ICON MATCH TOP 10]");
      console.table(debug.slice(0, 10).map((x, idx) => ({
        rank: idx + 1,
        name: x.name,
        score: Number((x.score || 0).toFixed(4)),
        dx: x.dx,
        dy: x.dy
      })));
      console.log("[ICON MATCH BEST]", {
        best: { name: best.name, score: Number(best.score.toFixed(4)), dx: best.dx, dy: best.dy },
        second: second ? { name: second.name, score: Number(second.score.toFixed(4)) } : null,
        gap: Number(gap.toFixed(4)),
        ratio: (ratio === Infinity ? "∞" : Number(ratio.toFixed(4))),
        thresholds: { accept: Number(thr.accept.toFixed(4)), minGap: Number(thr.minGap.toFixed(4)), minRatio: Number(thr.minRatio.toFixed(4)) },
        nn: (thr.nn == null ? null : Number(thr.nn.toFixed(4))),
      });
      console.groupEnd();
    } catch (e) {}
  }

  const accepted =
    (best.score >= thr.accept) &&
    (gap >= thr.minGap) &&
    (ratio >= thr.minRatio);

  // Always return the best match for visibility/debugging; caller decides whether to submit.
  best.accepted = accepted;
  best.thr = thr;
  best.gap = gap;
  best.ratio = ratio;

  return best;
}

// -------- Hover + Alt+1 manual submit (no overlay) --------
// Capture a square around the mouse and snap to the best-matching icon window automatically.
function __captureAroundMouse(captureSize) {
  if (!(window.A1lib && typeof A1lib.capture === "function")) return null;
  const pos = getMousePos();
  if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return null;

  const capW = (captureSize | 0), capH = (captureSize | 0);
  const rx = Math.max(0, (pos.x - (capW >> 1)) | 0);
  const ry = Math.max(0, (pos.y - (capH >> 1)) | 0);

  let capImg = null;
  try { capImg = A1lib.capture(rx, ry, capW, capH); } catch (e) {}
  if (!capImg) return null;

  const capProps = __getImgProps(capImg);
  if (!capProps) return null;

  return { capImg, capProps, rx, ry, mx: pos.x, my: pos.y };
}

// Find best icon match near the center of a capture (mouse-centered).
// Returns an object similar to matchIconFromSelection(): {name, score, second, accepted, thr, gap, ratio, ...}
function __findBestIconMatchAroundMouseCapture(cap, templates) {
  if (!cap || !cap.capProps || !templates || !templates.length) return null;

  __buildTemplateFeatures(templates); // ensures _feat/_featEdge + ambiguity map

  const capProps = cap.capProps;
  const sSize = ICON_MATCH.sampleSize | 0;

  const cx = (capProps.width >> 1) | 0;
  const cy = (capProps.height >> 1) | 0;

  const r = (ICON_MATCH.hoverSearchRadius == null ? 18 : ICON_MATCH.hoverSearchRadius) | 0;
  const step = (ICON_MATCH.hoverStep == null ? 1 : ICON_MATCH.hoverStep) | 0;

  // Try matching with both common icon sizes (templates are tagged with entry.size from barrows_icon_map.json)
  const sizesToTry = [32, 48];

  let best = null;
  let second = null;

  const debug = (DEBUG_ICON_MATCH === true) ? [] : null;

  const clamp = (v, lo, hi) => (v < lo ? lo : (v > hi ? hi : v));

  const useEdges = ICON_MATCH.useEdges === true;
  const ew = (ICON_MATCH.edgeWeight === undefined ? 0.65 : ICON_MATCH.edgeWeight);

  for (const iconSz of sizesToTry) {
    const pool = templates.filter(t => (t && (t.size | 0) === (iconSz | 0)));
    if (!pool.length) continue;

    // Search window around the capture center (mouse).
    for (let dy = -r; dy <= r; dy += step) {
      for (let dx = -r; dx <= r; dx += step) {
        const x = clamp((cx - (iconSz >> 1) + dx) | 0, 0, (capProps.width - iconSz) | 0);
        const y = clamp((cy - (iconSz >> 1) + dy) | 0, 0, (capProps.height - iconSz) | 0);

        const grayRaw = __downsampleToGray16(capProps, x, y, iconSz, iconSz, sSize);
        const gray = (ICON_MATCH.whiten === false) ? grayRaw : __whitenGray(grayRaw, sSize);
        const candFeat = __centerAndInvStd(gray);
        const candEdgeFeat = useEdges ? __centerAndInvStd(__edgeMag(gray, sSize)) : null;

        for (let i = 0; i < pool.length; i++) {
          const t = pool[i];
          if (!t || !t._feat) continue;

          const grayScore = __znccScore(t._feat, candFeat);

          let score = grayScore;
          if (useEdges && t._featEdge && candEdgeFeat) {
            const edgeScore = __znccScore(t._featEdge, candEdgeFeat);
            score = edgeScore * ew + grayScore * (1 - ew);
          }

          if (!best || score > best.score) {
            second = best;
            best = { name: t.name, size: t.size, score, x, y, iconSz, dx, dy };
          } else if (!second || score > second.score) {
            second = { name: t.name, size: t.size, score, x, y, iconSz, dx, dy };
          }

          if (debug) debug.push({ name: t.name, size: t.size, score, dx, dy, iconSz });
        }
      }
    }
  }

  if (!best) return null;
  best.second = second;

  // Apply per-icon adaptive thresholds (or fall back to ICON_MATCH base)
  const thr = __adaptiveThresholds(best.name);
  const secondScore = second ? second.score : -1;
  const gap = best.score - secondScore;
  const ratio = (secondScore > 0) ? (best.score / secondScore) : Infinity;

  if (debug) {
    try {
      debug.sort((a, b) => b.score - a.score);
      console.group("[ICON MATCH TOP 10]");
      console.table(debug.slice(0, 10).map((x, idx) => ({
        rank: idx + 1,
        name: x.name,
        size: x.size,
        score: Number((x.score || 0).toFixed(4)),
        iconSz: x.iconSz,
        dx: x.dx,
        dy: x.dy
      })));
      console.log("[ICON MATCH BEST]", {
        best: { name: best.name, size: best.size, score: Number(best.score.toFixed(4)), iconSz: best.iconSz, dx: best.dx, dy: best.dy },
        second: second ? { name: second.name, size: second.size, score: Number(second.score.toFixed(4)) } : null,
        gap: Number(gap.toFixed(4)),
        ratio: (ratio === Infinity ? "∞" : Number(ratio.toFixed(4))),
        thresholds: { accept: Number(thr.accept.toFixed(4)), minGap: Number(thr.minGap.toFixed(4)), minRatio: Number(thr.minRatio.toFixed(4)) },
        nn: (thr.nn == null ? null : Number(thr.nn.toFixed(4))),
      });
      console.groupEnd();
    } catch (e) {}
  }

  const accepted =
    (best.score >= thr.accept) &&
    (gap >= thr.minGap) &&
    (ratio >= thr.minRatio);

  best.accepted = accepted;
  best.thr = thr;
  best.gap = gap;
  best.ratio = ratio;

  return best;
}


async function manualSubmitFlow() {
  if (!isSetupReady()) {
    showEvent("Manual submit", "Setup not locked/ready.", "warn", true, true);
    return;
  }

  // Hover icon + Alt+1: capture around mouse and auto-snap to the icon (no overlay).
  showEvent("Manual submit", "Hover the item icon… scanning", "ok", true, false);
  try { if (alt1 && typeof alt1.setTooltip === "function") alt1.setTooltip("Manual submit: hover the item icon (Alt+1)"); } catch (e) {}

  const templates = await ensureIconTemplatesLoaded();
  if (!templates || !templates.length) {
    try { if (alt1 && typeof alt1.clearTooltip === "function") alt1.clearTooltip(); } catch (e) {}
    showEvent("Manual submit", "No icon templates loaded.", "warn", true, true);
    return;
  }

  const capSize = (ICON_MATCH.hoverCaptureSize == null ? 220 : ICON_MATCH.hoverCaptureSize) | 0;
  const cap = __captureAroundMouse(capSize);
  try { if (alt1 && typeof alt1.clearTooltip === "function") alt1.clearTooltip(); } catch (e) {}

  if (!cap) {
    showEvent("Manual submit", "Capture failed (mouse position / capture unavailable).", "warn", true, true);
    return;
  }

  const best = __findBestIconMatchAroundMouseCapture(cap, templates);

  if (!best || !best.name) {
    showEvent("Manual submit", "No icon match found.", "warn", true, true);
    return;
  }

  // Allowlist validation (avoid silent no-op)
  const v = validateDropName(best.name);
  if (!v || !v.valid) {
    showEvent("Manual submit", `Matched: ${best.name} (not in allowlist)`, "warn", true, true);
    return;
  }
  const chosen = v.canonical || best.name;

  const qty = 1; // manual qty OCR disabled for now
  const accepted = (best.accepted === true);

  // Log proof every attempt
  try {
    console.log("[ICON MATCH]", "best=", { name: best.name, size: best.size, score: best.score, accepted }, "thr=", best.thr, "gap=", best.gap, "ratio=", best.ratio);
  } catch (e) {}

  if (!accepted) {
    const sc = (best.score || 0).toFixed(3);
    const gap = (best.gap || 0).toFixed(3);
    showEvent("Manual submit", `Ambiguous: ${chosen} (score ${sc}, gap ${gap})`, "warn", true, true);
    return;
  }

  showEvent("Manual submit", `Icon match: ${chosen} x${qty} (score ${(best.score || 0).toFixed(3)})`, "ok", true, false);
  try {
    await submitDrop({ drop_name: chosen, amount: String(qty) });
    showEvent("Manual submit", `Submitted: ${chosen} x${qty}`, "ok", true, true);
    playBeep("ok");
  } catch (e) {
    showEvent("Manual submit", "Submit failed: " + (e && e.message ? e.message : e), "warn", true, true);
  }
}


  function setPill(pill, label, state) {
    if (!pill) return;
    pill.textContent = label;
    pill.className = "pill " + (state || "");
  }

  function openDrawer() {
    if (!ui.drawer || !ui.backdrop) return;
    ui.drawer.classList.add("open");
    ui.drawer.setAttribute("aria-hidden", "false");
    ui.backdrop.classList.add("show");
    ui.backdrop.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    if (!ui.drawer || !ui.backdrop) return;
    ui.drawer.classList.remove("open");
    ui.drawer.setAttribute("aria-hidden", "true");
    ui.backdrop.classList.remove("show");
    ui.backdrop.setAttribute("aria-hidden", "true");
  }

  function setVisible(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  

// Hide the entire setup panel when setup is complete (IGN locked + Bingo/Team locked),
// and show it again if the user unlocks either. In settings-only popup mode, keep it visible.
function updateSetupPanelWrapVisibility() {
  const wrap = ui.setupPanelWrap || document.getElementById("setupPanelWrap");
  if (!wrap) return;

  if (__settingsOnly) {
    wrap.style.display = "";
    return;
  }

  const sl = (localStorage.getItem(LS.setupLocked) || "") === "1";
  const il = (localStorage.getItem(LS.ignLocked) || "") === "1";

    const cl = !!localStorage.getItem(LS.chatPos);

  wrap.style.display = (sl && il && cl) ? "none" : "";
}
// ---------- UI render (no storage writes) + cross-window sync ----------
  function renderSetupLockedUI(locked) {
    setVisible(ui.setupBlock, !locked);
    setVisible(ui.setupSummary, locked);
    initHistoryPanel();
    refreshSummary();
    refreshSetupState();

    try { updateAutoChatUI(); } catch (e) {}
    try { updateSetupGating(); } catch (e) {}
  }

  function isChatLocked() {
  return !!localStorage.getItem(LS.chatPos);
}

function updateAutoChatUI() {
  const locked = isChatLocked();
  if (ui.autoChatPill) {
    ui.autoChatPill.textContent = locked ? "Chat: locked" : "Chat: not set";
    ui.autoChatPill.className = "pill mini " + (locked ? "ok" : "warn");
  }
  if (ui.btnAutoLocateChat) ui.btnAutoLocateChat.disabled = locked || !isAlt1;
  if (ui.autoChatWrap) ui.autoChatWrap.style.display = locked ? "none" : "";
}

function updateSetupGating() {
  // Enforce order:
  // 1) Chat must be locked before IGN
  // 2) IGN must be locked before Bingo/Team lock
  const cl = isChatLocked();
  const il = (localStorage.getItem(LS.ignLocked) || "") === "1";

  if (ui.ign) ui.ign.disabled = !cl || il;
  if (ui.btnLockIgn) ui.btnLockIgn.disabled = !cl || il;

  // Bingo/team controls live in the main setup panel; disable until IGN locked.
  const lockSetupBtn = ui.btnLockSetup;
  if (lockSetupBtn) lockSetupBtn.disabled = !il || lockSetupBtn.disabled; // keep existing disabled if selections missing

  // Disable dropdown buttons until IGN locked
  try {
    if (ui.bingoBtn) ui.bingoBtn.disabled = !il;
    if (ui.teamBtn) ui.teamBtn.disabled = !il;
  } catch (e) {}
}

function renderIgnLockedUI(locked) {
    const field = ui.ign ? ui.ign.closest(".field") : null;
    if (!ui.ign || !ui.btnLockIgn) return;

    if (locked) {
      ui.ign.disabled = true;
      ui.btnLockIgn.disabled = true;
      if (ui.ignHint) ui.ignHint.textContent = "IGN locked ✅ (reset in Settings if you change RSN).";
      if (field) field.style.display = "none";
    } else {
      ui.ign.disabled = false;
      ui.btnLockIgn.disabled = false;
      if (ui.ignHint) ui.ignHint.textContent = "Tip: lock your IGN once so submissions can’t be spoofed accidentally.";
      if (field) field.style.display = "";
    }
  }

  function syncUiFromStorage() {
    const sl = (localStorage.getItem(LS.setupLocked) || "") === "1";
    const il = (localStorage.getItem(LS.ignLocked) || "") === "1";

    // reflect lock state UI
    renderSetupLockedUI(sl);
    renderIgnLockedUI(il);

    // keep premium select + lock button in sync
    try { applySelectionToUI(); } catch (e) {}
    try { updateLockButtonEnabled(); } catch (e) {}

    updateConfigPill();
    refreshSummary();
    refreshSetupState();
    updateSetupPanelWrapVisibility();

  }

  function syncRuntimeFromStorage() {
    // Start/stop automatically based on current configuration
    if (!isAlt1) return;
    if (isSetupReady()) {
      if (!running) start();
      else addFeed("Running. Waiting for drops…", "ok");
    } else {
      if (running) stop();
    }
  }

  // Cross-window changes (Settings popup -> Main overlay)
  window.addEventListener("storage", (e) => {
    if (!e) return;
    const keys = new Set([
      LS.setupLocked, LS.ignLocked, LS.bingoId, LS.team, LS.chatPos, LS.ign, LS.settings,
      "irb.bingoName", "irb.teamName"
    ]);
    if (!keys.has(e.key)) return;

    syncUiFromStorage();
    syncRuntimeFromStorage();

    // subtle feedback for lock/unlock transitions
    if (e.key === LS.setupLocked) playBeep((e.newValue === "1") ? "ok" : "warn");
    if (e.key === LS.ignLocked) playBeep((e.newValue === "1") ? "ok" : "warn");
    if (e.key === LS.chatPos) playBeep(e.newValue ? "ok" : "warn");
  });

  // ---------- Alt1 detect ----------
  const isAlt1 = !!window.alt1;
  setPill(ui.alt1Pill, isAlt1 ? "Alt1: ✅" : "Alt1: ❌", isAlt1 ? "ok" : "bad");
  if (window.A1lib && typeof A1lib.identifyApp === "function") {
    try { A1lib.identifyApp("./appconfig.json"); } catch (e) {}
  }

  if (ui.apiBase) ui.apiBase.value = getApiBase();
  if (!getApiBase()) addFeed("API base is empty (locked). Check embedded apiBase value.", "bad");

  if (ui.bingoId) ui.bingoId.value = localStorage.getItem(LS.bingoId) || "1";
  if (ui.teamNumber) ui.teamNumber.value = localStorage.getItem(LS.team) || "1";

  const setupLocked = (localStorage.getItem(LS.setupLocked) || "") === "1";
  const ignLocked = (localStorage.getItem(LS.ignLocked) || "") === "1";
  const ignVal = localStorage.getItem(LS.ign) || "";
  if (ui.ign) ui.ign.value = ignVal;

  function setIgnLocked(locked) {
    renderIgnLockedUI(locked);
  }

  function setSetupLocked(locked) {
    localStorage.setItem(LS.setupLocked, locked ? "1" : "0");
    renderSetupLockedUI(locked);
  }

  function refreshSummary() {
    if (!ui.summaryMeta) return;
    const b = localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "—";
    const t = localStorage.getItem(LS.team) || ui.teamNumber?.value || "—";
    const names = loadSavedNames();
    const bingoLabel = names.bingoName ? names.bingoName : `Bingo ${b}`;
    const teamLabel = names.teamName ? names.teamName : `Team ${t}`;
    const ign = (localStorage.getItem(LS.ign) || ui.ign?.value || "").trim();
    const chat = localStorage.getItem(LS.chatPos) ? "Chat locked" : "Chat not set";
    const ignTxt = ign ? `IGN: ${ign}` : "IGN: —";
    ui.summaryMeta.textContent = `${bingoLabel} • ${teamLabel} • ${ignTxt} • ${chat}`;
    updateConfigPill();
  }

  function refreshSetupState() {
    if (!ui.setupState) return;
    const b = localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "—";
    const t = localStorage.getItem(LS.team) || ui.teamNumber?.value || "—";
    const names = loadSavedNames();
    const bingoLabel = names.bingoName ? names.bingoName : `Bingo ${b}`;
    const teamLabel = names.teamName ? names.teamName : `Team ${t}`;
    const sl = (localStorage.getItem(LS.setupLocked) || "") === "1";
    const il = (localStorage.getItem(LS.ignLocked) || "") === "1";
    const cl = !!localStorage.getItem(LS.chatPos);
    ui.setupState.textContent = `${bingoLabel} • ${teamLabel} • IGN ${il ? "locked" : "not set"} • Chat ${cl ? "locked" : "not set"} • Setup ${sl ? "locked" : "unlocked"}`;
  }

  setIgnLocked(ignLocked);
  setSetupLocked(setupLocked);
  try { syncUiFromStorage(); } catch (e) {}

  // ---------- settings init ----------
  let settings = loadSettings();
  if (ui.optAutoDetect) ui.optAutoDetect.checked = settings.autoDetect;
  if (ui.optHighlight) ui.optHighlight.checked = settings.highlight;
  if (ui.optStrictDrops) ui.optStrictDrops.checked = settings.strictDrops;
  if (ui.optUseWikiCanonical) ui.optUseWikiCanonical.checked = settings.useWikiCanonical;

  // ---------- Premium Selects (Bingo + Team) ----------
  let _bingosCache = [];
  let _selectedBingo = null;
  let _selectedTeam = null

// ---------- Drop history panel ----------
let historyLoadedOnce = false;
let historyLoading = false;

function setHistoryOpen(isOpen) {
  if (!ui.toggleHistory || !ui.historyBody) return;
  ui.toggleHistory.checked = !!isOpen;
  ui.historyBody.classList.toggle("open", !!isOpen);
  ui.historyBody.setAttribute("aria-hidden", isOpen ? "false" : "true");
  const lbl = document.querySelector("#historyPanel .switchLabel");
  if (lbl) lbl.textContent = isOpen ? "Hide" : "Show";
  try { localStorage.setItem(LS.historyOpen, isOpen ? "1" : "0"); } catch(e) {}
}

function getHistoryContext() {
  const bingoId = parseInt(localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "0", 10) || 0;
  const team_number = parseInt(localStorage.getItem(LS.team) || ui.teamNumber?.value || "0", 10) || 0;
  const ign = (localStorage.getItem(LS.ign) || ui.ign?.value || "").trim();
  return { bingoId, team_number, ign };
}

function normalizeHistoryPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.history && Array.isArray(payload.history)) return payload.history;
  return [];
}

function fmtWhen(ts) {
  try {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString();
  } catch(e) { return String(ts || "—"); }
}

function renderHistory(items) {
  if (!ui.historyList) return;
  ui.historyList.innerHTML = "";
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) {
    const div = document.createElement("div");
    div.className = "historyEmpty";
    div.textContent = "No drops found.";
    ui.historyList.appendChild(div);
    return;
  }

  const base = getApiBase();

  for (const it of arr) {
    const name = (it.drop_name || it.drop || it.name || it.item || "").toString();
    const amt = (it.amount ?? it.qty ?? it.count ?? "").toString();
    const when = fmtWhen(it.ts_iso || it.ts || it.created_at || it.time);

    const row = document.createElement("div");
    row.className = "historyItem";

    // icon (RuneScape Wiki proxy)
    const iconWrap = document.createElement("div");
    iconWrap.className = "historyIcon";
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = `${base}/wiki/icon?item=${encodeURIComponent(name || "")}&size=52`;
    img.onerror = () => { iconWrap.style.display = "none"; };
    iconWrap.appendChild(img);

    const left = document.createElement("div");
    left.className = "historyLeft";

    const nm = document.createElement("div");
    nm.className = "historyName";
    nm.textContent = name || "(unknown drop)";

    const sub = document.createElement("div");
    sub.className = "historySub";
    sub.textContent = when;

    left.appendChild(nm);
    left.appendChild(sub);

    const right = document.createElement("div");
    right.className = "historyAmt";
    right.textContent = amt ? `x${amt}` : "";

    row.appendChild(iconWrap);
    row.appendChild(left);
    row.appendChild(right);

    ui.historyList.appendChild(row);
  }
}

async function fetchDropHistoryFromApi() {
  const base = getApiBase();
  const { bingoId, team_number, ign } = getHistoryContext();

  if (!bingoId || !team_number || !ign) {
    throw new Error("Complete setup (IGN + Bingo + Team) to view history.");
  }

  // Confirmed admin endpoint used by the web admin UI.
  const url = `${base}/b/${bingoId}/api/admin/recent-drops`;

  const r = await fetch(url, { method: "GET", cache: "no-store", credentials: "omit" });
  if (!r.ok) throw new Error(`HTTP ${r.status} loading drop history`);

  const payload = await r.json();
  const all = normalizeHistoryPayload(payload);

  const ignKey = String(ign).trim().toLowerCase();
  const teamKey = String(team_number).trim();

  // Filter to the user's selected team + IGN from setup.
  const filtered = (Array.isArray(all) ? all : []).filter(x => {
    const t = String(x?.team_id ?? x?.team_number ?? "").trim();
    const i = String(x?.ign ?? "").trim().toLowerCase();
    return t === teamKey && i === ignKey;
  });

  // Sort newest first if timestamps exist
  filtered.sort((a, b) => {
    const ta = new Date(a?.ts_iso || a?.ts || a?.timestamp || 0).getTime();
    const tb = new Date(b?.ts_iso || b?.ts || b?.timestamp || 0).getTime();
    return (tb || 0) - (ta || 0);
  });

  return filtered;
}

async function loadHistory() {
  if (!ui.historyMeta || !ui.historyList) return;
  if (historyLoading) return;
  historyLoading = true;

  ui.historyMeta.textContent = "Loading…";
  renderHistory([]);

  try {
    const items = await fetchDropHistoryFromApi();
    renderHistory(items);
    ui.historyMeta.textContent = `${items.length} drop(s)`;
    historyLoadedOnce = true;
  } catch (e) {
    ui.historyMeta.textContent = "Failed";
    ui.historyList.innerHTML = `<div class="historyEmpty">${escapeHtml(e.message || "Unable to load history.")}</div>`;
  } finally {
    historyLoading = false;
  }
}

function initHistoryPanel() {
  if (!ui.toggleHistory || !ui.historyBody) return;

  const open = (localStorage.getItem(LS.historyOpen) || "0") === "1";
  setHistoryOpen(open);

  ui.toggleHistory.addEventListener("change", () => {
    const isOpen = !!ui.toggleHistory.checked;
    setHistoryOpen(isOpen);
    if (isOpen && !historyLoadedOnce) loadHistory();
  });

  if (ui.btnRefreshHistory) {
    ui.btnRefreshHistory.addEventListener("click", () => loadHistory());
  }
}

;

  function pselectOpen(wrap, open) {
    if (!wrap) return;
    wrap.classList.toggle("open", !!open);
    const btn = wrap.querySelector(".pselectBtn");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function pselectCloseAll() {
    pselectOpen(ui.bingoSelectWrap, false);
    pselectOpen(ui.teamSelectWrap, false);
  }
  function pselectSetDisabled(wrap, disabled) {
    if (!wrap) return;
    wrap.classList.toggle("disabled", !!disabled);
    const btn = wrap.querySelector(".pselectBtn");
    if (btn) btn.disabled = !!disabled;
  }
  function pselectSetLabel(valueEl, text, fallback) {
    if (!valueEl) return;
    valueEl.textContent = (text && String(text).trim()) ? String(text).trim() : (fallback || "Select…");
  }
  function pselectClearMenu(menuEl, emptyText) {
    if (!menuEl) return;
    menuEl.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "pselectEmpty";
    empty.textContent = emptyText || "No items";
    menuEl.appendChild(empty);
    menuEl.classList.add("is-empty");
  }
  function pselectRenderMenu(menuEl, items, selectedValue, onPick) {
    if (!menuEl) return;
    menuEl.innerHTML = "";
    if (!items || !items.length) {
      pselectClearMenu(menuEl, "No items");
      return;
    }
    menuEl.classList.remove("is-empty");

    for (const it of items) {
      const row = document.createElement("div");
      row.className = "pselectItem";
      row.setAttribute("role", "option");
      row.setAttribute("tabindex", "0");
      row.dataset.value = String(it.value);
      row.setAttribute("aria-selected", String(it.value) === String(selectedValue) ? "true" : "false");
      row.innerHTML = `<div class="txt">${escapeHtml(it.label)}</div>${it.meta ? `<div class="meta">${escapeHtml(it.meta)}</div>` : ""}`;

      const pick = () => onPick(it);
      row.addEventListener("click", (e) => { e.stopPropagation(); pick(); });
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
      menuEl.appendChild(row);
    }
  }

  function getSavedBingoId() {
    const v = localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "";
    const id = parseInt(v || "0", 10);
    return id || 0;
  }
  function getSavedTeamNo() {
    const v = localStorage.getItem(LS.team) || ui.teamNumber?.value || "";
    const t = parseInt(v || "0", 10);
    return t || 0;
  }
  function setHiddenIds(bingoId, teamNo) {
    if (ui.bingoId) ui.bingoId.value = bingoId ? String(bingoId) : "";
    if (ui.teamNumber) ui.teamNumber.value = teamNo ? String(teamNo) : "";
  }
  function updateLockButtonEnabled() {
    if (!ui.btnLockSetup) return;
    const b = getSavedBingoId();
    const t = getSavedTeamNo();
    ui.btnLockSetup.disabled = !(b > 0 && t > 0);
  }
  function findBingoById(id) {
    return _bingosCache.find(b => Number(b.id) === Number(id)) || null;
  }
  function findTeamByNo(bingoObj, teamNo) {
    if (!bingoObj || !Array.isArray(bingoObj.teams)) return null;
    return bingoObj.teams.find(t => Number(t.team_number) === Number(teamNo)) || null;
  }

  function applySelectionToUI() {
    const bid = getSavedBingoId();
    const tno = getSavedTeamNo();
    _selectedBingo = bid ? findBingoById(bid) : null;
    _selectedTeam = (_selectedBingo && tno) ? findTeamByNo(_selectedBingo, tno) : null;

    pselectSetLabel(ui.bingoValue, _selectedBingo?.name, "Select a bingo…");
    if (_selectedBingo) {
      pselectSetDisabled(ui.teamSelectWrap, false);
      pselectSetLabel(ui.teamValue, _selectedTeam?.name, "Select a team…");
    } else {
      pselectSetDisabled(ui.teamSelectWrap, true);
      pselectSetLabel(ui.teamValue, "", "Select a team…");
      pselectClearMenu(ui.teamMenu, "Select a bingo first…");
    }
    updateLockButtonEnabled();
  }

  function renderTeamMenu(bingoObj) {
    const selectedTeam = getSavedTeamNo();
    const teams = (bingoObj?.teams || []).map(t => ({
      value: t.team_number,
      label: t.name || `Team ${t.team_number}`,
      meta: `#${t.team_number}`
    }));

    pselectRenderMenu(ui.teamMenu, teams, selectedTeam, (it) => {
      const t = findTeamByNo(bingoObj, it.value);
      if (!t) return;

      localStorage.setItem(LS.team, String(t.team_number));
      localStorage.setItem("irb.teamName", String(t.name || `Team ${t.team_number}`));

      setHiddenIds(bingoObj.id, t.team_number);
      _selectedTeam = t;

      pselectSetLabel(ui.teamValue, t.name, "Select a team…");
      applySelectionToUI();
      pselectOpen(ui.teamSelectWrap, false);
    });
  }

  function renderBingoMenu() {
    const selectedId = getSavedBingoId();
    const items = (_bingosCache || []).map(b => ({
      value: b.id,
      label: b.name || `Bingo ${b.id}`,
      meta: `ID ${b.id}`
    }));

    pselectRenderMenu(ui.bingoMenu, items, selectedId, (it) => {
      const b = findBingoById(it.value);
      if (!b) return;

      localStorage.setItem(LS.bingoId, String(b.id));
      localStorage.setItem("irb.bingoName", String(b.name || `Bingo ${b.id}`));
      localStorage.removeItem(LS.team);
      localStorage.removeItem("irb.teamName");

      setHiddenIds(b.id, "");
      _selectedBingo = b;
      _selectedTeam = null;

      pselectSetLabel(ui.bingoValue, b.name, "Select a bingo…");
      pselectSetLabel(ui.teamValue, "", "Select a team…");

      renderTeamMenu(b);
      applySelectionToUI();
      pselectOpen(ui.bingoSelectWrap, false);
    });
  }

  function wirePremiumSelects() {
    if (ui.bingoBtn && ui.bingoSelectWrap) {
      ui.bingoBtn.addEventListener("click", (e) => {
        if (ui.bingoSelectWrap.classList.contains("disabled")) return;
        const open = !ui.bingoSelectWrap.classList.contains("open");
        pselectCloseAll();
        pselectOpen(ui.bingoSelectWrap, open);
        e.stopPropagation();
      });
    }
    if (ui.teamBtn && ui.teamSelectWrap) {
      ui.teamBtn.addEventListener("click", (e) => {
        if (ui.teamSelectWrap.classList.contains("disabled")) return;
        const open = !ui.teamSelectWrap.classList.contains("open");
        pselectCloseAll();
        pselectOpen(ui.teamSelectWrap, open);
        e.stopPropagation();
      });
    }
    document.addEventListener("click", () => pselectCloseAll());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") pselectCloseAll(); });
  }

  async function loadBingosAndPopulate() {
    const base = getApiBase();
    if (!base) return false;

    pselectSetDisabled(ui.bingoSelectWrap, true);
    pselectSetDisabled(ui.teamSelectWrap, true);
    pselectClearMenu(ui.bingoMenu, "Loading…");
    pselectClearMenu(ui.teamMenu, "Select a bingo first…");
    pselectSetLabel(ui.bingoValue, "", "Loading…");
    pselectSetLabel(ui.teamValue, "", "Select a team…");
    if (ui.btnLockSetup) ui.btnLockSetup.disabled = true;

    try {
      const res = await fetch(`${base}/api/bingos`, { method: "GET", credentials: "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const arr = Array.isArray(data) ? data : (Array.isArray(data?.bingos) ? data.bingos : []);
      _bingosCache = (arr || []).map(b => ({
        id: b.id ?? b.bingo_id ?? b.bingoId,
        name: b.name ?? b.title ?? b.bingo_name,
        teams: Array.isArray(b.teams) ? b.teams.map(t => ({
          team_number: t.team_number ?? t.teamNumber ?? t.teamNo ?? t.team_no ?? t.number,
          name: t.name ?? t.team_name ?? t.title
        })) : []
      })).filter(b => b.id);

      if (!_bingosCache.length) throw new Error("No bingos returned");

      pselectSetDisabled(ui.bingoSelectWrap, false);
      renderBingoMenu();

      applySelectionToUI();
      if (_selectedBingo) renderTeamMenu(_selectedBingo);
      updateLockButtonEnabled();

      addFeed("Loaded bingos ✅", "ok");
      // If we are already running (auto-start), keep the main status line unambiguous
      if (typeof running !== "undefined" && running) addFeed("Running. Waiting for drops…", "ok");
      return true;
    } catch (e) {
      pselectSetDisabled(ui.bingoSelectWrap, false);
      pselectClearMenu(ui.bingoMenu, "Failed to load bingos");
      pselectSetLabel(ui.bingoValue, "", "Failed to load bingos");
      addFeed("Failed to load bingos: " + e.message, "bad");
      return false;
    }
  }

  wirePremiumSelects();

  // ---------- API helpers ----------
  async function pingApi() {
    const base = getApiBase();
    const bingoId = parseInt(localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "0", 10) || 0;
    try {
      const r = await fetch(`${base}/b/${bingoId}/api/state`, { method: "GET" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setPill(ui.apiPill, "API: ✅", "ok");
      return true;
    } catch (e) {
      setPill(ui.apiPill, "API: ❌", "bad");
      addFeed("API ping failed: " + e.message, "bad");
      return false;
    }
  }

  
  // ---------- allowlist (strict validation) ----------
  let allowlist = { strict: true, drops: [] };
  const canonicalMap = new Map();

  function normalizeDropName(name) {
    if (!name) return "";
    return String(name)
      .replace(/[’]/g, "'")
      .trim()
      .replace(/^[Aa]n?\s+/, "") // leading 'a' / 'an'
      .replace(/\s+/g, " ")
      .replace(/[.,;:]+$/g, "")
      .toLowerCase();
  }

  function buildCanonicalMap(dropList) {
    canonicalMap.clear();
    for (const item of (dropList || [])) {
      const canon = String(item || "").trim();
      if (!canon) continue;
      const n = normalizeDropName(canon);
      if (!n) continue;
      canonicalMap.set(n, canon);

      // Safe apostrophe-less variant (Archers ring -> Archers' Ring etc.)
      const noApos = n.replace(/'/g, "");
      if (!canonicalMap.has(noApos)) canonicalMap.set(noApos, canon);
    }
  }

  function validateDropName(inputName) {
    const n = normalizeDropName(inputName);
    if (!n) return { valid: false };
    const canon = canonicalMap.get(n) || canonicalMap.get(n.replace(/'/g, ""));
    if (canon) return { valid: true, canonical: canon };
    return { valid: false };
  }

  async function loadAllowlistFile() {
    try {
      const res = await fetch("./drops_allowlist.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`allowlist ${res.status}`);
      const data = await res.json();
      allowlist = {
        strict: data && data.strict !== false,
        drops: Array.isArray(data && data.drops) ? data.drops : [],
      };
      buildCanonicalMap(allowlist.drops);
      addFeed(`Allowlist loaded (${allowlist.drops.length} items)`, "ok");
    } catch (e) {
      allowlist = { strict: true, drops: [] };
      canonicalMap.clear();
      addFeed("Allowlist not loaded (drops_allowlist.json missing/invalid). Strict validation will be ineffective until provided.", "warn");
    }
  }

// ---------- canonical name resolver ----------
  const canonicalCache = new Map();
  async function resolveCanonicalName(rawName) {
    const base = getApiBase();
    if (!base) return rawName;
    const key = (rawName || "").trim();
    if (!key) return rawName;
    if (canonicalCache.has(key)) return canonicalCache.get(key);

    const cleaned = key.replace(/[\s\u00A0]+$/g, "").replace(/[\.,;:]+$/g, "");
    try {
      const url = `${base}/wiki/tooltip?item=${encodeURIComponent(cleaned)}`;
      const res = await fetch(url, { method: "GET", credentials: "omit" });
      if (!res.ok) throw new Error(`tooltip ${res.status}`);
      const data = await res.json();
      const title = (data && data.title) ? String(data.title).trim() : cleaned;
      canonicalCache.set(key, title || cleaned);
      return title || cleaned;
    } catch (e) {
      canonicalCache.set(key, cleaned);
      return cleaned;
    }
  }

  // FIX: submitDrop does NOT resolve canonical again (poll already does it)
  async function submitDrop({ drop_name, amount }) {
    const base = getApiBase();
    const bingoId = parseInt(localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "0", 10) || 0;
    const team_number = parseInt(localStorage.getItem(LS.team) || ui.teamNumber?.value || "0", 10) || 0;
    const ign = (localStorage.getItem(LS.ign) || ui.ign?.value || "").trim() || "Unknown";
    const ts_iso = new Date().toISOString();

    const canonical = (drop_name || "").trim(); // trust caller

    const fd = new FormData();
    fd.append("ts_iso", ts_iso);
    fd.append("ign", ign);
    fd.append("team_number", String(team_number));
    fd.append("boss", "");
    fd.append("drop_name", canonical);
    fd.append("result", "success");
    fd.append("amount", amount || "");

    const url = `${base}/b/${bingoId}/api/mock_drop`;
    const res = await fetch(url, { method: "POST", body: fd, credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  }

  // ---------- drop parsing ----------
  function stripTimestampPrefix(s) {
    return (s || "")
      .replace(/^\s*\[?\d{1,2}:\d{2}:\d{2}(?:\s*[AP]M)?\]?\s*/i, "")
      .replace(/^\s*poll\s+/i, "")
      .trim();
  }

  function _tryParseReceive(text) {
    const t = stripTimestampPrefix(text);
    const idx = t.toLowerCase().indexOf('you receive');
    const idx2 = t.toLowerCase().indexOf('you received');
    const start = idx >= 0 ? idx : idx2;
    const slice = start >= 0 ? t.slice(start) : t;

    const patterns = [
      /^You\s+(?:have\s+)?(?:receive|received)\s*:?\s*([0-9]+)\s*x\s*(.+?)\s*$/i,
      /^You\s+(?:have\s+)?(?:receive|received|find|found|stockpile|stockpiled)\s*:?\s*(.+?)\s*(?:\(?x\s*(\d+)\)?)?\s*$/i,
      /^Loot\s*:\s*(.+?)\s*(?:\(?x\s*(\d+)\)?)?\s*$/i,
    ];

    for (const re of patterns) {
      const m = slice.match(re);
      if (m) {
        let item = (m[1] || "").trim();
        let amt = (m[2] || "").trim();
        if (amt && /^\d+$/.test(item) && !/^\d+$/.test(amt)) {
          const tmp = item; item = amt; amt = tmp;
        }
        if (!item) return null;
        item = item.replace(/\s+from.*$/i, "").trim();
        return { drop_name: item, amount: amt };
      }
    }
    return null;
  }

  function parseDropLine(text, nextLine) {
    let parsed = _tryParseReceive(text);
    if (parsed) return parsed;

    if (text && nextLine) {
      const t = stripTimestampPrefix(text);
      const n = stripTimestampPrefix(nextLine);
      if (/you\s+receiv/i.test(t) && n && !/^you\s+/i.test(n)) {
        const joined = (t + " " + n).replace(/\s+/g, " ").trim();
        parsed = _tryParseReceive(joined);
        if (parsed) return parsed;
      }
    }
    return null;
  }

  function detectHasTimestamps(lines) {
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const raw = lineToText(lines[i]);
      if (/^\s*\[\d{1,2}:\d{2}:\d{2}/.test(raw)) return true;
    }
    return false;
  }

  function isLikelyMessageStartNoTs(line) {
    const t = (line || "").trim();
    if (!t) return false;
    if (/^(You\b|Your\b|News:|A\b)/.test(t)) return true;
    if (/^[^a-z\s][^:]{1,40}:\s+/.test(t)) return true;
    if (/^[A-Z][A-Za-z0-9' _-]{1,30}:\s+/.test(t)) return true;
    return false;
  }

  
  function toPlainText(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map(toPlainText).join("");
    if (typeof v === "object") {
      if (typeof v.text === "string") return v.text;
      if (typeof v.value === "string") return v.value;
      if (Array.isArray(v.fragments)) return v.fragments.map(toPlainText).join("");
      if (Array.isArray(v.parts)) return v.parts.map(toPlainText).join("");
      return "";
    }
    return String(v);
  }
  function lineToText(line) {
    if (typeof line === "string") return line;
    if (line && typeof line === "object") {
      if (typeof line.text === "string") return line.text;
      return toPlainText(line.text);
    }
    return toPlainText(line);
  }

function stitchChatMessages(lines) {
    const rawLines = (lines || []).map(lineToText).filter(Boolean);
    const hasTs = detectHasTimestamps(lines || []);
    const out = [];

    for (const raw of rawLines) {
      const t = String(raw || "").trimEnd();
      if (!t) continue;

      if (out.length === 0) { out.push(t); continue; }

      if (hasTs) {
        if (/^\s*\[\d{1,2}:\d{2}:\d{2}/.test(t)) out.push(t);
        else out[out.length - 1] = (out[out.length - 1] + " " + t.trim()).replace(/\s+/g, " ");
        continue;
      }

      const prev = out[out.length - 1];
      const prevEndsSentence = /[.!?]\s*$/.test(prev);
      const startsLower = /^[a-z]/.test(t.trim());
      const likelyStart = isLikelyMessageStartNoTs(t);

      if (!likelyStart || startsLower) {
        out[out.length - 1] = (prev + " " + t.trim()).replace(/\s+/g, " ");
        continue;
      }
      if (!prevEndsSentence) {
        out[out.length - 1] = (prev + " " + t.trim()).replace(/\s+/g, " ");
        continue;
      }
      out.push(t);
    }

    return { messages: out, rawCount: rawLines.length, stitchedCount: out.length, hasTimestamps: hasTs };
  }

  // Duplicate protection (centralised + time-based)
  const recentDrops = new Map(); // key -> lastSeenMs
  function seenRecently(key, windowMs = 8000) {
    const now = Date.now();
    const last = recentDrops.get(key) || 0;
    if (now - last < windowMs) return true;
    recentDrops.set(key, now);

    // lightweight cleanup to avoid unbounded growth
    if (recentDrops.size > 250) {
      for (const [k, ts] of recentDrops) {
        if (now - ts > windowMs * 4) recentDrops.delete(k);
      }
      // still too big? drop oldest-ish by iter order
      while (recentDrops.size > 200) {
        const firstKey = recentDrops.keys().next().value;
        recentDrops.delete(firstKey);
      }
    }
    return false;
  }
// ---------- chat reader ----------
  let chatReader = null;
  let running = false;
  let pollTimer = null;

  let chatState = {
    locked: false,
    usingFallback: false,
    confPct: 0,
    lastLine: "",
    consecutiveEmpty: 0,
  };

  function getChatboxCtor() {
    return (window.Chatbox && (Chatbox.default || Chatbox)) || window.ChatBox || null;
  }

  function loadChatPos() {
    try {
      const s = localStorage.getItem(LS.chatPos);
      if (!s) return null;
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }
  function saveChatPos(pos) { localStorage.setItem(LS.chatPos, JSON.stringify(pos)); }
  function clearChatPos() { localStorage.removeItem(LS.chatPos); }

  function updateConfigPill() {
    if (!ui.chatPill) return;

    const b = localStorage.getItem(LS.bingoId) || ui.bingoId?.value || "—";
    const t = localStorage.getItem(LS.team) || ui.teamNumber?.value || "—";
    const ign = (localStorage.getItem(LS.ign) || ui.ign?.value || "").trim();

    const setupLocked = (localStorage.getItem(LS.setupLocked) || "") === "1";
    const ignLocked = (localStorage.getItem(LS.ignLocked) || "") === "1";
    const chatLocked = !!localStorage.getItem(LS.chatPos);

    const configured = setupLocked && ignLocked && chatLocked;

    if (configured) {
      const ignTxt = ign ? ign : "—";
      setPill(ui.chatPill, `Configured ✅ • B${b} • T${t} • IGN: ${ignTxt}`, "ok");
      return;
    }

    const parts = [];
    parts.push(setupLocked ? `B${b}/T${t} ✅` : "B/T …");
    parts.push(ignLocked ? `IGN ✅` : "IGN …");
    parts.push(chatLocked ? "Chat ✅" : "Chat …");

    const any = setupLocked || ignLocked || chatLocked;
    const state = any ? "warn" : "bad";
    setPill(ui.chatPill, `Config: ${parts.join(" • ")}`, state);
  }

  function setChatPillLocked() {
    updateConfigPill();
    refreshSummary();
    refreshSetupState();
  }
  function setChatPillMissing() {
    updateConfigPill();
    refreshSummary();
    refreshSetupState();
  }

  function initChatReader() {
    const ChatboxCtor = getChatboxCtor();
    if (!ChatboxCtor) {
      addFeed("Alt1 chatbox library not loaded (Chatbox ctor missing).", "bad");
      return false;
    }
    chatReader = new ChatboxCtor();

    if (!chatReader.readargs) chatReader.readargs = {};
    if (!Array.isArray(chatReader.readargs.colors)) chatReader.readargs.colors = [];

    const mix = (window.A1lib && typeof A1lib.mixColor === "function")
      ? A1lib.mixColor
      : ((r,g,b) => ((r & 255) << 16) | ((g & 255) << 8) | (b & 255));

    const extraCols = [
      mix(255,255,255),
      mix(127,169,255),
      mix(255,255,0),
      mix(255,0,0),
      mix(0,255,0),
    ];
    for (const c of extraCols) {
      if (chatReader.readargs.colors.indexOf(c) === -1) chatReader.readargs.colors.push(c);
    }
    chatReader.readargs.backwards = true;

    const stored = loadChatPos();
    if (stored) {
      try {
        chatReader.pos = stored;
        chatState.locked = true;
        chatState.usingFallback = false;
        chatState.confPct = 95;
        setChatPillLocked();
        addFeed("Chatbox loaded from calibration ✅", "ok");
      } catch (e) {
        clearChatPos();
        addFeed("Calibration invalid; cleared. Will auto-detect.", "warn");
        setChatPillMissing();
      }
    } else {
      setChatPillMissing();
    }
    return true;
  }

  function tryFindChatbox(tag) {
    if (!chatReader) return false;
    try {
      chatReader.find();
      if (chatReader.pos !== null) {
        chatState.locked = false;
        chatState.usingFallback = true;
        chatState.confPct = 70;
        setChatPillLocked();
        addFeed(`Chatbox auto-detected (${tag}).`, "ok");
        return true;
      }
    } catch (e) {}
    return false;
  }

  function tryOverlayRect(pos, force) {
    if (!pos || !isAlt1) return false;
    if (!force && !loadSettings().highlight) return false;

    const rect = pos.mainbox && pos.mainbox.rect ? pos.mainbox.rect : (pos.rect ? pos.rect : pos);
    const x = rect.x, y = rect.y;
    const w = rect.width || rect.w;
    const h = rect.height || rect.h;

    const ms = 1300;
    const t = 2;

    // Alt1 expects colors produced by A1lib.mixColor (opaque). Using 0x00ff00 can be invisible.
    const mix = (window.A1lib && typeof A1lib.mixColor === "function")
      ? A1lib.mixColor
      : ((r,g,b) => (255 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)); // ARGB fallback (opaque)

    const color = mix(0, 255, 0);

    if (window.alt1 && typeof alt1.overLayRect === "function") {
      try {
        const ok1 = alt1.overLayRect(color, x, y, w, t, ms, 2);
        const ok2 = alt1.overLayRect(color, x, y + h - t, w, t, ms, 2);
        const ok3 = alt1.overLayRect(color, x, y, t, h, ms, 2);
        const ok4 = alt1.overLayRect(color, x + w - t, y, t, h, ms, 2);

        const ok = !!(ok1 || ok2 || ok3 || ok4);
        if (!ok && force) addFeed("Highlight failed: enable Overlay permission (Alt1 spanner) or avoid exclusive fullscreen.", "warn");
        return ok;
      } catch (e) {
        if (force) addFeed("Highlight error: " + e.message, "warn");
        return false;
      }
    }

    if (window.A1lib && typeof A1lib.drawRect === "function") {
      try { A1lib.drawRect(x, y, w, h, ms); return true; } catch (e) {}
    }

    if (force) addFeed("Highlight failed: overlay API not available.", "warn");
    return false;
  }

  function locateChatboxAndStore() {
    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return false;
    }
    try {
      chatReader.find();
      if (chatReader.pos !== null) {
        saveChatPos(chatReader.pos);
        chatState.locked = true;
        chatState.usingFallback = false;
        chatState.confPct = 95;
        setChatPillLocked();
        addFeed("Chatbox calibrated & locked ✅", "ok");
        tryOverlayRect(chatReader.pos, true);
        return true;
      }
      addFeed("Could not find chatbox. Ensure chat is visible and try again.", "bad");
      setChatPillMissing();
      return false;
    } catch (e) {
      addFeed("Locate chat failed: " + e.message, "bad");
      setChatPillMissing();
      return false;
    }
  }

  // ---------- chat scanning + selection ----------
  let scannedChats = [];

  function describeRect(r) {
    if (!r) return "—";
    return `x=${r.x},y=${r.y},w=${r.width},h=${r.height}`;
  }
  function extractRectFromPos(pos) {
    if (!pos) return null;
    if (pos.mainbox && pos.mainbox.rect) return pos.mainbox.rect;
    if (pos.rect) return pos.rect;
    if (typeof pos.x === "number" && typeof pos.y === "number") return pos;
    return null;
  }

  function populateChatSelect(list) {
    scannedChats = list || [];
    if (!ui.chatSelect || !ui.btnLockChat || !ui.btnHighlightChat) return;

    ui.chatSelect.innerHTML = "";
    if (!scannedChats.length) {
      ui.chatSelect.disabled = true;
      ui.btnLockChat.disabled = true;
      ui.btnHighlightChat.disabled = true;
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No chatboxes found";
      ui.chatSelect.appendChild(opt);
      return;
    }
    ui.chatSelect.disabled = false;
    ui.btnLockChat.disabled = false;
    ui.btnHighlightChat.disabled = false;

    scannedChats.forEach((it, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = `#${idx + 1} (${describeRect(it.rect)})`;
      ui.chatSelect.appendChild(opt);
    });

    ui.chatSelect.value = "0";
    tryOverlayRect(scannedChats[0].pos, true);
  }

  function scanChatboxes() {
    if (!isAlt1) { addFeed("Alt1 not detected.", "bad"); return; }
    const ChatboxCtor = getChatboxCtor();
    if (!ChatboxCtor) { addFeed("Chatbox library missing.", "bad"); return; }

    let found = null;
    try {
      if (typeof ChatboxCtor.find === "function") {
        found = ChatboxCtor.find();
      } else if (chatReader && typeof chatReader.find === "function") {
        chatReader.find();
        found = chatReader.pos ? [chatReader.pos] : [];
      } else {
        found = [];
      }
    } catch (e) {
      addFeed("Scan failed: " + e.message, "bad");
      found = [];
    }

    const list = [];
    if (Array.isArray(found)) {
      for (const pos of found) {
        const rect = extractRectFromPos(pos);
        if (rect) list.push({ id: list.length + 1, pos, rect });
      }
    } else if (found) {
      const rect = extractRectFromPos(found);
      if (rect) list.push({ id: 1, pos: found, rect });
    }

    populateChatSelect(list);
    addFeed(list.length ? `Scan found ${list.length} chatbox(es). Select one and Lock.` : "No chatboxes found. Make sure chat is visible.", list.length ? "ok" : "bad");
  }

  function lockSelectedChat() {
    if (!ui.chatSelect) return;
    const idx = parseInt(ui.chatSelect.value || "-1", 10);
    const sel = scannedChats[idx];
    if (!sel) { addFeed("Select a chatbox first.", "bad"); return; }
    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return;
    }
    try {
      chatReader.pos = sel.pos;
      saveChatPos(sel.pos);
      chatState.locked = true;
      chatState.usingFallback = false;
      chatState.confPct = 95;
      setChatPillLocked();
      tryOverlayRect(sel.pos, true);
      addFeed("Chatbox locked ✅", "ok");
      playBeep("ok");
    } catch (e) {
      addFeed("Lock chat failed: " + e.message, "bad");
    }
  }

  function unlockChat() {
    clearChatPos();
    if (chatReader) chatReader.pos = null;
    chatState.locked = false;
    chatState.usingFallback = false;
    chatState.confPct = 0;
    setChatPillMissing();
    addFeed("Chat unlocked. Scan/locate again in Settings.", "warn");
    playBeep("warn");
  }

  // ---------- runtime ----------
  function isSetupReady() {
    const sl = (localStorage.getItem(LS.setupLocked) || "") === "1";
    const il = (localStorage.getItem(LS.ignLocked) || "") === "1";
    const cl = !!localStorage.getItem(LS.chatPos);
    const b = parseInt(localStorage.getItem(LS.bingoId) || "0", 10);
    const t = parseInt(localStorage.getItem(LS.team) || "0", 10);
    return sl && il && cl && b > 0 && t > 0;
  }

  function start() {
    if (!isAlt1) { addFeed("Alt1 not detected. Open inside Alt1 Toolkit.", "bad"); return; }
    if (!isSetupReady()) { addFeed("Finish setup first (lock Bingo/Team + IGN + Chat).", "bad"); return; }
    if (running) return;

    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return;
    }

    running = true;
    addFeed("Running. Waiting for drops…", "ok");
    playBeep("ok");

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, 350);
  }

  function stop() {
    running = false;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    addFeed("Stopped.", "warn");
    playBeep("warn");
  }

  async function poll() {
    if (!running || !chatReader) return;
    // Barrows chest UI detection test (template match)
    try { await __chestTestTick(); } catch (e) { console.warn("[BARROWS CHEST] tick error:", e.message); }

    if (!isSetupReady()) return;

    if (chatReader.pos === null) {
      setChatPillMissing();
      if (loadSettings().autoDetect) {
        const ok = tryFindChatbox("no-pos");
        if (!ok) {
          chatState.consecutiveEmpty++;
          if (chatState.consecutiveEmpty % 10 === 0) addFeed("Chatbox not found. Open Settings → Scan/locate.", "warn");
        } else {
          chatState.consecutiveEmpty = 0;
        }
      }
      return;
    }

    let lines = [];
    try {
      lines = chatReader.read() || [];
    } catch (e) {
      addFeed("Chat read error: " + e.message, "bad");
      setChatPillMissing();
      return;
    }

    if (!lines.length) {
  chatState.consecutiveEmpty++;
  if (chatState.consecutiveEmpty >= 12 && loadSettings().autoDetect && !chatState.locked) {
    const ok = tryFindChatbox("empty-read");
    if (ok) {
      chatState.consecutiveEmpty = 0;
      addFeed("Re-calibrate chat in Seffings and reload plugin.", "warn");
    }
  }
  return;
}

    chatState.consecutiveEmpty = 0;
    const stitched = stitchChatMessages(lines);

    for (let i = 0; i < stitched.messages.length; i++) {
      const raw = stitched.messages[i];
      if (!raw) continue;

      chatState.lastLine = stripTimestampPrefix(raw);

      const nextRaw = stitched.messages[i + 1] ? stitched.messages[i + 1] : "";
      const parsed = parseDropLine(raw, nextRaw);
      if (!parsed) continue;

      // Reject rich-fragment stringify artifacts
      if (raw.includes("[object Object]")) {
        addFeed("Ignored line (unparsed rich text): " + raw, "warn");
        continue;
      }

      // Allowlist validation (primary gate)
      const strictOn = settings.strictDrops && canonicalMap.size > 0;
      let canonicalName = parsed.drop_name;

      if (strictOn) {
        const v = validateDropName(parsed.drop_name);
        if (!v.valid) {
          continue;
        }
        canonicalName = v.canonical;
      }

      // Optional wiki canonicalisation (secondary; never bypass allowlist)
      if (settings.useWikiCanonical) {
        const wikiName = await resolveCanonicalName(canonicalName);
        if (strictOn) {
          const v2 = validateDropName(wikiName);
          canonicalName = v2.valid ? v2.canonical : canonicalName;
        } else {
          canonicalName = wikiName;
        }
      }


      // De-dupe across ALL detection paths (broadcast, "You received", etc.)
      const amtKey = (parsed.amount || "1").toString().trim();
      const key = `${canonicalName}`.toLowerCase().trim() + "||" + amtKey;
      if (seenRecently(key, 8000)) continue;

      addFeed(`Drop: ${canonicalName}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");

      try {
        await submitDrop({ drop_name: canonicalName, amount: parsed.amount });
        playBeep("ok");
        addFeed(`Submitted ✅ ${canonicalName}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");
      } catch (e) {
        addFeed(`Submit failed ❌ (${canonicalName}): ${e.message}`, "bad");
      }
    }
  }

  // ---------- events ----------
// User guide popup (themed)
ui.btnOpenGuide && ui.btnOpenGuide.addEventListener("click", () => {
  try {
    const base = location.href.split("#")[0].split("?")[0];
    const root = base.replace(/\/[^\/]*$/, ""); // folder
    const url = root + "/userguide.html";
    const w = 440;
    const h = 660;
    if (window.alt1 && typeof alt1.openPopup === "function") {
      try { alt1.openPopup(url, w, h); return; } catch (e) {}
    }
    window.open(url, "irb_guide", `width=${w},height=${h},resizable=yes`);
  } catch (e) {
    console.warn("Guide popup failed:", e);
  }
});



ui.btnCloseGuide && ui.btnCloseGuide.addEventListener("click", () => {
  try { window.close(); } catch (e) {}
});

  if (!__settingsOnly) {
    ui.btnOpenSettings && ui.btnOpenSettings.addEventListener("click", openSettingsPopup);
    ui.btnOpenSettings2 && ui.btnOpenSettings2.addEventListener("click", openSettingsPopup);
  } else {
    ui.btnOpenSettings && ui.btnOpenSettings.addEventListener("click", openDrawer);
    ui.btnOpenSettings2 && ui.btnOpenSettings2.addEventListener("click", openDrawer);
  }

  ui.btnCloseSettings && ui.btnCloseSettings.addEventListener("click", () => {
    if (__guideOnly) {
    try {
      // Guide-only popup: hide main UI and show the guide panel
      const topbar = document.querySelector(".topbar");
      const panel = document.querySelector(".panel");
      const setupBlock = document.getElementById("setupBlock");
      const setupSummary = document.getElementById("setupSummary");
      const statusPanel = document.getElementById("statusPanel");

      if (topbar) topbar.style.display = "none";
      if (panel) panel.style.display = "none";
      if (setupBlock) setupBlock.style.display = "none";
      if (setupSummary) setupSummary.style.display = "none";
      if (statusPanel) statusPanel.style.display = "none";

      if (ui.drawer) ui.drawer.style.display = "none";
      if (ui.backdrop) ui.backdrop.style.display = "none";

      if (ui.guidePanel) ui.guidePanel.style.display = "";
    } catch (e) {}
  }

  if (__settingsOnly) {
    try { window.close(); } catch (e) {}
      return;
    }
    closeDrawer();
  });


  // FIX: null-guard backdrop
  ui.backdrop && ui.backdrop.addEventListener("click", closeDrawer);

  ui.optAutoDetect && ui.optAutoDetect.addEventListener("change", (e) => {
    settings = saveSettings({ autoDetect: !!e.target.checked });
    addFeed("Auto-detect fallback: " + (settings.autoDetect ? "ON" : "OFF"), "ok");
  });
  ui.optHighlight && ui.optHighlight.addEventListener("change", (e) => {
    settings = saveSettings({ highlight: !!e.target.checked });
    addFeed("Highlight during locate: " + (settings.highlight ? "ON" : "OFF"), "ok");
  });

  ui.optStrictDrops && ui.optStrictDrops.addEventListener("change", (e) => {
    settings = saveSettings({ strictDrops: !!e.target.checked });
    addFeed("Strict drop validation: " + (settings.strictDrops ? "ON" : "OFF"), "ok");
  });
  ui.optUseWikiCanonical && ui.optUseWikiCanonical.addEventListener("change", (e) => {
    settings = saveSettings({ useWikiCanonical: !!e.target.checked });
    addFeed("Wiki canonicalisation: " + (settings.useWikiCanonical ? "ON" : "OFF"), "ok");
  });

  // FIX: btnLockSetup uses existing helpers; no missing functions
  ui.btnLockSetup && ui.btnLockSetup.addEventListener("click", () => {
    const b = getSavedBingoId();
    const t = getSavedTeamNo();

    if (!b || b < 1) { addFeed("Set a valid Bingo.", "bad"); return; }
    if (!t || t < 1) { addFeed("Set a valid Team.", "bad"); return; }

    // ensure hidden inputs also set
    setHiddenIds(b, t);

    // keep names in sync with cache when available
    const bingoObj = findBingoById(b);
    const teamObj = bingoObj ? findTeamByNo(bingoObj, t) : null;
    if (bingoObj) localStorage.setItem("irb.bingoName", String(bingoObj.name || `Bingo ${b}`));
    if (teamObj) localStorage.setItem("irb.teamName", String(teamObj.name || `Team ${t}`));

    localStorage.setItem(LS.bingoId, String(b));
    localStorage.setItem(LS.team, String(t));

    setSetupLocked(true);
    addFeed("Bingo/Team locked ✅", "ok");
    playBeep("ok");
    pingApi();
    if (isSetupReady()) start();

    // Force-refresh after locking Bingo/Team so runtime state is clean
    try { setTimeout(() => location.reload(), 80); } catch (e) {}

  });

  ui.btnUnlockSetup && ui.btnUnlockSetup.addEventListener("click", () => {
    setSetupLocked(false);
    addFeed("Bingo/Team unlocked. Set values then Lock again.", "warn");
    playBeep("warn");
    stop();
  });

  
ui.btnAutoLocateChat && ui.btnAutoLocateChat.addEventListener("click", () => {
  if (!isAlt1) { addFeed("Alt1 not detected.", "bad"); return; }
  const ok = initChatReader();
  if (!ok) { addFeed("Chat reader unavailable.", "bad"); return; }

  // Use chatReader.find() then lock/save immediately
  try {
    chatReader.find();
    if (chatReader.pos === null) {
      addFeed("Auto-locate failed: chatbox not found. Make sure chat is visible.", "bad");
      if (ui.autoChatHint) ui.autoChatHint.textContent = "Chat not found — open chatbox and try again.";
      return;
    }
    saveChatPos(chatReader.pos);
    chatState.locked = true;
    chatState.usingFallback = false;
    chatState.confPct = 95;
    setChatPillLocked();
    tryOverlayRect(chatReader.pos, true);
    addFeed("Chatbox auto-located & locked ✅", "ok");
    playBeep("ok");
    updateAutoChatUI();
    updateSetupGating();
    refreshSetupState();
    updateSetupPanelWrapVisibility();
  } catch (e) {
    addFeed("Auto-locate failed: " + e.message, "bad");
  }
});

ui.btnLockIgn && ui.btnLockIgn.addEventListener("click", () => {
    const ign = (ui.ign?.value || "").trim();
    if (!ign) { addFeed("Enter your IGN first.", "bad"); return; }
    localStorage.setItem(LS.ign, ign);
    localStorage.setItem(LS.ignLocked, "1");
    setIgnLocked(true);
    addFeed("IGN locked ✅", "ok");
    playBeep("ok");
    refreshSummary();
    refreshSetupState();
    if (isSetupReady()) start();
  });

  ui.btnResetIgn && ui.btnResetIgn.addEventListener("click", () => {
    localStorage.setItem(LS.ignLocked, "0");
    setIgnLocked(false);
    addFeed("IGN unlocked. Update it, then Lock again.", "warn");
    playBeep("warn");
    refreshSummary();
    refreshSetupState();
    stop();
  });

  // Ensure Barrows chest lock reset button exists (if settings HTML doesn't include it)
  try { __ensureBarrowsResetButton(); } catch (e) {}
  try { __ensureBarrowsDebugButton(); } catch (e) {}
  // Barrows chest lock reset (Settings)
// Use delegated click handling so it works even if the settings drawer DOM is rebuilt.
(function () {
  const handler = (ev) => {
    const t = ev && ev.target;
    if (!t || t.id !== "btnResetBarrowsLock") return;
    ev.preventDefault && ev.preventDefault();

    try { __saveBarrowsChestLock(null); } catch (e) {}
    try { localStorage.removeItem("irb_barrowsChestRect"); } catch (e) {} // legacy cache key

    __barrowsChestSeen = false;
    __barrowsChestLastScanKey = "";
    __barrowsChestLastScanMs = 0;
    __barrowsChestScanDone = false;

    try { __statusChest("Lock cleared. Hover the chest and press Alt+1 to re-lock.", "warn"); } catch (e) {}
    try { addFeed("Barrows chest lock cleared. Hover the chest and press Alt+1 to re-lock.", "warn"); } catch (e) {}
    try { playBeep("warn"); } catch (e) {}
  };

  // Attach once
  if (!window.__irbBarrowsResetHooked) {
    window.__irbBarrowsResetHooked = true;
    document.addEventListener("click", handler, true);
  }
})();



  // Ensure Barrows chest lock reset button exists in the Settings drawer (create if missing)
  function __ensureBarrowsResetButton() {
    try {
      let btn = document.getElementById("btnResetBarrowsLock");
      if (btn) return btn;

      const anchor = document.getElementById("btnResetIgn") || document.getElementById("btnUnlockSetup");
      if (!anchor || !anchor.parentNode) return null;

      btn = document.createElement("button");
      btn.id = "btnResetBarrowsLock";
      btn.type = "button";
      // match styling of the IGN reset button when possible
      btn.className = anchor.className || "btn";
      btn.textContent = "Reset Barrows chest lock";
      btn.title = "Clears the saved Barrows chest position (press Alt+1 to re-lock).";

      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      return btn;
    } catch (e) { return null; }
  }

// Ensure Barrows chest debug toggle button exists in the Settings drawer (create if missing)
function __ensureBarrowsDebugButton() {
  try {
    let btn = document.getElementById("btnToggleBarrowsDebug");
    if (btn) return btn;

    const anchor = document.getElementById("btnResetBarrowsLock") || document.getElementById("btnResetIgn") || document.getElementById("btnUnlockSetup");
    if (!anchor || !anchor.parentNode) return null;

    btn = document.createElement("button");
    btn.id = "btnToggleBarrowsDebug";
    btn.type = "button";
    btn.className = anchor.className || "btn";
    btn.style.marginTop = "6px";
    btn.title = "Toggles live overlay for detected chest bounds and matched loot icons.";
    btn.textContent = `Debug chest overlay: ${__debugChestOverlayEnabled ? "ON" : "OFF"}`;

    btn.addEventListener("click", () => {
      __setDebugChestOverlayEnabled(!__debugChestOverlayEnabled);
      try { addFeed(`Barrows debug overlay ${__debugChestOverlayEnabled ? "enabled" : "disabled"}.`, __debugChestOverlayEnabled ? "ok" : "warn"); } catch (e) {}
    });

    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    return btn;
  } catch (e) { return null; }
}





function __rescaleImageDataNearest(img, scale) {
  const sw = img.width | 0;
  const sh = img.height | 0;
  const dw = Math.max(1, Math.round(sw * scale)) | 0;
  const dh = Math.max(1, Math.round(sh * scale)) | 0;

  const c = document.createElement("canvas");
  c.width = dw;
  c.height = dh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  // Nearest scaling for crisp UI pixels
  ctx.imageSmoothingEnabled = false;

  const srcC = document.createElement("canvas");
  srcC.width = sw;
  srcC.height = sh;
  const srcCtx = srcC.getContext("2d", { willReadFrequently: true });
  srcCtx.putImageData(img, 0, 0);
  ctx.drawImage(srcC, 0, 0, dw, dh);

  return ctx.getImageData(0, 0, dw, dh);
}

function __getBarrowsCloseTemplateScaled(scale, featW, featH) {
  if (!__barrowsCloseImgData) return null;
  const s = Math.max(0.5, Math.min(2.0, scale));
  const key = `${s.toFixed(3)}|${featW}x${featH}`;
  const cached = __barrowsCloseCache.get(key);
  if (cached) return cached;

  const imgS = (Math.abs(s - 1.0) < 0.001) ? __barrowsCloseImgData : __rescaleImageDataNearest(__barrowsCloseImgData, s);
  const featGray = __downsampleImageDataToGrayRect(imgS, 0, 0, imgS.width, imgS.height, featW, featH);
  const feat = __centerAndInvStd(featGray);
  const t = { w: imgS.width | 0, h: imgS.height | 0, feat, scale: s };
  __barrowsCloseCache.set(key, t);
  return t;
}

function __getBarrowsTopbarTemplateScaled(scale) {
  if (!__barrowsTopbarImgData) return null;
  const s = Math.max(0.5, Math.min(2.0, scale));
  const key = `${s.toFixed(3)}`;
  const cached = __barrowsTopbarCache.get(key);
  if (cached) return cached;

  const imgS = (Math.abs(s - 1.0) < 0.001) ? __barrowsTopbarImgData : __rescaleImageDataNearest(__barrowsTopbarImgData, s);
  const featGray = __downsampleImageDataToGrayRect(imgS, 0, 0, imgS.width, imgS.height, CHEST_TEST.featW, CHEST_TEST.featH);
  const feat = __centerAndInvStd(featGray);
  const t = { w: imgS.width | 0, h: imgS.height | 0, feat, scale: s };
  __barrowsTopbarCache.set(key, t);
  return t;
}



  ui.btnRecalibrate && ui.btnRecalibrate.addEventListener("click", () => {
    locateChatboxAndStore();
  });

  ui.btnScanChats && ui.btnScanChats.addEventListener("click", () => {
    if (!chatReader) initChatReader();
    scanChatboxes();
  });

  ui.chatSelect && ui.chatSelect.addEventListener("change", () => {
    const idx = parseInt(ui.chatSelect.value || "-1", 10);
    const sel = scannedChats[idx];
    if (sel) tryOverlayRect(sel.pos, true);
  });

  ui.btnHighlightChat && ui.btnHighlightChat.addEventListener("click", () => {
    if (!ui.chatSelect) return;
    const idx = parseInt(ui.chatSelect.value || "-1", 10);
    const sel = scannedChats[idx];
    if (!sel) { addFeed("Select a chatbox first.", "bad"); return; }
    tryOverlayRect(sel.pos, true);
    addFeed("Highlight shown.", "ok");
  });

  ui.btnLockChat && ui.btnLockChat.addEventListener("click", lockSelectedChat);
  ui.btnUnlockChat && ui.btnUnlockChat.addEventListener("click", unlockChat);

  // --- WebAudio beep ---
  let __irbAudioCtx = null;
  function playBeep(type = "ok") {
    try {
      if (!__irbAudioCtx) __irbAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = __irbAudioCtx;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = type === "bad" ? 220 : (type === "warn" ? 660 : 880);

      o.type = "sine";
      o.frequency.value = freq;

      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.13);
    } catch(e) {}
  }

  // --- Dev: mock drop ---
  function addMockDrop() {
    const picks = [
      ["Magic logs", 71],
      ["Ahrim's hood", 1],
      ["Onyx", 2],
      ["Rune bar", 50],
      ["Hydrix bolt tips", 25]
    ];
    const [name, amt] = picks[Math.floor(Math.random() * picks.length)];
    addFeed(`Mock Drop: ${name} x${amt}`, "ok");
    playBeep("ok");
  }
  window.addMockDrop = addMockDrop;

  // ---------- boot ----------
  if (__settingsOnly) {
    try {
      if (ui.drawer) {
        ui.drawer.style.width = "100vw";
        ui.drawer.style.maxWidth = "100vw";
        ui.drawer.style.transform = "translateX(0)";
      }

      const hdr = document.querySelector(".drawerHeader");
      if (hdr && !document.getElementById("btnClosePopup")) {
        const btn = document.createElement("button");
        btn.id = "btnClosePopup";
        btn.className = "iconBtn";
        btn.type = "button";
        btn.title = "Close Settings";
        btn.setAttribute("aria-label", "Close Settings");
        btn.innerHTML = '<span class="icon">✕</span>';
        btn.addEventListener("click", () => {
          try { window.close(); } catch (e) {}
        });
        hdr.appendChild(btn);
      }

      if (ui.btnCloseSettings) ui.btnCloseSettings.style.display = "none";

      const topbar = document.querySelector(".topbar");
      const panel = document.querySelector(".panel");
      const setupBlock = document.getElementById("setupBlock");
      const setupSummary = document.getElementById("setupSummary");
      const feedHeader = document.querySelector(".feedHeader");
      const feedMeta = document.getElementById("feedMeta");
      const feed = document.getElementById("feed");

      if (topbar) topbar.style.display = "none";
      if (panel) panel.style.display = "none";
      if (setupBlock) setupBlock.style.display = "none";
      if (setupSummary) setupSummary.style.display = "none";
      if (feedHeader) feedHeader.style.display = "none";
      if (feedMeta) feedMeta.style.display = "none";
      if (feed) feed.style.display = "none";

      openDrawer();
      if (ui.backdrop) ui.backdrop.style.display = "none";
    } catch (e) {}
  }

  addFeed("Plugin loaded.", "ok");
  try { startIdleTicker(); } catch (e) {}
  pingApi();

  // NOTE: removed setupPremiumSelectUI(); it was undefined and crashed boot.
  await loadAllowlistFile();
  try { await ensureBarrowsCloseTemplateLoaded(); } catch (e) { console.warn("[BARROWS CHEST] close template not loaded:", e.message); }
  try { await ensureBarrowsTopbarTemplateLoaded(); } catch (e) { console.warn("[BARROWS CHEST] topbar template not loaded:", e.message); }


  loadBingosAndPopulate();

  window.IRB = window.IRB || {};
  window.IRB.reloadBingos = loadBingosAndPopulate;

  if (isAlt1) {
    initChatReader();
    initHistoryPanel();
    refreshSummary();
    refreshSetupState();

    if (isSetupReady()) { start(); addFeed("Running. Waiting for drops…", "ok"); }
    else addFeed("Finish setup to enable auto-submit.", "warn");

    if (!loadChatPos() && loadSettings().autoDetect) {
      tryFindChatbox("startup");
    }
  } else {
    setPill(ui.apiPill, "API: —", "warn");
    setPill(ui.chatPill, "Chat: —", "warn");
    initHistoryPanel();
    refreshSummary();
    refreshSetupState();
  }


  // Alt1 Hotkey: use Alt1's configured "Alt+1" (rightclick) to trigger a manual scan/submit
  function bindAlt1ManualHotkey() {
    if (!window.alt1) return;
    // Preferred newer API (not available in some builds)
    const rc = window.alt1?.events?.rightclick;
    if (Array.isArray(rc) && typeof rc.push === "function") {
      rc.push((obj) => {
        try { console.log("[Alt1] rightclick event", obj); } catch (e) {}
        if (!__loadBarrowsChestLock()) { __locateBarrowsChestFromMouse(); } else { __forceBarrowsChestScanNow(); }
      });
      return;
    }

    // Legacy callback (works on older/mid Alt1 builds; may show a deprecation warning in console)
    window.alt1onrightclick = (obj) => {
      try { console.log("[Alt1] alt1onrightclick (legacy)", obj); } catch (e) {}
      if (!__loadBarrowsChestLock()) { __locateBarrowsChestFromMouse(); } else { __forceBarrowsChestScanNow(); }
    };
  }

  // Bind hotkey after everything is defined
  bindAlt1ManualHotkey();

})();


// --- Added: Universal broadcast drop detection ---
function normalizeIgn(raw) {
  // Strict, deterministic IGN normalization:
  // - remove leading/trailing whitespace
  // - strip any leading non-alphanumeric noise (icons, bullets, etc.)
  // - enforce alphanumeric-only (your requirement)
  // - case-insensitive comparisons are done by caller via .toLowerCase()
  raw = (raw || "").toString().trim();

  // Remove leading junk (icons/prefix punctuation) but keep the rest intact for now
  raw = raw.replace(/^[^A-Za-z0-9]+/, "");

  // Enforce alphanumeric-only IGN
  return raw.replace(/[^A-Za-z0-9]/g, "");
}

function stripChatPrefix(s) {
  // Goal: reduce lines like
  // "[00:00:39] ☠ [Iron Rivals] News: ifwewerecgim has received ..."
  // to:
  // "ifwewerecgim has received ..."
  let t = (s || "").toString();

  // 1) Remove leading timestamp blocks like "[17:36:57]" (one or more)
  t = t.replace(/^\s*(?:\[\d{1,2}:\d{2}:\d{2}\]\s*)+/, "");

  // 2) Remove leading non-alphanumeric noise (icons, bullets, punctuation) before tags/labels
  // Keep '[' so we can still strip bracket tags next.
  t = t.replace(/^\s*[^A-Za-z0-9\[]+\s*/g, "");

  // 3) Remove one or more leading bracket tags like "[CC]" "[Iron Rivals]" etc (repeat)
  t = t.replace(/^\s*(?:\[[^\]]+\]\s*)+/, "");

  // 4) Remove leading % and optional bracket tag(s) that sometimes precede News:
  // e.g. "% [CC] News:" or "%[Iron Rivals] News:"
  t = t.replace(/^\s*%\s*(?:\[[^\]]+\]\s*)*/i, "");

  // 5) Strip "News:" label (case-insensitive), allowing extra whitespace
  t = t.replace(/^\s*news\s*:\s*/i, "");

  // 6) Finally, strip again any leading junk/icons that might remain after removing tags/labels
  t = t.replace(/^\s*[^A-Za-z0-9]+/, "");

  return t.trim();
}

// Patch into existing parse function if present
if (typeof _tryParseReceive === "function") {
  const __originalTryParseReceive = _tryParseReceive;

  _tryParseReceive = function (text) {
    // First try the original parser
    const result = __originalTryParseReceive(text);
    if (result) return result;

    // Then try broadcast parsing
    let t = stripTimestampPrefix(text);
    t = stripChatPrefix(t);

    const lockedIgnRaw = (localStorage.getItem(LS.ign) || "").trim();
    if (!lockedIgnRaw) return null;

    const lockedIgn = normalizeIgn(lockedIgnRaw).toLowerCase();
    if (!lockedIgn) return null; // if locked ign normalizes to empty, don't match anything

    // Broadcast format:
    // "IGN has received some Item drop!"
    // "IGN has received an Item."
    // "IGN has received Item (x 3) drop!"
    //
    // Improvements vs old version:
    // - IGN capture is strictly alphanumeric (no icons, no spaces)
    // - "drop" is OPTIONAL (many broadcasts omit it)
    // - quantity parsing supports "(x 3)" and "x 3" variants
    const reBroadcast = new RegExp(
      "^([A-Za-z0-9]+)\\s+has\\s+received\\s+(?:some\\s+|an?\\s+)?(.+?)\\s*(?:\\(?\\s*x\\s*(\\d+)\\s*\\)?)?\\s*(?:drop\\b.*)?$",
      "i"
    );

    const m = t.match(reBroadcast);
    if (!m) return null;

    const ign = normalizeIgn(m[1]).toLowerCase();
    if (!ign || ign !== lockedIgn) return null;

    const item = (m[2] || "").trim();
    if (!item) return null;

    const amt = (m[3] || "1").trim();

    return { drop_name: item, amount: amt };
  };
}
// --- End broadcast patch ---
