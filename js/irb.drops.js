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
  if (/^[A-Za-z0-9][A-Za-z0-9' _-]{1,30}:\s+/.test(t)) return true;
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

// ---------- Manual loot/tooltip scan (under-mouse) ----------
// Usage (console): IRB.manualLootScan()
// Hover the loot icon so the tooltip is visible, then run the command.
// This is intentionally single-shot (no polling) and safe (re-entrancy guarded).
let __manualBusy = false;

function _getAlt1MousePos() {
  try {
    if (!window.alt1) return null;
    if (typeof alt1.getMousePosition === "function") return alt1.getMousePosition();
    if (typeof alt1.mousePosition === "function") return alt1.mousePosition();
    if (alt1.mouse && typeof alt1.mouse.x === "number") return { x: alt1.mouse.x, y: alt1.mouse.y };
  } catch (e) {}
  return null;
}

function _clampRect(x, y, w, h) {
  x = Math.max(0, Math.floor(x));
  y = Math.max(0, Math.floor(y));
  w = Math.max(1, Math.floor(w));
  h = Math.max(1, Math.floor(h));
  return { x, y, w, h };
}

function _captureRect(rect) {
  if (!window.alt1 || typeof alt1.capture !== "function") return null;
  try {
    return alt1.capture(rect.x, rect.y, rect.w, rect.h);
  } catch (e) {
    return null;
  }
}

function _getOcrReader() {
  // Alt1 OCR globals vary by bundling; try the common ones.
  // We only need a "read" function that returns text/lines.
  return (
    window.alt1ocr ||
    window.OCR ||
    window.Ocr ||
    (window.ocr && window.ocr.default) ||
    window.ocr ||
    null
  );
}

function _extractStringsFromOcrResult(res) {
  if (!res) return [];
  if (typeof res === "string") return [res];
  if (Array.isArray(res)) return res.map(x => (typeof x === "string" ? x : (x && x.text) || "")).filter(Boolean);
  if (Array.isArray(res.text)) return res.text.map(String).filter(Boolean);
  if (typeof res.text === "string") return [res.text];
  if (Array.isArray(res.lines)) return res.lines.map(x => (typeof x === "string" ? x : (x && x.text) || "")).filter(Boolean);
  return [];
}

function _bestItemFromLines(lines) {
  const strictOn = (settings && settings.strictDrops) && canonicalMap && canonicalMap.size > 0;

  const cleaned = (lines || [])
    .map(s => String(s || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Prefer allowlist hit (most reliable)
  for (const s of cleaned) {
    const v = validateDropName(s);
    if (v && v.valid) return { name: v.canonical, source: "allowlist" };
  }

  // Fallback: heuristics for tooltip format (first non-empty line)
  const first = cleaned[0] || "";
  if (!first) return null;

  if (strictOn) {
    // Strict mode but no allowlist match => refuse to submit
    return null;
  }
  return { name: first, source: "raw" };
}

function _tryExtractQty(lines) {
  const cleaned = (lines || []).map(s => String(s || "").replace(/\s+/g, " ").trim()).filter(Boolean);

  // Sometimes tooltips include "Quantity: 123" or "Stack: 123"
  for (const s of cleaned) {
    let m = s.match(/\b(?:quantity|stack|amount)\s*:\s*(\d{1,6})\b/i);
    if (m) return m[1];
  }

  // Sometimes OCR grabs the "x 123" from loot messages/overlays
  for (const s of cleaned) {
    let m = s.match(/\bx\s*(\d{1,6})\b/i);
    if (m) return m[1];
  }

  return "";
}

function _findRecentKillLine() {
  // Reads the *already locked* chatbox (fast + reliable, no fullscreen OCR).
  if (!chatReader) return null;
  let lines = [];
  try { lines = chatReader.read() || []; } catch (e) { return null; }
  if (!lines.length) return null;

  const stitched = stitchChatMessages(lines);
  const recent = stitched.messages.slice(0, 18); // backwards=true, so index 0 is newest

  // Examples:
  // "You have killed 23 Vindicta in hard mode."
  // "You have killed 1 Telos in practice mode."
  const re = /^You\s+have\s+killed\s+(\d+)\s+(.+?)\s+in\s+(.+?)\.\s*$/i;

  for (const raw of recent) {
    const t = stripChatPrefix(stripTimestampPrefix(raw));
    const m = t.match(re);
    if (m) {
      return {
        qty: (m[1] || "").trim(),
        boss: (m[2] || "").trim(),
        mode: (m[3] || "").trim(),
        line: t
      };
    }
  }
  return null;
}

async function manualLootScan() {
  if (__manualBusy) return;
  __manualBusy = true;

  try {
    if (!isAlt1) { addFeed("Manual scan requires Alt1.", "bad"); return; }
    if (!isSetupReady()) { addFeed("Finish setup first (lock Bingo/Team + IGN + Chat).", "bad"); return; }

    const mp = _getAlt1MousePos();
    if (!mp) { addFeed("Mouse position unavailable in Alt1 (need overlay permission + not exclusive fullscreen).", "bad"); return; }

    // Recommended approach: TWO regional scans (fast + reliable)
    // 1) Tooltip scan: modest box around mouse (captures tooltip even if it grows up/down)
    // 2) Qty scan: small box near mouse (sometimes catches stack number or tooltip quantity)
    //
    // 480x320 is usually enough for RS3 tooltip without being too heavy.
    const tipRect = _clampRect(mp.x - 240, mp.y - 160, 480, 320);
    const qtyRect = _clampRect(mp.x - 60, mp.y - 40, 140, 90);

    // Optional highlight for debugging
    tryOverlayRect({ x: tipRect.x, y: tipRect.y, width: tipRect.w, height: tipRect.h }, false);

    const capTip = _captureRect(tipRect);
    const capQty = _captureRect(qtyRect);

    if (!capTip) { addFeed("Capture failed (tooltip). Check Alt1 permissions / windowed mode.", "bad"); return; }

    const ocr = _getOcrReader();
    if (!ocr) { addFeed("OCR library not detected. (alt1/dist/ocr not available as a global)", "bad"); return; }

    // Try a few common OCR call patterns without hard-coding one.
    const ocrRead = async (cap) => {
      if (!cap) return [];
      try {
        if (typeof ocr.read === "function") return _extractStringsFromOcrResult(await ocr.read(cap));
        if (typeof ocr.readText === "function") return _extractStringsFromOcrResult(await ocr.readText(cap));
        if (typeof ocr.findText === "function") return _extractStringsFromOcrResult(await ocr.findText(cap));
        if (typeof ocr.recognize === "function") return _extractStringsFromOcrResult(await ocr.recognize(cap));
      } catch (e) {}
      return [];
    };

    const tipLines = await ocrRead(capTip);
    const qtyLines = await ocrRead(capQty);

    const best = _bestItemFromLines(tipLines);
    if (!best) {
      addFeed("Manual scan: couldn't read a valid item name (strict mode may be rejecting).", "bad");
      return;
    }

    const qty = _tryExtractQty(qtyLines) || _tryExtractQty(tipLines) || "1";

    // Optional: verify a recent kill line exists before submitting
    const kill = _findRecentKillLine();
    if (!kill) {
      addFeed(`Manual scan read: ${best.name} x${qty} — but no recent 'You have killed …' line found in chat. Not submitted.`, "warn");
      playBeep("warn");
      return;
    }

    // De-dupe key (same as automatic path)
    const key = `${best.name}`.toLowerCase().trim() + "||" + String(qty).trim();
    if (seenRecently(key, 8000)) {
      addFeed(`Manual scan: duplicate suppressed (${best.name} x${qty}).`, "warn");
      return;
    }

    addFeed(`Manual scan: ${best.name} x${qty} • Kill verified: ${kill.boss} (${kill.mode})`, "ok");

    // Canonicalise if enabled (still respect allowlist when strict)
    let canonicalName = best.name;
    const strictOn = settings.strictDrops && canonicalMap.size > 0;
    if (settings.useWikiCanonical) {
      const wikiName = await resolveCanonicalName(canonicalName);
      if (strictOn) {
        const v2 = validateDropName(wikiName);
        canonicalName = v2.valid ? v2.canonical : canonicalName;
      } else {
        canonicalName = wikiName;
      }
    }

    await submitDrop({ drop_name: canonicalName, amount: qty, boss: kill.boss, result: "success" });
    playBeep("ok");
    addFeed(`Manual submit ✅ ${canonicalName} x${qty}`, "ok");
  } catch (e) {
    addFeed("Manual scan failed: " + (e && e.message ? e.message : String(e)), "bad");
  } finally {
    __manualBusy = false;
  }
}

// expose console helpers
window.IRB = window.IRB || {};
window.IRB.manualLootScan = manualLootScan;
window.IRB._findRecentKillLine = _findRecentKillLine;
window.addMockDrop = addMockDrop;


// --- Added: Universal broadcast drop detection ---
function normalizeIgn(raw) {
  raw = (raw || "").toString().trim();
  // RSN can start with A-Z, a-z, or 0-9. Broadcast lines may include icon prefixes before the RSN.
  // Strategy: strip any leading non [A-Za-z0-9], then take the remainder.
  const i = raw.search(/[A-Za-z0-9]/);
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
    // and anchor the "real" IGN to the first alphanumeric character before comparing to the locked IGN.
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