# Instagram Auto-DM Comment Responder

Minimal full-stack Next.js app that connects an Instagram Business or Creator account, lets you create keyword-based DM automations, receives comment webhooks, sends private reply DMs, and records trigger history in a local JSON file.

## Stack

- Next.js 16 App Router
- TypeScript
- Local JSON storage in `data/db.json`
- Instagram API with Instagram Login
- Plain UI with Tailwind 4 utilities

## What It Does

- Connects an Instagram professional account with OAuth
- Fetches recent posts from the connected account
- Creates automations for `ALL` posts or a specific post
- Receives Instagram comment webhooks
- Matches comments against automation keywords
- Sends private reply DMs to matching commenters
- Records `sent` and `failed` trigger logs
- Offers a manual polling fallback when webhooks are unavailable

## Project Structure

```text
src/app/page.tsx                      Main dashboard
src/app/api/auth/*                    Instagram OAuth routes
src/app/api/posts/route.ts            Recent posts API
src/app/api/automations/route.ts      Automation CRUD API
src/app/api/webhooks/instagram        Webhook verification + comment receiver
src/app/api/triggers/route.ts         Trigger log API
src/app/api/poll-comments/route.ts    Manual polling fallback
src/lib/db.ts                         Local JSON storage helpers
src/lib/automation-engine.ts          Keyword matching, dedupe, DM send orchestration
src/lib/instagram-dm.ts               Private reply DM sender
data/db.json                          Local app data
```

## Prerequisites

- Node.js 20+
- An Instagram `Business` or `Creator` account
- A Meta app configured for Instagram API with Instagram Login
- A public HTTPS URL for callbacks and webhooks
  - `ngrok` or `Cloudflare Tunnel` works well for local development

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
IG_APP_ID=
IG_APP_SECRET=
IG_REDIRECT_URI=https://your-public-url.example/api/auth/callback
NEXT_PUBLIC_BASE_URL=https://your-public-url.example
IG_WEBHOOK_VERIFY_TOKEN=
```

### Where each value comes from

- `IG_APP_ID`
  - Meta App Dashboard -> `App Settings` -> `Basic` -> `App ID`
- `IG_APP_SECRET`
  - Meta App Dashboard -> `App Settings` -> `Basic` -> `App Secret`
- `IG_REDIRECT_URI`
  - Your public HTTPS URL plus `/api/auth/callback`
  - Example: `https://your-ngrok-host.ngrok-free.dev/api/auth/callback`
- `NEXT_PUBLIC_BASE_URL`
  - Your public HTTPS app URL
  - Example: `https://your-ngrok-host.ngrok-free.dev`
- `IG_WEBHOOK_VERIFY_TOKEN`
  - You create this yourself
  - Use any long random string and paste the same value into Meta’s webhook `Verify Token` field
  - Example generation:

```bash
openssl rand -hex 32
```

## Meta App Setup

### 1. Create the correct Meta app

