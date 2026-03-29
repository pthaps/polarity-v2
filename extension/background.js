const DEFAULT_BASE = "http://localhost:3000";
const STORAGE_KEY = "polarityLastResult";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "POLARITY_ANALYZE") return;
  const { url, apiBaseUrl } = msg;
  const base = (apiBaseUrl || DEFAULT_BASE).replace(/\/$/, "");

  (async () => {
    try {
      const res = await fetch(`${base}/api/extension-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const responseText = await res.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        await chrome.storage.local.set({
          [STORAGE_KEY]: {
            success: false,
            error: res.ok
              ? "Invalid JSON from server"
              : `Server error (${res.status}): ${responseText.replace(/\s+/g, " ").trim().slice(0, 200)}`,
            analyzedUrl: url,
            at: Date.now(),
          },
        });
        sendResponse({ ok: false });
        return;
      }

      if (!res.ok) {
        const code = data.code ? ` [${data.code}]` : "";
        await chrome.storage.local.set({
          [STORAGE_KEY]: {
            success: false,
            error:
              (data.error ||
                (typeof data.message === "string" ? data.message : null) ||
                res.statusText ||
                "Request failed") + code,
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
          data: {
            reliability: data.reliability,
            biasCategory: data.biasCategory,
            confidence: data.confidence,
            outletBaseline: data.outletBaseline,
            title: data.title,
          },
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
