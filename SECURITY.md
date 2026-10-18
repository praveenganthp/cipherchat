# Security Policy

## Reporting Security Vulnerabilities

We take the security and privacy of CipherChat very seriously. If you discover a security vulnerability, we appreciate your help in disclosing it responsibly.

### How to Report

Please **do not** report vulnerabilities through public GitHub issues, discussions, or social media.

Instead, submit a confidential report to:
**security@cipherchat.internal** (or open a GitHub Private Vulnerability Advisory on the repository).

Please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- Any relevant logs, network traces, or environment details.
- Recommended remediation steps if known.

### Response Timeline
- **Initial Response**: Within 24–48 hours acknowledging receipt of your report.
- **Triage & Assessment**: Within 5 business days confirming reproduction and severity score.
- **Fix & Disclosure**: We will collaborate with you to release a patch and publish a coordinated security advisory.

---

## Security Best Practices for Self-Hosting

When deploying CipherChat in production:
1. Always enforce **TLS 1.3** across both HTTP and WebSockets (WSS).
2. Generate cryptographically strong random secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET` (at least 256 bits).
3. Set `NODE_ENV=production` to ensure secure cookie flags (`Secure`, `HttpOnly`, `SameSite=Strict`).
4. Configure database firewall rules so PostgreSQL is accessible only by the backend application host.
5. Configure reverse proxy rate limiting (e.g. Cloudflare or NGINX) to mitigate distributed Denial of Service (DDoS).
