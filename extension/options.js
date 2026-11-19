document.addEventListener("DOMContentLoaded", async () => {
  const { apiBaseUrl } = await chrome.storage.sync.get({ apiBaseUrl: DEFAULT_BASE });
  document.getElementById("apiBaseUrl").value = apiBaseUrl;
});

document.getElementById("save").addEventListener("click", async () => {
  const status = document.getElementById("status");
  try {
    const url = parseApiBase(document.getElementById("apiBaseUrl").value.trim());
    const origins = [apiHostPermission(url)];
    if (url.protocol === "https:" && !await chrome.permissions.request({ origins })) {
      status.textContent = "Allow access to this site to save it as the API origin.";
      return;
    }
    await chrome.storage.sync.set({ apiBaseUrl: url.origin });
    const { origins: granted = [] } = await chrome.permissions.getAll();
    const previous = granted.filter((origin) => origin.startsWith("https://") && !origins.includes(origin));
    if (previous.length) await chrome.permissions.remove({ origins: previous });
    status.textContent = "Saved.";
  } catch (error) {
    status.textContent = error.message || "Could not save the API origin.";
  }
});
