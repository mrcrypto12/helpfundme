# Cloudflare production security

For the new split deployment, use [SPLIT_DEPLOYMENT_SETUP.md](SPLIT_DEPLOYMENT_SETUP.md) first. The frontend is on Cloudflare Pages (`helpfundme`), the API is a proxied Render web service (`api`), public images are on an R2 custom domain (`media`), and verification documents remain in a separate private R2 bucket. These settings are a checklist, not a claim of complete protection. Controls available in the Cloudflare dashboard vary by plan.

The application now trusts one reverse proxy hop, rejects direct-origin requests when
`CLOUDFLARE_ORIGIN_SECRET` is configured, requires `CF-Ray` when enabled, applies strict
HTTP headers, CORS/origin validation, tiered rate limits, request-size limits, HPP
protection, authenticated routes, and validated image uploads.

Cloudflare edge controls cannot be switched on by application code. Apply these settings
to the production zone:

1. Pages manages the frontend hostname. Proxy the `api` CNAME **after** Render verifies its custom domain and issues TLS. Render Free does not expose a host firewall you can configure to allow only Cloudflare IPs; disable the Render subdomain after testing instead. Keep the private R2 bucket completely unexposed.
2. SSL/TLS: use **Full (strict)** for the proxied API after Render's managed certificate is ready. Enable Always Use HTTPS and a supported minimum TLS version. Do not install an Origin Certificate on a Render Free service; Render manages its own certificate.
3. Leave `CLOUDFLARE_ORIGIN_SECRET` unset and `CLOUDFLARE_REQUIRE_RAY=false` initially. A paid-plan-capable edge rule can add an origin secret later, but do not enable either check until the rule, Render health checks, Google callback, and Seev webhook have all been tested.
4. WAF: enable managed rules available on your plan and review Security Events. Test genuine registration, uploads, and Seev webhook requests before enforcing challenges.
5. Bots: enable bot controls available on your plan. Do not challenge server-to-server Seev webhook traffic; the webhook endpoint checks its signature and timestamp.
6. Rate limiting: challenge `/api/auth/login` and `/api/auth/register` above 10 requests
   per 15 minutes per IP; `/api/posts` POST above 5/hour; upload endpoints above 10/hour;
   and donation initialization above 10/15 minutes. Keep the application limits as a
   second layer.
7. Custom WAF rules: do not block non-Ghana traffic unless that matches your donor policy. Never challenge `/api/donations/seev-webhook`; its HMAC is verified in code. Restrict methods and suspicious traffic without blocking Google OAuth redirects or legitimate payment callbacks.
8. Enable DDoS protection and browser checks available on your plan, then monitor false positives. Avoid blanket high-security settings that make mobile sign-in or payment redirects fail.
9. Cache: bypass cache for `/api/*` and any response carrying cookies. Cache only immutable frontend assets and public R2 images. Do not cache private document, authenticated, or payment responses.
10. Turn on Security Events/log retention and alerts. Review WAF false positives after
    each rule change. Rotate the origin secret if it is ever disclosed.

No configuration can make a platform “fully” immune to attacks. Keep Node dependencies,
the OS, PostgreSQL, and credentials patched/rotated, back up PostgreSQL, and test restores.
