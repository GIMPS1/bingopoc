
/* Iron Rivals Bingo (Alt1) - hybrid chatbox capture + themed UI
   - Default: calibrated chatbox rectangle (fast, reliable)
   - Fallback: auto-detect using Chatbox.find()
   - Minimal UI + settings drawer
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
    btnStart: $("btnStart"),
    btnStop: $("btnStop"),
    btnPing: $("btnPing"),
    btnLocate: $("btnLocate"),
    feed: $("feed"),
    feedMeta: $("feedMeta"),

    // Mini debug
    miniDebug: $("miniDebug"),
    dbgChat: $("dbgChat"),
    dbgConf: $("dbgConf"),
    dbgLast: $("dbgLast"),

    // Drawer
    drawer: $("settingsDrawer"),
    backdrop: $("drawerBackdrop"),
    btnOpenSettings: $("btnOpenSettings"),
    btnCloseSettings: $("btnCloseSettings"),

    // Settings controls
    btnRecalibrate: $("btnRecalibrate"),
    optAutoDetect: $("optAutoDetect"),
    optHighlight: $("optHighlight"),
    optMiniDebug: $("optMiniDebug"),
    btnCopyDebug: $("btnCopyDebug"),
    optAutoSubmit: $("optAutoSubmit"),
    btnSendTest: $("btnSendTest"),
    btnResetIgn: $("btnResetIgn"),

    // Chat debug (testing)
    chatDebug: $("chatDebug"),
    chatDebugMeta: $("chatDebugMeta"),
    chatDebugPos: $("chatDebugPos"),
    chatDebugBox: $("chatDebugBox"),
    btnDebugRead: $("btnDebugRead"),
    btnDebugHighlight: $("btnDebugHighlight"),
    btnDebugClear: $("btnDebugClear"),
    optChatDebug: $("optChatDebug"),
  };

  // ---------- storage ----------
  const LS = {
    apiBase: "irb.apiBase",
    bingoId: "irb.bingoId",
    team: "irb.team",
    ign: "irb.ign",
    ignLocked: "irb.ignLocked",
    chatPos: "irb.chatPos",
    settings: "irb.settings"
  };

  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS.settings) || "{}"); } catch (e) {}
    return {
      autoDetect: s.autoDetect !== false,     // default true
      highlight: s.highlight === true,        // default false
      miniDebug: s.miniDebug === true,        // default false
      chatDebug: s.chatDebug === true,        // default false
      autoSubmit: s.autoSubmit !== false      // default true
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
  function addFeed(msg, level = "warn") {
    feedItems.unshift({ ts: nowTs(), msg, level });
    while (feedItems.length > FEED_MAX) feedItems.pop();

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

    ui.feedMeta.textContent = `${feedItems.length} events`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
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

  // ---------- Alt1 detect ----------
  const isAlt1 = !!window.alt1;
  setPill(ui.alt1Pill, isAlt1 ? "Alt1: ✅" : "Alt1: ❌", isAlt1 ? "ok" : "bad");
  if (window.A1lib && typeof A1lib.identifyApp === "function") {
    try { A1lib.identifyApp("./appconfig.json"); } catch (e) {}
  }

  // ---------- restore form ----------
  ui.apiBase.value = localStorage.getItem(LS.apiBase) || "http://127.0.0.1:8000";
  ui.bingoId.value = localStorage.getItem(LS.bingoId) || "1";
  ui.teamNumber.value = localStorage.getItem(LS.team) || "1";

  const ignLocked = (localStorage.getItem(LS.ignLocked) || "") === "1";
  const ignVal = localStorage.getItem(LS.ign) || "";
  ui.ign.value = ignVal;
  setIgnLocked(ignLocked);

  function setIgnLocked(locked) {
    if (locked) {
      ui.ign.disabled = true;
      ui.btnLockIgn.disabled = true;
      ui.ignHint.textContent = "IGN locked ✅ (reset in Settings if you change RSN).";
    } else {
      ui.ign.disabled = false;
      ui.btnLockIgn.disabled = false;
      ui.ignHint.textContent = "Tip: lock your IGN once so submissions can’t be spoofed accidentally.";
    }
  }

  // ---------- settings init ----------
  let settings = loadSettings();
  ui.optAutoDetect.checked = settings.autoDetect;
  ui.optHighlight.checked = settings.highlight;
  ui.optMiniDebug.checked = settings.miniDebug;
  ui.optChatDebug.checked = settings.chatDebug;
  ui.optAutoSubmit.checked = settings.autoSubmit;
  ui.miniDebug.style.display = settings.miniDebug ? "" : "none";
  ui.chatDebug.style.display = settings.chatDebug ? "" : "none";

  function updateMiniDebug({ chatState, confPct, lastLine }) {
    if (!loadSettings().miniDebug) return;
    ui.dbgChat.textContent = chatState || "—";
    ui.dbgConf.textContent = (confPct != null) ? `${confPct}%` : "—";
    ui.dbgLast.textContent = lastLine ? lastLine : "—";
  }

  // ---------- chat debug (testing) ----------
  const chatDebugState = {
    lines: [],
    max: 60,
    lastReadAt: null,
    lastFirstLineKey: "",
  };

  function setChatDebugVisible(on) {
    ui.chatDebug.style.display = on ? "" : "none";
  }

  function renderChatDebug() {
    if (!loadSettings().chatDebug) return;
    const pos = chatReader && chatReader.pos ? chatReader.pos : null;
    ui.chatDebugPos.textContent = pos
      ? `pos: x=${pos.x}, y=${pos.y}, w=${pos.width || pos.w}, h=${pos.height || pos.h}`
      : "pos: —";
    ui.chatDebugBox.value = chatDebugState.lines.join("\n");
    ui.chatDebugMeta.textContent = `${chatDebugState.lines.length} lines` + (chatDebugState.lastReadAt ? ` • last read ${chatDebugState.lastReadAt}` : "");
  }

  function pushChatDebug(lines, sourceTag) {
    if (!loadSettings().chatDebug) return;
    const stamp = nowTs();
    chatDebugState.lastReadAt = stamp;
    const tag = sourceTag ? ` ${sourceTag}` : "";

    for (const ln of (lines || [])) {
      const raw = (ln && typeof ln === "object" && "text" in ln) ? (ln.text || "") : String(ln || "");
      const cleaned = stripTimestampPrefix(String(raw || "")).trim();
      if (!cleaned) continue;
      chatDebugState.lines.unshift(`[${stamp}]${tag} ${cleaned}`);
    }
    while (chatDebugState.lines.length > chatDebugState.max) chatDebugState.lines.pop();
    renderChatDebug();
  }

  // ---------- API helpers ----------
  async function pingApi() {
    const base = (ui.apiBase.value || "").replace(/\/+$/, "");
    const bingoId = parseInt(ui.bingoId.value || "0", 10) || 0;
    localStorage.setItem(LS.apiBase, base);
    localStorage.setItem(LS.bingoId, String(bingoId || 1));
    try {
      const r = await fetch(`${base}/b/${bingoId}/api/state`, { method: "GET" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setPill(ui.apiPill, "API: ✅", "ok");
      addFeed(`API ping OK (/b/${bingoId}/api/state).`, "ok");
      return true;
    } catch (e) {
      setPill(ui.apiPill, "API: ❌", "bad");
      addFeed("API ping failed: " + e.message, "bad");
      return false;
    }
  }

  async function submitDrop({ drop_name, amount }) {
    const base = (ui.apiBase.value || "").replace(/\/+$/, "");
    const bingoId = parseInt(ui.bingoId.value || "0", 10) || 0;
    const team_number = parseInt(ui.teamNumber.value || "0", 10);
    const ign = (ui.ign.value || "").trim() || "Unknown";
    const ts_iso = new Date().toISOString();

    const fd = new FormData();
    fd.append("ts_iso", ts_iso);
    fd.append("ign", ign);
    fd.append("team_number", String(team_number || 0));
    fd.append("boss", "");
    fd.append("drop_name", drop_name);
    fd.append("result", "success");
    fd.append("amount", amount || "");

    const url = `${base}/b/${bingoId}/api/mock_drop`;
    const res = await fetch(url, { method: "POST", body: fd, credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  }

  // ---------- drop parsing ----------
  function stripTimestampPrefix(s) {
    return (s || "").replace(/^\s*\[?\d{2}:\d{2}:\d{2}\]?\s*/g, "").trim();
  }
  function parseDropLine(text) {
    const t = stripTimestampPrefix(text);

    const patterns = [
      /^You (?:have )?(?:receive|received|find|found)\s*:?\s*(.+?)\s*(?:\(?x\s*(\d+)\)?)?\s*$/i,
      /^Loot\s*:\s*(.+?)\s*(?:\(?x\s*(\d+)\)?)?\s*$/i,
    ];

    for (const re of patterns) {
      const m = t.match(re);
      if (m) {
        let item = (m[1] || "").trim();
        let amt = (m[2] || "").trim();
        if (!item) return null;
        item = item.replace(/\s+from.*$/i, "").trim();
        return { drop_name: item, amount: amt };
      }
    }
    return null;
  }

  // Duplicate protection
  let lastLineTime = new Date(0);
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

  // ---------- chat hybrid reader ----------
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

  function loadChatPos() {
    try {
      const s = localStorage.getItem(LS.chatPos);
      if (!s) return null;
      const obj = JSON.parse(s);
      if (!obj) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }
  function saveChatPos(pos) {
    localStorage.setItem(LS.chatPos, JSON.stringify(pos));
  }
  function clearChatPos() {
    localStorage.removeItem(LS.chatPos);
  }

  function setChatPillLocked(confPct, mode) {
    const label = mode === "fallback" ? "Chat: ⚠" : "Chat: ✅";
    const state = mode === "fallback" ? "warn" : "ok";
    setPill(ui.chatPill, label, state);
    updateMiniDebug({ chatState: mode === "fallback" ? "FALLBACK" : "LOCKED", confPct, lastLine: chatState.lastLine });
  }
  function setChatPillMissing() {
    setPill(ui.chatPill, "Chat: ❌", "bad");
    updateMiniDebug({ chatState: "NOT FOUND", confPct: 0, lastLine: chatState.lastLine });
  }

  function initChatReader() {
    if (!window.Chatbox || !Chatbox.default) {
      addFeed("Alt1 chatbox library not loaded.", "bad");
      return false;
    }
    chatReader = new Chatbox.default();
    // IMPORTANT: don't overwrite chatbox default readargs/colors.
    // Some chat tabs fail if we replace the color list.
    if (!chatReader.readargs) chatReader.readargs = {};
    if (!Array.isArray(chatReader.readargs.colors)) chatReader.readargs.colors = [];
    const extraCols = [
      A1lib.mixColor(255,255,255),   // white
      A1lib.mixColor(127,169,255),   // timestamp blue
      A1lib.mixColor(255,255,0),     // yellow
      A1lib.mixColor(255,0,0),       // red
      A1lib.mixColor(0,255,0),       // green
    ];
    for (const c of extraCols) {
      if (chatReader.readargs.colors.indexOf(c) === -1) chatReader.readargs.colors.push(c);
    }
    chatReader.readargs.backwards = true;

    // Apply stored calibration if present
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
        // If assigning fails, clear and fall back to auto-detect
        clearChatPos();
        addFeed("Calibration invalid; cleared. Will auto-detect.", "warn");
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

  function highlightChatPos(pos) {
    if (!pos || !isAlt1) return;
    if (!loadSettings().highlight) return;
    tryOverlayRect(pos, false);
  }

  function highlightChatPosForce(pos) {
    // Used when user clicks Locate/Recalibrate: always show once for confidence.
    if (!pos || !isAlt1) return;
    tryOverlayRect(pos, true);
  }

  function tryOverlayRect(pos, force) {
    if (!pos || !isAlt1) return false;
    const x = pos.x, y = pos.y;
    const w = pos.width || pos.w;
    const h = pos.height || pos.h;
    const dur = 2500;
    const thick = 2;
    const colA = 0xFF00FF00; // ARGB green
    const colB = 0x00FF00;   // RGB green

    const attempts = [];

    // alt1 overlay variants (different builds)
    if (window.alt1 && typeof alt1.overLayRect === "function") {
      attempts.push(() => alt1.overLayRect(x, y, w, h, dur));
      attempts.push(() => alt1.overLayRect(x, y, w, h, dur, thick));
      attempts.push(() => alt1.overLayRect(x, y, w, h, colA, dur, thick));
      attempts.push(() => alt1.overLayRect(x, y, w, h, colB, dur, thick));
      attempts.push(() => alt1.overLayRect(x, y, w, h, colA, dur));
      attempts.push(() => alt1.overLayRect(x, y, w, h, colA));
      attempts.push(() => alt1.overLayRect(x, y, w, h, dur, colA));
    }

    // RuneApps lib fallback
    if (window.A1lib && typeof A1lib.drawRect === "function") {
      attempts.push(() => A1lib.drawRect(x, y, w, h, dur));
      attempts.push(() => A1lib.drawRect(x, y, w, h, dur, thick));
    }

    for (const fn of attempts) {
      try { fn(); return true; } catch (e) {}
    }

    if (force) {
      addFeed("Highlight attempted but no overlay API responded. Check appconfig permissions include 'overlay'.", "warn");
    }
    return false;
  }

  async function poll() {
    if (!running || !chatReader) return;

    // Determine whether we have a position
    if (chatReader.pos === null) {
      setChatPillMissing();
      if (loadSettings().autoDetect) {
        const ok = tryFindChatbox("no-pos");
        if (!ok) {
          chatState.consecutiveEmpty++;
          if (chatState.consecutiveEmpty % 10 === 0) addFeed("Chatbox not found. Use Locate chat / Recalibrate.", "warn");
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
      // If we get empty too long, attempt fallback re-find (in case tab changed / moved)
      if (chatState.consecutiveEmpty >= 12 && loadSettings().autoDetect) {
        const ok = tryFindChatbox("empty-read");
        if (ok) {
          chatState.consecutiveEmpty = 0;
          // Prompt user to recalibrate (via feed)
          addFeed("Chat moved. Recalibrate to lock ✅", "warn");
        }
      }
      return;
    }

    chatState.consecutiveEmpty = 0;

    // If chat debug enabled, record the raw lines (only when the newest line changes)
    if (loadSettings().chatDebug) {
      const first = lines[0] && lines[0].text ? lines[0].text : String(lines[0] || "");
      const key = stripTimestampPrefix(first).trim();
      if (key && key !== chatDebugState.lastFirstLineKey) {
        chatDebugState.lastFirstLineKey = key;
        pushChatDebug(lines.slice(0, 6), "poll");
      }
      renderChatDebug();
    }

    for (const line of lines) {
      const raw = line && line.text ? line.text : "";
      if (!raw) continue;

      chatState.lastLine = stripTimestampPrefix(raw);
      updateMiniDebug({ chatState: chatState.locked ? "LOCKED" : (chatState.usingFallback ? "FALLBACK" : "OK"), confPct: chatState.confPct, lastLine: chatState.lastLine });

      // Timestamp ordering if present
      let lineTime = new Date();
      let timeStr = null;
      try {
        const m = raw.match(/\d{2}:\d{2}:\d{2}/);
        if (m) timeStr = m[0];
        if (timeStr) {
          const [hh, mm, ss] = timeStr.split(":").map(x => parseInt(x, 10));
          const now = new Date();
          lineTime = new Date(now);
          lineTime.setHours(hh, mm, ss, 0);
          if (hh === 23 && now.getHours() === 0) lineTime.setDate(lineTime.getDate() - 1);
        }
      } catch (e) {}

      if (timeStr && lineTime < lastLineTime) continue;
      if (timeStr) lastLineTime = lineTime;

      const parsed = parseDropLine(raw);
      if (!parsed) continue;

      const key = `${parsed.drop_name}||${parsed.amount || ""}`;
      if (recentSet.has(key)) continue;

      rememberKey(key);
      addFeed(`Drop detected: ${parsed.drop_name}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");

      if (!loadSettings().autoSubmit) {
        addFeed("Auto-submit is OFF (Settings).", "warn");
        continue;
      }

      try {
        await submitDrop(parsed);
        addFeed(`Submitted ✅ ${parsed.drop_name}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");
      } catch (e) {
        addFeed(`Submit failed ❌ (${parsed.drop_name}): ${e.message}`, "bad");
      }
    }
  }

  function validateBeforeStart() {
    if (!isAlt1) {
      addFeed("Alt1 not detected. Open inside Alt1 Toolkit.", "bad");
      return false;
    }
    const team = parseInt(ui.teamNumber.value || "0", 10);
    const bingoId = parseInt(ui.bingoId.value || "0", 10);
    const ign = (ui.ign.value || "").trim();
    if (!bingoId || bingoId < 1) {
      addFeed("Set a valid Bingo # first.", "bad");
      return false;
    }
    if (!team || team < 1) {
      addFeed("Set a valid Team # first.", "bad");
      return false;
    }
    if (!ign) {
      addFeed("Set your IGN first.", "bad");
      return false;
    }
    return true;
  }

  function start() {
    if (!validateBeforeStart()) return;

    localStorage.setItem(LS.team, ui.teamNumber.value);
    localStorage.setItem(LS.bingoId, ui.bingoId.value);
    localStorage.setItem(LS.apiBase, ui.apiBase.value.replace(/\/+$/, ""));

    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return;
    }

    running = true;
    ui.btnStart.disabled = true;
    ui.btnStop.disabled = false;
    addFeed("Auto-submit started.", "ok");

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

  // ---------- calibration actions ----------
  function locateChatboxAndStore() {
    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return;
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
        // Always show highlight once when user requests locate.
        highlightChatPosForce(chatReader.pos);
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

  // ---------- IGN lock ----------
  ui.btnLockIgn.addEventListener("click", () => {
    const ign = (ui.ign.value || "").trim();
    if (!ign) { addFeed("Enter your IGN first.", "bad"); return; }
    localStorage.setItem(LS.ign, ign);
    localStorage.setItem(LS.ignLocked, "1");
    setIgnLocked(true);
    addFeed("IGN locked ✅", "ok");
  });

  ui.btnResetIgn.addEventListener("click", () => {
    localStorage.setItem(LS.ignLocked, "0");
    setIgnLocked(false);
    addFeed("IGN unlocked. Update it, then Lock again.", "warn");
  });

  // ---------- settings wiring ----------
  ui.btnOpenSettings.addEventListener("click", openDrawer);
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
  ui.optMiniDebug.addEventListener("change", (e) => {
    settings = saveSettings({ miniDebug: !!e.target.checked });
    ui.miniDebug.style.display = settings.miniDebug ? "" : "none";
    addFeed("Mini debug: " + (settings.miniDebug ? "ON" : "OFF"), "ok");
  });

  ui.optChatDebug.addEventListener("change", (e) => {
    settings = saveSettings({ chatDebug: !!e.target.checked });
    setChatDebugVisible(settings.chatDebug);
    addFeed("Chat debug: " + (settings.chatDebug ? "ON" : "OFF"), "ok");
    renderChatDebug();
  });
  ui.optAutoSubmit.addEventListener("change", (e) => {
    settings = saveSettings({ autoSubmit: !!e.target.checked });
    addFeed("Auto-submit: " + (settings.autoSubmit ? "ON" : "OFF"), "ok");
  });

  ui.btnCopyDebug.addEventListener("click", async () => {
    const dbg = buildDebugSnapshot();
    try {
      await navigator.clipboard.writeText(JSON.stringify(dbg, null, 2));
      addFeed("Debug info copied to clipboard.", "ok");
    } catch (e) {
      addFeed("Copy failed (clipboard blocked).", "bad");
    }
  });

  ui.btnRecalibrate.addEventListener("click", () => {
    locateChatboxAndStore();
  });

  ui.btnLocate.addEventListener("click", () => {
    locateChatboxAndStore();
  });

  // Chat debug actions (testing)
  ui.btnDebugRead && ui.btnDebugRead.addEventListener("click", () => {
    if (!chatReader) initChatReader();
    if (!chatReader || !chatReader.pos) {
      addFeed("Debug read: chatbox not located yet (use Locate chat).", "bad");
      renderChatDebug();
      return;
    }
    try {
      const lines = chatReader.read() || [];
      addFeed(`Debug read: ${lines.length} lines.`, "ok");
      pushChatDebug(lines.slice(0, 12), "manual");
      // Prove 'Last'
      const first = lines[0] && lines[0].text ? lines[0].text : String(lines[0] || "");
      const last = stripTimestampPrefix(first).trim();
      if (last) {
        chatState.lastLine = last;
        updateMiniDebug({ chatState: chatState.locked ? "LOCKED" : (chatState.usingFallback ? "FALLBACK" : "OK"), confPct: chatState.confPct, lastLine: chatState.lastLine });
      }
      renderChatDebug();
    } catch (e) {
      addFeed("Debug read failed: " + e.message, "bad");
    }
  });

  ui.btnDebugHighlight && ui.btnDebugHighlight.addEventListener("click", () => {
    if (!chatReader) initChatReader();
    if (chatReader && chatReader.pos) {
      highlightChatPosForce(chatReader.pos);
      addFeed("Highlight requested.", "ok");
    } else {
      addFeed("No chatbox position to highlight. Use Locate chat first.", "bad");
    }
  });

  ui.btnDebugClear && ui.btnDebugClear.addEventListener("click", () => {
    chatDebugState.lines = [];
    chatDebugState.lastFirstLineKey = "";
    renderChatDebug();
    addFeed("Chat debug cleared.", "ok");
  });

  ui.btnPing.addEventListener("click", pingApi);

  ui.btnSendTest.addEventListener("click", async () => {
    try {
      await submitDrop({ drop_name: "Ahrim's hood", amount: "1" });
      addFeed("Test drop submitted ✅ (Ahrim's hood).", "ok");
    } catch (e) {
      addFeed("Test drop failed: " + e.message, "bad");
    }
  });

  ui.btnStart.addEventListener("click", start);
  ui.btnStop.addEventListener("click", stop);

  // ---------- debug snapshot ----------
  function buildDebugSnapshot() {
    return {
      time: new Date().toISOString(),
      alt1Detected: isAlt1,
      apiBase: (ui.apiBase.value || "").replace(/\/+$/, ""),
      bingoId: ui.bingoId ? ui.bingoId.value : "1",
      team: ui.teamNumber.value,
      ign: (ui.ign.value || "").trim(),
      ignLocked: (localStorage.getItem(LS.ignLocked) || "") === "1",
      settings: loadSettings(),
      chat: {
        hasStoredCalibration: !!localStorage.getItem(LS.chatPos),
        state: {
          locked: chatState.locked,
          usingFallback: chatState.usingFallback,
          confPct: chatState.confPct,
          consecutiveEmpty: chatState.consecutiveEmpty,
          lastLine: chatState.lastLine
        },
        storedPos: loadChatPos()
      },
      recentFeed: feedItems.slice(0, 8)
    };
  }

  // ---------- boot ----------
  addFeed("Plugin loaded.", "ok");
  pingApi();

  // Auto-init chat reader so we can show chat state early
  if (isAlt1) {
    initChatReader();
    // If no calibration and autodetect enabled, attempt early find once
    if (!loadChatPos() && loadSettings().autoDetect) {
      const ok = tryFindChatbox("startup");
      if (!ok) addFeed("Chatbox not locked yet. Use Locate chat.", "warn");
    }
  } else {
    setPill(ui.apiPill, "API: —", "warn");
    setPill(ui.chatPill, "Chat: —", "warn");
  }

})();
