# HelpFundMe split deployment (sandbox first)

Public architecture:

| Purpose | Public name | Host |
| --- | --- | --- |
| React frontend | `helpfundme.forgetechgh.com` | Cloudflare Pages |
| Express API | `api.helpfundme.forgetechgh.com` | Render Free web service |
| Campaign images | `media.helpfundme.forgetechgh.com` | Cloudflare R2 public bucket |
| Identity/evidence documents | No public hostname | Private R2 bucket, streamed through admin API |
| Database | No browser-facing hostname | Neon PostgreSQL, connected only by API |

The `.onrender.com` address is still the **DNS CNAME target** for Render, but it need not appear in customer-facing links. Disable the Render subdomain after the API custom domain is verified. Pages has a `pages.dev` preview name; redirect its production URL to the custom domain if desired. Never publish Neon or R2 secret keys in Pages/Vite variables.

## 1. Cloudflare DNS and Pages

1. Confirm `forgetechgh.com` is an active zone in your Cloudflare account and that its nameservers are in use. Do not remove existing root-domain or mail records.
2. Workers & Pages → Create → Pages → Connect your GitHub repo. Project root directory: `client`. Build command: `npm ci && npm run build`. Build output directory: `dist`.
3. Set Pages **build** variables `VITE_API_URL=https://api.helpfundme.forgetechgh.com/api`, `VITE_PAYMENT_PROVIDER=seev`, and `VITE_PAYMENT_MODE=sandbox`. Set Pages **runtime** variable `API_ORIGIN=https://api.helpfundme.forgetechgh.com` for the campaign share-preview function. These are public addresses, not secrets.
4. Pages project → Custom domains → Add `helpfundme.forgetechgh.com`. Let Pages create/verify its DNS record. Do not point `helpfundme` at Render; the frontend now lives on Pages. Ensure HTTPS is active, then test a nested path such as `/dashboard` after refresh.
5. The `client/public/_redirects` file provides SPA fallback. The Pages Function at `client/functions/posts/[id].ts` requests approved campaign data from the API for social-link previews. Verify a shared campaign link on a crawler preview tool after deployment.

## 2. Render API

Use the **correct** Render workspace containing your GitHub repository. Create a separate **Web Service** (Free plan): root directory `server`, build `npm ci && npm run build`, start `npm start`, health check `/api/health`. Set `NODE_ENV=production` and `SERVE_CLIENT=false`. Do not deploy a second frontend on Render.

Render service → Settings → Custom Domains → add `api.helpfundme.forgetechgh.com`. In Cloudflare DNS add `CNAME api → <your-api-service>.onrender.com`, initially **DNS only**. Verify the domain in Render and wait for its TLS certificate. Then switch the Cloudflare record to **Proxied**, use SSL/TLS **Full (strict)**, and test `https://api.helpfundme.forgetechgh.com/api/health`. Only then disable the service's Render subdomain under Render Settings → Custom Domains.

Render → Environment: enter the server variables from `server/.env.example`. Important values:

```text
CLIENT_URL=https://helpfundme.forgetechgh.com
API_URL=https://api.helpfundme.forgetechgh.com
SERVE_CLIENT=false
DATABASE_URL=<Neon pooled connection string, server-side only>
DATABASE_DIRECT_URL=<Neon direct connection string, server-side only>
DATABASE_SSL=true
PAYMENT_PROVIDER=seev
SEEV_ENV=sandbox
SEEV_LIVE_ENABLED=false
SEEV_CHECKOUT_API_KEY=<sandbox Checkout API key>
SEEV_WEBHOOK_SECRET=<sandbox webhook signing secret>
GOOGLE_CALLBACK_URL=https://api.helpfundme.forgetechgh.com/api/auth/google/callback
```

Also supply distinct 64+ character JWT secrets and the R2 values described below. Do **not** set `CLOUDFLARE_ORIGIN_SECRET` unless you have a working edge rule that injects it; otherwise all API traffic will be rejected. Leave `CLOUDFLARE_REQUIRE_RAY=false` until Cloudflare proxying, Render health checks, and Seev webhooks are tested. Render Free sleeps after inactivity; this is unsuitable for reliable live payment webhooks, especially because Seev currently allows only one 8-second delivery attempt and no automatic retry. Use Free for sandbox testing; upgrade to an always-on backend before accepting live donations.

## 3. Neon PostgreSQL (new empty database)

