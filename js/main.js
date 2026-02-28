
function __getImgProps(img) {
  // In this project we treat Alt1 captures and loaded templates as ImageData-like objects.
  // They already expose { width, height, data (RGBA) }.
  if (!img) return null;
  if (img.data && (img.width != null) && (img.height != null)) return img;
  return null;
}

/* IRB v2026-02-27-barrows-iconmatch2 (BARROWS ICONS)
   Fixes:
   - Manual-submit icon templates now load from /assets/barrows
   - Adds assets/barrows_icon_map.json and robust asset URL resolution
*/
(async function () {

  const BUILD_VERSION = "v2026-02-28-barrows-chestscan-minimal";

  console.log("IRB v2026-02-27-barrows-iconmatch2 ✅");
  try {
    const sub = document.querySelector(".subtitle");
    if (sub) sub.textContent = `Drop auto-submit • v2026-02-28-barrows-chestscan-minimal`;
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
    btnOpenSettings: $("btnOpenSettings"),
    btnCloseSettings: $("btnCloseSettings"),

    // Settings - setup
    setupState: $("setupState"),
    btnUnlockSetup: $("btnUnlockSetup"),
    btnResetIgn: $("btnResetIgn"),

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

  function showEvent(title, subtitle, level = "ok", flash = true, sound = false) {
    if (!ui.eventLine || !ui.eventTitle || !ui.eventSub) return;
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
  featW: 96,                  // downsampled feature width
  featH: 10,                  // downsampled feature height
  acceptScore: 0.78,          // UI match threshold
  // Chest geometry relative to the matched topbar crop
  chestWidth: 560,
  chestHeight: 312,
  topbarInsetX: 37,           // (560 - 486) / 2
  topbarInsetY: 0,
  debug: true,
};

const BARROWS_TOPBAR_URL = assetUrl("assets/ui/barrows_topbar.png"); // user-provided crop

let __barrowsTopbarT = null;          // { w,h, feat }
let __barrowsTopbarTLoading = null;
let __lastChestTestMs = 0;
let __lastChestSeenMs = 0;
let __lastChestRect = null;

async function ensureBarrowsTopbarTemplateLoaded() {
  if (__barrowsTopbarT) return __barrowsTopbarT;
  if (__barrowsTopbarTLoading) return __barrowsTopbarTLoading;

  __barrowsTopbarTLoading = (async () => {
    const img = await __loadImageToCanvasImageData(BARROWS_TOPBAR_URL);
    if (!img) throw new Error("Failed to load barrows_topbar.png");
    const featGray = __downsampleImageDataToGrayRect(img, 0, 0, img.width, img.height, CHEST_TEST.featW, CHEST_TEST.featH);
    const feat = __centerAndInvStd(featGray);
    __barrowsTopbarT = { w: img.width, h: img.height, feat };
    return __barrowsTopbarT;
  })().finally(() => { __barrowsTopbarTLoading = null; });

  return __barrowsTopbarTLoading;
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

function __chestTestTick() {
  if (!CHEST_TEST.enabled) return;
  if (!__barrowsTopbarT) return; // not loaded yet

  const now = Date.now();

  // Lazy-load cached rect from localStorage once per session (optional).
  if (!__barrowsChestCache) {
    const saved = __loadChestCacheFromLocalStorage();
    if (saved) __barrowsChestCache = saved;
  }

  // If we have a cached rect, validate it cheaply and avoid full scanning.
  if (__barrowsChestCache) {
    if (now - __lastChestValidateMs < 350) return;
    __lastChestValidateMs = now;

    const v = __validateChestCache(__barrowsChestCache, __barrowsTopbarT);
    if (v.ok) {
      __barrowsChestCache.lastSeenMs = now;
      if (CHEST_TEST.debug) {
        __drawChestRect(__barrowsChestCache, true);
      }
      return;
    }

    // Validation failed → clear cache and re-detect.
    if (CHEST_TEST.debug) {
      console.log("[BARROWS CHEST] cache invalid (score:", v.score.toFixed(3), ") → re-scan");
      __drawChestRect(__barrowsChestCache, false);
    }
    __barrowsChestCache = null;
    __saveChestCacheToLocalStorage(null);
  }

  // No cache: do a throttled global scan.
  if (now - __lastChestScanMs < CHEST_TEST.cooldownMs) return;
  __lastChestScanMs = now;

  const found = __detectChestGlobalOnce();
  if (!found) {
    if (CHEST_TEST.debug && now - __lastChestSeenMs > 2000) {
      console.log("[BARROWS CHEST] not found (global scan)");
    }
    return;
  }

  __barrowsChestCache = found;
  __saveChestCacheToLocalStorage(found);
  __lastChestSeenMs = now;

  if (CHEST_TEST.debug) {
    console.log("[BARROWS CHEST] detected score:", found.score.toFixed(3), "rect:", found);
    __drawChestRect(found, true);
  }
  showEvent("Chest test", `Barrows chest detected (score ${found.score.toFixed(3)})`, "ok", true, true);
}

function __adaptiveThresholds(bestName) {
  const baseAcc = (ICON_MATCH.acceptScore == null ? 0.78 : ICON_MATCH.acceptScore);
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

  wrap.style.display = (sl && il) ? "none" : "";
}
// ---------- UI render (no storage writes) + cross-window sync ----------
  function renderSetupLockedUI(locked) {
    setVisible(ui.setupBlock, !locked);
    setVisible(ui.setupSummary, locked);
    initHistoryPanel();
    refreshSummary();
    refreshSetupState();
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
    try { __chestTestTick(); } catch (e) { console.warn("[BARROWS CHEST] tick error:", e.message); }

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
  if (!__settingsOnly) {
    ui.btnOpenSettings && ui.btnOpenSettings.addEventListener("click", openSettingsPopup);
    ui.btnOpenSettings2 && ui.btnOpenSettings2.addEventListener("click", openSettingsPopup);
  } else {
    ui.btnOpenSettings && ui.btnOpenSettings.addEventListener("click", openDrawer);
    ui.btnOpenSettings2 && ui.btnOpenSettings2.addEventListener("click", openDrawer);
  }

  ui.btnCloseSettings && ui.btnCloseSettings.addEventListener("click", () => {
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
  });

  ui.btnUnlockSetup && ui.btnUnlockSetup.addEventListener("click", () => {
    setSetupLocked(false);
    addFeed("Bingo/Team unlocked. Set values then Lock again.", "warn");
    playBeep("warn");
    stop();
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
  pingApi();

  // NOTE: removed setupPremiumSelectUI(); it was undefined and crashed boot.
  await loadAllowlistFile();
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
        barrowsHotkey();
      });
      return;
    }

    // Legacy callback (works on older/mid Alt1 builds; may show a deprecation warning in console)
    window.alt1onrightclick = (obj) => {
      try { console.log("[Alt1] alt1onrightclick (legacy)", obj); } catch (e) {}
      barrowsHotkey();
    };
  }


  // -------- Minimal Barrows Chest Auto-Scan (no OCR; minimal deps) --------
  // Alt+1:
  //  - If no chest lock saved: locate via topbar template global scan, save position.
  //  - If lock exists: force a scan now and report found items / none.
  const BARROWS_LOCK_KEY = "irb.barrowsChest.lock.v1";
  const BARROWS_SCAN_CFG = {
    // Template match acceptance for locating/validation
    locateMinScore: 0.70,
    validateMinScore: 0.70,
    // Scanning cadence while chest is present
    autoScanMs: 900,
    // Slot grid relative to detected topbar (tuned for 100% UI scale; good enough to start)
    iconSz: 32,
    slotCount: 10,
    slotStartX: 22,
    slotY: 32,
    slotSpacing: 44,
    // Icon acceptance
    iconAccept: 0.70,
  };

  let __barrowsTopbar = null;          // { w,h, gray, mu, invStd }
  let __barrowsLock = null;            // { x,y,w,h,lastSeen }
  let __barrowsLastAutoScan = 0;

  // Embedded topbar PNG (486x35) to avoid asset-path issues.
  const __BARROWS_TOPBAR_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeYAAAAjCAIAAADOoz4rAAAQAElEQVR4Aey8d5wk13Xfe86tqu7Js3Fm02zOGYucCYAUA0gARGYAkQGCpBntpz9sWX62JVmyn4MkP3/sZz09SxRNiSIp0aQiA0SACQRBIi2w2F2ExcbZSd0z09OhwvueW9UzgwUFArL1+dgyzvzq3nNPPrdu1fT2gHTnXH7puVde/vafu/AD15x7z40X3HvTBYx333A+gL/v5ovuv+Wi+26+EOa2a8/+wHvOAh+8Zt9t15x9+3Xn3PHe8+5477l3Xn/evTdf9OH3XfbhWy/FDNx/y8X333rJ/bde/OFbL3ngfZc+8P7LPvKByz/6wbeAj7XHj3/oSvD3brviY7ddQcZ7bjj/LkK99xxGD2Puvv48VAQExMzLuN/queiu68/9+Acv/Oj7zvv4By782Acvufv6825/z947r91393X77nnv3vtv3Hf/TWd/9NZzH7hp34dv3PfAzWffdd2eu6/be98NZ6H68E37GDFDeNd1e+9+7957r5+T33Xt7nuuJ4JJCvsbLeZd1+7BBctceP8NZ8GT9I5r9pE3x13XnX33e8+55/pzGZHccc1ZSO5B8t5zkBiuO/ue68+++7qz7rxmdx7wvuvPyiskLPXcfZ1lgadI5PdevxeGJenuv9FKso5u2nfv9Wdhefd1VjlmuZBQxATIrdT37r3v+r33XLf3zmv23nktlVDn2Xdce/ad19ne3sPe3nD+PTecf++N59930wX33dgGvMe9N15wzw3n3Xnt2R96997b33PWndexh+fcdd05d1yz74PvZnnuvTecf/+NF374JsN9BLnhfPiP3HLxAzdfeP+NF9x/I9rzP3LLRX/v/Zd+9NaL77+J+Odj9sAtF33k1os/wgm56YJ72hv1oXfv+cA7d4E7rt51+7v33Pau3WS869qz77xmH+lg7rnuXPgPXb3njvfsvee959x3/XkfufnCj9168Sc/eNknP3j5p257y6c/dMWnb3vL37/9yn9w51WfueNKhJ/44OUIP3P7lX//DiRXffr2Kz552+Uf/8Bl1MP4idve8onbLv8k44eu+PgHL//Y+y8FCD/5oSsYP/b+yyiYBmmfjHdes/fua/fdd/25H77x/I/eehHuOH7qQ1d8+nYiv/Uzd77103dc9anbr2QEn7z9yk/dcdUnPnTFx297yydvv+rTd77t03e97ZNIbr+S5Sduv/KjH7jsnhvY+fNuv+as267efdu7rOU73r33zmu4p3Z47r3hvPvY25sufOCWiz/CE8SWgjbz0fdfRnmM81QXP3BrjksewMzjw7de/GE2+eaL7rvxQn8ryTgHnhdqQH7vTRfef/NFwB6xmy/CxRzx5ZaxvPWSj7z/MnJ99AOX8+TytMLcd9OFd19/7n03XcB429V7DP6E3HHtPp7cO649+/Zr9t1+DSftHE6ax7l3vfc8VMZfe/Yd1+y7w7R2Du+5/vz7biIpZV/Ki+Ij75vLRTpykd3k778MxvCByz7ygctM/oHLHnj/pbxkeD9wVDg5f7dxy8/tuO4tW3duHBAR51y4sic7b8vg26+86D1Xv+3qd1zx9qsueuvl57zlwt0X7dty7q41Z21dsWfz4K4Ni8/ZuuzcrcvO2Tp49paBfVuW7t20ZM/GRXs2Lt69YdH2NX1bVnVtGeretqYPbF3du3WoZ+tQ75ahns2rujev7Nq0onPj8g6woT2uGyyB9cvKG5aVd6xbsGP9wl2E2riE0cOYnRsWoSIgIOa2Nf3b1vRtXW0pqGfd8v6NqxatW9G/YXkPlnu3Ltu9eWDnpoEdG5dtXTewde3SjUOLN68d2LJuYPOapbs2Ld+5adm29YOotqwdYMQM4a5Ny3ZuXLZ9w5x81+YVOzYQwSSF/TqLuWvzclywzIVb1w/Ck3TPlgHy5ti1aenOjUt2bFjMiGTPlkEkO5BsXILEsGnpjg1Ld24a3L1lRR5w24ZBQm1dt2zXlqFzdm04b++WC87ecdG5ey654NxLLzl/+4ZlVGsZrXIryTpaO7B9w+DOTdYRjDVIm2sHCEVMsHPTMit147JtG5bt2LRs95Zlu7mDm6hz6Z7NS3dvsr3dwd6uX7hj/cLt6xZuW7tg27o24D22r+OmLNq9eelZ25bt3Tq4exN7uGTXpiV7tgycvY3l4u3rF25d179lrWEbQdYvhN+0unfzmv6t6xZsXYd24abVfetXdm8c6t26lvgLMdu8um/TUC9mSHa0N+qsbcvP2bkS7Nm+cu+25ft2rCDjLkrdMkA6mB2bFu/eMnDW9uV7ti5jP7dtWLRpTf+God41y7vWLO9cvaxjaLA8tKxj5UBpxZJo1dISwrXLOxGuGiitXIokGhoor1nWuW5FF/Uwrl3WsXZZ5xrGwfK65Z0bVnaDtcs61gyWGTes7KI8GqR9MrKBOzezvYu3rFu4cagPdxxXD5aHBogcrloSDi2NVg+UGMGagdLqpdHawfI6og1EQ0uCocXBGiQDpTUD0dqB0sYVXWz7jvWL9m4Z3Ld9xb4d1vKebct2b+Ge2uHZvn7RNvZ2bf/m1b2bhnoYDW1m48ouymOcp+rdPJSjZzNmHluGeres7t26pm/bun5/K+1e71hfjDs3LIJHvn1tPzbAnqw1fbiYI77cMpZDPZtWdpFr44pOnlyeVphta/t3bljMmWHct325wZ+QPZsHeHI5YHu3DOzdsnTP5iW7N+VYvGvjol083Sw3L+WG7jGtncMdGxZuW0tSyu7mRbFp1Vwu0pGL7CZf2QVjWNG1aUXXxhWdm1Z0bV7ZvXWoZ8e6BRwVTs7fAZy3a+j8PWsv2rfh0nO3XH7hzqsuPevtV55/9Tsuve49b73phquvu+Zt17zt3At2rXJ9rrZ9aOH6NStrtZln9h/Yv/+5Zw88/9yhlw69cPT5IydePHr6yPHRoycmjp6qHB+uHj89eeL01Jv4H7sDx4cnjw9Xj52cePnE2EvHRl58efj5l04ceuHlg4df/h+b6M1ob+7A/zI78L/fe4a367HhytGT47xyXzo6/MKRk4dfOHbw0JFnn3v+wIHDU5NTmzasveLiPa6vlK4dWpak2f6nn/3JE/t/8sSzTz598OlnXnjmuSMHDh07+PyJQy8OHz5y+oWXR184OvbisfE38bexA+zt8y+PHn7p9KEXTz33/PFnDx3df+Cl/c++8LeR682Yb+7AmzvwP+EO8BLgNXv4yMihl4YPvnDywOFjzxw88vSzLzz59KEnnzrwzDMHG83W1i0bXbkU9HR31ev10dGJkfGZw8eqhqM2Pg8P80ocOlqZj8NHK2C+BB7JPFQPvzLCay8PHZ2Lf7jteGie8NDRql8ygjnjv154hs3PXL6xgg8ftR2YHX0ZpKC2HPD/XZiN7Jk3Vlu7GCvg8NHC99BRW7ZHimTJCGDmAwmYL/kb8EQAhaNvYXa7inoOtwt7bebQvLIPt10OzRMeOkqiWRQZ2wa5/AzhG13mQRjN8fDR2UZgzujl1ZJXGLSrsjjwh48W2kNHC8mho2SZxaxwlslVs8u/AZNHYDTfw0cpeD6Keg4fzRmzOXT0DY254xsa5wqYl4sKwRtK/WpjIoAz5EgAwnyEMRwuWv7pwlntz2J+ai95fFMdeuVmHm4nnWXs3Zu/fhmPVYfHZ8bGKzO1mZ6eLuecZmmSJnzOTmuNZGwynpyRyYZMNXSyodWZrDKTTdQM1RmBH5tKTlfi05UWGJtMUCGcmM4q0ykGgGUFyxqOUqlnBWbaDBJ4gEEtnfAYn05AxfMTtWxiOi1QS300C1VIptNKzZaVGumyai0jY15kBTn2hgwe+/HpdHwqtXHaAlZqjKaqmKUxs7mQEIrR7KesmAlfEuMEXrU8aWbFUH+OmXnL2X5ninpwHJ+Kx6cSyiAswWEMtYzlLCbYt1pmKSgVUO1UOjFNOuAtLYuYPSnyvIwIGXPAgxrGqcWp0S9Jk0otX2ZEK1BLrX4zlkJiiTJ/s17HZvra/kabGdM+t8lnb/dCGbP15wwjQmC9ZLO9cDByfqI2r5fpxKLVbLcnpgs5LXuhtWkZvdZLMlPRfg3GR25vNe1M2CaklRpBTAuTA7mBIDWTFwdjKq7UEnopjhw3BS1jPbVzPpNZOhqpizEs0dZ8xlpqR2J69taQDkk6MW1MYeztLWm7JJPbORdrhyzegPImahQMskrNgvjauO/GexUxUc1hghqmTVupmZAUnMzxqZiS5iITHy2j1Z9ZatJ5fryWWQofYaJmeSemszxUPk7UyHhm/LH2EzR7B3Pj+ZGLTfNZvFzMhhpm7M5S2/i0PURkR86ScaIo45UFWD1WwDh3FviziiX2HtQMMlJw4+z21YifVeiFXLWieG8v2ICJmkVDYsCghjsS/2aopWjNt5ZhacjrZ5yZ/5aTihnYszZabY1MNMHpiebpisdEY3i8cWqscWrcmNOVxgjyiQYMBvAjldZIpYnjxJS9k6frcZplScpP7EQ1bjWTuMXfIlWkVIp6+3q6ujo7OsqljhIol0rlUgRKjB1lFKbs6Ojs7Ojq7jR0dnZ1dbDsKJcxLZVKET+lKCqFkVEYhTZFYT5FJkcbRSEIjYIwDLjCMPKOpXJEDPgwCucRC0MUhVHEZSM20SsIYWhC/AkVGTGXS6WigcjiRVGIgCzlUmRyGi2XOrs6AY10dJTKpjDTANMwjMKoIOsoX+QjYpgwQl7Kay6VyiX2oaOj3NFZ7gRdbE5nRyeyclSOolJUKhsiXCxuGEVhCSpzgSgqzQLT0ETMJgwjo9CcYMKQwUActJGJQ09spOMKw8g7WjoMShiEBUXMXIYosjihH7EHYTRLsCGSOUSw9FeyTSuROIxCDMJSyToqlyLkqGmVnezs6vCbWbatKEMlKMIS6wivKGIMIyOC2BRFhCSI58M2WStBiAx3gpt3qRSWItMzRFywjFEUmZldMCUyRRYwKig0YRTlci8zlquMJYnDCAPAqhyVyhG9gI5SiYPdaTexg7vJPeXGlr1LVMI5ikogjOYIHpQiQgIvD8MoDMOgDWS45r1YiBLKHFFglhiDMIpyREaWhRkJI4AJKSDK5WQzlHxMRGFovlFUCkvlqFw2w6hcKpetly5/zq0XOvEolXNn7EEYmS9j5KlgSrlJuQRF0euL743xD9sU5VSKolKYsxYJzlZhhDwKLb7PRbUcJDs8HeUuXi8Ge4qs2rINpbLvi1BhGEa4l6zH3D+KotI8oDUg9VOuiuDDyCgMw6gAc+gpColQKkXtLBFSHquAKUfkyUKFnouwiCBb2RWx+aaNgsAt6CktXdCxZEEHI4BZ0t+xpL+8dEF5qY0dXsiyY2k/KC9ZUF7s5Yv6Sl0dpSAIeDPzfuYtHTcbTkWTuJkk9srORJwLolKUZlmzlbRacZwmSZrGaRInCas4jp1qFDkP3rMuTbOEV3+axUnabLaajVa93mo0mvVmq258s15vsvQweQObVtwCcdyKSZE04cnleURxnMRxVWxMugAAEABJREFU6mEqgszULVSzacpmK240Wj5mXG80m8240WzWGxa5SeRm3DS04OMkSSguS9PUrjRJW60Y9xa5POKWZUniBFAJqiRJMsmgJM1acYqw1YpbraQZx6DVwj0hPgU06pYRhkrq9Va90WxYv034Rh0+TgiRio9GlgTfJIbSJDaQutVCCCxmHJM59ZQxxklKalpoNmIL2GjWi+DEn7+ZrQYtt6jQdiYP2LRl0ooTliaNSUsBIEFVb7RsM+vsT9yiqdb8zTRho9FsNFqNRrNJ5GbcNLRwjJOEwrLMBq40SVuWiNRJq5m0Wknc3kx6ySPjYe1LlqaCQaNB2Fa90aw3Qatef2UvdctLohZhKSymPCu4GVtwAsYFJWxObMK43rBeZgjXjDHAt9GICZsnajRbhkar0WjC0E6rGTcbrWYzjuPEN0Mf1JamSdqKkxZ5DcZYLy1uU4JlnCTNVgJZL1mWpYKw2fD71mjVm81Gs1VvNMkLGo2Woc5IwrjJLY79yWFswRDc0GzFUBKncZ46TgkyU2/NNJq4t1rsatxs+hT1VqNpaLYsJtpGE4pb9GJotVoJQegk9Yc8SdI4TpvkbcUtQxK3UiQeSZK3GSe0kUnGw54kWbMZc2Lrdeui0bTR+Hqz0fCokzfPkaVpmrz++FmWphn2rVbSjNlD7hEMoxXWbMWNRou8NvpE9brfQwpoNtlPL2+1WgmHx5eaEQqvfOdoJI5TWsOg5Y9fq2Vh0yT1lGUkT9M4sbzNZqvZtP2EaTRoqsWIpN6AKQ5MHtmE9RY3AhWSOE7iOPVIqLvVSlpxcfuMt6UlxbLRJFQO4jeLXhrNerNVbzRpc3Ff1Ncd9HUZejuDvs6gvztc0BPlgEdo6Ap6c3QGvZ2up8Mt6ouiUGiKm8UrO6WQVsOxiFvNJI4RAdsg1dQmLtFMxf+oJ+5zM47rDUqhxLw4SmqyC9TdosuEF1Xq3fE1V/MmrneHVymEyrt/diESsHQiKMWTMqqKehK1lR+F96C/qNtmX6SgMhNmsxcGUVGDqjqqxppOxJI4IbWo4I0zCpg4SdjoRqMxU2Pg/seZ0Ag2Qht8dwQUYpUDXglBTCa1XcIh4zlIoZhHtOn3Z6Y5M9OoE7LR4kExB5JlVo9CTi2s5GSFqIpCQk5VRgJnaXszkRhEvI0qBg6eFbDGWGSi9vMzNhMbIEYZAxegdrY2wx0oYhE1YoSz0VZnbKYGcuZmZlmxmXW/mfVms9lqxq0kSayV1JpXy6IqKkbaJtaq4vfEicIBEbaI5kRUZklFCxJFqH5kY+EzP9nIzTAepSIXaXsUt4yY6sQsJMvrIZGalFXuLypZkib1RpNbaPex3mw06KYVJ7HvhWYsgGaqAiya5iR2BwnPyjnTKRYihLdbowL5+gQdK1Wf2VZcAlkFfuKs5HdGMlFRQErNSYSl5iOTQJlpRSwLyTg/ONuWYylJljXsWDasl5mmPbd0E8dpSiNcuFrZKgqIpTmJX6t4et3x6xY6SROC4qrqgzhxVOVZL1FIREW4VCUvVzJfDgemyYuJgutNeyrrjXq9GSeJ+Hb87mWCDwED21gViN3KOKIKiapBbIRlFi7j2MnCPaM6VgKpCLo2bEYgSCUnVed3VZQf2yYnSmpR1k5EgRqJwKsKvahVQy9ZVorc6YnG9HizOdGqjzd/JhoTraQanx6rc1eUSL5OEUmSmC1xbEESt1ggonyMkiS1XWNrPBDiBvKNUREQsPax4Knc4NQZmSJQa8c4fwmjeFJRZsISNGNzvVmmQUAAwUodo4E1wjB0YaBh4NADVWUELjcTlYx4iGdBdANS+iIPzTrHCog4VWD+oiqiokpAp86IXJIJEoCLGQaOETUSMfI3WrCRNqGZQ6AW3mK1L9OJCUPacOQhHVlFGVQsuqqSQwVSFXhqMEimikxQBrmJFiTiFUz5TJOScfRQO3XONhNWuDTfJRUSBYHafgbFZiJR1cAZVMUgr38zxUhVHfmcenex0UcLHBSGTkRzwgIJYGlKpldAclImevEo9EJA51RIpI5wOUxovYR5L/5BUoQGV5ipiEHb5JcCKWKfgi1TTybEy6laO4hEsVHCUrKJil4Qq/VrUn8FjPoKEsFTILWZNLCWx2KLBoq7CrkUElVD4JRe7O5YO8rSjBE6ylHFXEV4Q2SKtXpiKZ5UmYozidY5lsySezoCqS1FxcIS0LFjsGpiVTefVAN9BYmoeNJ8VuxtzfL1xscFOJpyKpoTmwJ4NtWC2aXa1qmRU2+vpPP1mcwuEeVGIEIdOC8xR1EVR6vOL8SIFZv+GllE7Kibg10SWIUK4QjP24aHNb8pSNTbqBM1Eu4Uj5hTx4qHznY/IxtaaROaAhgFzjxz1faOjnM7u84qd+4udewpdcLsK3fOguVer0J7Xmf3pf39fWHoHWmFFEDSJElaTYc0SeKUX19wysV+8s8R/9mOanxRKYyIVxbVqBjjnBVPMPVrUYFU80ny2SRiPEuvsIXxyitf1Bk4k+pUVH4KqaJyjKqiXq+iyh1lEHXinBfmg6lElQUXgKEdJMhUFWP+2MoNE4iyaY79wE6VgM6agVMEIox8fHJ+ZiUCh4xJBLaAeDJ54eQnL2TQgpwGqqJISEdeGEMmeVYVVbUW/TabRkSBqqiqQArDZECQwxZcCkmuV6p18tdtpioqVcePQsJShNHatuSir9xMVclhRsJCICpUdSzUjPl9j8yQcX7Z6UxURLVoCwZImwreLNoiP6sKKFgH7w8GQiev7kWRSU7KrubdCFJkKsraqcIAJzCIAUwOEfWQNmlOdpLlle3QqmCtLjBlbiavJhXVQgqTw69VrQAEIqrqVFgCVVGZpTarGKgnyUUqajusnsR4LZxUJYeIekibVJU0Nqj7Kb2IKDum6DBUfGWWVP1SJZ+Rw+SAb0P1DcVXEYP6myhqM6OqExEVEZPYLHPEEggqP4mRenJK3QyKgjtjT64p/ZWJ3SEnKqp8xs68UBm5kIiqgXUO9kYxVnH+tIiKkYqqWgLnOTXZKy4V1EUvuIsgUGXiEgg+BzyAx8IYyWfpKkW9neWlgwsWDy7s6+/q7+5Y1NM5i4U9nb3dHQsW9y1bvXRRb1dnKbIIPFZ0q4Tg8q/suMW3BlnC52r7Jwx6e+xS+0ZXqErVCbLCxz7LqUOmbJBYBKHnwE60iCoCp6LmIThZoAxxpggVCRewIKYtBIoF0YA3U8QZV2FhrD2+OKFGTjAVMpyRBXP0CglEEBV+nGCmqiLqnEI8AoKpZIpa/CWQvUVVjcntRBRyKlTFPRU4VVFpE/Y5q6qiRl7CLkkmggTH3Ml0+cVuKL8p2jYigivHjnJgVNWpmowrL9vBiQhCwQZ3XNkKrICY3FS2QeIHVihUrWbrVlQR5ToLIEY0jnGGLl9hYnm4/DrPgjVyIEIEDxV1ooxcQgqF2pspiGWO2IpMlXWW24moqjgVIogKwcmSl6UqaoRQuWjQtHCsVNGx+bTjWRvQgKwwQs/+ZUwIhZwqTvxKxZugtVTmqRBCFCr8OKEYVRVR2ypVRSrC05gx5LxA7V4yojtVFVFVcSreXTyRBTMU2KgqMrsyAoldwkoh4aIdRlXjsfPq3AiJxRFRMVLIiU+ktrZ2SJKJPwAoEaJQ4cfJvGLUqREyLIiIHsbD/FWJZHWKFuRUHNZOPOGBGUqzUYzFrsx0xoioUyNXyDP1jBjhmKm+Mr4o5FS4ifTOykM8Ye9nRGqXql+SzPYuExXlhDEqcjWiULEU3jNDmkO5bZ4zc1VHPjFzReFEVMQuJlUVYCXinWdBhxujIuaa5cxCIGY0MIKvqor14hwLD/FksTxDBFX1Gr4Uwdc0TF4pEkVBTzn6uVsufM89V2zYMdTZWeoohb3lCHSXwnIpXLCo5/Lrz737F29YtLCLOLmbxUiLItKMV3Xs0ixN+ZTtX9l5eN4tZu1zi41td7yBqBF1EydLs4x9dF6itmFcznxEVIQvzpW/2MCoisFpTkgkExVxDIgYYVkqcVVtac8bwTMzQ8ArQFwAHP8yUswcQhUBWOZZqMSWyAghnrIshWAzIaENzhwRGBTTAuLUcfcZyKJmY5eoIlVscWVUUYfIQ0XYKRIkcCIsVL2WSM6KNEtR7++YBMJSVRSOgdsPYw8KkyHLyVgR7ETFV4s98Jvpy0ClhCW+GgmUYSvIBIFg7JCR1IkqXdG7hWYHhCUC3GnTBc7qVDc/S8ZXu6mZmafan5rLpaAUBpF9SWWBkGfMFizzjsIYWgwV/Azi1IWhlstBR0dQLoflchSFYeCsYm+DEZldKXKlUmDxSwEHWh0RLDSTVa5mg2MUBqUoKPGXeiKgzyx/4Fw5Cksl5xsRF7gwCoycU09h4KLAqSgeyEBEushFYYA4Kw4GoeiEEQg26iQMXCkMMPOjZeGjWxhqRznoKIdRKe9Vg0AjK4y0fKR1ZAlD+185lMshjx+IQrIL6f1uuCiihSAMkGrgXBlfFhbERZ4vRY4dYyQyFqr4ARVVEcCHLM0yv+ciCEwsRnaE/J4gpA2WFOOcY4labVKxUSyciqLJESBwqs45pJrbpIllERUFTiEODHmJKRx4mywJPixFGNQGZhHCqcpcfLUFl6jJVMyZQQmbA5HF5GbwFKMBCqHEg01wgXOBqBNqILgYmY+KgnzlnBKXrikLKc97lr90xIwEpWeUEPx9KlMxUlHFkeGMLCiIw3ZmkAhLJ9pOTSYEikSFnFyiOTltS62RNDW9iIoCyamVZhK4I/uPdXeX91y1beG6JZOteDpJZ9J0Mk7iUrDrrdv3XLLlqQefSdIMY2rAUS0PLEVJxh8H4sS14jhNkyxNUbehFKD8Ts8yRhPCS8FnWcpDrU6wEXZB5pOSQOkPnUFsuwOFMFK1+m2bRMU7ZpnVwcImgdQY9cRKxHPsj4ioqNookOecWqh2FuGp8TdNAxXFZg5kSRLbQp1PbSNsEZu1ilNymUA8UQwLWCLAw4ioilpeJsASnxARMLmpBFIuD81JvMB4L2VQsVVxCa9jf9L8hqAtgBHxrUelNNtMePMRFVEVn85YyqNIEWEBL0ZnbKZ6okF0KqoiQEQ898os4sR+FWeyY/3if37fJX/5b278wi9d859+/u3/6f94+95NSzkseOo8unT3qndduG7l0p5cLiKDi7r+/vvO/dav3/zNf3fz7/3jq//oV679hTsu2LBqAa8tpQUnF+xa/uufuvLB37zlT//VDZ//p+/G5u537+rpLMm8g9HVEb37ovX/+u+95bP/+F1f+Gfv+Y1PX/mOC9Z1lkMh/sJu4n/93930h790zepl/c45hNdeuvHKfUOL+jtIsWqw7xO3nP3bv/CO9799Ky49HaX3XLr+X330cvB7//hdN16xhVzsWJIwsAW+GaelKNixbsln3nfO//PzP/d7v3j1Z8EvvOvXPnpZX1fHTVdt/cI/f8/X/uX1916ze8WSHlXdu3nwX37s8v6068cAABAASURBVK//+k2/8Zmrzt7Gv3U7Pn7Tvm/9xs10TUd/9C+u/c1PvXXL6kVZlm1ateD+a/f82kcu+81PX/XL919y3vblQ4N9//rjVxD/c794NVuEy+//03d/9hffxW78o9sv2LhqoYjfSxE3/9bQukoSZ+rU9DJHZOG+pGec87aRilCwQGqM51UEiIgyEZBEjMpzHYo6VeR2CXIRXkNZmoBUxRSak7ASiAkBDAIYIHAGgTiQGBhDlUyiKkpYZQIsVTnbQJ0oqXN4SxsEI8TobKWQzXaZguUsRHiZFUlM7y+M+DY0syMtdBeIEml2V81EbfBZxEZRpQKE6i8Ve/uJiAr7IH6CKdJgo0UvqFQUIvj8LKJoBJckbTTjF58+8cS3nuXX/t4rtw9sXl5tNKv1VtZV2vPWnVvPXvv4159+6qFDzelGGidFBjzbSLM0TWN+w0dZms6qycjngNxGLZlYRSJqbTgRUdUszTI8hHuR0ZwIQsmNRVWEwZyUgYeJhgzINcsYRRWFhRNCiYjy04YKlEEiqmI/lkXVOPNCLBBrEVWTMADyEFFsXyyHmYuKYIKY0aJYl2mWplw+gWkxEYhNZhS1H4oVUeUSETVHUSM6BWIS3FWU7KTlc0DgWbMRSJVBRHOCES9warsHrywztSrsop6MfTS5CPFV1VyECQikqpRkA6ngnBPbtze8mSJEJhXx4CymlzAgF6TO0nNZU+pMeOClsYefONZoJX/5/UMP/MpXpmozP//Bc1txM8182SljyqfFfVsGr7tsw9bVC/j1jxudnq7MfOXhw6Ly/adefucnfufXPvudvRuXXLVv5YKekqqouh8fPP3E4ZGx6sxvfeWx9/+jL/zlI4euvmjdRTsGMvEnSrWzI/ro9Xsv3Ln8P375R9d85nPv+4Uv/Gj/0Xuv2fXxm85a2FseqdS/+OBz45MzC3vKzx0+2my2skwu2b3yvZdtGFhQTtJ0fLI+02g9dejUf/7yD2u1mSvOHrrlyi2/9tnv3fvL/+2BX/1atTo1XatlaUYxwplJ6SeLnLvirKGP33jWVK1x/6989d2f+iz4yK99tRTo8OjoF7/13MRU4+hw9U8f3v/0wePNOH76+ZEfPnNqpt565KmX//w7z5wanfrigwfD0D327In3/oPPXXbfb3/uz35y+MipwYUdt71je5rE//A/fPP+X/nKb/3xo3GzcWq0+rXvHqav93zm936w/yhl3PXPvvyOj//uVR/9L3/wl08Mj07UG01RERQ22M1SG/ytCdQqRy5mwazC7VJVWDuuHCsMUiO2U9XLRUTVCcRSNCcRW4jaqGoJGAJ/zMgkHLNM8xAONVZ2+CX125Ua5crZMD8lvncyA04eAYnjuIhsvwUUiXJcSEZSOErwWoFUGUQQqYr9iAi2yqSCiJmbnqZZmnIxsjK5D6AiBhUzzFKfHGfLjZ58CgmkyiCipsHYVlzYq/pmM4uKQpDmgEMtmperkHCEbKNUWBDbECghSaWKNgcfnJO41ahNH3r62I8fOpglyd7LNi3dsiLu69pz+ZYN25c9/vDBRx86PFWdrDfrDZryburJs7ZlaZraLlNWluWfsjMyOOELbtQiTkWVZthPZ56ivk5YOxoixmAiKpCKKhNoTyr8tIXIRT2J0qJf2uATFQLjrRLNFBsRpRQHxxapMktOLGGKNXJgaya6ASxyKEeKbFhqxtZzAX9/i4REyjAwa1W7RQy2KNRWT74kRMEo5LjYgUxEvSIfxciv0Rlv2lyl2pbjA6wcNj+lHHJk/BMHoXgbGMr27n7wQhECwDEKlInnFTIuQ2QzE13ayEULdM9t1XwzuY9i9labn70NVn4mns2q2BSMOGmladP+68SMcWKqefBopaczGhkZTxL/31pRfZrt3LB47bK+DSsWbl+zqLczNGcR0s40YlLhOF2Pv/v0cJxmfIAtBXwOSsjSitNmzKs1qzeT46MzPzk03t9d2rNxYGqqRjcqcvHOFeduG/zWDw8/uv9okgXTzfDbT5x44uDwzvWLz968mN8NE9ONHx0Y5k6sW9HPh3c+zy5b1E2ElYu7QierBnr5vuXAkdHqdHNwSR8f8LvKYRw3g6A0Op3+4NnhqVrTl2p3gj4An4UvP2vVeLX221957NjpybDUVersrszon/7gxekazxCbwVOWxkkWRvyEraRoIU5StrhcLtXqvuU4mW7EUUfXD58bq9TioYHeZYu6Ah6pLGul4YvDM/tfGh+t1L712EvsUGdXj3NsmvI7Jog6Utdx8ETtdKXBDvjyGAqWTRPPGnPGIcfKYAc4s7NEN8ycrtT+0cKGAsnwVmUQBmAedplOxOQikssZTZqxhJ1N9jeJn4lR5qciB7yKU26dBRSScIkwk0wKym0xtbXJM1F+bMXx8jA+o8+MRkmQZRm9C7Y+rGamzy86cKZgZWplzpFzhSUqESSZqjonIswMWZaRQKDcjlTw2DEKIjU7TJU1S2Ep8Molr6BWljVSzn/amKm/uP/44w8fbtRbF79t089dt33l+sVP/uCFJx46ND05nbTiRqLNLM8jFsvSCIQsy3hlW2ifChlbkWUxD6RkiDnOyNKUfw2xwWJ7bLuBsbJWxQS9iIqqiidmD7MVf14yS+1dFBJIzRx+djYeB1GUohaalQlxBcZ5FepCoaIGhYQshBcjtMALMVBMkGa0kfl2VC22DU5UUYmKql3CIGrkFDmM45qHXIlA4Pzl+SxNs0xIzyqHqT03y6jC2uAnz1gAfhW3q1H70CHsPRco7CW3Z7RaWJGo2EwcDALlxqywY8yBgyhKUUvBCrFQKCI49ao2r6rioZDMbWbhKZ5UpRwFg4u6/+tf7q837T/hV8gHPnvz4MGXRx977iQvzW1rF/P+EguIWr2r0GjdPpfLiyd4VU0laSpY2KYJhBGFNVppo5UcOHK6NlNHIqpv2bcqdLr/heFGK+vs5LsO9+LJyWdfnli1tPeszYNT0zO8H7/39Ann9KpzNzjJLtm94vnjE9P1FtqVS3pAkqTPHRmPorAZZ8dOTw0s7P7lB67i+40gCCrTrXK5jC/7STqr1ena5f2bVi08NTb1/PHx3p7ucrlUikqp6ENPHC+XO8IwoCorWJWO8DUvwRuZwNvUvngfRWGo6nq6usamWpVa850XbfrM+y84Z9vyViy1Zloqleirr7cniqJZX1KAJJUoKpXLyEU1h0LSvjXwfuNVBK2qqBSUFQfRq6mBQgWtinoSGFEGLWh2Mcso9hwzTjWn0axYI5Oc3nB8CgFEt1CqswwcEXMBicgIYGS+BUZKByoiShQ1ElY2qzEiohh4nR/QZHZH2QbBgqWIMSiBseTwSlQeorkdkxgxqyocrTKrEa4OiajAmcBf4kcbxOxVRdUuy0ANdrzVSBBKTuxqK+WtnTWaLV7NLz5z7NCPX+RTwIJFXSdfHH7yoecmRqqNer2ZpI0UcUYNOOYjjIdVz2n3fHvgFZRlqSORipCTwc5Khjzls5P4uh0K2lBTCqOIIAEUzKshy0mMVEVtRkwbZLSbk+v9AqFXIVZVngTADG+Q3FdmeW+GQxGBieCmVfPNmTNHaQus7IKHLRLBFTKzs3KISAYP68dEViq5yG4SJlsgNBcVxcMLioFljny7OXAsfZK5ZAWXT/Z4ef2rhiKiD6SWSAlFDZRgdcFRpzcy1kSYGohEg0BJzwJI7sukymCBMjjvzWCBkKkn7+g51a5ydP7OVT//oYt2rl8yVpnp6+vhrZdHHRrsXdzf+fjBkw/9+MiSBd3nbF2WZTFuhLeRcJSVCZ+XT45Of+mbz5wam27L1SttWNDbsWloweMHh7/w9f1hyEdOhNmaZX3qpBWnASL+IOi0lWSVac5ztrCno1arN5rJMy+O8uH00r2royDbs3HJl761/7tPHt2zaXDDiv4Vizs5/M++NNrRUa414h8+e/KPHjq4fsWC29+18/5rdnWUI3ulzjbp78KC3nJ/d8QH6ixTvGaVU7VWd3cXt4jdXbdywcdvOe+X7r+Mr+YB3+BTaw7fV6ZOd24Y+OUHrvwnd130vrdtHVzcfXxk6mvfOfziicrFu1fddfXOq85exRuf3waMdIbX7EZ43lZ5asJyV2bB0gzOvGS+wPfhBZ7zg1/aYCtRoUJC0YuN/mqnaB8AUQiNybHLBCckwEIwAc/5gUUOW5mpU3zxY+SUArFFlo8WkwsJipzBTszPBowQtqF8QMxwRCqqKvwo5RcXu+R0Hs0uZJ4Qti3HnhUQ4lkK65dZ1QRciqMoDFDRNnGjineLlUzlbeBrsCURmSgVmDfuTHNaFiJxmsYxn6GTejOearTSSDv7S3ErmRxvlDuDjkXlyWar3mw14hSjVpLibn5MeVRb2OWow+bZiz3K+D7R3sgqErafzhQ7C2LeTsU5CTjFHmokGItoZhOXmdEHnBgx57CFZZhbCd4mzS/zU9F8ITBogS+bodhls0InOVlOnXURWFWnikQLspWy9vb5bEtVlRwoiGletADH+lUgDZVzZ9Coek/zFlGhUy4PxZtCPUygRsZwORU1KCSaR0IMEBQQzS2EYkTUg5CSp2AthdCz3BQAC8RItc2xMj81c3gAq0Z4GPxldaIyI7Mmi4ool+QEq604OXKy8mffPfjoM8dvuGLr5XvXlKIgV5+/ffmGVQveeeGGS/YMLe7v3Dy0cMOKPo4JWnUcHrdzw+A/uffyD1+399kjo8+fqIRhKeLjarv1hX0d77ho4z+842K+RP7OE0dPT8z09XaLp3oj7usq93WXsVfNN0tVheM+MjEdJwnlVqebfCe+cWjxOy9YP1lrPn341HefOOaC4OLdK1ct7Tk+Msl35bx8OfzHT09/4ZsH/+8v/Xh6pvHui9dvXNFDC04VqBbdxkkqov09HfzZ06EQcU4gEkVRqE5FZbxa//ZjL37h609+/s8fB4/uP4oBckblgssyfi199aFnv/JX+0+cnpicmpqs1R89cOq3vvrk13/4wuCizsv2rBzoL9spIa/iYG7Fxc3wO8MxgzWYXgutiBqJJ9V85ec2qxC8N/CBZo2MycWmx4ym5mVBpdx6JhtV1DgV7FSNlZxVCE48EUFUkHjAeKkYg8S0Mp+0WHAnAblFlB8Pz4inWT9laTtgF6yovxeeE1WDiJ+IJgWpquPyEEErtoYxCKQmY86zMNp9sAx2sWOUlamntod4Zl4OBKqSE2JAGGAS5AYuWxHPT7MD/9TkRcyHjlqcdPR3rNsx0LOw47kDIz/58cnqZGPznuWDaxdONuNGmrYyqaf+A7LdD6tqNgiMK0UR0zxkpKTVMHSB8/ukVnbBEYL6MpOoYqUqwjYBERXIXgRMyBXKZfnabFSR+MFkXIDtYpwPDBykFh8vVTVtlufmrx/sE+9uZCi0IClmxRbkSzMRUVH15RNBPClkZdskeTT2xasYPOsHFnNQEbWLSVTUiIrEyHhVyV/3xQ6IV1pKQtEpHQ36AAAQAElEQVSjAZka5U3BIQB4Es/DD4oACBe+IqwVEtZipGrFC5Pmg8wSWWb5nMGKvSRjDnNAQV0+dJrm7SPCUAvCqM2h4JwdPz354I+PfP3Rl3esX/q2c9fwx7QszXq7Srs2LPnh/mNfffi53//6U9949Pmhwb5zti6v1xuEl0zTLOMvhI889fLMTGPH2sW7Ny1f2NcduMDHJrDwZcjLJyvPvDBcjnTflmXbNywrlyJ1im7/S2NJlm1es5gPv9aUSrkU9HeXq9ONpw6fDgLnVFtJ9vCTxzvL4S1v2/HI08cr083HD4/wcf68HSt7OkvPHxsXUd748CuX9h49PfUXjx75nT97ZmFvx5qB7izjTZ7RKDbi6dRY7eTY9MqBXnq0veHbKruVWV+3/cnUm8jEZP1Hz5787pPHHz1w+tEDIy8NT+VyxoyLvczk9Pj0t3/y8vf2n/ze0yfHqvUVi3sC5544PPqlbx967LnhwcVdS/qjZsv+L33olFvja8CZDbPGLbVYMGPo3Fi/YSoqknOqcB6FwPOqtpKC1JPzI3KkFswu2BwW2mdpP025sT+4Kuak4n/URrGRS3JST68R3yLnpjZaLmZzEiIVAb2779aEJs8V+AI7nEI1vJFUeLiMpQERb5j7el6MfAZVJ2YrqkBF1H4Y1JP4kUEUFSnIPZsFXiBVIhdwzIhegbyCXGRR7BJR81J48aSikKhfFAOfCVpJyvu6c0F5/dZFCxd3HHu5+syTp54/NPLM08NJkmzbvWRwqJ/PI80k4fP4XCJaA0UYcVGU/1O0LWAmmbogCOw8sQQ0pyrOKuBiZR+6mUTUE9F9THWuAAqUBjWWQYy8lTFc83mW3BA/snOZqAjZiUZ44co5Cx54OQNSRSWiAvmBuYBfmoVjcEVoL8QzDBxwjjXgvFr5WZoy4a5OVRSCnwc9g7e1YodYuUTMj5jEB6qBIhBTsU8Wmeefj3ECaRCAgBpUvQEtC+dSNCeBESMVH1D9WkXUfvwgP5Oy3IKsokocKwpOIYLayJ0KkHqwJq6KgGKQnHIBo7qJWsxONlqtyelakqbb1i4qRcG3Hn3ha989/I3Hjn5//6lUdPu6Jb0dgW2m2HBsuPqVh577r994LgzdLVdt27tpKW9YsSxElNpM68nDw1988MA3H3uZ7xzufPeeZYs6xUi/9djLL5+avOqcdXwbUwqdZMIfOVcP9j7+3KkHf/xiV2cHFcdJ9sThkYmpBp+Lv/P4i61UR6uN516eKJfCE6OTzx0Z898I67LFXVecvSqTdKaZPn+8ytEdHp/mS3NuihVBaMsoh49XHnnm1NKF3be+bceGlX3IsjRzTt9x3prQ8TJGYOCx6Orq7O/r7e/r6ewom0hENQeTdJTCKArK5fKCvq5FC3ou3Tu0YUU/2zVSaZye4NdZPDoxzbeZ7KRkmRpJTs54LkLBBv6+MCgLQSYWXF5J6mWak1dlvh0EnK7ACFaF912aJ6RpOxkmssBnZhGxNGpqY8RIxYlCYvT641O2iprP3GV/Vppb5aWKD22GXGorVecAvYOAMnGxuvMnNCtKwIYeQeAcBqI20KSKI6JBpC2UggobFVOre2UWkyFS0zKTG9bXaDvmmSLMXzeZp4oAu1QUojYVT7xf6kna2Vdat2nBgoXlE8cmDx8YmRiu1CYmjx2pHNg/msTp9t1Llizr4vN4nHLDzK1wNra4HPtQsMVkp5PDCuZXiadBVVQMbJwY0U0KZRw+UWV7HQ+ndeuUc6IMaiQqwDiFk5xU53hy5bcCFbeH9gDBWTrVwLG7qoTnchoEloW7hViIAbBrQ1VAfrVlGcEtmhaENlMRIMJoUuEWuoJXSGbJL8wbCbzi5aGQiLZ5166K8iiMTUCnSlgssMuhYhssyqxGSC00BQqkIh5ew/CamykYSJvm82duZsrNtASEfo3NVKeiYpCCFvV1DA308g7avm4pX4lctHP5E4dGvvzgMzP15qahhXzc5mXabCV81btoQf/kTDo8PrN1zeK3n7927bJeviRhEwYX9Zy3c9UTz4996a8O93SVrr1041vPXb1iSffKpd3LFnV3lqP1KxcuW9z34E+Off2HL+1ct+S2t2+/YPuy7s6I76m//O1D1Vrrol0rrrts4zWXrD9/27LhsakvPfjskVOT3V32ZmffxicbfDfy59/ny+KJKOITevDjg8OPHTi1//nh05VaqVSik66OaO/GgZuv2PzeSze+84J1fAPDvwyavOCVbtkWIKJK8fye+N5TJwYWdl194bqbrtx8/eUbb7lyyzlbB+v1+vqV/V3lcEFvx7a1S2iKs7dyac+awb6OcrhmWf/WNUvYpa1rFqno0GD/h96558Yrttx61dbli3uWL+6+8uyhG9+y+bpLN/Ld0UM/efngkTE7G5k4M+5d3NfBRl24a2jN8v5yKVRFCfwhD+yc24IzY/+Il/lk5ftLRD14X/H7SIw0J7FDzjrXM4o4rxE/kpezSi92zALTiApQMbWo55VZjZM3Fl9UDaL45UCQM4zqyZQqnmUQUaGkvB4Kg0cKvNzKy3mWwFpj7SH8k4jqhBORQ0TyuKIqryCWKur0VVkcwsA5S2OhJM2ylMufDiLwArHwcB6q6mcb1EgEgYqxdrHMLGDgnEpOLQI6Xbm6Z+Gi8qmTtRcOTVRHp9NGI603mlP140cqz+4fVZUtOxaWS86MczdCFkwxOeIULJP1668sTVJuP9tCEMFLISlIWTvOm6ZiXdGXeo2qHQinlGqY61ALEk8sRM2jvRtItZC0fbKMf7imSZJmKSwliSOuqlOBCYzRgqRNxVpF8huIV2b/f3yEECMC5SaZL7vIrmZPWnVmQ3CFQyYomIDgaDo1MsYuz6uaFcvMZlXzdIyAScVHExVBJbaXkpPtLJd4uVCO1eIndjSzA5Nl5qJKmBxYSU4oVAX4pWrBZ/h5iUhb0vah/iT1m4kREPGFqVOBmd1MRygpSD2VooBvZr/8VweePHSqr6s0PjH5H7706CP7T5TLHd0dEd9pPPyTl0YqM6qcIjk+Ov2NR196+PGXZxqtJG7xWv+DbzzzV4+92FEKpmv1hx4/9scPPX/kZCVuNVvNhoocOjr+x98+cOClkcDJsdOTf/L9F7/63edr9UYaNxu8I5vxnz/y4ue/ceClE9VQ01KQvnRilA/sPzpwqrenOypF/nimaZp97bsvfOnB51Lhgy2/QdzBlye+8vDhJ58fdS6IIvsX5MhE/ZH9J7tKLnLJeGXy1//gkZNjMxHvd96DebtZRj0ctEPHKn/wzYN//NChU6OTnWFWCtNykPzpdw6OTUx1loNv/uilP/v+4YnJGZUU4h199PTklx989slDwyRuxXHg3Oe/vv/PvnewtyvsKsnJ0xPHh8e+9+TRk2NTnZEkcZPviP74oedmWlm5FOWZIyf8CvndP3mcAoia2H+sJap2X7gdBlZMiDLJSecRRzM/LVnGecrMJLMRD4yR8VnNhCwsgXkSj8k5xaYYVZ0oS67iyGCsRqJwJCHoG46vRnkAC0IJ7Uq8grWg9bwWBkzqiWICVV+eKLNDI2h8eQontJ2xYRSWsXQ88Z7NkPt6GTwwxK8AixzYI2Kcl4U0alqLk/Hm4ZGBNYmPaYxiAIy1XWZWI2aDsUoxxnPxK1nZUYXNEWeJC4K4pceP1I4crk6O1rJWi3tEnRkPxXT9xJHqoWcqM1NJGEQxuYscvuk8hB85x7TpWT+wyC1nXXiLiIqvxwb6VL/EPOU+Sqbq1/mgs/3NuagqCxEb1RNBAuecilO12TGaQvDO0+dcmrFxnOOUoydiDtiropSMH5vt0oJENYd1YQoRFQhxEASwmmVOkMEyGkgIsixLU5BiSRZVpTAueMqDt5EJhaooJOInOErP2axduaIDprPYtICKepGLCCMQEVVRwUAIHjiiCxIxkbVWBMMNG6BzJLCiwuiBZ0AIFRibnTo4VSF2EcVzqR3EOKGcFBU2RMAQnnzsGAw+6gkVODU+85XvHP5n/9/3fum/fO8/f+Unv/XfnuC1tXBBH98JPPn8yH/848f/368++dKpSRUlwenxGu/KX/3sDz77Z0/95LlTf/HIC7/8O9//l5975HtPn5hpNPlU+72nT/76H/74d/7kyWdfGjl8bPz3v3ngV373B7/9NZZjcZyOTza/8p0Xfum/fP8rDx8cq9SyjFsvz75c+f1vPvebX3zs33/xsS988xne8uWOjp6eLk55mqa0EreSR589+dKp6a6urii0F3StHv/oudMnxhvdXZ10x16cHJv+3b/Y/3/91x/+2z/44W/84Y9+cvBUf38vf5bMGw0Cs2IHlH8Vptlotf6dp/hr4VP/6nOP/NvPP/Krn/3+5/7iKXXBUy+M/Psv/vhXf/f7/F45PjJF6iOnJj//jQO//Ds/+M//7fGnXhidqjUfeuIY9f+T33r4X/zuD/7N53/4a7/3A37f/GD/yf/0R4+z/Hd/8OgfPvjs8ER9QX8vSX2D6dMvjv7b3//R//lbD3/52wefeeE0v7GUOlRVbE+FbQX5TVRV7pmqtIE4wwLkMpHAOeB7MSuvEWUSG8kI2LcsSy0GfSPP1WSBF6M8iyoKu0RzEtYEB683vgqedhj9RTYevSAIYJCjM4g3Yq3GWHpfCSngsRTNy+HtTOFpRs/oskxFgIioqvMcQxQGyuSFotiJEaI2NCeTeq3fPqcqalkQkyPmdZOkWcqD59XUkxmj3oZkDoJX2218kQPxl40wHvAikpqvwgDeYTNx9uyByjNPj40MT/LV3EwrqSepIeZbu1Ztuv7C4YlHvn96ZCZp2v/yASfqnKvE1iL8+TFnzhzJi21qtYv3owYKRmyW7B2YrVhFhROfYZ1hkVqh4pxjJxgx8xBGtIwIg4AvcxkCeIRtoJxlcVc1gX2ISwnqw2aZZRF+r4oR7gXUbDkWVgo83k6JHoaWpcQDHQTsfQ48MWOkNUbz9B8VkySDTKLi67BngAAgUOdyUT46cyI1q8CR1iLlwXkjesYicZ8kj+TPkLIQIwxE7A90uFNayHGjTMtmIfNEZqxmIyKBIx8qJp9XJbdhRIqrVRgE8ARsA2WbZWYFfJuvsZlKCKA+iwi1LVrQt2rlwMoVA8sGFgNe2eVSKXABXygPLl00uHRxZ2eZwCLCVvM+WrFs6ZLFCzs7Ovg4vGrFwMplA/29PaJC5N7e7mWDSwaWLOrq6uCL4CWLF6xaMTi4dFF3V4dzGkXBkoX9QysGlyxaQAqqCJzr7upcsmjh4NLFeC1c0E9ShAqRkl5EeL66uzs7OzsQcEYoA0e8AIwZOg55NLBk4YrBpcsHliwfXNLT3cV2gSAIIrY+DET5LZBxdkUpI+R30sDSRcsGlpCXghct7FdxpBgcXLJy+QDLUiniDkZRuHhRP5LBgcW9PV0UhiPLVdb10hWDS1YsH+jp6qR9kgICLl60oKPM3zOpy0CF7B7uK5YthdWsqQAAEABJREFUJWy5VEZKZJCfIrGHj6LsJKPCnjaBiglhnGNfOTdBEAZhGFISQr8PxTcpZlkEMRf8Mj6FYWHHk3cK/xBF1j5mQTCXhUCqDCQN3BuOLzmp5AHZattwYikF+7AwKhYfBrlTBvGlij/2vkC7L/6pRIaFYpAj59iojPdUllFhxAGiTNIQCFtCk1vEAfUZnUlREgFHeWUW/1Agw0bNGt855LFsjXvRSxDA5wpGp+K8H0J1Dp3kvTB5TKfZyZmZo9NT4ESjPhzHZ+BUq4UqR5Uvtr3XqweXZjonnWMLjl1TsXsPk9/l1HoVFQmoy2DdORW6cVwKJ5SrnvLNCpx6uECNcdjRTFacHF51CCyq4qsiHuoJUwdZClsXOsFexEYY5K/OgtwgKPF1KpokaeACCEdAuuKRwMQ51TOyKDZomOiaE55xLkQwDJwGqqFzgbNeGMmuKqosicOsSDzUgjhCA1TA76TvHRUhnXO85oQzl3IblKUZCYxlCZyKSuCcerKYSpYcLvC8KX1AiqTUuc0UfFUYAe7YedjAModX++jCCBC/Ogtyg6BUx49tJv92c0HAm44U5LTHni01ExKoY8DFHHwKjFiKCCNA7oRAeSOMLlAFuYqtnu1FRfFiUIVBLwKjqiTgchaElenQiJgFSg/kLEHgSAEsSy5UjLEhiGiapk5cEASi/BvMmqAA8aQYcDmbcETmRHKwtMhMHk4lKLJooAZ8nPrfA8LmENLur0pOzE7QeiimXA5SCAsnkoMlCAjEpOpU4HPYCUTiTOFUHOTrz1LhRLHidIlYR7QEzE4RA9xU8rWIJVIVIbJTSLzEsV2GIosqbqitjdcfX1RFiayMGb8bKM0CqCqhAlWDc4GzREicoDEVPF6MKlJAvdxEjlKETm1X7eAJpMrtCwPH52MVLL2dMfCvziKqJjcjFRtFFCBVL0fEHfEQNQ3KnGEbUZKVB40jSjOoMbQWVAM3vxdRT4Ef05SvwoJGp051yetHWLZspBPSyBy5euzmVmK/09IsteTejoxUNgfJnNAYeuccVSpTjsB5oZpkHq8BCzdHKqpmoiaGYaWZqY0hsjjq1KIiZlZOieztsVMuA2GBcRYOKbBVcSFUXO0qYjERjgZBxvMjfoXUGExfkYW1WkBVgUVF2MB51kKiUyRtIDJd4BwlBbm1c8yBc8C7MUhO3HgtzlwGL6qiucZG7BxESOWCswiB8WRU4puofamYeeDUZ3EsCOYgNQeH2sFJTiRh5ZSAuX0RH3MQcAH8HFqFnQNCs+UiRh5MRJ34neRsIAUsAYxzyk/giOOM2sEoHngJohy2oiAmNcLVvAKUxooNJvcVOIElBbAsqs7MzB53z9tMCmAcBg6tGdkysMEhRGAgBpE8VOyHdvKVvzuwKuIU4EgcX6bCGwg2myWwLG4+UadadeaF3HhEzpyZTePEqUqbYE2pZk9k43FzlpEsAbPi5OEKUk9mqY6xHUmEqL7+jEdZMqzsjImRqmBJ3sAR0QVz8TQITOJUnZEGNtplJgjxlDa97vjOJwt8GAIwB1pk8SEViV/b7LyxQ+GcFRO4gtpWAQbGE6moxArhlnH+/GMk6gqFCHE0t/cBXZsChMALZzM4SB0ugXOBaR28tmOpCmunoqbCzikSIijGQI0VN5+o37v43xZBEITBdD1Z1FseXNT5RpGkEiezN1ByclGp+A+V8nWj0ZqoTMVJyxcR+Iq4hcDxKzekyMAFgTpV7DOOhWaignHgTCKq6uhGndMgcLOEUNCrKBrhcqqCPuRfc9h5PnAmd05h+MN5oDAuUKAOUmKoqkDGOYSGIEBXwORYqCgk6oK5u8id5TsPfA1q5FSDHI5ExjtnAZCjDpxzKgSnwsB4RedQiMIwG7BH5RxmZoM6h6qIMOSrgEKUFC5g9HCqeWWMaWbf82Rmb16iglbtWVN4depAYClcmxCiAqqwXOYROPvAzmcNpwIf4OUg8urr2sxAndMgwMXBMRFaVABZVEwmbcqyLMlSzZeKoSFQNThno2JvQqeQ2eUL55Cf2YtZqDA6URfgIc45GgmDwDkNnMmQOuM1ZNRCGMComkqhuSyInMPLzRISs/BZ2Ft0Zu0vdj6hH2G2NWYEnIvs3ByPTgsbC+iUOIGbIxNiY22oiqJAQrQwoJ0gwF6tciTO4UovLkACWDLioYpWdTaLsHbOvIIAIwch0VkSW4nyg4vSQ5rZcXK8y0QYiRaovy+MznneIQSq4qH5mjFwDgvnyeKqJ6cWmovP7OI/LGd8brP9eu34rvC2+GHAi8viqgqdOzLDqZ8cBqbiCqwCZlWcnYoIVk79ymmgHs7lTC4XLDATSaxvNkBycs4pOrQqokIIk3A5FwTOOXWBIgQioipOYRUF4kBd4ExvD45TZ0Bid8GphIHL3wkKOZRMJBBh8JbIQBA4fJxTvvg6OdF6/kTt8ImZQ8drh45Ng4N+PHysZpLjtcPA84ePTx8yFPKXTs1MTDeTJP+lJDm5NOUbgpznBUzf6cxM/fTI+ERlMk2TIAioDwSBchqarVZtZmZiamqsWgXj1WqlMlmdnJ6qzTRaLYrGjK4i83LcJUDRzrnABUFAKL5sCwLUSMIALZFDqBSWy1HEWIrK9uUiV4QYkyDAFOcCjl8aSNgaFcKELDEKEdnGIXaQOlVOhR1eTpaKOKdBQFpFgV3gLAyGzimugXPAeZsgcIbQUYzBqghCy+QCzPgFEwUUFgS2CkxGZEcjQeSiEKk6py7QwApzQWAgmXMaOBcGfunUOXhePiqqTCZ3TkWA/Suaop1gE3CpEnZ+m8gCwgRWhi+MJI508CHlUVwpnN3MUhT6nwhxGEDOmbMLGEOKMMaRS8VaDIlD3MA5NkmduoAfZv3pm2lGSv0uCALnFISBC5wGDtLAyAUsLKxJnEpI+FADm4IAlXMBP85ZefRJEc65ACMkAR1xC+ilVIpKNMVXlaFvJwwJgJUL8PRz4IL5WRz3wnFHgjBwzsp0ymxQenF2ztljdhtR4FwUaGBWNhLGGWkYcI8sg3MKFwTOgDp0LlDnhDkKiixB4KDABTaSNQjDKDByLggd5bKMorBUjsql0HopsaKXsKAgMNfQ2QwLE+JJFg2chmGQ9xI4R5mUY3BGovSRcWZEYCVwLqRsp6LqVDkOSJzTIIB3gXko00/Nwvb7UkO0DhcX5ESFqioiXIF7Y/GjKIjKYVQKaT8ksDUVECSIgrx5KgpcYGPgAjMIwpBSA6fiqAH70OHgETgkzgUOAwcPgiAImdQoCpSlrURsU9KMXzGqCHAJnDqMWAQhPmThpiMU5yQInAtdAAJnvB/NKgzDKIrCqBSF5VIUlUKOYlgKPQV0ZC4OR+MRBpALnJEG5h+EoYvCIIrC3t6unt7uckfJhUGqGmdpnCUtRn4DqmDMwejs7uzr6+7r7+3rM3R1dWaSzdT9H+4zXtGZtMnOb5vnKEuW8gEvo7/6TGNkdHxkZGx8rDI6MjEyMjE+XuEFzeu5UWu0Gq2kxWfxJGZuNOsz9cnq9Ph4FYyNVUdGJ8ZGK+M2ToyOToyOjIExlmMTY2MT4+OgMj5WGRufQItk9PT4qVOjp0+Nnjo1cnJ4bPj06Njo+MREhYQTlYox45Vxjwk/jo1ZSaeGR0+fniDs+JgPSFgfc6LCLxIwWa1OVicnK9XJagVUq5WpqUnDJMsq0snJ6nSlMgUmKpNgfKI64TE+Wjl9evz08PjoyDgVgvGxvACrf2zMko5RI31ZUxWrYbQyYsaVsTHbhHFvP1GpFjErkxXDVLUyVa1OTZKcqeqLqSKcrFaqVROimaxQXmWSSvAdG6u8zs2kSDA2NjE6bzNPvcZmjlUmfJFjY1Xu7994M6tWLaXT1Ks209r3WSxRlUScorHXPhgTFbvFYxV6ASO+l+FTI8OnRk8Ojw6fHhsZHbPzUKlMgAlvPO5vDSnG2PwKvWA2fHrcEo391INRrVAzN5+qYdj5ytTkZPte2G1AV/SC5UTF7sXERHWCdsYq42Dc98LBHp3gqIx5ZpTDMDIGP25JJ7gR4+M++1iFRgwj46eHOeGj9MI5P3V67PSI9UI7E5WKjeOV8RykGCt64RwOD4+OjlTGxype62NiNoFLlc2v0AL10guomGSyar1Mca6q0GQVppK3MzlBL3Qx4XshiMW0XkZHK5xeSzFK5b7gdjs0UqnkcSarMBWSvY74E1WicbtPD49zE0f9FiGxm8tzPU4WD+Q+EQa2dWS3SlBVx8erZk+FE5WJomarv1KxB3ayOj1pfVWrlcn8oa5WeI5sWalOVqmxOlmpAOt0bHyCUOOM1vIEiXhvcOBHR/JEFXsQSIR2vGI3ouLfPBOVsdHx4dOjp4bHuF/+7TQ6enqcDaFa4GNyUyaQGEYnRl/dCx1Z5Mnx8epkdbpRq7eaTd6ZSSvl/clbtDHT4I1aqUyNj1fYLkpii0ZGOOfjMzX7b2Edf4/gw/LcG1vsO/vZV/aS/vLeTYv2bly8Z8Mizyzaua5/+9q+7ev6YHatX7B7w8I5rF+427AA+c71/TvW9W1f27ttde/WoZ4tq7q3MA71wBsQGorlllU9hXaVSeDx2rG2d8e6fsvixzzUtiGi9W413/aIZLVl2bamd7sH8S0gMcFQN0vD6h5i5o6zzOwS35zfurrnFfA1Wz0+MvG3ru61aG05ifLlVnP0JbV7xAsUWoTm2PtK+x7vNa+wNdbIVixfCV+wNyYOqV/nZubGQxaf3Xtdm+nzko4NoVlA/dRc4L9/M+3++l0i0VAPwbcO/ayDYTfRjoc3tl7OOBg71vZZwRwDQNhXwlRrfvbBwOynbjv70Jb7/be77BnuAqCd1b1mUPRidc7d9Fy12oR58baNeLWNcdy+pm+Hf5Tycw5PJWDrX9tLHzcFr22E5RiwOQb20J9zX962Iq8vrM0jnO0Ffqu3LEZfD7UVSf1yq6+TXgC8oQjVM4/v3VoI7dz+jPiEXV3cCCuA5WwKa6HHwiK0wnotLHzbgEPS1uaq9nNkxv52FIxpKcPitwsj1OzSMz15qC0cPJ/XN97jd7V3zneeOxG2DvXy5sF9+9re/E4x7rA3YS/C2S2CMXAqfPFbrarerYTyS1PR0Sq7U9tW9/hj3Ldjff+udQt28yI1LJx7l25YaG/Rdf28abetsZft3o32Bt6zcdGejYt5FQ8u7JA2uWTeFyNxmtWbyRmYacT1RnKG8MwlBh4Y/02RzM8y00hmGvFrAgPw2jb/m2ptJ7kd7Vs587/2Zv6dOhh2a9r3BX7mZxxyDvCbh5xN+NsAGwteO/K89x4P1M9+jl4jmj/GBJm9+z+V8SnOfLs2k3jeHyHdwN6z2q9vmWmmpyrxm3hzB97cgTd34M0d+J9nB6YbfJ1dvKdd2NdbsCJ84OYFPzldr07VJqdmwNR0HUzXmlPTjapJ6tXJmcpkDZvJKeMRosotEZpqama61piqNRg9zBcVNhjnmJquI1bjrocAAAStSURBVCEUQs/UsEdl/NQMjGGSAurIcyEuHo2p6TZqDasB+8ka9pihyiV4kXrKF29jjY5mpqatBbOcqmPm7Y2hZhNO141pd2fu8+KbasrqwZGyc3uKJ1EOJABJHjYXmrH3qlStQivAx4eZtcQLTE3XyTiLqVqTOIC8BLFxuo4NluY4ZVuEFphkmu5qyK2wSWuT7CafMhe8pqbndmxqmpZnquzYpLlMeVWVrZ62AnCcmvZeNcw8pglO4zPkIkWuxd5KmjIVPDBVrYF7bladrGEAkCOpTpJxhkbyJWaApS8SOTXXp6Y5MNa1eU3XZ3fMzCaxwcDqmZq2serP57TPyOiBb8Ny+c2p+rFtjPtMrpquNYmPPDewkeDT9alag0QAlUdjatrDp6Ds6mTNMFWUao7wXjuFO6jVLYXff7S4sMxHDJCQl5EU1UnbDXiSUjljW2ibhpwljpgZY/3OYGOYbhAElWHaNmR67sG0mKY1eQNf4kxN05Q1PjXt79RUEYekHs2pWsOK9FpyeRcLi3uewku8zdQMEpY2TsLXc1+ztIzmNTXdKFAzF4yrbJo5oi0keJGacSr3qtXJazVMWYVt3jYZIe0AmOqkdVedrMGb77z4GJCIqlBhUJ2cgcmXuSVaYJLicfDHLE83PXfMsKn6+N6dginMnjLqzAtm9DjzmGGPDZUTwWfxXjV71SCnPITVSat/arpBSViCqem6x9yOTfmbVfUPDi4sgcWcrvNPsSSd+zLbzb29/Zs7TdMkjtM0S2AAE3xilCYs2kxiX4mnnpIkjhMIa9ZZ6u3jVjxLpkvSNEWVGiUpyiRGlGCT4JymjLmKMeNK0sQojlutJI5tgdBHRmxeiOIkTZMsTbMsS41FxJQaJUnm/8OYOOZb/jhJUsySxITeKPE2xiZJzBRDrRiXBBts8+xxkmBnF1OaxHGS5DB1mqSxJ2NasVmksHYluCQpY5JfTJ7JbbI0QxBzGQpZkli0FvviYyZJnCamymygoCz2RNA4TiC0+Wj6JEkTDDOTpPRrUbBERQxTJkkMJXFihDjNMrOH8wKsYAF/o+bXtlUSx21hkmKKJ2qQJGgZEiiO4zRBZmBOYmQJkoRFal6ssSnkKNI09iKTGGd2XAaulJJRp0YJ6ySJY2S29FccJ0nC5Re+XyQtv2V+iPFHl3F5JAlbgT0wN64UUZLf5ZRyMmo0SRJDrVaSmGWSYgUSCDEjYuJlWZaCFBXACplBMiMsW604M4FpEflY3iwxCRfAjIBY2Yg8N2JEREGMKGLWAM4jJn+SxDH6VtwicpLC2pUQITFiDZ+Lkhg9gdqrOEabphljZmMSx7OPZivBOElRGbgSezBjhGkSx3ECk0BxmiRpm2ARJQnPZSthgZepMliWcRwzAlyyNKXa1Lt6SQoPg5A3DQzHNIlTI28DkxRrvNMkNl2SkClOszRJMGIyJon9CkFqFMe2TmxkmZDF2DjGNGZEZpkRI7AFzmaUMBibxDHSjBwgSZM49lIvS9MkSRHQbcy+teIksbAZlug9YuSxyZOYnyRJUjL5yXwzs8n8MuH2sfUJVqaxK/EUx7Gf8bSXceaDmyQ1CUO+Y2xajv8fAAD//xk91xAAAAAGSURBVAMAWhv3VttUS4IAAAAASUVORK5CYII=";

  function __barrowsLoadLock() {
    if (__barrowsLock) return __barrowsLock;
    try {
      const raw = localStorage.getItem(BARROWS_LOCK_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && typeof obj.x === "number" && typeof obj.y === "number") {
        __barrowsLock = obj;
        return __barrowsLock;
      }
    } catch (e) {}
    return null;
  }

  function __barrowsSaveLock(lock) {
    __barrowsLock = lock;
    try { localStorage.setItem(BARROWS_LOCK_KEY, JSON.stringify(lock)); } catch (e) {}
  }

  function __znccPrepare(vec) {
    const n = vec.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += vec[i];
    const mu = sum / n;
    let ss = 0;
    for (let i = 0; i < n; i++) { const d = vec[i] - mu; ss += d * d; }
    const invStd = ss > 1e-9 ? (1 / Math.sqrt(ss)) : 0;
    return { mu, invStd };
  }

  function __znccScoreWin(src, srcW, x0, y0, tpl) {
    const tw = tpl.w, th = tpl.h;
    let sum = 0, ss = 0, dot = 0;
    for (let y = 0; y < th; y++) {
      const row = (y0 + y) * srcW + x0;
      for (let x = 0; x < tw; x++) sum += src[row + x];
    }
    const mu = sum / (tw * th);
    let ti = 0;
    for (let y = 0; y < th; y++) {
      const row = (y0 + y) * srcW + x0;
      for (let x = 0; x < tw; x++, ti++) {
        const v = src[row + x] - mu;
        ss += v * v;
        dot += v * (tpl.gray[ti] - tpl.mu);
      }
    }
    const invStd = ss > 1e-9 ? (1 / Math.sqrt(ss)) : 0;
    return dot * invStd * tpl.invStd;
  }

  async function __loadBarrowsTopbarTemplateOnce() {
    if (__barrowsTopbar) return __barrowsTopbar;
    try {
      const img = new Image();
      img.src = __BARROWS_TOPBAR_PNG;
      await new Promise((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("topbar png failed to load")); });
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const outW = 162, outH = 12;
      const gray = __downsampleCapToGrayRect({ data: id.data, width: id.width, height: id.height }, 0, 0, id.width, id.height, outW, outH);
      const prep = __znccPrepare(gray);
      __barrowsTopbar = { w: outW, h: outH, gray, mu: prep.mu, invStd: prep.invStd, rawW: id.width, rawH: id.height };
      return __barrowsTopbar;
    } catch (e) {
      console.warn("[BARROWS] failed to load topbar template:", e.message);
      return null;
    }
  }

  async function __barrowsLocateChestGlobal() {
    const tpl = await __loadBarrowsTopbarTemplateOnce();
    if (!tpl) return null;

    const cap = captureFullRs();
    const capProps = __getImgProps(cap);
    if (!capProps) return null;

    const W = capProps.width | 0, H = capProps.height | 0;
    const dsW = Math.max(200, (W / 3) | 0);
    const dsH = Math.max(200, (H / 3) | 0);
    const gray = __downsampleCapToGrayRect(capProps, 0, 0, W, H, dsW, dsH);

    const tw = tpl.w, th = tpl.h;
    const maxX = dsW - tw;
    const maxY = dsH - th;
    if (maxX <= 0 || maxY <= 0) return null;

    let best = -1, bestX = 0, bestY = 0;
    const step = 3;
    for (let y = 0; y <= maxY; y += step) {
      for (let x = 0; x <= maxX; x += step) {
        const s = __znccScoreWin(gray, dsW, x, y, tpl);
        if (s > best) { best = s; bestX = x; bestY = y; }
      }
    }

    if (best < BARROWS_SCAN_CFG.locateMinScore) {
      console.log(`[BARROWS] locate: not found (best ${best.toFixed(3)})`);
      return null;
    }

    const rx0 = Math.max(0, bestX - 6), ry0 = Math.max(0, bestY - 6);
    const rx1 = Math.min(maxX, bestX + 6), ry1 = Math.min(maxY, bestY + 6);
    let rBest = best, rX = bestX, rY = bestY;
    for (let y = ry0; y <= ry1; y++) {
      for (let x = rx0; x <= rx1; x++) {
        const s = __znccScoreWin(gray, dsW, x, y, tpl);
        if (s > rBest) { rBest = s; rX = x; rY = y; }
      }
    }

    const scaleX = W / dsW;
    const scaleY = H / dsH;
    const x = (rX * scaleX) | 0;
    const y = (rY * scaleY) | 0;

    const lock = { x, y, w: 560, h: 260, score: +rBest.toFixed(3), ts: Date.now() };
    __barrowsSaveLock(lock);
    console.log("[BARROWS] locate: locked", lock);
    showEvent("Barrows chest", `Locked (score ${lock.score})`, "ok");
    return lock;
  }

  function __barrowsValidatePresent(lock) {
    if (!lock || !__barrowsTopbar) return false;

    const cap = captureFullRs();
    const capProps = __getImgProps(cap);
    if (!capProps) return false;

    const W = capProps.width | 0, H = capProps.height | 0;
    const sx = lock.x | 0, sy = lock.y | 0;
    const sw = (__barrowsTopbar.rawW || 486) | 0;
    const sh = (__barrowsTopbar.rawH || 35) | 0;
    if (sx < 0 || sy < 0 || sx + sw > W || sy + sh > H) return false;

    const gray = __downsampleCapToGrayRect(capProps, sx, sy, sw, sh, __barrowsTopbar.w, __barrowsTopbar.h);
    const prep = __znccPrepare(gray);
    let dot = 0;
    for (let i = 0; i < gray.length; i++) dot += (gray[i] - prep.mu) * (__barrowsTopbar.gray[i] - __barrowsTopbar.mu);
    const score = dot * prep.invStd * __barrowsTopbar.invStd;
    lock.lastScore = +score.toFixed(3);
    return score >= BARROWS_SCAN_CFG.validateMinScore;
  }

  async function __barrowsEnsureTemplates() {
    if (typeof ensureIconTemplatesLoaded === "function") {
      try { await ensureIconTemplatesLoaded(); } catch (e) {}
    }
    return (typeof __iconTemplates !== "undefined" && Array.isArray(__iconTemplates) && __iconTemplates.length);
  }

  function __barrowsMatchSlot(capProps, x, y, size) {
    const outW = 16, outH = 16;
    const gray = __downsampleCapToGrayRect(capProps, x, y, size, size, outW, outH);
    const prep = __znccPrepare(gray);

    let best = { name: null, score: -1 };
    for (const t of __iconTemplates || []) {
      if (!t || !t.gray16 || t.gray16.length !== gray.length) continue;
      let dot = 0;
      for (let i = 0; i < gray.length; i++) dot += (gray[i] - prep.mu) * (t.gray16[i] - t.mu16);
      const s = dot * prep.invStd * t.invStd16;
      if (s > best.score) best = { name: t.name, score: s };
    }
    return best;
  }

  async function __barrowsScanOnce(reason) {
    const lock = __barrowsLoadLock();
    if (!lock) return { ok: false, msg: "No chest lock saved" };

    if (!__barrowsValidatePresent(lock)) return { ok: false, msg: `Chest not present (score ${lock.lastScore ?? "?"})` };

    const have = await __barrowsEnsureTemplates();
    if (!have) return { ok: false, msg: "Icon templates not loaded" };

    const cap = captureFullRs();
    const capProps = __getImgProps(cap);
    if (!capProps) return { ok: false, msg: "No pixel permission/capture" };

    const items = [];
    const rows = [];
    for (let i = 0; i < BARROWS_SCAN_CFG.slotCount; i++) {
      const sx = (lock.x + BARROWS_SCAN_CFG.slotStartX + i * BARROWS_SCAN_CFG.slotSpacing) | 0;
      const sy = (lock.y + BARROWS_SCAN_CFG.slotY) | 0;
      tryOverlayRect({ x: sx, y: sy, w: BARROWS_SCAN_CFG.iconSz, h: BARROWS_SCAN_CFG.iconSz }, true);

      const best = __barrowsMatchSlot(capProps, sx, sy, BARROWS_SCAN_CFG.iconSz);
      const accepted = best.score >= BARROWS_SCAN_CFG.iconAccept;
      rows.push({ slot: i + 1, name: best.name, score: +best.score.toFixed(3), accepted });
      if (accepted && best.name && !items.includes(best.name)) items.push(best.name);
    }

    try {
      console.groupCollapsed(`[CHEST SCAN] ${reason || "tick"} • chest ${lock.lastScore}`);
      console.table(rows);
      console.groupEnd();
    } catch (e) {}

    if (items.length) {
      showEvent("Barrows chest", `Found: ${items.join(", ")}`, "ok");
      return { ok: true, items };
    }
    showEvent("Barrows chest", "No valid Barrows drops detected!", "warn");
    return { ok: true, items: [] };
  }

  async function barrowsHotkey() {
    try {
      if (!__barrowsTopbar) await __loadBarrowsTopbarTemplateOnce();
      const lock = __barrowsLoadLock();
      if (!lock) {
        showEvent("Barrows chest", "Locating…", "warn");
        const got = await __barrowsLocateChestGlobal();
        if (!got) showEvent("Barrows chest", "Could not locate chest (open it and try again).", "warn");
        return;
      }
      await __barrowsScanOnce("hotkey");
    } catch (e) { console.warn("[BARROWS] hotkey error:", e.message); }
  }

  async function __chestTestTick() {
    const lock = __barrowsLoadLock();
    if (!lock) return;
    if (!__barrowsTopbar) await __loadBarrowsTopbarTemplateOnce();
    if (!__barrowsTopbar) return;

    if (!__barrowsValidatePresent(lock)) return;
    const now = Date.now();
    if (now - __barrowsLastAutoScan < BARROWS_SCAN_CFG.autoScanMs) return;
    __barrowsLastAutoScan = now;
    await __barrowsScanOnce("auto");
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
