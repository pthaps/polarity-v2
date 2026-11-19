const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const dns = require("node:dns/promises");
const { EventEmitter } = require("node:events");
const Module = require("node:module");
const path = require("node:path");
const { Readable } = require("node:stream");
const { test } = require("node:test");
const vm = require("node:vm");
const { gzipSync } = require("node:zlib");
const ts = require("typescript");

// Run Next's TypeScript route modules directly with their source aliases.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) {
  if (id === "server-only") id = "next/dist/compiled/server-only/empty";
  if (id.startsWith("@/")) id = path.join(__dirname, "../src", id.slice(2));
  return resolveFilename.call(this, id, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};

const { readJsonBody } = require("@/lib/readJsonBody");
const { isPublicAddress, resolvePublicAddress, fetchPublicHtml } = require("@/lib/publicHtml");
const { enforceRateLimit } = require("@/lib/rateLimit");
const { getCacheKey, getCacheSize, setCached } = require("@/lib/analysisCache");
const { POST: analyze } = require("@/app/api/analyze/route");
const { POST: fetchNews } = require("@/app/api/fetch-news/route");
const extension = require("@/app/api/extension-analyze/route");
const { POST: feedback } = require("@/app/api/feedback/route");

function request(body, headers = { "Content-Type": "application/json" }) {
  return new Request("https://polarity.example/api", { method: "POST", body, headers });
}

function configure(t, overrides = {}) {
  const settings = {
    NODE_ENV: "test", VERCEL: "1", UPSTASH_REDIS_REST_URL: "https://redis.example",
    UPSTASH_REDIS_REST_TOKEN: "test-token", GEMINI_API_KEY: "test-gemini",
    TAVILY_API_KEY: "test-tavily", ...overrides,
  };
  for (const [key, value] of Object.entries(settings)) {
    const old = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  }
}

function upstream(body, headers = {}, status = 200) {
  return Object.assign(Readable.from([Buffer.from(body)]), { headers, statusCode: status });
}

test("JSON parser validates type, shape, declared size and streamed byte count", async () => {
  for (const input of ["null", "[]", '"string"', "{"]) {
    assert.equal((await readJsonBody(request(input))).response.status, 400);
  }
  assert.equal((await readJsonBody(request("{}", {}))).response.status, 415);
  assert.equal((await readJsonBody(request("{}", {
    "Content-Type": "application/json", "Content-Length": "50",
  }), 10)).response.status, 413);
  assert.equal((await readJsonBody(request('{"a":"\u00e9\u00e9"}'), 11)).response.status, 413);
  assert.deepEqual(await readJsonBody(request('{"a":"\u00e9\u00e9"}'), 12), { ok: true, data: { a: "\u00e9\u00e9" } });
});

test("every protected route rejects an invalid field before fetching an article or calling AI", async (t) => {
  configure(t);
  const redis = t.mock.method(global, "fetch", (url) => {
    assert.equal(url.hostname, "redis.example");
    return Promise.resolve(Response.json({ result: 0 }));
  });
  for (const [handler, payload] of [
    [analyze, { body: {} }],
    [fetchNews, { url: "file:///tmp/test" }],
    [extension.POST, { url: [] }],
    [feedback, { rating: "yes", comment: {} }],
  ]) {
    assert.equal((await handler(request(JSON.stringify(payload)))).status, 400);
  }
  assert.equal(redis.mock.callCount(), 4);
});

test("distributed limiter passes quotas to Redis, returns 429 and fails closed", async (t) => {
  configure(t);
  const fetch = t.mock.method(global, "fetch", (url, options) => {
    assert.equal(url.href, "https://redis.example/");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const [operation, script, keys, clientKey, budget, ...limits] = JSON.parse(options.body);
    assert.equal(operation, "EVAL");
    assert.match(script, /redis.call\("SET", key/);
    assert.equal(keys, 2);
    assert.match(clientKey, /^polarity:\{api-budget\}:analyze:[a-f0-9]{64}$/);
    assert.equal(budget, "polarity:{api-budget}:gemini");
    assert.deepEqual(limits, [60, 6, 1, 86400, 800, 8]);
    return Promise.resolve(Response.json({ result: 23 }));
  });
  const blocked = await analyze(request("{}", {
    "Content-Type": "application/json", "x-vercel-forwarded-for": "203.0.113.50",
  }));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("Retry-After"), "23");
  fetch.mock.mockImplementation(async () => Response.json({ error: "sensitive detail" }, { status: 500 }));
  assert.equal((await enforceRateLimit(request("{}"), "feedback")).status, 503);
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal((await enforceRateLimit(request("{}"), "feedback")).status, 503);
});

