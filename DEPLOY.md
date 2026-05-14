# Deployment Guide

This is the operational handoff for the grocery supply app. It assumes a fresh checkout and walks through the steps to get the app running locally, seeded, and ready to ship.

---

## 1. Prerequisites

- Docker Desktop (the project's dev workflow runs inside containers — the host does not need Node or pnpm installed).
- A reachable MySQL/TiDB database. Local development uses the bundled docker-compose service.

## 2. Environment variables

Create a `.env` file at the project root with at minimum:

| Variable                     | Purpose                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`               | MySQL connection string, e.g. `mysql://root:root@db:3306/grocery`.      |
| `JWT_SECRET`                 | Random ≥32-char string used to sign session JWTs.                       |
| `EXPO_PUBLIC_API_BASE_URL`   | URL the client uses to reach the API server (e.g. `http://localhost:3000`). |
| `EXPO_PUBLIC_APP_ID`         | (Legacy) kept for compatibility — not used by phone+password auth.      |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | (Legacy) kept for compatibility.                                      |

Push notifications additionally require `extra.eas.projectId` to be set in `app.config.ts` for managed builds — `getExpoPushTokenAsync` silently fails without it.

## 3. First-time setup

```bash
# Start containers (server + db)
docker compose up -d

# Install deps inside the container (the host has no node/pnpm — see Docker dev setup memory)
docker compose exec app pnpm install

# Apply Drizzle migrations to create / update tables
docker compose exec app pnpm db:push

# Seed test data
docker compose exec app pnpm seed
```

## 4. Test accounts (created by `pnpm seed`)

All passwords are `pass1234`. Phones use local-digits-only format.

### Providers
| Phone        | Business           | Catalog                              |
| ------------ | ------------------ | ------------------------------------ |
| `1000000001` | Fresh Farms Co.    | Vegetables, Fruits (7 items)         |
| `1000000002` | Daily Dairy        | Milk & cream, Cheese (6 items)       |
| `1000000003` | Haddad Bakery      | Bread, Pastries (5 items)            |

### Buyers
| Phone        | Business              | Notes                          |
| ------------ | --------------------- | ------------------------------ |
| `2000000001` | Corner Grocer         | Has a default saved address    |
| `2000000002` | Mini Market Mansour   | —                              |

The seed script is idempotent; re-running it skips existing rows by phone / provider+name.

## 5. Running the app

```bash
docker compose exec app pnpm dev
```

This runs `pnpm dev:server` (tsx watch on the Express + tRPC server) and `pnpm dev:metro` (Expo dev server on port 8081) concurrently.

- **Web preview**: visit `http://localhost:8081`.
- **Native**: install Expo Go on a device on the same network, scan the QR with `pnpm qr` if needed.

## 6. Running checks

```bash
docker compose exec app pnpm check    # TypeScript
docker compose exec app pnpm lint     # ESLint via expo lint
docker compose exec app pnpm test     # Vitest
```

## 7. Production build

```bash
# Build the server bundle to dist/
docker compose exec app pnpm build

# Start in production mode
docker compose exec app pnpm start
```

For the native app, configure EAS Build (`eas.json` not included by default) — set `extra.eas.projectId` in `app.config.ts` first so push tokens resolve correctly.

## 8. Operational notes

- **Push notifications** use Expo's public push API (`https://exp.host/--/api/v2/push/send`). No additional credentials required, but the device's Expo push token must be obtainable — this needs a valid Expo project ID at build time.
- **Image uploads** land on local disk under `./uploads/products/` and are served by `express.static`. For production, swap to S3 or another object store before scaling.
- **Order updates** flow two ways: foreground via `react-query` polling (10–15s) and background via push. No socket.io is needed.
- **Cart persistence** is server-side (tRPC), not AsyncStorage — items survive across devices.

## 9. Adding more sample data

Edit the `ACCOUNTS` / `CATALOG` arrays at the top of `scripts/seed.ts` and re-run `pnpm seed`. Don't hardcode IDs — the script looks them up by phone since `insertId` varies between runs.
