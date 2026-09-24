# Resend setup for HelpFundMe

## Current status: disabled

Resend is production-ready in the repository but disabled by default while no
verified sending domain is available. The application, registration, login,
identity checks, in-app notifications, and campaign workflows continue without
Resend. Do not remove the integration files or npm package.

Use this environment configuration now:

```env
RESEND_ENABLED=false
# RESEND_API_KEY=re_replace_me
# RESEND_FROM_EMAIL=HelpFundMe <no-reply@mail.yourdomain.com>
# RESEND_AUDIENCE_ID=
# RESEND_WEBHOOK_SECRET=whsec_replace_me
```

When a domain is available, uncomment/fill the credential lines and change only:

```env
RESEND_ENABLED=true
```

Restart the local server or redeploy Render after changing the switch.

### Where the dormant integration is located

- `server/src/services/resend.ts` — feature switch, transactional email, OTP template, and Audience synchronization.
- `server/src/controllers/authController.ts` — signup OTP generation, verification, and resend endpoints.
- `server/src/controllers/resendController.ts` — signed webhook verification and event recording.
- `server/src/routes/resend.ts` — webhook route.
- `server/src/controllers/adminController.ts` — optional account and campaign status emails.
- `server/src/models/EmailEvent.ts` — delivery-event records.
- `client/src/pages/auth/VerifyEmailPage.tsx` — OTP entry screen used only when email verification is enabled.
- `server/.env.example` — disabled and production configurations.

These calls are intentionally guarded by `RESEND_ENABLED`; commenting out
imports and routes would make the TypeScript build fragile. The environment
switch provides the requested inactive behavior while preserving code that can
be safely re-enabled without editing application logic.

The integration uses Resend for email OTPs and important transactional account/campaign emails. In-app notifications remain enabled because email delivery is asynchronous and the free quota is limited.

## 1. Create and verify a sending domain

1. Create an account at https://resend.com and open **Domains**.
2. Click **Add Domain**. Prefer a sending subdomain such as `mail.yourdomain.com` so its email reputation is separated from the main website.
3. At your DNS provider, add every DKIM/SPF record Resend shows. Add a DMARC record as recommended by Resend.
4. Return to Resend and click **Verify DNS Records**. Wait until the domain is marked verified.
5. Without a verified domain, Resend's test sender is restricted and should not be used for production users.

## 2. Create an API key

1. Open **API Keys** → **Create API Key**.
2. Name it `helpfundme-production` and restrict it to sending access and the verified domain when the dashboard offers those controls.
3. Copy the key once. Never put it in `client/.env`, GitHub, or browser code.
4. In Render → HelpFundMe Web Service → Environment, add:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=HelpFundMe <no-reply@mail.yourdomain.com>
```

For local online testing, place the same variables in `server/.env`. For offline development, omit `RESEND_API_KEY`; OTPs are printed only to the server terminal. Optionally use `EMAIL_DEV_SHOW_OTP=true` locally, never in production.

## 3. Audience sync (optional)

1. Open **Audiences** and create `HelpFundMe Users`.
2. Copy its Audience ID into:

```env
RESEND_AUDIENCE_ID=aud_...
```

New email/password registrations will be added as contacts. Marketing broadcasts must only be sent to users who have separately opted into marketing; account acceptance alone is not marketing consent.

## 4. Webhook and inbound email

1. Open **Webhooks** → **Add Endpoint**.
2. Use:

```text
https://helpfundme-o99c.onrender.com/api/resend/webhook
```

3. Select delivery events needed for monitoring (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed`) and `email.received` if inbound mail is enabled.
4. Copy the signing secret into Render:

```env
RESEND_WEBHOOK_SECRET=whsec_...
```

5. The server verifies the exact raw request body with Resend's official SDK and stores idempotent event records in PostgreSQL.
6. For inbound email, open **Receiving**, copy the Resend-provided `@resend.app` address (or configure an inbound custom domain), and include `email.received` in the webhook. Resend retains the message content/attachments in its dashboard; this application stores the event metadata, not attachment bodies.

## 5. Broadcasts and Automations

- Create broadcasts in Resend using the opted-in Audience. Do not add users to marketing flows without explicit marketing consent and an unsubscribe route.
- Create a welcome automation in Resend using a contact-created/signup trigger if desired. Transactional OTP is sent directly by the application and should not be placed in a delayed automation.
- Keep security, OTP, verification, suspension, and payment-related mail transactional. Do not enable marketing link/open tracking on sensitive messages unless legally reviewed.

## 6. SMTP

The application uses Resend's HTTPS API because it supports idempotent structured sending and does not require an SMTP client. If another tool needs SMTP, obtain SMTP credentials from Resend and configure them only in that server-side tool. Do not add SMTP credentials to the React client.

## 7. Free-tier limits and testing

At the time this integration was written, Resend's free sending plan lists 3,000 emails/month, 100/day, three custom domains, one webhook endpoint, 30-day Resend-side data retention, and 10,000 automation runs. Confirm the current limits in Resend before launch.

Test sequence:

1. Deploy with the environment variables above.
2. Register using an email address you control.
3. Confirm the OTP email arrives and expires after 10 minutes.
4. Enter a wrong code and confirm it is rejected; five failed attempts require a new code.
5. Verify the correct code and confirm access to the dashboard.
6. Inspect **Emails** and **Webhooks** in Resend for delivery status.
7. Test bounce/complaint handling with Resend's documented test addresses before sending broadcasts.
