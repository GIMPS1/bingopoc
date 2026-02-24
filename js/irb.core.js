/* IRB v2026-02-20-premium-select (FIXED)
   Fixes:
   - Removes calls to missing functions: getBingoById/getSelectedBingoId/getTeamByNo/getSelectedTeamNo/saveSetupFromSelection/setupPremiumSelectUI
   - Null-guards backdrop listener
   - Avoids resolving canonical name twice (resolve ONLY in poll; submitDrop trusts input)
   - Fixes duplicate team_number mapping
*/

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
