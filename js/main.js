/* Iron Rivals Bingo (Alt1) - compact UI
   - Locked setup (Bingo/Team + IGN) becomes invisible
   - Auto-submit always ON once setup is locked
   - Chatbox: scan + dropdown select + highlight + lock (safe with multiple chat windows)
*/
(function () {
  const $ = (id) => document.getElementById(id);

  const ui = {
    alt1Pill: $("alt1Pill"),
    apiPill: $("apiPill"),
    chatPill: $("chatPill"),

    apiBase: $("apiBase"),
    bingoId: $("bingoId"),
    teamNumber: $("teamNumber"),

    ign: $("ign"),
    ignHint: $("ignHint"),
    btnLockIgn: $("btnLockIgn"),

    btnLockSetup: $("btnLockSetup"),
    setupBlock: $("setupBlock"),
    setupHint: $("setupHint"),
    setupSummary: $("setupSummary"),
    summaryMeta: $("summaryMeta"),
    btnOpenSettings2: $("btnOpenSettings2"),

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
    btnUnlockChat: $("btnUnlockChat"),

    // Runtime
    btnStart: $("btnStart"),
    btnStop: $("btnStop"),

    // Feed
    feed: $("feed"),
    feedMeta: $("feedMeta"),

    // Premium event line
    eventLine: $("eventLine"),
    eventTitle: $("eventTitle"),
    eventSub: $("eventSub"),
  };

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
  };

  // API base is locked (hidden in UI)
  const LOCKED_API_BASE = (ui.apiBase && ui.apiBase.value) ? ui.apiBase.value : "";
  const getApiBase = () => LOCKED_API_BASE;

  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS.settings) || "{}"); } catch (e) {}
    return {
      autoDetect: s.autoDetect !== false, // default true
      highlight: s.highlight === true,    // default false
    };
  }
  function saveSettings(patch) {
    const current = loadSettings();
    const next = { ...current, ...patch };
    localStorage.setItem(LS.settings, JSON.stringify(next));
    return next;
  }

  // ---------- UI helpers ----------
  const FEED_MAX = 12;
  const feedItems = []; // {ts, msg, level}
  function nowTs() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  function tagForLevel(level) {
    if (level === "ok") return "ok";
    if (level === "bad") return "bad";
    return "warn";
  }

  // Premium: tiny chime (no external audio file needed)
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
      // retrigger pulse
      void ui.eventLine.offsetWidth;
      ui.eventLine.classList.add("flash");
    }
    if (sound) playChime();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }
  function addFeed(msg, level = "warn") {
    // Always update premium event line (single-row)
    // Sound + gold flash on successful submissions
    const isSubmitOk = level === "ok" && /^Submitted ✅/.test(msg);
    const title = msg.replace(/^Submitted ✅\s*/,"").replace(/^Drop:\s*/,"").trim();
    const subtitle = isSubmitOk ? "Submitted" : (level === "bad" ? "Error" : "Status");
    showEvent(title || msg, subtitle, level, true, isSubmitOk);

    // Keep internal log buffer (for future / admin), but don't require DOM
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

  function setPill(pill, label, state) {
    pill.textContent = label;
    pill.className = "pill " + (state || "");
  }

  function openDrawer() {
    ui.drawer.classList.add("open");
    ui.drawer.setAttribute("aria-hidden", "false");
    ui.backdrop.classList.add("show");
    ui.backdrop.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    ui.drawer.classList.remove("open");
    ui.drawer.setAttribute("aria-hidden", "true");
    ui.backdrop.classList.remove("show");
    ui.backdrop.setAttribute("aria-hidden", "true");
  }

  function setVisible(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  // ---------- Alt1 detect ----------
  const isAlt1 = !!window.alt1;
  setPill(ui.alt1Pill, isAlt1 ? "Alt1: ✅" : "Alt1: ❌", isAlt1 ? "ok" : "bad");
  if (window.A1lib && typeof A1lib.identifyApp === "function") {
    try { A1lib.identifyApp("./appconfig.json"); } catch (e) {}
  }

  // ---------- restore setup ----------
  if (ui.apiBase) ui.apiBase.value = getApiBase();

  ui.bingoId.value = localStorage.getItem(LS.bingoId) || "1";
  ui.teamNumber.value = localStorage.getItem(LS.team) || "1";

  const setupLocked = (localStorage.getItem(LS.setupLocked) || "") === "1";
  const ignLocked = (localStorage.getItem(LS.ignLocked) || "") === "1";
  const ignVal = localStorage.getItem(LS.ign) || "";
  ui.ign.value = ignVal;

  function setIgnLocked(locked) {
    const field = ui.ign ? ui.ign.closest(".field") : null;
    if (locked) {
      ui.ign.disabled = true;
      ui.btnLockIgn.disabled = true;
      if (ui.ignHint) ui.ignHint.textContent = "IGN locked ✅ (reset in Settings if you change RSN).";
      // Hide IGN block once locked (requirement #2)
      if (field) field.style.display = "none";
    } else {
      ui.ign.disabled = false;
      ui.btnLockIgn.disabled = false;
      if (ui.ignHint) ui.ignHint.textContent = "Tip: lock your IGN once so submissions can’t be spoofed accidentally.";
      if (field) field.style.display = "";
    }
  }

  function setSetupLocked(locked) {
    localStorage.setItem(LS.setupLocked, locked ? "1" : "0");
    setVisible(ui.setupBlock, !locked);
    setVisible(ui.setupSummary, locked);
    refreshSummary();
    refreshSetupState();
  }

  function refreshSummary() {
    if (!ui.summaryMeta) return;
    const b = localStorage.getItem(LS.bingoId) || ui.bingoId.value || "—";
    const t = localStorage.getItem(LS.team) || ui.teamNumber.value || "—";
    const ign = (localStorage.getItem(LS.ign) || ui.ign.value || "").trim();
    const chat = localStorage.getItem(LS.chatPos) ? "Chat locked" : "Chat not set";
    const ignTxt = ign ? `IGN: ${ign}` : "IGN: —";
    ui.summaryMeta.textContent = `Bingo ${b} • Team ${t} • ${ignTxt} • ${chat}`;
    updateConfigPill();
  }

  function refreshSetupState() {
    if (!ui.setupState) return;
    const b = localStorage.getItem(LS.bingoId) || ui.bingoId.value || "—";
    const t = localStorage.getItem(LS.team) || ui.teamNumber.value || "—";
    const sl = (localStorage.getItem(LS.setupLocked) || "") === "1";
    const il = (localStorage.getItem(LS.ignLocked) || "") === "1";
    const cl = !!localStorage.getItem(LS.chatPos);
    ui.setupState.textContent = `Bingo ${b} • Team ${t} • IGN ${il ? "locked" : "not set"} • Chat ${cl ? "locked" : "not set"} • Setup ${sl ? "locked" : "unlocked"}`;
  }

  setIgnLocked(ignLocked);
  setSetupLocked(setupLocked);

  // ---------- settings init ----------
  let settings = loadSettings();
  ui.optAutoDetect.checked = settings.autoDetect;
  ui.optHighlight.checked = settings.highlight;

  // ---------- API helpers ----------
  async function pingApi() {
    const base = getApiBase();
    const bingoId = parseInt(localStorage.getItem(LS.bingoId) || ui.bingoId.value || "0", 10) || 0;
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

  // ---------- canonical name resolver (via backend /wiki/tooltip) ----------
  const canonicalCache = new Map(); // raw->canonical
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

  async function submitDrop({ drop_name, amount }) {
    const base = getApiBase();
    const bingoId = parseInt(localStorage.getItem(LS.bingoId) || ui.bingoId.value || "0", 10) || 0;
    const team_number = parseInt(localStorage.getItem(LS.team) || ui.teamNumber.value || "0", 10);
    const ign = (localStorage.getItem(LS.ign) || ui.ign.value || "").trim() || "Unknown";
    const ts_iso = new Date().toISOString();

    const canonical = await resolveCanonicalName(drop_name);

    const fd = new FormData();
    fd.append("ts_iso", ts_iso);
    fd.append("ign", ign);
    fd.append("team_number", String(team_number || 0));
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
      const raw = (lines[i] && lines[i].text) ? String(lines[i].text) : String(lines[i] || "");
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

  function stitchChatMessages(lines) {
    const rawLines = (lines || []).map(l => (l && l.text) ? String(l.text) : String(l || "")).filter(Boolean);
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

  // Duplicate protection
  const recentKeys = [];
  const recentSet = new Set();
  function rememberKey(k) {
    recentKeys.push(k);
    recentSet.add(k);
    while (recentKeys.length > 80) {
      const old = recentKeys.shift();
      recentSet.delete(old);
    }
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

  function setChatPillLocked(confPct, mode) {
    // Chat status contributes to overall Config pill (shown in the 3rd pill)
    updateConfigPill();
    refreshSummary();
    refreshSetupState();
  }
  function setChatPillMissing() {
    updateConfigPill();
    refreshSummary();
    refreshSetupState();
  }

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

    // Not configured yet: show progress
    const parts = [];
    parts.push(setupLocked ? `B${b}/T${t} ✅` : "B/T …");
    parts.push(ignLocked ? `IGN ✅` : "IGN …");
    parts.push(chatLocked ? "Chat ✅" : "Chat …");

    // state = bad if nothing set, warn otherwise
    const any = setupLocked || ignLocked || chatLocked;
    const state = any ? "warn" : "bad";
    setPill(ui.chatPill, `Config: ${parts.join(" • ")}`, state);
  }


  function initChatReader() {
    const ChatboxCtor = getChatboxCtor();
    if (!ChatboxCtor) {
      addFeed("Alt1 chatbox library not loaded (Chatbox ctor missing).", "bad");
      return false;
    }
    chatReader = new ChatboxCtor();

    // Do not overwrite default readargs/colors; only add safe extras.
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
        setChatPillLocked(chatState.confPct, "locked");
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
        setChatPillLocked(chatState.confPct, "fallback");
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
    const color = 0x00ff00;

    if (window.alt1 && typeof alt1.overLayRect === "function") {
      try {
        alt1.overLayRect(color, x, y, w, t, ms, 2);
        alt1.overLayRect(color, x, y + h - t, w, t, ms, 2);
        alt1.overLayRect(color, x, y, t, h, ms, 2);
        alt1.overLayRect(color, x + w - t, y, t, h, ms, 2);
        return true;
      } catch (e) {}
    }
    if (window.A1lib && typeof A1lib.drawRect === "function") {
      try { A1lib.drawRect(x, y, w, h, ms); return true; } catch (e) {}
    }
    if (force) addFeed("Highlight failed: overlay API not available. Check Alt1 overlay permission & capture mode.", "warn");
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
        setChatPillLocked(chatState.confPct, "locked");
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
  let scannedChats = []; // {id, pos, rect}

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

    // Normalise output
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
      setChatPillLocked(chatState.confPct, "locked");
      tryOverlayRect(sel.pos, true);
      addFeed("Chatbox locked ✅", "ok");
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
  }

  // ---------- runtime ----------
  function isSetupReady() {
    const sl = (localStorage.getItem(LS.setupLocked) || "") === "1";
    const il = (localStorage.getItem(LS.ignLocked) || "") === "1";
    const b = parseInt(localStorage.getItem(LS.bingoId) || "0", 10);
    const t = parseInt(localStorage.getItem(LS.team) || "0", 10);
    return sl && il && b > 0 && t > 0;
  }

  function start() {
    if (!isAlt1) { addFeed("Alt1 not detected. Open inside Alt1 Toolkit.", "bad"); return; }
    if (!isSetupReady()) { addFeed("Finish setup first (lock Bingo/Team + IGN).", "bad"); return; }

    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return;
    }

    running = true;
    ui.btnStart.disabled = true;
    ui.btnStop.disabled = false;
    addFeed("Running. Auto-submit active ✅", "ok");

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, 350);
  }

  function stop() {
    running = false;
    ui.btnStart.disabled = false;
    ui.btnStop.disabled = true;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    addFeed("Stopped.", "warn");
  }

  async function poll() {
    if (!running || !chatReader) return;

    // Guard: auto-submit only once setup locked
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
          addFeed("Chat moved. Lock it again from Settings.", "warn");
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

      const canonicalName = await resolveCanonicalName(parsed.drop_name);
      const key = `${canonicalName}||${parsed.amount || ""}`;
      if (recentSet.has(key)) continue;

      rememberKey(key);
      addFeed(`Drop: ${canonicalName}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");

      try {
        await submitDrop({ drop_name: canonicalName, amount: parsed.amount });
        addFeed(`Submitted ✅ ${canonicalName}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");
      } catch (e) {
        addFeed(`Submit failed ❌ (${canonicalName}): ${e.message}`, "bad");
      }
    }
  }

  // ---------- events ----------
  ui.btnOpenSettings.addEventListener("click", openDrawer);
  ui.btnOpenSettings2 && ui.btnOpenSettings2.addEventListener("click", openDrawer);
  ui.btnCloseSettings.addEventListener("click", closeDrawer);
  ui.backdrop.addEventListener("click", closeDrawer);

  ui.optAutoDetect.addEventListener("change", (e) => {
    settings = saveSettings({ autoDetect: !!e.target.checked });
    addFeed("Auto-detect fallback: " + (settings.autoDetect ? "ON" : "OFF"), "ok");
  });
  ui.optHighlight.addEventListener("change", (e) => {
    settings = saveSettings({ highlight: !!e.target.checked });
    addFeed("Highlight during locate: " + (settings.highlight ? "ON" : "OFF"), "ok");
  });

  ui.btnLockSetup.addEventListener("click", () => {
    const b = parseInt(ui.bingoId.value || "0", 10);
    const t = parseInt(ui.teamNumber.value || "0", 10);
    if (!b || b < 1) { addFeed("Set a valid Bingo #.", "bad"); return; }
    if (!t || t < 1) { addFeed("Set a valid Team #.", "bad"); return; }

    localStorage.setItem(LS.bingoId, String(b));
    localStorage.setItem(LS.team, String(t));
    setSetupLocked(true);
    addFeed("Bingo/Team locked ✅", "ok");

    // Re-ping with correct bingo path
    pingApi();

    // If IGN already locked too, auto start
    if (isSetupReady()) start();
  });

  ui.btnUnlockSetup.addEventListener("click", () => {
    setSetupLocked(false);
    addFeed("Bingo/Team unlocked. Set values then Lock again.", "warn");
    stop();
  });

  ui.btnLockIgn.addEventListener("click", () => {
    const ign = (ui.ign.value || "").trim();
    if (!ign) { addFeed("Enter your IGN first.", "bad"); return; }
    localStorage.setItem(LS.ign, ign);
    localStorage.setItem(LS.ignLocked, "1");
    setIgnLocked(true);
    addFeed("IGN locked ✅", "ok");
    refreshSummary();
    refreshSetupState();
    if (isSetupReady()) start();
  });

  ui.btnResetIgn.addEventListener("click", () => {
    localStorage.setItem(LS.ignLocked, "0");
    setIgnLocked(false);
    addFeed("IGN unlocked. Update it, then Lock again.", "warn");
    refreshSummary();
    refreshSetupState();
    stop();
  });

  ui.btnRecalibrate.addEventListener("click", () => {
    locateChatboxAndStore();
  });

  ui.btnScanChats.addEventListener("click", () => {
    // Ensure chatReader exists for best compatibility
    if (!chatReader) initChatReader();
    scanChatboxes();
  });

  ui.chatSelect.addEventListener("change", () => {
    const idx = parseInt(ui.chatSelect.value || "-1", 10);
    const sel = scannedChats[idx];
    if (sel) tryOverlayRect(sel.pos, true);
  });

  ui.btnHighlightChat.addEventListener("click", () => {
    const idx = parseInt(ui.chatSelect.value || "-1", 10);
    const sel = scannedChats[idx];
    if (!sel) { addFeed("Select a chatbox first.", "bad"); return; }
    tryOverlayRect(sel.pos, true);
    addFeed("Highlight shown.", "ok");
  });

  ui.btnLockChat.addEventListener("click", lockSelectedChat);
  ui.btnUnlockChat.addEventListener("click", unlockChat);

  ui.btnStart.addEventListener("click", start);
  ui.btnStop.addEventListener("click", stop);

  // ---------- boot ----------
  addFeed("Plugin loaded.", "ok");
  pingApi();

  if (isAlt1) {
    initChatReader();
    refreshSummary();
    refreshSetupState();

    // If setup already ready, auto-start
    if (isSetupReady()) {
      start();
    } else {
      addFeed("Finish setup to enable auto-submit.", "warn");
    }

    // If no stored calibration and autoDetect enabled, attempt a single early find
    if (!loadChatPos() && loadSettings().autoDetect) {
      tryFindChatbox("startup");
    }
  } else {
    setPill(ui.apiPill, "API: —", "warn");
    setPill(ui.chatPill, "Chat: —", "warn");
    refreshSummary();
    refreshSetupState();
  }

})();
