# Back-End Web Development & Cybersecurity Best Practices Guide

**Compiled: April 2026 | Sources: OWASP, NIST, Node.js/Express.js Official Docs, Industry Standards**

---

## Table of Contents

1. [OWASP Top 10 (2021) — Web Application Security Risks](#1-owasp-top-10-2021--web-application-security-risks)
2. [Node.js & Express.js Security](#2-nodejs--expressjs-security)
3. [NIST Cybersecurity Framework — Key Principles](#3-nist-cybersecurity-framework--key-principles)
4. [SQLite & Database Security](#4-sqlite--database-security)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [HTTP Security Headers](#6-http-security-headers)
7. [API Security](#7-api-security)
8. [Error Handling](#8-error-handling)
9. [Dependency Management & Supply Chain Security](#9-dependency-management--supply-chain-security)
10. [HTTPS/TLS Requirements](#10-httpstls-requirements)
11. [Code Review Checklist](#11-code-review-checklist)

---

## 1. OWASP Top 10 (2021) — Web Application Security Risks

The OWASP Top 10 is the industry-standard awareness document for the most critical web application security risks. The 2021 edition reflects data from over 500,000 applications.

### The 10 Risks (Ranked)

| Rank | Risk | Code Review Check |
|------|------|-------------------|
| A01 | **Broken Access Control** | Every endpoint enforces authorization; deny by default |
| A02 | **Cryptographic Failures** | Sensitive data encrypted at rest and in transit; no hardcoded secrets |
| A03 | **Injection** | All queries parameterized; all input validated server-side |
| A04 | **Insecure Design** | Threat model exists; security controls designed before coding |
| A05 | **Security Misconfiguration** | No default credentials; error pages customized; unnecessary features disabled |
| A06 | **Vulnerable & Outdated Components** | All deps audited; no known CVEs; lockfile committed |
| A07 | **Identification & Authentication Failures** | Strong password policy; MFA where possible; session timeouts |
| A08 | **Software & Data Integrity Failures** | CI/CD pipeline integrity verified; deps from trusted sources |
| A09 | **Security Logging & Monitoring Failures** | Login failures logged; anomalies alerted; audit trail maintained |
| A10 | **Server-Side Request Forgery (SSRF)** | URL schemes and destinations validated; outbound requests restricted |

### Key Principles

- **Deny by default** — Access must be explicitly granted, never implicitly available
- **Defense in depth** — Multiple overlapping security controls; no single point of failure
- **Least privilege** — Every user, process, and service account gets the minimum permissions needed
- **Fail securely** — When a control fails, default to denying access rather than granting it
- **Validate all input** — Server-side validation is mandatory even when client-side validation exists

**Sources:**
- [OWASP Top 10:2021 Official](https://owasp.org/Top10/2021/)
- [OWASP Top Ten Project](https://owasp.org/www-project-top-ten/)
- [Cloudflare — What is OWASP?](https://www.cloudflare.com/learning/security/threats/owasp-top-10/)

---

## 2. Node.js & Express.js Security

### Server Configuration

- **RULE:** Always run production with `NODE_ENV=production` — this disables verbose error output and debug info
- **RULE:** Disable the `X-Powered-By` header: `app.disable('x-powered-by')`
- **RULE:** Use a current LTS version of Node.js — LTS receives critical security patches longer
- **RULE:** Use Express 4.x or later (Express 2.x/3.x are unmaintained)

### Input Validation & Sanitization

- **RULE:** Validate every incoming request on the server side — query params, body, headers
- **RULE:** Use schema validation libraries: **Zod**, **Joi**, or **Yup**
- **RULE:** Sanitize input to prevent XSS: use libraries like `validator` or `express-mongo-sanitize`
- **RULE:** Validate URL redirects — check that redirect targets match allowed hosts

### Secret Management

- **RULE:** Never commit secrets (API keys, DB passwords, JWT secrets) to version control
- **RULE:** Use environment variables or dedicated secret managers (AWS Secrets Manager, HashiCorp Vault, Doppler)
- **RULE:** Never log secrets — scrub sensitive values from log output

### Async Error Handling

- **RULE:** Use Promises or async/await with proper try/catch — never let unhandled rejections crash the server
- **RULE:** Register a global error handler in Express as a last-resort catch
- **RULE:** Use structured logging libraries: **Winston**, **Bunyan**, or **Pino**

### Cookie Security

- **RULE:** Set `secure: true` (HTTPS only)
- **RULE:** Set `httpOnly: true` (no JavaScript access)
- **RULE:** Set `sameSite: 'Strict'` or `'Lax'`
- **RULE:** Never use the default session cookie name — rename it to something generic like `sessionId`
- **RULE:** Set explicit expiration times on all session cookies

**Sources:**
- [Express.js — Security Best Practices for Production](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Node.js Security Best Practices 2026 (Medium)](https://medium.com/@sparklewebhelp/node-js-security-best-practices-for-2026-3b27fb1e8160)
- [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

---

## 3. NIST Cybersecurity Framework — Key Principles

### CSF 2.0 Core Functions

The NIST Cybersecurity Framework provides a risk-based model built on six core functions:

| Function | Web App Application |
|----------|-------------------|
| **Govern** | Establish security policies, roles, risk tolerance for the application |
| **Identify** | Inventory all assets, data flows, third-party integrations; classify data sensitivity |
| **Protect** | Apply encryption, access controls, input validation, secure development practices |
| **Detect** | Monitor logs, set up alerting for anomalous behavior, failed logins, unusual traffic |
| **Respond** | Incident response plan for breaches; ability to revoke sessions and rotate secrets |
| **Recover** | Backup/restore procedures; post-incident review and remediation |

### NIST SP 800-53 Rev. 5 — Relevant Control Families

| Control Family | Key Requirements |
|---------------|-----------------|
| **AC (Access Control)** | Enforce least privilege; log all access; manage accounts lifecycle |
| **AU (Audit & Accountability)** | Log auditable events (login, data changes, failures); protect log integrity; review logs regularly |
| **IA (Identification & Auth)** | Unique user IDs; multi-factor authentication; password complexity; session timeouts |
| **SC (System & Comms Protection)** | Encrypt data in transit (TLS); protect data at rest; boundary protection |
| **SI (System & Info Integrity)** | Input validation; error handling; software updates; malicious code protection |

### Key Principles for Code Review

- **RULE:** Every data classification (PII, financial, health) must have corresponding encryption and access controls
- **RULE:** All security events must be logged with: event type, timestamp, source, outcome, user identity
- **RULE:** Audit logs must be tamper-resistant and retained per policy
- **RULE:** Security controls must be tested and updated continuously

**Sources:**
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [NIST CSF 2.0 (PDF)](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)
- [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [Invicti — How Cybersecurity Frameworks Apply to Web App Security](https://www.invicti.com/blog/web-security/cybersecurity-framework-web-application-security)

---

## 4. SQLite & Database Security

### SQL Injection Prevention

- **RULE:** ALWAYS use parameterized queries / prepared statements — NEVER concatenate user input into SQL strings
- **RULE:** Do not rely on string escaping as a defense — it is error-prone and bypassable
- **RULE:** Use ORM libraries (Sequelize, Knex, Drizzle, better-sqlite3) which parameterize by default
- **RULE:** Apply allowlist input validation as an additional layer on top of parameterized queries

### SQLite-Specific Best Practices

- **RULE:** Set the database file permissions to be readable/writable only by the application process (least privilege)
- **RULE:** Disable unnecessary SQLite extensions and features
- **RULE:** Use WAL (Write-Ahead Logging) mode for concurrent access safety
- **RULE:** Never expose the SQLite database file path to users or in error messages
- **RULE:** Validate and constrain column types via CHECK constraints and NOT NULL where appropriate

### Parameterized Query Pattern (Node.js / better-sqlite3)

```
CORRECT:   db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
WRONG:     db.exec(`SELECT * FROM users WHERE id = ${userId}`)
```

### Code Review Checks

- [ ] No string concatenation or template literals in any SQL query
- [ ] All user-supplied values passed as bind parameters
- [ ] Database file has restrictive filesystem permissions
- [ ] Error messages do not reveal table names, column names, or query structure

**Sources:**
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Preventing SQL Injection in SQLite](https://awjunaid.com/sqlite/preventing-sql-injection-in-sqlite/)
- [Best Practices for Securing SQLite](https://blackhawk.sh/en/blog/best-practices-for-securing-sqlite/)
- [PortSwigger — SQL Injection](https://portswigger.net/web-security/sql-injection)

---

## 5. Authentication & Authorization

### Password Handling

- **RULE:** Hash passwords with **bcrypt** using a minimum work factor of 12 (production); consider 14 for high-security
- **RULE:** NEVER store plaintext passwords, MD5, or SHA-family hashes for passwords
- **RULE:** Use the async bcrypt API in Node.js — sync hashing blocks the event loop
- **RULE:** Periodically increase the work factor as hardware improves (2025 cracking assumes 12x RTX 5090 GPUs)

### JWT Best Practices

- **RULE:** Store JWTs in **HttpOnly, Secure, SameSite** cookies — NEVER in localStorage or sessionStorage
- **RULE:** Set short expiration times: access tokens 5-15 minutes max; use refresh tokens for longer sessions
- **RULE:** Always transmit JWTs over HTTPS only
- **RULE:** Never store sensitive data (passwords, PII) in the JWT payload — it is base64-encoded, not encrypted
- **RULE:** Use asymmetric signing (RS256) for multi-service architectures; HMAC (HS256) acceptable for single-service
- **RULE:** Always validate the `alg` header server-side — reject `none` algorithm
- **RULE:** Validate `iss` (issuer), `aud` (audience), and `exp` (expiration) claims on every request
- **RULE:** Implement token revocation strategy (blacklist, database check, or short expiry + refresh)

### Session Management

- **RULE:** Regenerate session IDs after login (prevents session fixation)
- **RULE:** Implement absolute session timeouts (e.g., 8 hours) and idle timeouts (e.g., 30 minutes)
- **RULE:** Invalidate sessions on logout — destroy server-side session data
- **RULE:** Use a production-grade session store (Redis, database) — never rely on in-memory stores in production

### CORS Configuration

- **RULE:** NEVER use `Access-Control-Allow-Origin: *` with credentials or sensitive data
- **RULE:** Explicitly whitelist allowed origins — do not dynamically reflect the `Origin` header without validation
- **RULE:** Never set `Access-Control-Allow-Origin: null`
- **RULE:** When `Access-Control-Allow-Credentials: true`, you MUST specify explicit origins (wildcard is rejected by browsers)
- **RULE:** Restrict `Access-Control-Allow-Methods` to only the HTTP methods your API actually uses
- **RULE:** Restrict `Access-Control-Allow-Headers` to only the headers your API actually needs

**Sources:**
- [JWT.io — Introduction](https://www.jwt.io/introduction)
- [JWT Security Best Practices (PhaseTwo)](https://phasetwo.io/articles/jwts/jwt-security-best-practices/)
- [JWT Security Best Practices Checklist (Curity)](https://curity.io/resources/learn/jwt-best-practices/)
- [PortSwigger — CORS](https://portswigger.net/web-security/cors)
- [MDN — CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CORS)
- [bcrypt npm package](https://www.npmjs.com/package/bcrypt)
- [MojoAuth — Understanding bcrypt and New Hardware](https://mojoauth.com/news/understanding-bcrypt-new-hardware-accelerates-password-cracking)

---

## 6. HTTP Security Headers

### Required Headers (via Helmet.js or Manual Configuration)

Use `helmet()` middleware in Express to set all of these automatically, then customize as needed.

| Header | Recommended Value | Purpose |
|--------|------------------|---------|
| **Strict-Transport-Security** | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years; include subdomains; opt into browser preload lists |
| **Content-Security-Policy** | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'` | Restrict resource loading origins; primary XSS defense. Start strict, loosen as needed. Use nonce-based for inline scripts. |
| **X-Content-Type-Options** | `nosniff` | Prevent MIME type sniffing |
| **X-Frame-Options** | `DENY` or `SAMEORIGIN` | Prevent clickjacking (being phased out in favor of CSP `frame-ancestors`) |
| **Referrer-Policy** | `strict-origin-when-cross-origin` or `no-referrer` | Control what URL info is sent in the Referer header |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=(), payment=()` | Disable browser features you don't use |
| **Cross-Origin-Opener-Policy** | `same-origin` | Process-isolate your page |
| **Cross-Origin-Resource-Policy** | `same-origin` | Block cross-origin resource loading |
| **X-Powered-By** | *(remove entirely)* | Don't reveal server technology |
| **X-XSS-Protection** | `0` | Disable legacy XSS filter (can introduce vulnerabilities in modern browsers) |

### Implementation Order (Low Risk to High Risk)

1. `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (easy wins, unlikely to break anything)
2. `Strict-Transport-Security` (start with low `max-age`, increase gradually)
3. `Content-Security-Policy` in **Report-Only** mode first, then enforce after monitoring
4. `Permissions-Policy` (disable unused browser APIs)

### Code Review Checks

- [ ] `helmet()` middleware is registered before any route handlers
- [ ] CSP is configured (not just defaults) and does not include `unsafe-inline` or `unsafe-eval` for scripts
- [ ] HSTS is enabled with `includeSubDomains`
- [ ] `X-Powered-By` is removed

**Sources:**
- [OWASP HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Helmet.js Official](https://helmetjs.github.io/)
- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [ScanTower — Security Headers Guide 2025](https://scantower.io/blog/complete-guide-security-headers-2025)

---

## 7. API Security

### Rate Limiting & DDoS Protection

- **RULE:** Apply rate limiting to ALL endpoints; apply stricter limits to sensitive endpoints (login, registration, password reset, email/SMS-sending)
- **RULE:** Use `express-rate-limit` or `rate-limiter-flexible` middleware
- **RULE:** Implement multiple strategies: per-IP, per-user, per-endpoint
- **RULE:** Return `429 Too Many Requests` with `Retry-After` header when limits are exceeded
- **RULE:** Consider sliding window rate limiting for smoother enforcement
- **RULE:** For production, use a reverse proxy (Nginx, Cloudflare) as the first line of DDoS defense

### Input Validation

- **RULE:** Use allowlist (whitelist) validation — only accept data matching expected types, lengths, formats
- **RULE:** Enforce schemas using OpenAPI, JSON Schema, or Zod
- **RULE:** Validate on the server side ALWAYS — client-side validation is a UX convenience, not a security control
- **RULE:** Reject unexpected fields — do not silently accept extra properties in request bodies
- **RULE:** Set maximum request body size limits (`express.json({ limit: '100kb' })`)
- **RULE:** Validate content types — reject requests with unexpected `Content-Type` headers

### Error Handling for APIs

- **RULE:** Return generic HTTP error codes to clients: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`
- **RULE:** NEVER expose stack traces, database errors, file paths, or internal implementation details in API responses
- **RULE:** Log detailed error information (stack traces, query details) server-side only
- **RULE:** Use consistent error response format:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Invalid email format" } }
  ```
- **RULE:** Implement a global Express error handler that catches all unhandled errors
- **RULE:** In production, ensure `NODE_ENV=production` so Express does not send stack traces

### API Design Security

- **RULE:** Require authentication on every endpoint unless explicitly public
- **RULE:** Use API versioning to manage breaking changes safely
- **RULE:** Implement request/response logging for audit trails
- **RULE:** Use an API gateway for centralized auth, rate limiting, and monitoring in microservice architectures

**Sources:**
- [Aikido — API Security: The Complete 2025 Guide](https://www.aikido.dev/blog/api-security-guide)
- [Cloudflare — Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)
- [Kong — API Security Best Practices 2025](https://konghq.com/blog/engineering/api-security-best-practices)
- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

---

## 8. Error Handling

### OWASP Error Handling Principles

- **RULE:** Design error handling as a first-class concern, not an afterthought
- **RULE:** Define a default error page — the application must NEVER leak raw error messages
- **RULE:** Implement a last-chance error handler that catches any uncaught exception
- **RULE:** Error messages to users should be helpful but reveal NO internal details
- **RULE:** Log the full error (stack trace, context) server-side for debugging
- **RULE:** Never reveal: database type/version, table/column names, file paths, framework version, query structure, internal IP addresses

### Express.js Error Handling Pattern

```javascript
// Custom 404 handler (place after all routes)
app.use((req, res, next) => {
  res.status(404).json({ error: { message: 'Resource not found' } });
});

// Global error handler (4-argument signature)
app.use((err, req, res, next) => {
  logger.error({ err, req: { method: req.method, url: req.url, ip: req.ip } });
  res.status(err.status || 500).json({
    error: { message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message }
  });
});
```

### Code Review Checks

- [ ] No `console.log(err)` sending output to stdout that might be captured — use a structured logger
- [ ] Global error handler registered in Express
- [ ] 404 handler returns custom response (not Express default)
- [ ] Error responses in production contain no stack traces or internal details
- [ ] All async route handlers wrapped in try/catch or use express-async-errors

**Sources:**
- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [OWASP — Improper Error Handling](https://owasp.org/www-community/Improper_Error_Handling)
- [OWASP — Testing for Stack Traces](https://owasp.org/www-project-web-security-testing-guide/v41/4-Web_Application_Security_Testing/08-Testing_for_Error_Handling/02-Testing_for_Stack_Traces)
- [OWASP Developer Guide — Exception and Error Handling](https://owasp.org/www-project-developer-guide/release/appendices/implementation_dos_donts/exception_error_handling/)

---

## 9. Dependency Management & Supply Chain Security

### The Threat Landscape (2025-2026)

- 454,648 malicious packages were published to npm in 2025
- In September 2025, attackers hijacked 18 popular npm packages (including `debug` and `chalk`) with 2.6 billion combined weekly downloads
- More than half of Node.js security incidents in recent years stem from compromised dependencies
- Post-install scripts are the most common npm supply chain attack vector

### Mandatory Practices

- **RULE:** Always commit `package-lock.json` to version control
- **RULE:** Use `npm ci` (not `npm install`) in CI/CD pipelines — it fails if lockfile doesn't match `package.json`
- **RULE:** Pin exact dependency versions (avoid `^` and `~` ranges in `package.json` for production)
- **RULE:** Run `npm audit` regularly and before every deployment
- **RULE:** Disable lifecycle scripts globally: `npm config set ignore-scripts true` — enable selectively when needed
- **RULE:** Use a tool like Snyk, Socket, or GitHub Dependabot for continuous vulnerability monitoring
- **RULE:** Review new dependencies before adding them — check download count, maintenance status, known issues
- **RULE:** Minimize the number of dependencies — every dependency is an attack surface
- **RULE:** Use Node.js LTS versions only in production

### Code Review Checks

- [ ] `package-lock.json` is committed and up to date
- [ ] No `npm install` in CI/CD (use `npm ci`)
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] No unnecessary dependencies (check if native Node.js APIs can replace a package)
- [ ] No dependencies with `preinstall` or `postinstall` scripts that haven't been explicitly vetted

**Sources:**
- [Snyk — NPM Security Best Practices (Shai Hulud Attack)](https://snyk.io/articles/npm-security-best-practices-shai-hulud-attack/)
- [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)
- [Bastion — npm Supply Chain Attacks 2026 Defense Guide](https://bastion.tech/blog/npm-supply-chain-attacks-2026-saas-security-guide)
- [npm Security Best Practices (OpenReplay)](https://blog.openreplay.com/npm-security-best-practices/)

---

## 10. HTTPS/TLS Requirements

### Non-Negotiable Rules

- **RULE:** ALL production traffic MUST use HTTPS — HTTP must redirect to HTTPS
- **RULE:** Use TLS 1.2 as minimum; prefer TLS 1.3
- **RULE:** Disable SSL and TLS 1.0/1.1 (deprecated and vulnerable)
- **RULE:** Use Let's Encrypt for free, automated TLS certificates
- **RULE:** Configure HSTS to prevent protocol downgrade attacks
- **RULE:** Terminate TLS at a reverse proxy (Nginx, Caddy, Cloudflare) rather than in Node.js directly
- **RULE:** Use strong cipher suites — consult [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- **RULE:** Test TLS configuration with [SSL Labs](https://www.ssllabs.com/ssltest/) — aim for A+ rating

### Code Review Checks

- [ ] No HTTP endpoints serving sensitive data
- [ ] HSTS header is set
- [ ] `secure: true` flag on all cookies
- [ ] TLS certificate auto-renewal is configured
- [ ] Application does not implement its own TLS — uses reverse proxy

**Sources:**
- [Express.js — Use TLS](https://expressjs.com/en/advanced/best-practice-security.html)
- [Mozilla Server Side TLS Configuration](https://wiki.mozilla.org/Security/Server_Side_TLS#Recommended_Server_Configurations)
- [Let's Encrypt](https://letsencrypt.org/)

---

## 11. Code Review Checklist

A consolidated, actionable checklist for reviewing back-end code security:

### Access Control
- [ ] Every endpoint checks authentication AND authorization
- [ ] Deny-by-default: endpoints require auth unless explicitly marked public
- [ ] Role/permission checks happen server-side, not derived from client input
- [ ] No IDOR (Insecure Direct Object Reference) — users can only access their own resources

### Input & Data
- [ ] All user input validated server-side with schema validation (Zod/Joi)
- [ ] All SQL queries use parameterized statements — zero string concatenation
- [ ] Request body size limits configured
- [ ] File uploads validated (type, size, content) if applicable
- [ ] No open redirects — redirect targets validated against allowlist

### Authentication
- [ ] Passwords hashed with bcrypt (work factor >= 12)
- [ ] JWTs stored in HttpOnly/Secure/SameSite cookies
- [ ] JWT expiration <= 15 minutes; refresh tokens used for longer sessions
- [ ] Session regenerated on login; destroyed on logout
- [ ] Rate limiting on login/registration/password-reset endpoints

### HTTP & Transport
- [ ] HTTPS enforced; HSTS configured
- [ ] Helmet.js middleware enabled with all security headers
- [ ] CSP configured (no `unsafe-inline` / `unsafe-eval` for scripts)
- [ ] CORS restricted to explicit origins; no wildcard with credentials
- [ ] `X-Powered-By` header removed

### Error Handling
- [ ] Global error handler registered
- [ ] Custom 404 page (not framework default)
- [ ] No stack traces, DB errors, or file paths in production responses
- [ ] Errors logged server-side with structured logger (Winston/Pino)
- [ ] `NODE_ENV=production` in production

### Dependencies & Infrastructure
- [ ] `package-lock.json` committed
- [ ] `npm ci` used in CI/CD
- [ ] `npm audit` clean of high/critical issues
- [ ] No hardcoded secrets — environment variables or secret manager used
- [ ] Node.js LTS version used
- [ ] Lifecycle scripts disabled by default

### Logging & Monitoring
- [ ] Failed login attempts logged
- [ ] Authorization failures (403s) logged
- [ ] Input validation failures logged
- [ ] Logs do not contain passwords, tokens, or PII
- [ ] Audit trail for data modification operations

---

*This guide synthesizes current guidance from OWASP, NIST, the Node.js and Express.js projects, and industry security research as of April 2026. Security requirements evolve continuously — revisit these sources quarterly.*
