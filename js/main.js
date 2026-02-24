/* IRB v2026-02-20-premium-select (FIXED)
   Fixes:
   - Removes calls to missing functions: getBingoById/getSelectedBingoId/getTeamByNo/getSelectedTeamNo/saveSetupFromSelection/setupPremiumSelectUI
   - Null-guards backdrop listener
   - Avoids resolving canonical name twice (resolve ONLY in poll; submitDrop trusts input)
   - Fixes duplicate team_number mapping
*/
(async function () {

  console.log("IRB v2026-02-20-premium-select FIXED ✅");
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

  // ---------- manual submit selection overlay (OCR-only) ----------

  function __getImgProps(img) {
      if (!img) return null;
      const data = img.data || img.imgdata || img.pixels;
      const width = img.width || img.w;
      const height = img.height || img.h;
      if (!data || !width || !height) return null;
      return { data, width, height };
    }

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

  function __drawSelection(ctx, x0, y0, x1, y1, zoom) {
    const z = (zoom && zoom > 0) ? zoom : 1;

    // draw in zoomed canvas space
    const zx0 = x0 * z, zy0 = y0 * z, zx1 = x1 * z, zy1 = y1 * z;
    const x = Math.min(zx0, zx1);
    const y = Math.min(zy0, zy1);
    const w = Math.abs(zx1 - zx0);
    const h = Math.abs(zy1 - zy0);

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

  function __snapRectToIcon(cap, rect) {
    // Best-effort snap: find non-background pixels inside the rough rect and tighten bounds.
    // If detection fails, returns the original rect.
    try {
      const data = cap.data;
      const W = cap.width, H = cap.height;

      let x0 = rect.x | 0, y0 = rect.y | 0, x1 = (rect.x + rect.w) | 0, y1 = (rect.y + rect.h) | 0;
      x0 = Math.max(0, Math.min(W - 1, x0));
      y0 = Math.max(0, Math.min(H - 1, y0));
      x1 = Math.max(0, Math.min(W, x1));
      y1 = Math.max(0, Math.min(H, y1));
      if (x1 <= x0 + 1 || y1 <= y0 + 1) return rect;

      function pix(x, y) {
        const i = ((y * W + x) << 2) | 0;
        return [data[i] | 0, data[i + 1] | 0, data[i + 2] | 0];
      }

      // Sample BG from the 4 corners (inside the rect)
      const c1 = pix(x0, y0), c2 = pix(x1 - 1, y0), c3 = pix(x0, y1 - 1), c4 = pix(x1 - 1, y1 - 1);
      const bg = [
        ((c1[0] + c2[0] + c3[0] + c4[0]) >> 2) | 0,
        ((c1[1] + c2[1] + c3[1] + c4[1]) >> 2) | 0,
        ((c1[2] + c2[2] + c3[2] + c4[2]) >> 2) | 0
      ];

      const TH = 28; // sensitivity: higher => less snapping (safer)
      let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;

      for (let y = y0; y < y1; y++) {
        let row = ((y * W) << 2) | 0;
        for (let x = x0; x < x1; x++) {
          const i = row + ((x << 2) | 0);
          const r = data[i] | 0, g = data[i + 1] | 0, b = data[i + 2] | 0;
          const d = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
          if (d > TH) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < 0) return rect;

      const M = 2; // margin
      minX = Math.max(0, (minX - M) | 0);
      minY = Math.max(0, (minY - M) | 0);
      maxX = Math.min(W - 1, (maxX + M) | 0);
      maxY = Math.min(H - 1, (maxY + M) | 0);

      const w = (maxX - minX + 1) | 0;
      const h = (maxY - minY + 1) | 0;
      if (w < 20 || h < 20) return rect; // don't snap to tiny noise

      return { x: minX, y: minY, w, h };
    } catch (e) {
      return rect;
    }
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

    // ---- Zoomed selection UI ----
    // Makes it much easier to draw a tight box.
    const ZOOM = 2; // zoomed out a bit (was 3)

    const { overlay, canvas } = __createOverlay();
    canvas.width = cap.width * ZOOM;
    canvas.height = cap.height * ZOOM;

    const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });

    // Render capture scaled up (nearest-neighbor)
    ctx.imageSmoothingEnabled = false;

    const off = document.createElement("canvas");
    off.width = cap.width;
    off.height = cap.height;
    const offCtx = off.getContext("2d", { alpha: true, willReadFrequently: true });

    const idata = new ImageData(new Uint8ClampedArray(cap.data), cap.width, cap.height);
    offCtx.putImageData(idata, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0, cap.width * ZOOM, cap.height * ZOOM);

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

    const baseImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

    function redraw() {
      ctx.putImageData(baseImage, 0, 0);
      if (start && end) __drawSelection(ctx, start.x, start.y, end.x, end.y, ZOOM);
    }

    function eventToCapXY(ev) {
      const rect = canvas.getBoundingClientRect();
      const mx = (ev.clientX - rect.left);
      const my = (ev.clientY - rect.top);
      const x = Math.max(0, Math.min(cap.width - 1, Math.round(mx / ZOOM)));
      const y = Math.max(0, Math.min(cap.height - 1, Math.round(my / ZOOM)));
      return { x, y };
    }

    canvas.addEventListener("mousedown", (ev) => {
      start = eventToCapXY(ev);
      end = { ...start };
      redraw();
    });

    canvas.addEventListener("mousemove", (ev) => {
      if (!start) return;
      end = eventToCapXY(ev);
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

      const rough = { x, y, w, h };
      const snapped = __snapRectToIcon(cap, rough);

      resolve({ capImg, capProps: cap, rx, ry, rect: snapped });
    });

    return await prom;
  }

  // Expose selection helper for handlers defined outside this scope.
  // (Alt1 right-click handler calls manualSubmitFlow from global scope.)
  try { window.__selectIconRegionAroundMouse = __selectIconRegionAroundMouse; } catch (e) {}

  



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

  // ---------- Fast targeted tooltip OCR (manual submit) ----------
  // Instead of brute-force scanning a huge region (which can freeze),
  // we probe a few likely tooltip header areas near the selected icon and read only a handful of lines.
  function __clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function __looksLikeActionLine(s) {
    return /\b(?:take|withdraw|withdraw-all|withdraw-\d+|withdraw-x|open|search|claim|collect|pick up|loot)\b/i.test(s || "");
  }

  function __ocrReadLineBound(boundId, font, x, y, colors) {
    let s = "";
    try {
      const args = JSON.stringify((function () {
        var o = { fontname: font, allowgap: true };
        try { if (colors && colors.length) o.colors = colors; } catch (e) {}
        return o;
      })());
      s = alt1.bindReadStringEx(boundId, x, y, args) || "";
    } catch (e) {
      try { s = alt1.bindReadString(boundId, font, x, y) || ""; } catch (e2) { s = ""; }
    }
    return String(s || "").replace(/\u00A0/g, " ").trim();
  }

  function __ocrProbeRegion(x, y, w, h) {
    if (!window.alt1 || !alt1.permissionPixel) return { ok: false, reason: "No Pixel permission." };

    x = Math.max(0, x | 0);
    y = Math.max(0, y | 0);
    w = Math.max(20, w | 0);
    h = Math.max(20, h | 0);

    let id;
    try { id = alt1.bindRegion(x, y, w, h); }
    catch (e) { return { ok: false, reason: "bindRegion failed: " + (e && e.message ? e.message : String(e)) }; }

    // Tooltip headers are usually bright (white/yellow). Constraining colors improves reads.
    let colors = null;
    try {
      if (window.A1lib && typeof A1lib.mixcolor === "function") {
        colors = [
          A1lib.mixcolor(255, 255, 255),
          A1lib.mixcolor(255, 255, 0),
          A1lib.mixcolor(255, 200, 80),
          A1lib.mixcolor(200, 255, 200)
        ];
      }
    } catch (e) {}

    const fonts = ["chat", "small"]; // best for tooltip/menu text
    const xs = [2, 12, 22];
    const lines = [];
    const seen = {};

    // Scan only a handful of baselines (fast). Tooltips are left-aligned so x loop is tiny.
    const yStep = 7;
    const yMax = Math.min(h, 170);
    for (let fi = 0; fi < fonts.length; fi++) {
      const font = fonts[fi];
      for (let yy = 0; yy < yMax; yy += yStep) {
        for (let xi = 0; xi < xs.length; xi++) {
          const xx = xs[xi];
          const s = __ocrReadLineBound(id, font, xx, yy, colors);
          if (!s) continue;
          const k = s.toLowerCase();
          if (seen[k]) continue;
          seen[k] = true;
          lines.push(s);

          // If we saw an action line, it's almost always the one we want, so stop early.
          if (__looksLikeActionLine(s)) {
            return { ok: true, text: lines.join("\n"), x, y, w, h };
          }
          if (lines.length >= 12) return { ok: true, text: lines.join("\n"), x, y, w, h };
        }
      }
      if (lines.length) break;
    }

    if (!lines.length) return { ok: false, reason: "No text." };
    return { ok: true, text: lines.join("\n"), x, y, w, h };
  }

  // Uses the manual selection to infer likely tooltip locations and OCR only those spots.
  function ocrTooltipNearSelection(selection) {
    if (!selection || !selection.rect) return { ok: false, reason: "No selection." };
    const r = selection.rect;

    // Screen coords of the selected icon center
    const ix = (selection.rx + r.x + (r.w / 2)) | 0;
    const iy = (selection.ry + r.y + (r.h / 2)) | 0;

    // Probe rectangles (screen coords). These cover common RS tooltip placements.
    const probes = [
      { x: ix - 240, y: iy - 170, w: 480, h: 120 }, // above
      { x: ix + 35,  y: iy - 120, w: 520, h: 150 }, // right
      { x: ix - 555, y: iy - 120, w: 520, h: 150 }, // left
      { x: ix - 240, y: iy + 40,  w: 520, h: 170 }  // below
    ];

    for (let i = 0; i < probes.length; i++) {
      const p = probes[i];
      const res = __ocrProbeRegion(p.x, p.y, p.w, p.h);
      if (res && res.ok && res.text) return res;
    }
    return { ok: false, reason: "No tooltip text found near selection." };
  }

  // ---------- Manual submit OCR helpers (no icon matching) ----------
  function __normalizeOcrText(text) {
    return String(text || "")
      .replace(/\u00A0/g, " ")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .join("\n");
  }

  function __majorityVote(list) {
    const m = new Map();
    for (const v of list) {
      const k = String(v || "");
      m.set(k, (m.get(k) || 0) + 1);
    }
    let best = "", bestN = -1;
    for (const [k, n] of m.entries()) {
      if (n > bestN) { bestN = n; best = k; }
    }
    return best;
  }

  async function ocrTooltipNearSelectionStable(selection, tries = 3, delayMs = 55) {
    const reads = [];
    for (let i = 0; i < tries; i++) {
      const r = ocrTooltipNearSelection(selection);
      if (r && r.ok && r.text) reads.push(__normalizeOcrText(r.text));
      await new Promise(res => setTimeout(res, delayMs));
    }
    if (!reads.length) return { ok: false, reason: "No tooltip text found near selection." };

    const voted = __majorityVote(reads);
    if (voted) return { ok: true, text: voted };

    reads.sort((a, b) => b.length - a.length);
    return { ok: true, text: reads[0] };
  }

/* -----------------------------
 * Manual-submit OCR fallback: Tesseract.js (WASM)
 * - Only used for manual submits (chat OCR unchanged)
 * - Loaded via <script> in index.html
 * ----------------------------- */

let __tess = { worker: null, ready: false, initPromise: null };

async function __initTesseractOnce() {
  if (__tess.ready) return true;
  if (__tess.initPromise) return __tess.initPromise;
  __tess.initPromise = (async () => {
    if (typeof Tesseract === "undefined") {
      console.warn("[TESS] Tesseract.js not loaded. Add tesseract.min.js in index.html.");
      return false;
    }
    // Use CDN assets by default (keeps plugin zip small).
    // If you prefer fully-offline, host these files locally and change the paths.
    // Use CDN assets by default (keeps plugin zip small).
// NOTE: With tesseract.js v5, do NOT pass worker/core/lang paths or a logger function here.
// Alt1/CEF is most stable with the default resolver.
let __tessWorker = null;
let __tessInitPromise = null;

async function __initTesseractOnce() {
  if (__tessWorker) return __tessWorker;
  if (__tessInitPromise) return __tessInitPromise;

  __tessInitPromise = (async () => {
    const worker = await Tesseract.createWorker(); // ✅ v5-correct

    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    __tessWorker = worker;
    return worker;
  })();

  try {
    return await __tessInitPromise;
  } finally {
    // keep the resolved promise around via __tessWorker; clear pending handle
    __tessInitPromise = null;
  }
}

// Optional cleanup helper (call on unload if you want)
async function __terminateTesseract() {
  try {
    if (__tessWorker) await __tessWorker.terminate();
  } catch (e) {}
  __tessWorker = null;
  __tessInitPromise = null;
}

function __imgRefToImageData(imgRef) {
  // ImgRef-like objects from A1lib.capture expose {width,height,data}
  try {
    if (!imgRef || !imgRef.data || !imgRef.width || !imgRef.height) return null;
    return new ImageData(new Uint8ClampedArray(imgRef.data), imgRef.width, imgRef.height);
  } catch (e) {
    return null;
  }
}

function __preprocessToCanvasBW(imgData, scale, threshold) {
  const srcW = imgData.width | 0, srcH = imgData.height | 0;
  const s = Math.max(1, scale | 0);
  const t = Math.max(0, Math.min(255, threshold | 0));

  const tmp = document.createElement("canvas");
  tmp.width = srcW;
  tmp.height = srcH;
  tmp.getContext("2d", { willReadFrequently: true }).putImageData(imgData, 0, 0);

  const c = document.createElement("canvas");
  c.width = srcW * s;
  c.height = srcH * s;

  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, c.width, c.height);

  const d = ctx.getImageData(0, 0, c.width, c.height);
  const p = d.data;

  // Grayscale + hard threshold (fast + works well on RS tooltips)
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
    const v = lum >= t ? 255 : 0;
    p[i] = p[i + 1] = p[i + 2] = v;
    p[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

function __normalizeOcrText(t) {
  return String(t || "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function __tesseractRecognizeImageData(imgData, opts) {
  const ok = await __initTesseractOnce();
  if (!ok || !__tess.worker) return { ok: false, reason: "Tesseract init failed." };

  const scale = (opts && opts.scale) ? opts.scale : 2;
  const threshold = (opts && opts.threshold) ? opts.threshold : 165;
  const psm = (opts && opts.psm != null) ? opts.psm : Tesseract.PSM.SINGLE_BLOCK;
  const whitelist = (opts && opts.whitelist) ? opts.whitelist : "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:/()[]+-., '";

  try {
    await __tess.worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: whitelist
    });

    const canvas = __preprocessToCanvasBW(imgData, scale, threshold);
    const res = await __tess.worker.recognize(canvas);
    const text = __normalizeOcrText(res && res.data ? res.data.text : "");
    return text ? { ok: true, text } : { ok: false, reason: "No text." };
  } catch (e) {
    return { ok: false, reason: "Tesseract error: " + (e && e.message ? e.message : String(e)) };
  }
}

function __padRect(r, pad) {
  const p = Math.max(0, pad | 0);
  const x = Math.max(0, (r.x - p) | 0);
  const y = Math.max(0, (r.y - p) | 0);
  const w = Math.max(20, (r.w + (2 * p)) | 0);
  const h = Math.max(20, (r.h + (2 * p)) | 0);
  return { x, y, w, h };
}

async function ocrTooltipNearSelectionTesseract(selection) {
  if (!selection || !selection.rect) return { ok: false, reason: "No selection." };
  if (!(window.A1lib && typeof A1lib.capture === "function")) return { ok: false, reason: "A1lib.capture unavailable." };

  const r = selection.rect;
  const ix = (selection.rx + r.x + (r.w / 2)) | 0;
  const iy = (selection.ry + r.y + (r.h / 2)) | 0;

  // Same probe strategy as fast OCR, but we capture pixels and run Tesseract.
  const probes = [
    { x: ix - 240, y: iy - 170, w: 480, h: 120 }, // above
    { x: ix + 35,  y: iy - 120, w: 520, h: 150 }, // right
    { x: ix - 555, y: iy - 120, w: 520, h: 150 }, // left
    { x: ix - 260, y: iy + 30,  w: 520, h: 150 }, // below
  ];

  // "Zoom out" a bit for manual debug/robustness by padding the captured region.
  const PAD = 36;

  const reads = [];
  for (let pi = 0; pi < probes.length; pi++) {
    const pr = __padRect(probes[pi], PAD);

    let imgRef = null;
    try { imgRef = A1lib.capture(pr.x, pr.y, pr.w, pr.h); } catch (e) {}
    if (!imgRef) continue;

    const imgData = __imgRefToImageData(imgRef);
    if (!imgData) continue;

    // Try two quick parameter sets; pick best text.
    const r1 = await __tesseractRecognizeImageData(imgData, { scale: 2, threshold: 165, psm: Tesseract.PSM.SINGLE_BLOCK });
    const r2 = r1.ok ? r1 : await __tesseractRecognizeImageData(imgData, { scale: 3, threshold: 155, psm: Tesseract.PSM.SINGLE_BLOCK });

    if (r2 && r2.ok && r2.text) {
      reads.push(r2.text);
      // If we already see an action verb, stop early.
      if (/\b(Take|Open|Search|Claim|Collect|Withdraw|Pick up|Loot)\b/i.test(r2.text)) break;
    }
  }

  if (!reads.length) return { ok: false, reason: "No text found (tesseract)." };

  // Prefer the longest (most complete) read.
  reads.sort((a, b) => (b ? b.length : 0) - (a ? a.length : 0));
  return { ok: true, text: reads[0] };
}

  function getQtyFromSelectionOrOcr(selection, ocrText) {
    // Prefer reading the stack quantity directly from the selected icon.
    try {
      if (selection && selection.rect) {
        const rsX = (selection.rx + selection.rect.x) | 0;
        const rsY = (selection.ry + selection.rect.y) | 0;
        const q = readStackQtyAt(rsX, rsY);
        if (isFinite(q) && q > 0) return q;
      }
    } catch (e) {}

    // Fallback: parse quantity markers in text (e.g. x12, (x 12), * 12).
    try {
      const t = String(ocrText || "");
      const m = t.match(/(?:\bx\s*|\(\s*x\s*|\*\s*)(\d[\d,]*)\b/i);
      if (m) {
        const n = parseInt(String(m[1] || "").replace(/,/g, ""), 10);
        if (isFinite(n) && n > 0) return n;
      }
    } catch (e) {}

    return 1;
  }



  
  function normalizeAlt1OcrResult(val) {
    if (val == null) return "";
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return "";
      if (s[0] === "{" && s.indexOf('"text"') !== -1) {
        try {
          const obj = JSON.parse(s);
          if (obj && typeof obj.text === "string") return obj.text.trim();
        } catch (e) {}
      }
      return s;
    }
    if (typeof val === "object") {
      if (typeof val.text === "string") return val.text.trim();
      try {
        const s = String(val);
        if (s[0] === "{" && s.indexOf('"text"') !== -1) {
          const obj = JSON.parse(s);
          if (obj && typeof obj.text === "string") return obj.text.trim();
        }
      } catch (e) {}
    }
    return String(val).trim();
  }

  function readStackQtyAt(rsX, rsY) {
    if (!window.alt1 || !alt1.permissionPixel) return 1;
    // tight region: top-left corner digits
    const w = 26, h = 18;
    const bid = alt1.bindRegion(rsX, rsY, w, h);
    if (!bid) return 1;

    const optsSmall = JSON.stringify({ fontname: "small", allowgap: true });
    const optsChat = JSON.stringify({ fontname: "chat", allowgap: true });

    const yOffsets = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 0; i < yOffsets.length; i++) {
      const y = yOffsets[i];
      let res = "";
      try { res = alt1.bindReadStringEx(bid, 0, y, optsSmall); } catch (e) {}
      let txt = normalizeAlt1OcrResult(res);
      if (!txt) {
        try { res = alt1.bindReadStringEx(bid, 0, y, optsChat); } catch (e) {}
        txt = normalizeAlt1OcrResult(res);
      }
      const m = (txt || "").match(/\d[\d,]*/);
      if (m) {
        const n = parseInt(m[0].replace(/,/g, ""), 10);
        if (isFinite(n) && n > 0) return n;
      }
    }
    return 1;
  }

  
  


async function manualSubmitFlow() {
  if (!isSetupReady()) {
    showEvent("Manual submit", "Setup not locked/ready.", "warn", true, true);
    return;
  }

  // User hovers the item so the tooltip/menu appears, then draws a box around the icon.
  showEvent("Manual submit", "Hover the item (tooltip visible), then draw a box around its icon…", "ok", true, false);
  try { if (alt1 && typeof alt1.setTooltip === "function") alt1.setTooltip("Manual submit: hover item so tooltip shows, then draw a box around the icon"); } catch (e) {}

  // Bigger capture improves selection ergonomics; OCR itself stays targeted and fast.
  const selectionFn = (window && window.__selectIconRegionAroundMouse) ? window.__selectIconRegionAroundMouse : null;
  const selection = selectionFn ? await selectionFn(700) : null;
  try { if (alt1 && typeof alt1.clearTooltip === "function") alt1.clearTooltip(); } catch (e) {}

  if (!selection) {
  showEvent("Manual submit", "Selection cancelled or too small.", "warn", true, true);
  return;
}

// ---- Manual submit OCR (fast OCR first, Tesseract fallback) ----
// 1) Fast: Alt1 tooltip OCR sampled multiple frames and voted.
let ocr = await ocrTooltipNearSelectionStable(selection, 3, 55);

// 2) Fallback: Tesseract.js (WASM) for tougher tooltips/menus.
const ocrTextLen = (o) => String(o?.text ?? "").trim().length;

if (!ocr || !ocr.ok || ocrTextLen(ocr) < 3) {
  try {
    ocr = await ocrTooltipNearSelectionTesseract(selection);
  } catch (e) {}
}

if (!ocr || !ocr.ok || !ocr.text) {
  showEvent(
    "Manual submit",
    "Could not read tooltip text. Make sure the item tooltip/menu is visible and unobstructed, then try again.",
    "warn",
    true,
    true
  );
  return;
}

const qty = getQtyFromSelectionOrOcr(selection, ocr.text);
const cands = extractDropCandidatesFromOcr(ocr.text);

// Fallback: sometimes OCR gives just the title line without the verb; try first line.
if (!cands.length) {
  const first =
    String(ocr.text)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0] || "";
  if (first) cands.push(first);
}

// If we still have no candidates, try Tesseract once more (different OCR output can parse differently).
if (!cands.length) {
  try {
    const o2 = await ocrTooltipNearSelectionTesseract(selection);
    if (o2 && o2.ok && o2.text) {
      ocr = o2;

      const c2 = extractDropCandidatesFromOcr(ocr.text);
      if (c2?.length) cands.push(...c2);

      if (!cands.length) {
        const f2 =
          String(ocr.text)
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)[0] || "";
        if (f2) cands.push(f2);
      }
    }
  } catch (e) {}
}

if (!cands.length) {
  showEvent(
    "Manual submit",
    "Read tooltip text, but couldn't find an item name in it.",
    "warn",
    true,
    true
  );
  try {
    console.log("[MANUAL OCR] Raw OCR text:", ocr.text);
  } catch (e) {}
  return;
}

// Try candidates in order until one validates.
for (let i = 0; i < Math.min(4, cands.length); i++) {
  const raw = String(cands[i] || "").trim();
  if (!raw) continue;

  let v = validateDropName(raw);
  let chosen = v?.valid ? (v.canonical || raw) : null;

  // If allowlist uses canonical wiki title, try resolving canonical once.
  if (!chosen) {
    try {
      const canon = await resolveCanonicalName(raw);
      v = validateDropName(canon);
      chosen = v?.valid ? (v.canonical || canon) : null;
    } catch (e) {}
  }

  if (chosen) {
    showEvent("Manual submit", `OCR: ${chosen} x${qty}`, "ok", true, false);
    try {
      await submitDrop({ drop_name: chosen, amount: String(qty) });
      showEvent("Manual submit", `Submitted: ${chosen} x${qty}`, "ok", true, true);
      playOk();
      return;
    } catch (e) {
      showEvent(
        "Manual submit",
        "Submit failed: " + (e?.message ? e.message : e),
        "warn",
        true,
        true
      );
      return;
    }
  }
}
  showEvent("Manual submit", `OCR read "${cands[0]}", but it isn't in the allowlist.`, "warn", true, true);
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
      /^You\s+(?:have\s+)?(?:receive|received|find|found)\s*:?\s*(.+?)\s*(?:\(?x\s*(\d+)\)?)?\s*$/i,
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
          addFeed(`Rejected (not in allowlist): ${parsed.drop_name}`, "warn");
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
        manualSubmitFlow();
      });
      return;
    }

    // Legacy callback (works on older/mid Alt1 builds; may show a deprecation warning in console)
    window.alt1onrightclick = (obj) => {
      try { console.log("[Alt1] alt1onrightclick (legacy)", obj); } catch (e) {}
      manualSubmitFlow();
    };
  }

  // Bind hotkey after everything is defined
  bindAlt1ManualHotkey();

})();


