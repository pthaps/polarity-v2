const DEFAULT_BASE = "http://localhost:3000";
const STORAGE_KEY = "polarityLastResult";

function relColor(pct) {
  if (pct >= 71) return "#16a34a";
  if (pct >= 41) return "#ea580c";
  return "#dc2626";
}

/** @param {string | undefined} bias */
function horizontalFromBiasCategory(bias) {
  const t = (bias ?? "").trim().toLowerCase();
  if (/far\s*left/.test(t)) return -35;
  if (/lean\s*left|center-left/.test(t) || /^left$/.test(t)) return -18;
  if (/far\s*right/.test(t)) return 35;
  if (/lean\s*right|center-right/.test(t) || /^right$/.test(t)) return 18;
  if (/cent(er|re)/.test(t)) return 0;
  return 0;
}

/** @param {number} h -42..42 */
function horizontalToPercent(h) {
  const clamped = Math.min(42, Math.max(-42, h));
  return ((clamped + 42) / 84) * 100;
}

function showStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
}

function clearStaleUI() {
  document.getElementById("error").style.display = "none";
  document.getElementById("results").style.display = "none";
}

function showFooterForPage(pageUrl) {
  const footer = document.getElementById("footerLinks");
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
    footer.style.display = "none";
    return;
  }
  footer.style.display = "flex";
}

/**
 * Open Polarity with cached full analysis (no second API run).
 * Falls back to ?url= if no cached full result.
 */
async function openFullReport() {
  const { [STORAGE_KEY]: stored } = await chrome.storage.local.get(STORAGE_KEY);
  const { apiBaseUrl } = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_BASE });
  const base = (apiBaseUrl || DEFAULT_BASE).replace(/\/$/, "");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl = tab?.url || "";

  if (!stored?.success || !stored.fullResult) {
    if (pageUrl && /^https?:\/\//i.test(pageUrl)) {
      chrome.tabs.create({ url: `${base}/?url=${encodeURIComponent(pageUrl)}` });
    }
    return;
  }

  let jsonStr;
  try {
    jsonStr = JSON.stringify(stored.fullResult);
  } catch {
    if (pageUrl && /^https?:\/\//i.test(pageUrl)) {
      chrome.tabs.create({ url: `${base}/?url=${encodeURIComponent(pageUrl)}` });
    }
    return;
  }

  chrome.tabs.create({ url: `${base}/?hydrate=1` }, (created) => {
    const tabId = created?.id;
    if (tabId == null) return;

    const onUpdated = (updatedId, info) => {
      if (updatedId !== tabId || info.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(onUpdated);

      chrome.scripting.executeScript(
        {
          target: { tabId },
          world: "MAIN",
          func: (payload) => {
            try {
              sessionStorage.setItem("polarity-hydrate", payload);
            } catch (_) {
              /* quota */
            }
            const origin = window.location.origin;
            window.location.replace(`${origin}/`);
          },
          args: [jsonStr],
        },
        () => {
          if (chrome.runtime.lastError && pageUrl && /^https?:\/\//i.test(pageUrl)) {
            chrome.tabs.create({ url: `${base}/?url=${encodeURIComponent(pageUrl)}` });
          }
        }
      );
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

function renderFromStored(stored) {
  const errEl = document.getElementById("error");
  const results = document.getElementById("results");
  errEl.style.display = "none";
  results.style.display = "none";

  if (!stored || !stored.at) return;

  if (!stored.success) {
    errEl.textContent = stored.error || "Analysis failed.";
    errEl.style.display = "block";
    return;
  }

  const full = stored.fullResult;
  const legacy = stored.data;

  let rel = 0;
  let bias = "—";
  let h = NaN;

  if (full && typeof full === "object") {
    const cred = Number(full.credibilityScore);
    rel = Number.isFinite(cred)
      ? Math.min(100, Math.max(0, Math.round(cred)))
      : 0;
    bias =
      full.biasCategory ||
      full.biasPosition ||
      "—";
    h = Number(full.horizontalRank);
  } else if (legacy && typeof legacy === "object") {
    const relRaw = Number(legacy.reliability);
    rel = Number.isFinite(relRaw)
      ? Math.min(100, Math.max(0, Math.round(relRaw)))
      : 0;
    bias = legacy.biasCategory ?? "—";
    h = Number(legacy.horizontalRank);
  }

  document.getElementById("relNum").textContent = String(rel);
  const relBar = document.getElementById("relBar");
  relBar.style.width = `${rel}%`;
  relBar.style.background = relColor(rel);

  document.getElementById("biasName").textContent = bias;

  if (!Number.isFinite(h)) {
    h = horizontalFromBiasCategory(bias);
  }
  h = Math.min(42, Math.max(-42, h));
  document.getElementById("spectrumMarker").style.left = `${horizontalToPercent(h)}%`;

  results.style.display = "block";
}

async function refreshFromStorage() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  renderFromStored(stored[STORAGE_KEY]);
}

async function runAnalyze() {
  const btn = document.getElementById("analyze");
  const errEl = document.getElementById("error");
  clearStaleUI();
  errEl.style.display = "none";
  btn.disabled = true;
  showStatus("Evaluating…");

  let pageUrl = "";
  let apiBaseUrl = DEFAULT_BASE;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pageUrl = tab?.url || "";
    const stored = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_BASE });
    apiBaseUrl = stored.apiBaseUrl || DEFAULT_BASE;
    showFooterForPage(pageUrl);

    if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) {
      showStatus("");
      throw new Error("Open an http(s) page first.");
    }

    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "POLARITY_ANALYZE",
          url: pageUrl,
          apiBaseUrl: apiBaseUrl || DEFAULT_BASE,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        }
      );
    });

    await refreshFromStorage();
    showStatus("");
  } catch (e) {
    showStatus("");
    errEl.textContent = e instanceof Error ? e.message : String(e);
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
  }
}

function initPopup() {
  const opts = document.getElementById("opts");
  const analyze = document.getElementById("analyze");
  const openFull = document.getElementById("openFull");
  if (!opts || !analyze || !openFull) return;

  opts.addEventListener("click", (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
  });

  analyze.addEventListener("click", () => {
    void runAnalyze();
  });

  openFull.addEventListener("click", (e) => {
    e.preventDefault();
    void openFullReport();
  });

  clearStaleUI();
  showStatus("");
  void runAnalyze();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    renderFromStored(changes[STORAGE_KEY].newValue);
    showStatus("");
  }
});