test("local development limiter rejects the next request above the configured count", async (t) => {
  configure(t, { VERCEL: undefined, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined });
  t.mock.method(Date, "now", () => 123000);
  for (let n = 0; n < 6; n++) assert.equal(await enforceRateLimit(request("{}"), "feedback"), null);
  const denied = await enforceRateLimit(request("{}"), "feedback");
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get("Retry-After"), "57");
});

test("address policy rejects special IPv4 and IPv6 ranges and mixed DNS answers", async () => {
  for (const address of [
    "127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "168.63.129.16",
    "100.100.100.200", "0.0.0.0", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1",
    "64:ff9b::a9fe:a9fe", "2002:7f00:1::1",
  ]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ["93.184.216.34", "2606:4700::1111"]) assert.equal(isPublicAddress(address), true, address);
  const signal = new AbortController().signal;
  const mixed = async () => [{ address: "93.184.216.34", family: 4 }, { address: "::1", family: 6 }];
  await assert.rejects(resolvePublicAddress(new URL("https://news.example"), signal, mixed), /public addresses/);
  for (const url of ["http://2130706433/", "http://localhost./", "http://[::ffff:7f00:1]/"]) {
    await assert.rejects(resolvePublicAddress(new URL(url), signal, mixed), /public/);
  }
});

test("redirects are revalidated and response size and media type are enforced", async () => {
  const resolve = (url, signal) => resolvePublicAddress(url, signal,
    async () => [{ address: "93.184.216.34", family: 4 }]);
  let calls = 0;
  await assert.rejects(fetchPublicHtml("https://news.example", resolve, async () => {
    calls++;
    return upstream("", { location: "http://169.254.169.254/" }, 302);
  }), /public/);
  assert.equal(calls, 1);
  await assert.rejects(fetchPublicHtml("https://news.example", resolve,
    async () => upstream("pdf", { "content-type": "application/pdf" })), /Unsupported/);
  const headers = { "content-type": "text/html" };
  await assert.rejects(fetchPublicHtml("https://news.example", resolve,
    async () => upstream(Buffer.alloc(2 * 1024 * 1024 + 1), headers)), /too large/);
  await assert.rejects(fetchPublicHtml("https://news.example", resolve,
    async () => upstream(gzipSync(Buffer.alloc(2 * 1024 * 1024 + 1)), { ...headers, "content-encoding": "gzip" })));
});