// --- Added: Universal broadcast drop detection ---
function normalizeIgn(raw) {
  raw = (raw || "").toString().trim();
  // Anchor to the first capital letter (RSN display starts with A-Z; ironman icons/prefixes may precede it)
  const i = raw.search(/[A-Z]/);
  if (i >= 0) return raw.slice(i).trim();
  return raw;
}

function stripChatPrefix(s) {
  return (s || "")
    // remove timestamp/channel bracket prefixes like "[17:36:57]" "[CC]" etc
    .replace(/^\s*(?:\[[^\]]+\]\s*)+/i, "")
    // remove leading % and optional bracket tag before "News:"
    .replace(/^\s*%\s*(?:\[[^\]]+\]\s*)?/i, "")
    // remove "News:" label (case-insensitive)
    .replace(/^\s*news\s*:\s*/i, "")
    .trim();
}

// Patch into existing parse function if present
if (typeof _tryParseReceive === "function") {
  const __originalTryParseReceive = _tryParseReceive;
  _tryParseReceive = function(text) {
    let result = __originalTryParseReceive(text);
    if (result) return result;

    let t = stripTimestampPrefix(text);
    t = stripChatPrefix(t);

    const lockedIgnRaw = (localStorage.getItem(LS.ign) || "").trim();
    if (!lockedIgnRaw) return null;
    const lockedIgn = normalizeIgn(lockedIgnRaw).toLowerCase();

    // Accept relayed/broadcast formats where the sender name may include icon prefixes (e.g. ironman),
    // and anchor the "real" IGN to the first capital letter before comparing to the locked IGN.
    const reBroadcast = new RegExp(
      "^(.+?)\\s+has\\s+received\\s+(?:some\\s+|an?\\s+)?(.+?)\\s*(?:\\(?x\\s*(\\d+)\\)?)?\\s*drop\\b.*$",
      "i"
    );

    const m = t.match(reBroadcast);
    if (m) {
      const ignRaw = (m[1] || "").trim();
      const ign = normalizeIgn(ignRaw).toLowerCase();
      if (ign !== lockedIgn) return null;

      const item = (m[2] || "").trim();
      const amt = (m[3] || "1").trim();
      if (!item) return null;

      return { drop_name: item, amount: amt };
    }

    return null;
  };
}
// --- End broadcast patch ---
