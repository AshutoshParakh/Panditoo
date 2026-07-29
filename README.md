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

## Razorpay Setup

Create `backend/.env` from `backend/.env.example`, then add credentials from the Razorpay Dashboard:

```env
RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=your_private_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_signing_secret
RAZORPAY_CURRENCY=INR
```

Keep the key secret and webhook secret on the backend only. The backend sends only the public key ID to the authenticated mobile checkout. Restart the backend after changing environment variables.
