const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer, describeDatabase, checkDatabase } = require("./server");

test("describeDatabase hides the password and parses host, port, name", () => {
  const db = describeDatabase("postgresql://demo:s3cret@db-staging:5433/thesis");
  assert.deepEqual(db, { configured: true, host: "db-staging", port: 5433, name: "thesis", user: "demo" });
  assert.ok(!JSON.stringify(db).includes("s3cret"));
});

test("describeDatabase handles missing or invalid URLs", () => {
  assert.deepEqual(describeDatabase(""), { configured: false });
  assert.equal(describeDatabase("not a url").configured, false);
});

test("checkDatabase reports not configured without a URL", async () => {
  assert.equal(await checkDatabase({ configured: false }), "not configured");
});

test("/health returns env and version as JSON", async () => {
  const server = createServer().listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.ok("env" in body && "version" in body);
  } finally {
    server.close();
  }
});

test("unknown paths return 404", async () => {
  const server = createServer().listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/nope`);
    assert.equal(res.status, 404);
  } finally {
    server.close();
  }
});