test("socket uses the resolver's pinned address while preserving the Host header", async (t) => {
  let receivedHost;
  const server = http.createServer((incoming, response) => {
    receivedHost = incoming.headers.host;
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end("<p>Article</p>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.close(); server.closeAllConnections(); });
  const nativeRequest = http.request;
  t.mock.method(http, "request", (url, options, callback) => nativeRequest(
    url, { ...options, port: server.address().port }, callback,
  ));
  const result = await fetchPublicHtml("http://news.example/story",
    async () => ({ address: "127.0.0.1", family: 4 }));
  assert.equal(result.html, "<p>Article</p>");
  assert.equal(receivedHost, `news.example:${server.address().port}`);
});

function mockProviders(t, mode = "ok") {
  let geminiCalls = 0;
  let tavilyCalls = 0;
  t.mock.method(dns, "lookup", async () => [{ address: "93.184.216.34", family: 4 }]);
  t.mock.method(https, "request", (url, options, respond) => {
    assert.equal(url.hostname, "news.example");
    options.lookup(url.hostname, {}, (_, address) => assert.equal(address, "93.184.216.34"));
    const req = new EventEmitter();
    req.end = () => respond(upstream("<article><h1>Fixture</h1><p>Fixture story.</p></article>", {
      "content-type": "text/html",
    }));
    return req;
  });
  t.mock.method(global, "fetch", async (input, options) => {
    const host = new URL(input).hostname;
    if (host === "redis.example") return Response.json({ result: 0 });
    if (host === "api.tavily.com") {
      tavilyCalls++;
      assert.equal(JSON.parse(options.body).max_results, 1);
      return Response.json({ results: [{ url: "https://evidence.example/story", title: "Related report", content: "Snippet" }] });
    }
    assert.equal(host, "generativelanguage.googleapis.com");
    geminiCalls++;
    if (mode === "error") return Response.json({ error: { message: "test-gemini sensitive prompt" } }, { status: 429 });
    const payload = JSON.parse(options.body);
    assert.match(JSON.stringify(payload.systemInstruction), /untrusted/);
    const prompt = payload.contents[0].parts[0].text;
    let text = "General assessment\nSUMMARY: Assessment\nSCORE: 7";
    if (prompt.includes("You are Verify")) {
      text = "CLAIM: Fixture claim\nVERDICT: Unverified\nSOURCE: fabricated | https://fabricated.example/\nSEARCH_RESULT: fake | https://fake.example/\nSUMMARY: Assessment\nSCORE: 7";
    }
    if (prompt.includes("credibility summarizer")) text = "CREDIBILITY_SCORE: 70\nHORIZONTAL_ESTIMATE: +2\nFINAL_SUMMARY: Fixture evaluated.";
    if (prompt.includes("You analyze news")) text = "CREDIBILITY_SCORE: 70\nHORIZONTAL_ESTIMATE: +2\nCONFIDENCE: 50";
    return Response.json({ candidates: [{ content: { parts: [{ text }] } }] });
  });
  return () => [geminiCalls, tavilyCalls];
}

test("website URL and paste analysis plus extension API work with mocked providers", async (t) => {
  configure(t);
  const calls = mockProviders(t);
  const fetched = await fetchNews(request(JSON.stringify({ url: "https://news.example/story" })));
  assert.equal(fetched.status, 200);
  const payload = await fetched.json();
  assert.match(payload.body, /Fixture story/);
  const reply = await analyze(request(JSON.stringify(payload)));
  assert.equal(reply.status, 200);
  const report = await reply.json();
  assert.equal(report.replies.length, 3);
  const fact = report.replies.find(({ agentId }) => agentId === "factchecker");
  assert.match(fact.text, /https:\/\/evidence.example\/story/);
  assert.doesNotMatch(fact.text, /fabricated|fake.example/);
  assert.deepEqual(calls(), [4, 1]);
  assert.equal((await analyze(request(JSON.stringify(payload)))).status, 200);
  assert.deepEqual(calls(), [4, 1]);
  assert.equal((await analyze(request(JSON.stringify({ body: "Pasted fixture", url: "paste://article" })))).status, 200);
  const ext = await extension.POST(request(JSON.stringify({ url: payload.url })));
  assert.equal(ext.status, 200);
  assert.equal(ext.headers.has("Access-Control-Allow-Origin"), false);
  assert.equal(typeof (await ext.json()).reliability, "number");
  assert.deepEqual(calls(), [9, 2]);
});

test("Gemini quota errors are sanitized and are not retried", async (t) => {
  configure(t);
  const calls = mockProviders(t, "error");
  const response = await analyze(request(JSON.stringify({ body: "Unique quota fixture" })));
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /test-gemini|sensitive prompt/);
  assert.deepEqual(calls(), [3, 0]);
});

test("cache preserves case and is bounded", async () => {
  assert.notEqual(await getCacheKey("A"), await getCacheKey("a"));
  for (let n = 0; n < 150; n++) setCached(await getCacheKey(`fixture ${n}`), {});
  assert.equal(getCacheSize(), 128);
});

test("extension API base accepts supported origins and refuses unsafe targets", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../extension/api-base.js"), "utf8");
  const context = vm.createContext({ URL });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('parseApiBase("http://127.0.0.1:3008").origin', context), "http://127.0.0.1:3008");
  assert.equal(vm.runInContext('apiHostPermission(parseApiBase("https://demo.example"))', context), "https://demo.example/*");
  for (const invalid of ["javascript:alert(1)", "http://demo.example", "https://demo.example/path", "https://user@demo.example"]) {
    assert.throws(() => vm.runInContext(`parseApiBase(${JSON.stringify(invalid)})`, context));
  }
});

test("extension service worker completes the report flow through the website routes", async (t) => {
  configure(t);
  const calls = mockProviders(t);
  const directory = path.join(__dirname, "../../extension");
  let messageHandler;
  const storage = {};
  const context = vm.createContext({
    URL,
    AbortSignal,
    fetch: (target, options) => {
      const handler = new URL(target).pathname === "/api/fetch-news" ? fetchNews : analyze;
      return handler(new Request(target, options));
    },
    chrome: {
      runtime: {
        getURL: (name) => `chrome-extension://fixture/${name}`,
        onMessage: { addListener: (handler) => { messageHandler = handler; } },
      },
      storage: { local: { set: async (value) => { Object.assign(storage, value); } } },
    },
  });
  context.importScripts = (name) => vm.runInContext(fs.readFileSync(path.join(directory, name), "utf8"), context);
  context.importScripts("background.js");
  const message = {
    type: "POLARITY_ANALYZE", url: "https://news.example/extension-worker", apiBaseUrl: "https://polarity.example",
  };
  assert.equal(messageHandler(message, { url: "https://example.com" }, () => assert.fail("rejected sender")), undefined);
  const response = await new Promise((resolve) => {
    assert.equal(messageHandler(message, { url: "chrome-extension://fixture/popup.html" }, resolve), true);
  });
  assert.equal(response.ok, true);
  assert.equal(storage.polarityLastResult.fullResult.replies.length, 3);
  assert.deepEqual(calls(), [4, 1]);
});
