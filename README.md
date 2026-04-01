# SoccerApp - הקט של שובל ⚽

Hebrew soccer match management app for casual Saturday games. Handles player registration, team balancing, scoring, MVP awards, and payment tracking.

## Tech Stack

- **Backend**: Cloudflare Workers + Hono (TypeScript)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Frontend**: Single-page HTML/CSS/JS

## Local Development

### With Docker
```bash
docker compose up --build
# Open http://localhost:8080
```

### Without Docker
```bash
npm install
npm run db:init
npm run dev
# Open http://localhost:8787
```

## Deploy to Cloudflare (Free)

1. Create a Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Install Wrangler CLI: `npm install -g wrangler`
3. Login: `wrangler login`
4. Create the D1 database:
   ```bash
   wrangler d1 create soccer-db
   ```
5. Update `wrangler.toml` with the database ID from step 4
6. Initialize the database schema:
   ```bash
   wrangler d1 execute soccer-db --file=./src/db/schema.sql
   ```
7. Set secrets:
   ```bash
   wrangler secret put ADMIN_PASSWORD
   wrangler secret put JWT_SECRET
   ```
8. Deploy:
   ```bash
   npm run deploy
   ```

## Features

- Player management with 7 skill attributes
- Weekly game registration (15 confirmed + waiting list)
- Balanced team generation (snake draft algorithm)
- Game scoring and MVP/awards system
- Weekly player performance ratings
- Payment tracking (Bit integration)
- Photo gallery links
- WhatsApp/Email notifications
- Admin panel with password protection
