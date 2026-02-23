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
async function submitDrop({ drop_name, amount, boss = "", result = "success" }) {
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
  fd.append("boss", boss || "");
  fd.append("drop_name", canonical);
  fd.append("result", result || "success");
  fd.append("amount", amount || "");

  const url = `${base}/b/${bingoId}/api/mock_drop`;
  const res = await fetch(url, { method: "POST", body: fd, credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}
