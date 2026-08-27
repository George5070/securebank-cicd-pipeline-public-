/**
 * SecureBank Mobile Banking API — sample application for CYB204 Assessment 1, Scenario 1.
 *
 * PURPOSE: This app is a small, self-contained stand-in for "the mobile banking
 * application" described in the assignment brief. It exists to give the CI/CD
 * pipeline something real to build, test, and scan.
 *
 * A few lines are DELIBERATELY written insecurely and are clearly marked below.
 * They exist so that SonarCloud (SAST) and OWASP ZAP (DAST) have genuine,
 * realistic findings to report — mirroring exactly the kind of issues a real
 * bank's pipeline is designed to catch before code reaches production.
 * Do not use these patterns in real applications.
 */

const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const https = require("https");

const app = express();
app.use(bodyParser.json());

// ---------------------------------------------------------------------------
// INTENTIONALLY INSECURE #1: hardcoded secret (CWE-798, Hardcoded Credentials)
// A SAST tool should flag this. In production this MUST come from a secrets
// manager or environment variable injected at deploy time, never from source.
// ---------------------------------------------------------------------------
const JWT_SECRET = "supersecret123";

// In-memory "database" of demo accounts. Passwords are stored hashed (see the
// weak-hash issue below) purely so the login flow has something to check.
const accounts = [
  { id: 1, username: "alice", passwordHash: weakHash("Password1!"), balanceCents: 500000 },
  { id: 2, username: "bob", passwordHash: weakHash("Password2!"), balanceCents: 250000 },
];

// ---------------------------------------------------------------------------
// INTENTIONALLY INSECURE #2: weak cryptographic hash (CWE-327, Use of a
// Broken/Risky Cryptographic Algorithm). MD5 is not suitable for password
// storage — a real implementation should use bcrypt, scrypt, or Argon2 with
// a per-user salt.
// ---------------------------------------------------------------------------
function weakHash(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "securebank-mobile-api" });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  // ---------------------------------------------------------------------
  // INTENTIONALLY INSECURE #3: logging sensitive data (CWE-532, Insertion
  // of Sensitive Information into Log File). Never log raw credentials.
  // ---------------------------------------------------------------------
  console.log(`Login attempt: username=${username} password=${password}`);

  const account = accounts.find((a) => a.username === username);
  if (!account || account.passwordHash !== weakHash(password || "")) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ sub: account.id, username: account.username }, JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

app.get("/accounts/:id/balance", (req, res) => {
  const account = accounts.find((a) => a.id === Number(req.params.id));
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json({ id: account.id, balanceCents: account.balanceCents });
});

// ---------------------------------------------------------------------------
// INTENTIONALLY INSECURE #4: use of eval() on user-controlled input
// (CWE-95, Improper Neutralization of Directives in Dynamically Evaluated
// Code). This simulates a naive "transaction filter" feature and is a
// classic SAST-flagged pattern. It should be replaced with a safe,
// allow-listed filtering function.
// ---------------------------------------------------------------------------
app.post("/accounts/:id/transactions/filter", (req, res) => {
  const account = accounts.find((a) => a.id === Number(req.params.id));
  if (!account) return res.status(404).json({ error: "Account not found" });

  const { expression } = req.body || {};
  try {
    // eslint-disable-next-line no-eval
    const matches = eval(expression); // NOSONAR - intentionally insecure, see comment above
    res.json({ matches: Boolean(matches) });
  } catch (e) {
    res.status(400).json({ error: "Invalid filter expression" });
  }
});

// ---------------------------------------------------------------------------
// INTENTIONALLY INSECURE #5: TLS certificate validation disabled
// (CWE-295, Improper Certificate Validation). This simulates a call out to
// a partner-bank notification service. rejectUnauthorized: false must never
// be used outside of local testing.
// ---------------------------------------------------------------------------
function notifyPartnerBank(payload) {
  const options = {
    hostname: "partner-bank.example.com",
    path: "/notify",
    method: "POST",
    rejectUnauthorized: false, // INSECURE - disables TLS certificate checking
  };
  const req = https.request(options, () => {});
  req.on("error", () => {
    /* swallow errors in this demo endpoint */
  });
  req.write(JSON.stringify(payload));
  req.end();
}

app.post("/accounts/:id/transfer", (req, res) => {
  const account = accounts.find((a) => a.id === Number(req.params.id));
  if (!account) return res.status(404).json({ error: "Account not found" });

  const { amountCents, toAccountId } = req.body || {};
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (amountCents > account.balanceCents) {
    return res.status(400).json({ error: "Insufficient funds" });
  }

  const target = accounts.find((a) => a.id === Number(toAccountId));
  if (!target) return res.status(400).json({ error: "Target account not found" });

  account.balanceCents -= amountCents;
  target.balanceCents += amountCents;
  notifyPartnerBank({ from: account.id, to: target.id, amountCents });

  res.json({ status: "transfer complete", newBalanceCents: account.balanceCents });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`SecureBank API listening on port ${PORT}`));
}

module.exports = app;
