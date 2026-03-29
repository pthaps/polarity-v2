const DEFAULT_BASE = "http://localhost:3000";

function relColor(pct) {
  if (pct >= 71) return "#22c55e";
  if (pct >= 41) return "#ea580c";
  return "#dc2626";
}

function showStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.style.display = text ? "block" : "none";
}

function renderFromStored(stored) {
  const errEl = document.getElementById("error");
  const results = document.getElementById("results");
  const outletEl = document.getElementById("outlet");
  errEl.style.display = "none";
  results.style.display = "none";
  outletEl.style.display = "none";

  if (!stored || !stored.at) return;

  if (!stored.success) {
    errEl.textContent = stored.error || "Analysis failed.";
    errEl.style.display = "block";
    return;
  }

  const d = stored.data || {};
  const relRaw = Number(d.reliability);
  const rel = Number.isFinite(relRaw)
    ? Math.min(100, Math.max(0, relRaw))
    : 0;
  const bias = d.biasCategory ?? "—";
  const confRaw = Number(d.confidence);
  const conf = Number.isFinite(confRaw) ? confRaw : null;

  document.getElementById("relValue").textContent = `${rel} / 100`;
  const relBar = document.getElementById("relBar");
  relBar.style.width = `${Math.min(100, Math.max(0, rel))}%`;
  relBar.style.background = relColor(rel);

  document.getElementById("biasValue").textContent = bias;
  document.getElementById("conf").textContent =
    conf != null ? `Confidence: ${conf}%` : "";

  if (d.outletBaseline?.name) {
    outletEl.textContent = `Chart match: ${d.outletBaseline.name}`;
    outletEl.style.display = "block";
  }

  results.style.display = "block";
}

async function refreshFromStorage() {
  const { polarityLastResult } = await chrome.storage.local.get("polarityLastResult");
  renderFromStored(polarityLastResult);
}

document.getElementById("opts").addEventListener("click", (e) => {
  e.preventDefault();
  if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
});

document.getElementById("analyze").addEventListener("click", async () => {
  const btn = document.getElementById("analyze");
  const errEl = document.getElementById("error");
  errEl.style.display = "none";
  document.getElementById("results").style.display = "none";
  document.getElementById("outlet").style.display = "none";
  btn.disabled = true;
  showStatus("Analyzing… (safe to close; reopen this popup to see results)");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url;
    if (!url || !/^https?:\/\//i.test(url)) {
      showStatus("");
      throw new Error("Open a normal http(s) page first.");
    }

    const { apiBaseUrl } = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_BASE });

    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "POLARITY_ANALYZE",
          url,
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
});

document.addEventListener("DOMContentLoaded", () => {
  refreshFromStorage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.polarityLastResult) {
    renderFromStored(changes.polarityLastResult.newValue);
    showStatus("");
  }
});
