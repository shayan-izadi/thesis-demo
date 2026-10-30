// Minimal demo service for the Dokploy staging/production walkthrough.
// No dependencies: everything it shows comes from environment variables
// that Dokploy injects per environment. The image is identical in both.

const http = require("node:http");
const net = require("node:net");

const config = {
  env: process.env.APP_ENV || "local",
  version: process.env.APP_VERSION || "dev",
  greeting: process.env.GREETING || "Hello from the thesis demo",
  logLevel: process.env.LOG_LEVEL || "info",
  databaseUrl: process.env.DATABASE_URL || "",
  port: Number(process.env.PORT || 3000),
};

// Show where the database lives without leaking the password.
function describeDatabase(url) {
  if (!url) return { configured: false };
  try {
    const u = new URL(url);
    return {
      configured: true,
      host: u.hostname,
      port: Number(u.port || 5432),
      name: u.pathname.replace(/^\//, "") || null,
      user: u.username || null,
    };
  } catch {
    return { configured: false, error: "DATABASE_URL is not a valid URL" };
  }
}

// TCP reachability check: enough to prove each environment talks to its own DB.
function checkDatabase(db, timeoutMs = 1500) {
  if (!db.configured) return Promise.resolve("not configured");
  return new Promise((resolve) => {
    const socket = net.connect({ host: db.host, port: db.port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs, () => done("unreachable (timeout)"));
    socket.once("connect", () => done("reachable"));
    socket.once("error", (err) => done(`unreachable (${err.code || err.message})`));
  });
}

function info() {
  return {
    env: config.env,
    version: config.version,
    greeting: config.greeting,
    logLevel: config.logLevel,
    database: describeDatabase(config.databaseUrl),
  };
}

const ENV_COLORS = { production: "#1f7a4d", staging: "#b7791f", local: "#4a5568" };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function renderPage(data, dbStatus) {
  const color = ENV_COLORS[data.env] || "#2b6cb0";
  const db = data.database;
  const dbLine = db.configured
    ? `${escapeHtml(db.user || "?")}@${escapeHtml(db.host)}:${db.port}/${escapeHtml(db.name || "")}`
    : "not configured";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thesis demo (${escapeHtml(data.env)})</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #f7fafc; color: #1a202c; }
  header { background: ${color}; color: #fff; padding: 24px 32px; }
  header h1 { margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: .08em; }
  main { padding: 24px 32px; max-width: 720px; }
  dt { font-weight: 600; margin-top: 12px; }
  dd { margin: 4px 0 0; font-family: ui-monospace, monospace; }
</style></head>
<body>
<header><h1>${escapeHtml(data.env)}</h1><div>version ${escapeHtml(data.version)}</div></header>
<main>
  <p>${escapeHtml(data.greeting)}</p>
  <p><strong>New release:</strong> testing</p>
  <p>Debug: test rollback</p>
  <dl>
    <dt>Database</dt><dd>${dbLine}</dd>
    <dt>Database status</dt><dd>${escapeHtml(dbStatus)}</dd>
  </dl>
  <p>Same Docker image in every environment. Everything above comes from variables set in Dokploy.</p>
</main></body></html>`;
}

function createServer() {
  return http.createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;

    if (path === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", env: config.env, version: config.version }));
    }

    const data = info();
    const dbStatus = await checkDatabase(data.database);

    if (path === "/api/info") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ...data, databaseStatus: dbStatus }, null, 2));
    }

    if (path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(renderPage(data, dbStatus));
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(config.port, () => {
    console.log(`[${config.env}] thesis-demo ${config.version} listening on :${config.port}`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

module.exports = { createServer, describeDatabase, checkDatabase, config };
