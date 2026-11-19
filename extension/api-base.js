const DEFAULT_BASE = "http://localhost:3000";
const LOCAL_API_PORTS = new Set(["3000", "3001", "3008"]);

function parseApiBase(value) {
  const url = new URL(value || DEFAULT_BASE);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const allowed = (url.protocol === "https:" && !url.port) ||
    (local && url.protocol === "http:" && LOCAL_API_PORTS.has(url.port));
  if (!allowed || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Enter an HTTPS site origin or a supported local development URL.");
  }
  return url;
}

function apiHostPermission(url) {
  return `${url.protocol}//${url.hostname}/*`;
}
