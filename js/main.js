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
    // Same file, settings-only view
    const base = location.href.split("#")[0].split("?")[0];
    return `${base}?settings=1`;
  }

  function openSettingsPopup() {
    const url = buildSettingsUrl();
    const w = 356;
    const h = 560;

    // Alt1 popup if available
    if (window.alt1 && typeof alt1.openPopup === "function") {
      try { alt1.openPopup(url, w, h); return; } catch (e) {}
    }

    // Browser fallback
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
  };

  // API base is locked (hidden in UI)
  const LOCKED_API_BASE = (ui.apiBase && ui.apiBase.value) ? ui.apiBase.value : "";
  const getApiBase = () => LOCKED_API_BASE;

  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS.settings) || "{}"); } catch (e) {}
    return { autoDetect: true, highlight: s.highlight === true };
  }
  function saveSettings(patch) {
    const current = loadSettings();
    const next = { ...current, ...patch };
    localStorage.setItem(LS.settings, JSON.stringify(next));
    return next;
  }

  // ---------- UI helpers ----------
  const FEED_MAX = 3;
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
    if (!isAlt1) return;
    if (!isSetupReady()) return;
    if (running) return;

    if (!chatReader) {
      const ok = initChatReader();
      if (!ok) return;
    }

    running = true;

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, 350);
  }

  function stop() {
    running = false;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
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
        playBeep("ok");
        addFeed(`Submitted ✅ ${canonicalName}${parsed.amount ? " x" + parsed.amount : ""}`, "ok");
      } catch (e) {
        addFeed(`Submit failed ❌ (${canonicalName}): ${e.message}`, "bad");
      }
    }
  }

  // ---------- events ----------
  // ---------- events ----------
  // Main overlay opens Settings in a separate popup window (Alt1 can't render outside its window)
  if (!__settingsOnly) {
    ui.btnOpenSettings && ui.btnOpenSettings.addEventListener("click", openSettingsPopup);
    ui.btnOpenSettings2 && ui.btnOpenSettings2.addEventListener("click", openSettingsPopup);
  } else {
    // Settings-only window uses the in-window drawer
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

  // --- WebAudio "beep" (no file needed) ---
  let __irbAudioCtx = null;
  function playBeep(type = "ok") {
    try {
      if (!__irbAudioCtx) __irbAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = __irbAudioCtx;

      // Some browsers require resume after user gesture; best-effort
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const o = ctx.createOscillator();
      const g = ctx.createGain();

      // Tones: ok=880Hz, warn=660Hz, bad=220Hz
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

  // --- Dev: add mock drop to feed ---
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

  // If this is the settings-only popup view, hide the compact overlay UI and open the drawer immediately
  if (__settingsOnly) {
    try {
      // Make the drawer fill the popup (no dead space)
      if (ui.drawer) {
        ui.drawer.style.width = "100vw";
        ui.drawer.style.maxWidth = "100vw";
        ui.drawer.style.transform = "translateX(0)";
      }

      // Dedicated "Close Settings" button (closes the popup cleanly)
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

      // Hide the in-drawer close button if it exists (we use the dedicated one in popup)
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

      const runtimeSection = document.getElementById("runtimeSection");
      if (runtimeSection) runtimeSection.style.display = "none";
      // In popup, backdrop isn't needed (click outside won't exist meaningfully)
      if (ui.backdrop) ui.backdrop.style.display = "none";
    } catch (e) {}
  }
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
