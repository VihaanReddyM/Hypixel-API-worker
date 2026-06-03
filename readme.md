# hypixel-api

A Cloudflare Worker proxy for the Hypixel API with bearer-token auth. This keeps the Hypixel API key private while allowing guild bots to query player data.

## Requirements

- Node.js + npm
- A Cloudflare account
- A Hypixel API key

## Install

```bash
npm install
```

## Local development

Create a `.dev.vars` file (or use `.env`, but not both) in the project root:

```env
HYPIXEL_API_KEY=your_hypixel_api_key
GUILD_API_KEYS={"keys":[{"id":"guild-a","sha256":"HASH_HERE"}]}
```

Start the dev server:

```bash
npm run dev
```

## Deploy

Set required secrets (Cloudflare):

```bash
npx wrangler secret put HYPIXEL_API_KEY
npx wrangler secret put GUILD_API_KEYS
```

Then deploy:

```bash
npm run deploy
```

## Commands

- `npm run dev` — start local dev server
- `npm run deploy` — deploy to Cloudflare
- `npm run cf-typegen` — regenerate `Env` types after binding changes
- `npm run test` — run tests

## Endpoints

- `GET /` → `{ "status": "online" }`
- `GET /player/:username_or_uuid` with `Authorization: Bearer <RAW_GUILD_API_KEY>`

## API Authentication Guide

This project uses a custom API key system to protect the Worker and keep the Hypixel API key private.

```text
Guild Bot
    │
    ▼
Authorization: Bearer <Guild API Key>
    │
    ▼
Cloudflare Worker
    │
    ▼
Hypixel API Key (Secret)
    │
    ▼
Hypixel API
```

The Hypixel API key is never exposed to clients.

---

# Creating a New Guild API Key

## Generate a Secure Key

Run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output:

```text
b2d8f0d4a6c1f7e9c3a5b8d1e4f6a9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7a0
```

Save this key somewhere safe.

This is the key that the guild bot will use.

---

## Generate SHA-256 Hash

Replace `YOUR_KEY` with the generated key:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_KEY').digest('hex'))"
```

Example output:

```text
6c8f7b2e2c7d4f6a...
```

---

## Update Cloudflare Secret

Create JSON:

```json
{
  "keys": [
    {
      "id": "guild-a",
      "sha256": "HASH_HERE"
    }
  ]
}
```

Upload:

```bash
npx wrangler secret put GUILD_API_KEYS
```

Paste the JSON when prompted.

---

# Bot Configuration

## .env

```env
WORKER_URL=https://your-worker.workers.dev
API_KEY=YOUR_GENERATED_KEY
```

---

## Axios Example

```ts
const response = await axios.get(
  `${process.env.WORKER_URL}/player/${username}`,
  {
    headers: {
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
  }
);
```

---

# Testing

## Unauthorized Request

```bash
curl https://your-worker.workers.dev/player/VA80
```

Expected:

```json
{
  "error": "unauthorized"
}
```

---

## Authorized Request

```bash
curl \
  -H "Authorization: Bearer YOUR_KEY" \
  https://your-worker.workers.dev/player/VA80
```

Expected:

```json
{
  "success": true
}
```

---

# API Key Rotation

Safe rotation procedure:

1. Generate a new key.
2. Generate its SHA-256 hash.
3. Add the new hash to `GUILD_API_KEYS`.
4. Deploy/update secret.
5. Update bots to use the new key.
6. Remove or disable the old key.
7. Deploy/update secret again.

This allows zero-downtime key rotation.

---

# Adding a New Guild

Add a new entry:

```json
{
  "keys": [
    {
      "id": "guild-a",
      "sha256": "..."
    },
    {
      "id": "guild-b",
      "sha256": "..."
    }
  ]
}
```

Upload:

```bash
npx wrangler secret put GUILD_API_KEYS
```

---

# Revoking a Guild

Remove the key:

```json
{
  "keys": [
    {
      "id": "guild-a",
      "sha256": "..."
    }
  ]
}
```

or disable it:

```json
{
  "id": "guild-b",
  "sha256": "...",
  "disabled": true
}
```

Then update the secret.

---

# Cloudflare Secrets

List secrets:

```bash
npx wrangler secret list
```

Delete secret:

```bash
npx wrangler secret delete SECRET_NAME
```

Create secret:

```bash
npx wrangler secret put SECRET_NAME
```

---

# Required Secrets

```text
HYPIXEL_API_KEY
GUILD_API_KEYS
```

---

# Security Notes

- Never commit API keys to Git.
- Never commit `.dev.vars`.
- Never expose the Hypixel API key to clients.
- Only store SHA-256 hashes of guild API keys in Cloudflare.
- Guild bots should use their own API keys.
- Rotate keys immediately if a key is suspected to be leaked.
