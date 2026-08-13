# Panditoo customer website

A standalone responsive customer website using the existing Panditoo backend. Visitors can explore ceremonies before signing in, then complete OTP authentication, registration, pandit preference, pricing, payment and booking management.

## Included

- Luxury responsive landing page and original project-owned hero artwork
- Public ceremony catalogue with live backend data
- Real marketplace URLs for `/poojas`, `/pooja/:id`, `/pandits`, `/how-it-works` and `/about`
- OTP login and policy-aware registration
- Date/time, location and nearby-pandit booking flow
- Coupon/referral pricing and Razorpay checkout
- Customer dashboard, booking history/cancellation and profile editing
- Protected `/dashboard`, `/bookings`, `/account` and `/book/:id` pages with browser back/forward support
- Terms and Privacy access from registration, footer and account
- Mobile navigation and responsive layouts

## Local development

1. Run `npm install` in this folder.
2. Start with `npm run dev` or create the production bundle with `npm run build`.

Local development and production use the same-origin `/api` path. Vite, Vercel and Netlify proxy that path securely to `https://13.206.175.173`, avoiding browser CORS failures.

The development site runs at `http://localhost:5174`. The production output is written to `dist/`.

## AWS S3 + CloudFront routing

The production site uses client-side routes, so CloudFront must translate paths such as `/poojas`, `/dashboard` and `/pooja/:id` to `/index.html` before requesting an object from the private S3 origin. Otherwise S3 returns `403 AccessDenied` when a user reloads or opens one of those URLs directly.

Create a CloudFront Function from `deploy/cloudfront-spa-rewrite.js`, publish it, and associate it with the distribution's **default (`*`) cache behavior** on the **Viewer request** event. Keep any `/api/*` origin behavior separate; the function also explicitly leaves API and static-file requests unchanged. After publishing the association, invalidate `/*` on the distribution so cached 403 responses are removed.

Run `npm run test:cloudfront-routing` to verify the rewrite rules locally.

## Launch checklist

- Deploy the backend and run all database migrations, including migration 021.
- Seed/activate real pooja types; fallback cards intentionally cannot create bookings.
- Set production Razorpay credentials and verify the webhook secret/URL.
- Add the final website origin to backend `CORS_ORIGIN`.
- Configure the static host with `VITE_API_BASE_URL` before building.
- Replace and legally review the operator/grievance placeholders described in the repository legal checklist.
- Test production OTP, booking, payment verification, cancellation, email/SMS and account deletion.

The generated hero artwork is stored at `public/images/panditoo-sacred-hero.png`. It was created specifically for this project using the built-in image generation workflow.
