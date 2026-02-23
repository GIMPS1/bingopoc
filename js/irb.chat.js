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
