# Cloudflare production security

The application now trusts one reverse proxy hop, rejects direct-origin requests when
`CLOUDFLARE_ORIGIN_SECRET` is configured, requires `CF-Ray` when enabled, applies strict
HTTP headers, CORS/origin validation, tiered rate limits, request-size limits, HPP
protection, authenticated routes, and validated image uploads.

Cloudflare edge controls cannot be switched on by application code. Apply these settings
to the production zone:

1. Proxy every public web/API DNS record (orange cloud). Remove public DNS records that
   expose the origin. Allow inbound HTTPS at the host only from Cloudflare IP ranges.
2. SSL/TLS: use **Full (strict)**, enable Always Use HTTPS, TLS 1.3, Automatic HTTPS
   Rewrites, and an authenticated Origin Certificate.
3. Create a Request Header Transform Rule for the API origin that sets
   `x-origin-verify` to the exact `CLOUDFLARE_ORIGIN_SECRET` stored only in the server
   environment. Also set `CLOUDFLARE_REQUIRE_RAY=true`.
4. WAF: enable all Cloudflare Managed Rules and OWASP Core Rules. Start OWASP at score
   40 / medium sensitivity, review Security Events, then lower the threshold if safe.
5. Bots: enable Bot Fight Mode (or Super Bot Fight Mode), block definitely automated
   traffic, and challenge likely automated traffic. Exempt only verified payment webhooks.
6. Rate limiting: challenge `/api/auth/login` and `/api/auth/register` above 10 requests
   per 15 minutes per IP; `/api/posts` POST above 5/hour; upload endpoints above 10/hour;
   and donation initialization above 10/15 minutes. Keep the application limits as a
   second layer.
7. Custom WAF rules: block non-Ghana traffic only if that matches the product policy;
   block known threat scores, malformed methods, and requests to `/api/*` with unexpected
   content types. Never challenge the Paystack webhook; its signature is verified by code.
8. Enable DDoS protection, Browser Integrity Check, hotlink protection, Email Address
   Obfuscation, and Security Level High. Use Managed Challenge instead of blanket CAPTCHA.
9. Cache: bypass cache for `/api/*`, auth pages, and any response carrying cookies. Cache
   only immutable frontend assets. Do not cache authenticated or payment responses.
10. Turn on Security Events/log retention and alerts. Review WAF false positives after
    each rule change. Rotate the origin secret if it is ever disclosed.

No configuration can make a platform “fully” immune to attacks. Keep Node dependencies,
the OS, PostgreSQL, and credentials patched/rotated, back up PostgreSQL, and test restores.
