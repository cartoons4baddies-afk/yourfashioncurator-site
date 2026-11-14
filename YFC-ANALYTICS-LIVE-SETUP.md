# YFC Analytics — Connect live Cloudflare Web Analytics

The Editor's Room already contains the live Cloudflare panel. It will remain in **connection pending** status until you set the four Pages project secrets.

## 1. Create the Cloudflare read-only token

Cloudflare dashboard → My Profile / API Tokens → Create Token → Create Custom Token.
- Name: `YFC Analytics Read Only`
- Permissions: **Account → Account Analytics → Read**
- Account resources: limit to the account that owns `yourfashioncurator-site.pages.dev`.
- Set an expiration/restriction appropriate to your needs.
- Copy the token directly into the encrypted secret field in Cloudflare. Never paste it in GitHub, your site code, screenshots or chat.

## 2. Find the Cloudflare account ID

In your Cloudflare dashboard, select the account containing your Pages project. Locate the **Account ID** in account overview / account details, or in its account URL. This is *not* a Zone ID.

## 3. Configure the Pages project

Workers & Pages → `yourfashioncurator-site` → Settings → Variables and Secrets → Add.

Configure these **production** bindings:

| Name | Value | Private? |
| --- | --- | --- |
| `CF_ANALYTICS_TOKEN` | Read-only API token from step 1 | **Yes, encrypt** |
| `CF_ACCOUNT_ID` | Cloudflare account ID | Yes (prefer encrypted) |
| `SUPABASE_URL` | Same Supabase project URL used in `config.js` | No key required |
| `SUPABASE_PUBLISHABLE_KEY` | Same public/publishable Supabase key used in `config.js` | Public key; may encrypt |

Use exactly these names. Set the same bindings for preview only if you want testing there. Trigger a **new Pages deployment** after saving the bindings.

## 4. Test

Open the Editor's Room → **YFC ANALYTICS**. Click **REFRESH DATA**.

- If configured correctly, the live panel displays totals, top page paths, traffic referrers and countries for the last seven UTC calendar dates (today + previous six).
- No changes to site analytics instrumentation are required: the Cloudflare Web Analytics collection is already active.
- The live report reflects Cloudflare's available data, which may be delayed.
- The report includes private editor paths in site-wide totals, clearly labeled. Future work should separate editor activity from public readership.
- If the panel says **Cloudflare API returned HTTP 403**, verify account selection and read permission.
- If the panel says **Cloudflare rejected the analytics query**, consult the response or Cloudflare account limits; the GraphQL schema may differ by account/product.

## Security

The Cloudflare API token **never goes into browser JavaScript**. The Cloudflare Pages Function at `functions/api/analytics.js` validates the Supabase login access token with Supabase Auth and then checks the `editors` table under row-level security before querying analytics. It returns only report aggregates, not credentials. Unauthorized callers receive 401/403.

Never share tokens, service role keys or passwords in chat. The Public Supabase publishable key is not a service-role secret.

## Metrics and provenance

- Dataset: Cloudflare GraphQL API `rumPageloadEventsAdaptiveGroups`.
- Uses `count` for page views and `sum.visits` for visit counts.
- Date range: UTC calendar days, including the current date, **not** last rolling 168 hours.
- Site hostname: `yourfashioncurator-site.pages.dev`.
- Page paths may not distinguish each article's query string.
- Other sections of YFC Analytics still use separate sources; Google Search Console CSV imports are local-browser only.

Official docs:
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/analytics/graphql-api/getting-started/
