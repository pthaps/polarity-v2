const DEFAULT_BASE = "http://localhost:3000";
const STORAGE_KEY = "polarityLastResult";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "POLARITY_ANALYZE") return;
  const { url, apiBaseUrl } = msg;
  const base = (apiBaseUrl || DEFAULT_BASE).replace(/\/$/, "");

  (async () => {
    try {
      const fetchRes = await fetch(`${base}/api/fetch-news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const responseText = await fetchRes.text();
      let fetchData = {};
      try {
        fetchData = JSON.parse(responseText);
      } catch {
        await chrome.storage.local.set({
          [STORAGE_KEY]: {
            success: false,
            error: fetchRes.ok
              ? "Invalid JSON from fetch-news"
              : `fetch-news (${fetchRes.status}): ${responseText.replace(/\s+/g, " ").trim().slice(0, 200)}`,
            analyzedUrl: url,
            at: Date.now(),
          },
        });
        sendResponse({ ok: false });
        return;
      }

      if (!fetchRes.ok) {
        await chrome.storage.local.set({
          [STORAGE_KEY]: {
            success: false,
            error:
              fetchData.error ||
              (typeof fetchData.message === "string" ? fetchData.message : null) ||
              "Failed to fetch article",
            analyzedUrl: url,
            at: Date.now(),
          },
        });
        sendResponse({ ok: false });
        return;
      }

      const payload = {
        url: fetchData.url,
        title: fetchData.title,
        description: fetchData.description,
        body: fetchData.body,
      };

      const analyzeRes = await fetch(`${base}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const analyzeText = await analyzeRes.text();
      let analyzeData = {};
      try {
        analyzeData = JSON.parse(analyzeText);
      } catch {
        await chrome.storage.local.set({
          [STORAGE_KEY]: {
            success: false,
            error: analyzeRes.ok
              ? "Invalid JSON from analyze"
              : `analyze (${analyzeRes.status}): ${analyzeText.replace(/\s+/g, " ").trim().slice(0, 200)}`,
            analyzedUrl: url,
            at: Date.now(),
          },
        });
        sendResponse({ ok: false });
        return;
      }

      if (!analyzeRes.ok) {
        const code = analyzeData.code ? ` [${analyzeData.code}]` : "";
        await chrome.storage.local.set({
          [STORAGE_KEY]: {
            success: false,
            error:
              (analyzeData.error ||
                (typeof analyzeData.message === "string" ? analyzeData.message : null) ||
                analyzeRes.statusText ||
                "Analysis failed") + code,
            analyzedUrl: url,
            at: Date.now(),
          },
        });
        sendResponse({ ok: false });
        return;
      }

      await chrome.storage.local.set({
        [STORAGE_KEY]: {
          success: true,
          fullResult: analyzeData,
          analyzedUrl: url,
          at: Date.now(),
        },
      });
      sendResponse({ ok: true });
    } catch (e) {
      await chrome.storage.local.set({
        [STORAGE_KEY]: {
          success: false,
          error: e instanceof Error ? e.message : String(e),
          analyzedUrl: url,
          at: Date.now(),
        },
      });
      sendResponse({ ok: false });
    }
  })();

  return true;
});
