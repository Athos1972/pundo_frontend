# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public GitHub issue.**

Contact: security@pundo.cy

We aim to acknowledge reports within 48 hours and resolve critical issues within 14 days.
We follow coordinated disclosure: please allow us 90 days before public disclosure.

## Supported Versions

Only the latest production deployment is actively maintained.

## Security Measures

- Cloudflare WAF + DDoS protection
- Rate limiting on all authentication endpoints
- CAPTCHA (Cloudflare Turnstile) on public forms
- nonce-based Content Security Policy
- HTTP security headers (HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
