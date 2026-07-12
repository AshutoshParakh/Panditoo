# Pandit Booking Monorepo

Marketplace platform scaffold with:

- `backend/` - Node.js + Express + PostgreSQL REST API
- `user-app/` - React Native app for customers
- `pandit-app/` - React Native app for pandits
- `admin-dashboard/` - React web dashboard for superadmin

## Quick Start

1. Copy each `.env.example` to `.env` as needed.
2. Install dependencies from the repo root:

```bash
npm install
```

3. Start local services:

```bash
docker compose up --build
```

## Workspace Scripts

- `npm run dev:backend`
- `npm run dev:user`
- `npm run dev:pandit`
- `npm run dev:admin`
