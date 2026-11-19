importScripts("api-base.js");
const STORAGE_KEY = "polarityLastResult";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "POLARITY_ANALYZE" || sender.url !== chrome.runtime.getURL("popup.html")) return;
  const { url, apiBaseUrl } = msg;

  (async () => {
    try {
      const base = parseApiBase(apiBaseUrl).origin;
      const fetchRes = await fetch(`${base}/api/fetch-news`, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(20000),
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
              : `fetch-news (${fetchRes.status}): Request failed`,
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
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(55000),
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
              : `analyze (${analyzeRes.status}): Request failed`,
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
