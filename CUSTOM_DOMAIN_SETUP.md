# Superseded: use [SPLIT_DEPLOYMENT_SETUP.md](SPLIT_DEPLOYMENT_SETUP.md)

The instructions below describe the old combined Render deployment. Do not apply them to the new Cloudflare Pages frontend + Render API architecture.

Use one public address for the React app and API:

- Website: `https://helpfundme.forgetechgh.com`
- API: `https://helpfundme.forgetechgh.com/api`
- Existing Render service: `https://helpfundme-o99c.onrender.com`

This requires DNS control of `forgetechgh.com`. Keep the current Render address
working until the new domain, login, and payments have been tested.

## 1. Link the domain to the existing Render web service

In the **correct** Render workspace, open the existing HelpFundMe web service,
then **Settings → Custom Domains → Add Custom Domain**. Add
`helpfundme.forgetechgh.com`.

At the DNS provider for `forgetechgh.com`, add one record:

| Type | Name / Host | Target / Value |
| --- | --- | --- |
| CNAME | `helpfundme` | `helpfundme-o99c.onrender.com` |

If Cloudflare hosts the DNS zone, set the CNAME to **DNS only** initially. Do not
create an A/AAAA record with the same `helpfundme` name. In Render, click
**Verify** for the custom domain and wait for the TLS certificate to be ready.
After verification, Cloudflare proxying can be enabled if desired.

## 2. Update the Render service environment

Set these on the **same web service** under **Environment**:

```env
CLIENT_URL=https://helpfundme.forgetechgh.com
GOOGLE_CALLBACK_URL=https://helpfundme.forgetechgh.com/api/auth/google/callback
RESEND_ENABLED=false
```

Keep `DATABASE_URL`, Cloudinary, Paystack, JWT, and Google client credentials
unchanged. Remove `VITE_API_URL` from the combined web service if it was set to
an old frontend/backend address. The client automatically uses its own origin
for `/api` when this variable is absent. Rebuild and deploy after changing
`VITE_API_URL`, because Vite embeds it at build time.

If `CLOUDFLARE_ORIGIN_SECRET` or `CLOUDFLARE_REQUIRE_RAY` is enabled, review
the associated Cloudflare rules before enabling the proxy. These application
checks can reject requests if Cloudflare is not supplying the expected headers.

## 3. Update Google and Paystack

In Google Cloud Console, for the existing OAuth web client, add the **exact**
authorized redirect URI:

```text
https://helpfundme.forgetechgh.com/api/auth/google/callback
```

Keep the old Render redirect URI during the transition. If the OAuth client
has an Authorized JavaScript origins list, add
`https://helpfundme.forgetechgh.com` there too.

In Paystack, set the webhook URL in the applicable test/live environment to:

```text
https://helpfundme.forgetechgh.com/api/donations/webhook
```

The app's donation return URL derives from `CLIENT_URL`, so changing that
variable also changes the customer-facing payment return address.

## 4. Verify before sharing the new address

1. Open `https://helpfundme.forgetechgh.com/api/health` and confirm JSON.
2. Open the homepage and refresh a nested URL such as `/dashboard`.
3. Register or log in on both desktop and mobile.
4. Test Google sign-in and check for redirect URI mismatch errors.
5. Make a Paystack test donation to the platform and to a campaign; check
   Paystack webhook delivery and the recorded donation.
6. Share an approved campaign link and check its preview and target URL.

Do not disable the `onrender.com` address until the new address has passed
these checks. The custom domain does not require a second Render service.

References: [Render custom domains](https://render.com/docs/custom-domains),
[Render with Cloudflare DNS](https://render.com/docs/configure-cloudflare-dns),
[Google OAuth redirect URIs](https://developers.google.com/identity/protocols/oauth2/web-server),
[Paystack webhooks](https://paystack.com/docs/payments/webhooks/).
