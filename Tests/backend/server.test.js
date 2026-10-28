const assert = require("node:assert/strict");
const { once } = require("node:events");
const test = require("node:test");
const { createServer } = require("../../Backend/server");

async function withServer(run) {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("serves the frontend entry page", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /Banana Breakout/);
  });
});

test("serves frontend JavaScript modules", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/js/main.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/javascript/);

    const engineResponse = await fetch(`${baseUrl}/js/breakout-engine.mjs`);
    assert.equal(engineResponse.status, 200);
    assert.match(engineResponse.headers.get("content-type"), /text\/javascript/);
  });
});

test("rejects POST requests until an API endpoint is implemented", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: 1 }),
    });

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  });
});
