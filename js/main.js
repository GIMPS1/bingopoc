/* Iron Rivals Bingo (Alt1) - local chat-to-API bridge
   - Watches chat lines
   - Parses common "You received/receive/find" drop lines
   - POSTs to FastAPI PoC endpoint: /api/mock_drop (form fields)
*/
(function () {
  const $ = (id) => document.getElementById(id);

  const ui = {
    alt1Status: $("alt1Status"),
    apiStatus: $("apiStatus"),
    apiBase: $("apiBase"),
    teamNumber: $("teamNumber"),
    ign: $("ign"),
    btnStart: $("btnStart"),
    btnStop: $("btnStop"),
    btnTest: $("btnTest"),
    btnPing: $("btnPing"),
    log: $("log"),
  };

  function log(msg) {
    const ts = new Date().toLocaleTimeString();
    ui.log.value = `[${ts}] ${msg}\n` + ui.log.value;
  }

  // Alt1 detect + add-app button
  const isAlt1 = !!window.alt1;
  ui.alt1Status.textContent = isAlt1 ? "Alt1: detected" : "Alt1: not detected";
  ui.alt1Status.className = "pill " + (isAlt1 ? "ok" : "bad");

  if (window.A1lib && typeof A1lib.identifyApp === "function") {
    try { A1lib.identifyApp("./appconfig.json"); } catch (e) {}
  }

  // --- API helpers ---
  async function pingApi() {
    const base = ui.apiBase.value.replace(/\/+$/, "");
    try {
      const r = await fetch(base + "/api/state", { method: "GET" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      ui.apiStatus.textContent = "API: OK";
      ui.apiStatus.className = "pill ok";
      log("API ping OK (/api/state).");
    } catch (e) {
      ui.apiStatus.textContent = "API: failed";
      ui.apiStatus.className = "pill bad";
      log("API ping failed: " + e.message);
    }
  }

  async function submitDrop({ drop_name, amount }) {
    const base = ui.apiBase.value.replace(/\/+$/, "");
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

    const url = base + "/api/mock_drop";
    const res = await fetch(url, { method: "POST", body: fd, credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  }

  // --- Chat reading ---
  let chatReader = null;
  let running = false;
  let pollTimer = null;

  // Duplicate protection:
  // - If timestamps are enabled: skip older times
  // - Always keep a rolling set of recently submitted payloads
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

  function stripTimestampPrefix(s) {
    // removes [12:34:56] or 12:34:56
    return (s || "").replace(/^\s*\[?\d{2}:\d{2}:\d{2}\]?\s*/g, "").trim();
  }

  function parseDropLine(text) {
    const t = stripTimestampPrefix(text);

    // Common RS3-like patterns (we keep it flexible):
    // "You received: <item>"
    // "You receive: <item>"
    // "You find: <item>"
    // "You have received: <item>"
    // Optionally " x2" or " (x2)" or " x 2"
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

        // clean up common suffixes
        item = item.replace(/\s+from.*$/i, "").trim();

        return { drop_name: item, amount: amt };
      }
    }
    return null;
  }

  function initChat() {
    if (!window.Chatbox || !Chatbox.default) {
      log("Alt1 chatbox lib not loaded.");
      return false;
    }
    chatReader = new Chatbox.default();

    // A reasonable default color list (white + typical highlight colors)
    chatReader.readargs = {
      colors: [
        A1lib.mixColor(255, 255, 255), // white
        A1lib.mixColor(102, 152, 255), // blue-ish (notable)
        A1lib.mixColor(163, 53, 238),  // purple (rare)
        A1lib.mixColor(255, 112, 0),   // orange
        A1lib.mixColor(0, 255, 0),     // green
      ],
      backwards: true
    };
    return true;
  }

  async function poll() {
    if (!running || !chatReader) return;

    // Ensure chatbox pos
    if (chatReader.pos === null) {
      try {
        chatReader.find();
        if (chatReader.pos !== null) log("Chatbox found.");
      } catch (e) {
        // ignore
      }
      return;
    }

    let lines = [];
    try {
      lines = chatReader.read() || [];
    } catch (e) {
      log("Chat read error: " + e.message);
      return;
    }

    for (const line of lines) {
      const raw = line && line.text ? line.text : "";
      if (!raw) continue;

      // Timestamp-based ordering (if present)
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

          // Cross-midnight correction
          if (hh === 23 && now.getHours() === 0) lineTime.setDate(lineTime.getDate() - 1);
        }
      } catch (e) {}

      if (timeStr && lineTime < lastLineTime) continue;
      if (timeStr) lastLineTime = lineTime;

      const parsed = parseDropLine(raw);
      if (!parsed) continue;

      const key = `${parsed.drop_name}||${parsed.amount || ""}`;
      if (recentSet.has(key)) continue;

      // Submit
      try {
        await submitDrop(parsed);
        rememberKey(key);
        log(`SUBMITTED: ${parsed.drop_name}${parsed.amount ? " x" + parsed.amount : ""}`);
      } catch (e) {
        log(`FAILED submit (${parsed.drop_name}): ${e.message}`);
      }
    }
  }

  function start() {
    if (!isAlt1) {
      log("Alt1 not detected. Open this inside Alt1 Toolkit.");
      return;
    }

    const team = parseInt(ui.teamNumber.value || "0", 10);
    const ign = (ui.ign.value || "").trim();
    if (!team || team < 1) {
      log("Set a valid Team # first.");
      return;
    }
    if (!ign) {
      log("Set your IGN first.");
      return;
    }

    if (!chatReader) {
      const ok = initChat();
      if (!ok) return;
    }

    running = true;
    ui.btnStart.disabled = true;
    ui.btnStop.disabled = false;

    log("Auto-submit started.");
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(poll, 350);
  }

  function stop() {
    running = false;
    ui.btnStart.disabled = false;
    ui.btnStop.disabled = true;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    log("Stopped.");
  }

  ui.btnStart.addEventListener("click", start);
  ui.btnStop.addEventListener("click", stop);
  ui.btnPing.addEventListener("click", pingApi);
  ui.btnTest.addEventListener("click", async () => {
    try {
      await submitDrop({ drop_name: "Ahrim's hood", amount: "1" });
      log("Test drop submitted (Ahrim's hood).");
    } catch (e) {
      log("Test drop failed: " + e.message);
    }
  });

  // do an initial ping
  pingApi();

})();