Create a Neon project in a region close to the Render service. Neon Console → project → Connect → choose the **pooled** connection string for Render `DATABASE_URL`, and the **direct** connection string for `DATABASE_DIRECT_URL` (startup schema creation). For local online testing, put these in `server/.env`. Use `DATABASE_SSL=true`. Do not paste either secret into GitHub, Cloudflare Pages, or a browser variable. On startup the app creates `app_records` and its indexes automatically. You explicitly chose a fresh database: old Render database users, roles, campaigns, and donation history will **not** appear. Keep an offline export of any real-money records for reconciliation before switching.

## 4. Cloudflare R2

Create **two** buckets: `helpfundme-media` and `helpfundme-documents` (names can differ if env values match). Bind `media.helpfundme.forgetechgh.com` as a **custom domain only to the media bucket**. Keep the documents bucket private: no custom domain and no `r2.dev` public development URL. Create an R2 S3 API token scoped to those two buckets with Object Read & Write. Copy its Access Key ID, Secret Access Key, and your Cloudflare Account ID into Render:

```text
R2_ACCOUNT_ID=<account ID>
R2_ACCESS_KEY_ID=<S3 access key ID>
R2_SECRET_ACCESS_KEY=<S3 secret access key>
R2_PUBLIC_BUCKET=helpfundme-media
R2_PRIVATE_BUCKET=helpfundme-documents
R2_PUBLIC_BASE_URL=https://media.helpfundme.forgetechgh.com
```

Never expose the R2 token to Pages or the browser. The API accepts only listed image/PDF formats and size-limited files. Admin document links use authenticated API streaming; R2 private signatures do not appear in browser URLs. The `media` domain is intentionally public because campaign pictures must be visible to donors. Avoid caching document API responses.

## 5. Google and SeevPlus sandbox

Google Cloud Console → OAuth web client → authorized redirect URI: `https://api.helpfundme.forgetechgh.com/api/auth/google/callback`. Add `https://helpfundme.forgetechgh.com` as an authorized JavaScript origin if the client configuration requires it. Keep local redirect URI for local testing. Do not put OAuth client secret into Vite variables.

SeevPlus → organization → Seev API/Developer Dashboard → accept developer terms → Sandbox → create a **Checkout API sandbox key**. Set it as `SEEV_CHECKOUT_API_KEY` on Render. Create a sandbox webhook subscribed to both `payment.succeeded` and `payment.failed` with URL `https://api.helpfundme.forgetechgh.com/api/donations/seev-webhook`; store the one-time signing secret as `SEEV_WEBHOOK_SECRET`. Keep `SEEV_ENV=sandbox` and `SEEV_LIVE_ENABLED=false`. Sandbox payments move no real money. Test a platform donation and an approved-campaign donation, success, failure, and replay. Seev redirects back to `/donations`; the server verifies the reference and amount before crediting a donation. **Do not switch to live keys yet.** Seev's current Checkout API lacks recurring charges and API refunds; those functions are disabled/blocked rather than represented as successful.

## 6. Cloudflare security and go/no-go checks

On `api` enable the Cloudflare proxy after Render TLS works, Full (strict), WAF managed rules available on your plan, bot/rate-limit rules for login, registration, and donation initialization, and DDoS protection. Start rules in log/challenge mode and test legitimate mobile users. Never issue a browser challenge on the Seev webhook path; the API verifies its HMAC signature. Bypass caching for `/api/*`, especially authentication and payment responses. The R2 public-media hostname can use cache rules; the private bucket must not be public. Consult `CLOUDFLARE_SECURITY.md` for the current checklist.

Before sharing the site: verify HTTPS on all three public hostnames; sign up/sign in (desktop and mobile); Google login; admin identity document view/download; image upload; draft/review/approval; no donation before approval; Seev sandbox success/failure for platform and campaign; webhook signature rejection and replay; and campaign share preview. Confirm the API subdomain's `.onrender.com` URL returns 404 after you disable it. Rotate any key accidentally exposed in Git, screenshots, or chat.

References: [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [Render custom domains](https://render.com/docs/custom-domains), [Render Free limits](https://render.com/docs/free), [Neon pooling](https://neon.com/docs/connect/connection-pooling), [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/), [SeevPlus checkout](https://docs.seevcash.com/docs/payments/checkout), [SeevPlus webhooks](https://docs.seevcash.com/docs/developer/webhooks).
