# SecureBank Mobile Banking API (Sample App)

Sample application built for **CYB204 Assessment 1, Scenario 1: Secure Online
Banking CI/CD Pipeline**. This is a small Express (Node.js) API standing in
for "the mobile banking application" described in the assignment brief. It
exists to give a real CI/CD pipeline something to build, test, and scan.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check, also used as the DAST scan's readiness probe |
| POST | /login | Authenticates a demo user, returns a JWT |
| GET | /accounts/:id/balance | Returns an account's balance |
| POST | /accounts/:id/transfer | Transfers funds between two demo accounts |
| POST | /accounts/:id/transactions/filter | Demo transaction filter (see security note) |

Demo accounts: `alice` / `Password1!` and `bob` / `Password2!`.

## Running locally

```
npm install
npm start
```

The app listens on port 3000 by default.

## Running tests

```
npm test
```

## ⚠️ Intentional security issues (for SAST/DAST demonstration)

This app deliberately contains five common insecure coding patterns,
each clearly commented in `src/index.js` with the relevant CWE reference.
They exist so that SonarCloud (SAST) and OWASP ZAP (DAST), run via the
GitHub Actions pipeline in `.github/workflows/pipeline.yml`, have genuine
findings to report:

1. **Hardcoded JWT secret** (CWE-798)
2. **Weak cryptographic hash (MD5) for password storage** (CWE-327)
3. **Logging of sensitive credentials** (CWE-532)
4. **Use of `eval()` on user-controlled input** (CWE-95)
5. **Disabled TLS certificate validation** (CWE-295)

Do not use these patterns in a real application. Part of this assignment's
report should discuss how each finding would be remediated in practice.

## Pipeline

See `.github/workflows/pipeline.yml` for the full CI/CD pipeline definition:
build & test → SAST (SonarCloud) → DAST (OWASP ZAP) → simulated staging →
simulated production deployment.
