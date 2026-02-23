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
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(ign)) {
    addFeed("IGN must start with A–Z, a–z, or 0–9 and only use A–Z, a–z, 0–9, space, _ or -.", "bad");
    return;
  }
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
  


async function irbBoot() {
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
}

document.addEventListener('DOMContentLoaded', () => {
  irbBoot().catch((e) => {
    console.error(e);
    try { addFeed('Boot failed: ' + (e && e.message ? e.message : String(e)), 'bad'); } catch (_) {}
  });
});