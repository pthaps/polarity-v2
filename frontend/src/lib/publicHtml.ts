import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { BlockList, isIP } from "node:net";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { parseArticleUrl } from "./apiInput";

const blocked = new BlockList();
const ipv4Ranges: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
  ["168.63.129.16", 32],
];
for (const [address, prefix] of ipv4Ranges) blocked.addSubnet(address, prefix, "ipv4");

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
const ipv6Ranges: [string, number][] = [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
];
for (const [address, prefix] of ipv6Ranges) blocked.addSubnet(address, prefix, "ipv6");

export function isPublicAddress(address: string): boolean {
  if (address.includes("%")) return false;
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  return family === 6 && globalIpv6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

type Address = { address: string; family: number };
const MAX_BYTES = 2 * 1024 * 1024;
const redirects = new Set([301, 302, 303, 307, 308]);

export async function resolvePublicAddress(url: URL, signal: AbortSignal, resolve = lookup): Promise<Address> {
  signal.throwIfAborted();
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if ((!host.includes(".") && !isIP(host)) || /(?:^|\.)(localhost|local|internal|home\.arpa)$/i.test(host)) {
    throw new Error("Article host must be public");
  }
  const family = isIP(host);
  const records = family ? [{ address: host, family }] : await new Promise<Address[]>((resolveResult, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    resolve(host, { all: true }).then(resolveResult, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
  if (!records.length || records.some(({ address, family }) => isIP(address) !== family || !isPublicAddress(address))) {
    throw new Error("Article host must resolve to public addresses");
  }
  return records.find(({ family }) => family === 4) ?? records[0];
}

function requestPinned(url: URL, address: Address, signal: AbortSignal): Promise<http.IncomingMessage> {
  const request = url.protocol === "https:" ? https.request : http.request;
  return new Promise((resolve, reject) => {
    const req = request(url, {
      agent: false,
      family: address.family,
      signal,
      // Preserve the URL's Host and TLS identity while eliminating a second DNS lookup.
      lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Polarity Article Reader)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Encoding": "gzip, deflate, br",
      },
    }, resolve);
    req.on("error", reject);
    req.end();
  });
}

export async function fetchPublicHtml(
  input: string,
  resolve = resolvePublicAddress,
  request = requestPinned,
): Promise<{ html: string; url: string }> {
  const signal = AbortSignal.timeout(12000);
  let url = parseArticleUrl(input);
  for (let hop = 0; url && hop <= 4; hop++) {
    const address = await resolve(url, signal);
    const response = await request(url, address, signal);
    if (redirects.has(response.statusCode ?? 0)) {
      const location = response.headers.location;
      response.destroy();
      url = location ? parseArticleUrl(new URL(location, url).href) : null;
      continue;
    }
    try {
      const type = response.headers["content-type"]?.split(";")[0].trim().toLowerCase();
      if (response.statusCode !== 200 || (type !== "text/html" && type !== "application/xhtml+xml")) {
        throw new Error("Unsupported article response");
      }
      if (Number(response.headers["content-length"]) > MAX_BYTES) throw new Error("Article too large");
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of response) {
        size += chunk.length;
        if (size > MAX_BYTES) throw new Error("Article too large");
        chunks.push(chunk);
      }
      let content = Buffer.concat(chunks, size);
      const options = { maxOutputLength: MAX_BYTES };
      switch (response.headers["content-encoding"]?.trim().toLowerCase()) {
        case "gzip": content = gunzipSync(content, options); break;
        case "deflate": content = inflateSync(content, options); break;
        case "br": content = brotliDecompressSync(content, options); break;
        case undefined:
        case "identity": break;
        default: throw new Error("Unsupported article encoding");
      }
      return { html: content.toString("utf8"), url: url.href };
    } finally {
      response.destroy();
    }
  }
  throw new Error("Invalid article URL or redirect");
}
