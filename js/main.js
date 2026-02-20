/* IRB v2026-02-20-premium-select (FIXED)
   Fixes:
   - Removes calls to missing functions: getBingoById/getSelectedBingoId/getTeamByNo/getSelectedTeamNo/saveSetupFromSelection/setupPremiumSelectUI
   - Null-guards backdrop listener
   - Avoids resolving canonical name twice (resolve ONLY in poll; submitDrop trusts input)
   - Fixes duplicate team_number mapping
*/
(function () {

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

  // ---------- Premium Selects (Bingo + Team) ----------
  let _bingosCache = [];
  let _selectedBingo = null;
  let _selectedTeam = null;

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

  // ---------- multi-frame stabilisation (adaptive, lightweight) ----------
  // Goal: reduce OCR flicker / one-frame garbage reads without slowing normal operation.
  // Strategy:
  // - Compute a per-frame confidence estimate from chatReader.read() output (best-effort).
  // - Require 1/2/3 consecutive frame hits depending on confidence.
  // - Only enqueue a drop once it is "stable" across frames.
  const __stab = {
    frameId: 0,
    // key -> { lastFrame, streak, lastAcceptedFrame }
    map: new Map(),
    // keep small to avoid perf impact
    maxEntries: 220,
    pruneAfterFrames: 12,
  };

  function __normKey(name, amt) {
    const n = String(name || "")
      .replace(/[\u00A0\s]+/g, " ")
      .replace(/[\.,;:]+$/g, "")
      .trim()
      .toLowerCase();
    const a = String(amt || "").trim();
    return `${n}||${a}`;
  }

  function __getLineConf(line) {
    // Alt1 Chatbox line objects sometimes carry confidence/score fields; fall back to 0.
    const v =
      (line && typeof line.confidence === "number" ? line.confidence :
      (line && typeof line.conf === "number" ? line.conf :
      (line && typeof line.score === "number" ? line.score :
      (line && typeof line.confPct === "number" ? line.confPct : null))));
    if (v === null || v === undefined) return null;
    // Accept either 0..1 or 0..100
    const n = v > 1 ? (v / 100) : v;
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  }

  function __estimateFrameConf(lines, stitched) {
    // Best-effort. If no numeric confidence is present, infer from structure:
    // timestamps present + reasonable line count => higher confidence.
    const vals = [];
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const c = __getLineConf(lines[i]);
      if (typeof c === "number") vals.push(c);
    }
    if (vals.length) {
      // Use a robust-ish central tendency (median) to avoid spikes.
      vals.sort((a,b) => a-b);
      return vals[Math.floor(vals.length / 2)];
    }

    // Heuristics if confidence isn't provided
    const hasTs = !!(stitched && stitched.hasTimestamps);
    const rawCount = stitched && typeof stitched.rawCount === "number" ? stitched.rawCount : (lines ? lines.length : 0);
    if (hasTs && rawCount >= 6) return 0.88;
    if (hasTs) return 0.80;
    if (rawCount >= 8) return 0.78;
    if (rawCount >= 4) return 0.70;
    return 0.62;
  }

  function __requiredHits(conf) {
    // Adaptive thresholds: high confidence -> 1 frame, medium -> 2, low -> 3.
    if (conf >= 0.88) return 1;
    if (conf >= 0.72) return 2;
    return 3;
  }

  function __stabPrune() {
    // prune old entries occasionally
    if (__stab.map.size <= __stab.maxEntries) return;
    const cutoff = __stab.frameId - __stab.pruneAfterFrames;
    for (const [k, v] of __stab.map.entries()) {
      if (!v || (v.lastFrame || 0) < cutoff) __stab.map.delete(k);
    }
    // still too big? delete oldest-ish by lastFrame
    if (__stab.map.size > __stab.maxEntries) {
      const arr = [];
      for (const [k, v] of __stab.map.entries()) arr.push([k, v.lastFrame || 0]);
      arr.sort((a,b) => a[1]-b[1]);
      const toDrop = __stab.map.size - __stab.maxEntries;
      for (let i = 0; i < toDrop; i++) __stab.map.delete(arr[i][0]);
    }
  }

  function __stabNextFrame() {
    __stab.frameId++;
  }

  function __stabShouldAccept(rawName, amt, frameConf) {
    const need = __requiredHits(frameConf);

    const key = __normKey(rawName, amt);
    if (!key || key === "||") return false;

    const prev = __stab.map.get(key) || { lastFrame: 0, streak: 0, lastAcceptedFrame: 0 };

    // Update consecutive streak (same key must appear in consecutive frames)
    if (prev.lastFrame === __stab.frameId - 1) prev.streak += 1;
    else prev.streak = 1;

    prev.lastFrame = __stab.frameId;
    __stab.map.set(key, prev);

    // Avoid immediately re-accepting the same key across adjacent frames once accepted.
    if (prev.lastAcceptedFrame && (__stab.frameId - prev.lastAcceptedFrame) <= 2) return false;

    if (prev.streak >= need) {
      prev.lastAcceptedFrame = __stab.frameId;
      __stab.map.set(key, prev);
      __stabPrune();
      return true;
    }

    __stabPrune();
    return false;
  }


  // ---------- submission queue (prevents poll stalls; integrates with stabiliser) ----------
  const dropQueue = []; // { rawName, amount, rawLine, seenAt }
  let queueRunning = false;

  function enqueueDrop(job) {
    if (!job) return;
    dropQueue.push(job);
    // kick processor (fire-and-forget)
    void processDropQueue();
  }

  async function processDropQueue() {
    if (queueRunning) return;
    queueRunning = true;
    try {
      while (dropQueue.length) {
        const job = dropQueue.shift();
        if (!job) continue;

        // Resolve canonical (network) outside poll loop
        const canonicalName = await resolveCanonicalName(job.rawName);

        // Time-bucketed dedupe: allow legitimate repeats later, block spam/duplicate reads
        const bucket = Math.floor((job.seenAt || Date.now()) / 5000); // 5s bucket
        const key = `${canonicalName}||${job.amount || ""}||${bucket}||${job.rawLine || ""}`;
        if (recentSet.has(key)) continue;

        rememberKey(key);

        addFeed(`Drop: ${canonicalName}${job.amount ? " x" + job.amount : ""}`, "ok");

        try {
          await submitDrop({ drop_name: canonicalName, amount: job.amount });
          playBeep("ok");
          addFeed(`Submitted ✅ ${canonicalName}${job.amount ? " x" + job.amount : ""}`, "ok");
        } catch (e) {
          addFeed(`Submit failed ❌ (${canonicalName}): ${e.message}`, "bad");
        }
      }
    } finally {
      queueRunning = false;
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
    pollTimer = setInterval(pollWrapper, 350);
  }

  function stop() {
    running = false;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    addFeed("Stopped.", "warn");
    playBeep("warn");
  }

  
  // Prevent re-entrant polls if a poll cycle takes longer than the interval
  let __pollRunning = false;
  async function pollWrapper() {
    if (__pollRunning) return;
    __pollRunning = true;
    try { await poll(); }
    finally { __pollRunning = false; }
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
      addFeed("Chat moved. Lock it again from Settings.", "warn");
    }
  }
  return;
}

    chatState.consecutiveEmpty = 0;
    const stitched = stitchChatMessages(lines);
    const frameConf = __estimateFrameConf(lines, stitched);
    __stabNextFrame();

    for (let i = 0; i < stitched.messages.length; i++) {
      const raw = stitched.messages[i];
      if (!raw) continue;

      chatState.lastLine = stripTimestampPrefix(raw);

      const nextRaw = stitched.messages[i + 1] ? stitched.messages[i + 1] : "";
      const parsed = parseDropLine(raw, nextRaw);
      if (!parsed) continue;

            // Multi-frame stabilisation gate (adaptive)
      // Only enqueue once the same drop is seen consistently across frames.
      if (!__stabShouldAccept(parsed.drop_name, parsed.amount, frameConf)) continue;

      enqueueDrop({
        rawName: parsed.drop_name,
        amount: parsed.amount,
        rawLine: chatState.lastLine || "",
        seenAt: Date.now()
      });
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
  loadBingosAndPopulate();

  window.IRB = window.IRB || {};
  window.IRB.reloadBingos = loadBingosAndPopulate;

  if (isAlt1) {
    initChatReader();
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
    refreshSummary();
    refreshSetupState();
  }

})();
