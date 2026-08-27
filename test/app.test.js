const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/index");

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: data
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          : {},
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(chunks || "{}") }));
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

test("GET /health returns ok", async () => {
  const server = await startServer();
  const res = await request(server, "GET", "/health");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, "ok");
  server.close();
});

test("POST /login with valid credentials returns a token", async () => {
  const server = await startServer();
  const res = await request(server, "POST", "/login", { username: "alice", password: "Password1!" });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
  server.close();
});

test("POST /login with invalid credentials is rejected", async () => {
  const server = await startServer();
  const res = await request(server, "POST", "/login", { username: "alice", password: "wrong" });
  assert.strictEqual(res.status, 401);
  server.close();
});

test("GET /accounts/:id/balance returns balance for existing account", async () => {
  const server = await startServer();
  const res = await request(server, "GET", "/accounts/1/balance");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 1);
  server.close();
});
