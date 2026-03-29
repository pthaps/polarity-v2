# Polarity AI — Chrome extension (Manifest V3)

Compact **reliability + bias** view for the active tab, backed by the same deployment as the web app.

## Behavior (current)

1. **Scan** runs a **full analysis** on the background:  
   `POST {apiBaseUrl}/api/fetch-news` → `POST {apiBaseUrl}/api/analyze`  
   (same pipeline as the website, not the lighter `extension-analyze` shortcut).
2. The full JSON is stored in extension storage as **`fullResult`**.
3. The popup shows a **minimal** score + spectrum; **Full report in Polarity →** opens your site and injects the result into **`sessionStorage`** so the **full dashboard appears without running analyze twice**.

**Permissions:** `activeTab`, `storage`, `scripting`, `tabs` (open tab + inject bridge script).

## Setup

1. Run or deploy **`frontend/`** with `GEMINI_API_KEY` set (see `frontend/.env.example`).
2. Chrome → **Extensions** → **Developer mode** → **Load unpacked** → select this `extension` folder.
3. **Options** → set **API base URL** to your site root (e.g. `https://your-app.vercel.app`), no trailing slash.
4. Open an **http(s)** article page, click the Polarity icon — analysis starts automatically; use **Scan** to repeat.

## API notes

- **`/api/extension-analyze`** still exists on the server for a faster, lighter Gemini-only path; the extension’s **default** path is **fetch-news + analyze** so popup and website stay aligned.

## Troubleshooting

- **500 / missing key:** Set `GEMINI_API_KEY` on the server (Vercel → Env → redeploy).
- **Wrong port locally:** Match **Options** URL to your dev server (e.g. `http://localhost:3000`) and ensure `manifest.json` `host_permissions` includes that origin.
