# ☁️ Deploy DOPAMINE to Cloudflare — $0, no cold starts, global edge

This replaces `server.js` in production. The Worker serves your static site **and** the API (leaderboard, admin) using D1 (SQLite at the edge).

**Free tier:** unlimited site requests · 100k API requests/day (~3k daily players) · 5M DB reads/day.

---

## One-time setup (~10 minutes)

```bash
npm install -g wrangler   # Cloudflare CLI
wrangler login            # opens browser → authorize
```

### 1. Create the database

```bash
wrangler d1 create dopamine
```

Copy the `database_id` it prints into `cloudflare/wrangler.toml` (replace `REPLACE_ME`), then create the tables:

```bash
wrangler d1 execute dopamine --remote --file=cloudflare/schema.sql
```

### 2. Set your secrets

```bash
cd cloudflare
wrangler secret put ADMIN_PASSWORD   # type your owner password
wrangler secret put SECRET           # type any long random string (press enter)
```

### 3. Deploy 🚀

```bash
wrangler deploy
```

Done. Your site is live at **`https://dopamine.<your-subdomain>.workers.dev`** — check the URL the command prints.

---

## Updating later

```bash
cd cloudflare
wrangler deploy
```

That's it — static files and API deploy together.

## After deploy

- [ ] Update `https://dopamine.games` links in `public/js/share.js`, `share texts in game files`, and meta tags in `public/index.html` to your real URL
- [ ] Visit `/#/admin` → login with your `ADMIN_PASSWORD` → configure ads (saved to D1, live for everyone)
- [ ] Optional: add a custom domain in the Cloudflare dashboard (Workers → your worker → Domains) — DNS is free, domain ~$10/yr

## Architecture

```
Browser ──► Cloudflare edge
              ├── static assets (public/)  ← unlimited, cached globally
              └── /api/* ──► Worker ──► D1 (scores, ads config)
```

- Leaderboard reads: one indexed SQL query — microseconds
- Scores prune automatically after 8 days
- Admin auth: HMAC-signed token, timing-safe compares, password never stored client-side