- Create a `Business` app in the [Meta for Developers dashboard](https://developers.facebook.com/apps/)
- Add the Instagram product for Instagram API with Instagram Login

### 2. Use a supported Instagram account

- The Instagram account must be a `Business` or `Creator` account
- It should be the same account you plan to connect inside the app

### 3. Configure Instagram Login

- Add the OAuth redirect URI:
  - `https://your-public-url.example/api/auth/callback`
- Make sure it exactly matches `IG_REDIRECT_URI`

### 4. Configure app access while in development mode

- If the app is still in development mode, the testing account must have access to the app
- In Meta App Dashboard, add the testing account under roles such as:
  - `Admin`
  - `Developer`
  - `Tester`
- Accept any invite from the testing account

### 5. Configure Webhooks

- Open the app’s `Webhooks` settings in Meta
- Set callback URL to:
  - `https://your-public-url.example/api/webhooks/instagram`
- Set verify token to the exact same value as `IG_WEBHOOK_VERIFY_TOKEN`
- Subscribe to the `comments` field for Instagram

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open the app through your public HTTPS tunnel URL, not plain `localhost`, if you are testing OAuth or webhooks.

## Tunnel Setup

Example with ngrok:

```bash
ngrok http 3000
```

Then update:

- `NEXT_PUBLIC_BASE_URL`
- `IG_REDIRECT_URI`
- Meta OAuth redirect URI
- Meta webhook callback URL

All four must point to the same public HTTPS host.

## Data Storage

This app stores all state in `data/db.json`.

Structure:

```json
{
  "account": null,
  "automations": [],
  "triggers": []
}
```

Notes:

- Access tokens are stored server-side only
- No external database is used
- This is intentionally minimal for local development and demo use

## API Routes

- `GET /api/auth/login`
  - Starts Instagram OAuth
- `GET /api/auth/callback`
  - Handles OAuth callback, exchanges token, stores account
- `POST /api/auth/logout`
  - Clears the connected account
- `GET /api/posts`
  - Returns recent Instagram media
- `GET /api/automations`
  - Returns automations
- `POST /api/automations`
  - Creates an automation
- `DELETE /api/automations?id=...`
  - Deletes an automation
- `GET /api/webhooks/instagram`
  - Meta webhook verification challenge
- `POST /api/webhooks/instagram`
  - Receives comment webhooks and processes matches
- `GET /api/triggers`
  - Returns trigger logs newest first
- `POST /api/poll-comments`
  - Manual fallback that polls recent comments on fetched posts

## Demo Flow

1. Start the app locally.
2. Start your HTTPS tunnel.
3. Update `.env.local` with the tunnel URL.
4. Update the Meta app redirect URI and webhook callback URL.
5. Open the app on the public tunnel URL.
6. Click `Login with Instagram`.
7. Confirm recent posts load.
8. Create an automation:
   - Target `ALL` posts or a specific post
   - Set a keyword
   - Set a DM message
9. Leave the webhook configured and comment on a matching Instagram post.
10. Check the Trigger Logs table for `sent` or `failed` results.
11. If webhook delivery is unavailable, use `Check now` to trigger manual polling.

## Webhook Notes

- Meta webhook delivery requires a public HTTPS URL
- Local `http://localhost:3000` is not enough for live webhook delivery
- The app verifies `X-Hub-Signature-256` using `IG_APP_SECRET`
- The app verifies the challenge request using `IG_WEBHOOK_VERIFY_TOKEN`

## Private Reply DM Notes

- This app sends a private reply to a comment using the Instagram Messaging API
- Private replies are time-limited by Instagram/Meta policy
- If the allowed reply window has expired, the send can fail
- When that happens, the API error is stored in the trigger log `reason`

## Polling Fallback

Primary path:

- Use webhooks whenever possible

Fallback path:

- `POST /api/poll-comments`
- The dashboard `Check now` button calls this route
- It fetches recent posts, fetches comments for each post, and runs them through the same processing engine as webhooks

Why this exists:

- Local tunnels can be unstable
- Webhook configuration can be temporarily unavailable during development
- Polling is useful for manual recovery and debugging

## Manual Test Checklist

- OAuth login succeeds
- Logout clears the stored account
- `/api/posts` returns recent media
- Automation creation works for `ALL` posts
- Automation creation works for a specific post
- Duplicate keyword + target is rejected
- Webhook verification succeeds in Meta
- A matching comment triggers a DM attempt
- Trigger logs record `sent` and `failed` states
- Manual polling processes comments when webhooks are unavailable

## Constraints and Surprises

### API constraints and surprises encountered

- Instagram OAuth and webhook setup both require a real public HTTPS URL
- Redirect URIs and callback URLs must match exactly
- The Meta app type matters; using the wrong app/product setup causes login failures
- Comment webhooks and manual polling can return slightly different shapes, so the app normalizes both into one internal comment event format
- Private reply DMs are not guaranteed to succeed indefinitely because Instagram enforces a reply window
- Access tokens expire and require reconnect handling

### Scaling considerations for 500 comments per minute

- JSON file storage is fine for local development, but not for sustained load
- At higher throughput, move trigger writes and DM sends into a queue-based worker model
- Introduce idempotency keys based on comment ID + automation ID
- Replace `data/db.json` with a real database
- Use batched workers and retry policies for transient Meta API failures
- Add rate-limit awareness and backoff around DM sends and comment reads
- Store webhook deliveries and processing state separately for observability
- Avoid doing all comment processing directly inside the webhook request path under production load

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Final Notes

- This project is optimized for clarity and demoability, not production hardening
- Before production use, replace file storage, add authentication for app operators, improve auditing, and add structured monitoring
