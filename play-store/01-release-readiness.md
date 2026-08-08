# Release readiness and Play Console checklist

## A. Business and account setup

- [ ] Choose Personal or Organization developer account. A commercial marketplace should normally use an Organization account; organization verification requires a D-U-N-S number.
- [ ] Complete identity, contact, payments-profile, and Android-device verification.
- [ ] Add a monitored developer email and phone number.
- [ ] Confirm developer display name: `[DEVELOPER NAME]`.
- [ ] Confirm merchant, GST, invoicing, withholding, and provider-payout obligations in India.
- [ ] If using a new Personal account, confirm the current closed-testing requirement shown in Play Console and recruit eligible testers before planning the launch date.

## B. Permanent app identity

| Item | Customer app | Provider app |
|---|---|---|
| Suggested Play name | Panditoo | Panditoo Partner |
| Suggested application ID | `in.panditoo.customer` | `in.panditoo.partner` |
| Current status | Still `com.anonymous.panditbookinguser` | Not configured |
| Version name | `1.0.0` | `1.0.0` |
| First version code | `1` | Configure `1` |

Application IDs are permanent after the first artifact is uploaded. Verify trademark/domain ownership before selecting them.

## C. Production engineering

- [ ] Create an upload keystore, store it outside Git, back it up securely, and configure release signing through uncommitted environment/Gradle properties.
- [ ] Enroll in Play App Signing.
- [ ] Generate release AABs for both apps; never upload a debug-signed artifact.
- [ ] Target the API level required by Play Console at upload time. As of this pack, Play requires new apps/updates to remain within one year of the latest major Android release.
- [ ] Confirm 64-bit native support, edge-to-edge behavior, adaptive icon, notification icon, splash screen, and app labels.
- [ ] Remove unused sensitive permissions. The customer app should not request storage or overlay permission unless a documented feature requires it.
- [ ] Declare only foreground location if location is requested solely while choosing an address/service area. Do not request background location.
- [ ] Add clear, just-in-time explanations before location, camera, photo, and notification permission prompts.
- [ ] Ensure all production API traffic uses HTTPS and no cleartext traffic is allowed.
- [ ] Disable dev OTPs (`123456`, `111111`), OTP logging, stub Razorpay orders, mock coordinates, and development endpoints in production.
- [ ] Add rate limiting, abuse protection, log redaction, database backups, and a tested incident response process.
- [ ] Store ID proofs and bank details in access-controlled storage; never expose them through public URLs or logs.
- [ ] Implement authenticated account deletion and deletion of associated data, with defined exceptions for legally required transaction records.
- [ ] Provide a public web deletion request page for both account types.
- [ ] Verify payment signatures and webhook signatures only on the server.
- [ ] Obtain a payments-policy determination for provider credits; migrate to Play Billing if required.
- [ ] Ensure Razorpay production configuration and privacy/terms disclosures are correct.

## D. Quality gates

- [ ] Test new registration, existing login, bad/expired OTP, logout, and account deletion.
- [ ] Test permission denial and “Don't ask again” states without crashes or fake success.
- [ ] Test booking creation, matching, confirmation, service OTP, cancellation, refunds, ratings, and completed booking history.
- [ ] Test provider verification, request acceptance, credit purchase, withdrawals, unavailable dates, and notifications.
- [ ] Verify Hindi and English screens for overflow and encoding errors.
- [ ] Test low bandwidth, offline mode, API timeouts, server errors, and payment interruption.
- [ ] Run accessibility checks: labels, contrast, font scaling, touch targets, and screen-reader navigation.
- [ ] Run Play pre-launch report and fix crashes, ANRs, security warnings, and layout issues.
- [ ] Test the exact release AAB delivered through an internal track on low-, mid-, and high-range Android devices.

## E. Play Console forms (complete separately for each app)

- [ ] Main store listing and translations
- [ ] App category: `Lifestyle` (recommended; confirm in Console)
- [ ] Contact details and public privacy-policy URL
- [ ] Data safety form using `05-data-safety.md`, verified against production SDKs and backend behavior
- [ ] App access/reviewer instructions and persistent review credentials or OTP process
- [ ] Ads declaration: `No`, unless ads/ads SDKs are added
- [ ] Target audience: adults (`18+` recommended for a paid service marketplace)
- [ ] Content rating questionnaire
- [ ] News-app declaration: `No`
- [ ] Government-app declaration: `No`
- [ ] Financial-features declaration: marketplace payments/payouts only; not banking, lending, investing, or crypto
- [ ] Account deletion URL
- [ ] Permissions declarations if Console requests them
- [ ] Countries/regions, pricing, and device availability

## F. Launch

- [ ] Upload mapping/symbol files if minification or native crash reporting is enabled.
- [ ] Use internal testing first; then closed/open testing as required.
- [ ] Provide responsive support during review.
- [ ] Start production at 5–10% staged rollout, monitor vitals and payment/booking errors, then expand.
- [ ] Keep Data safety, privacy policy, deletion behavior, and store copy synchronized with every material product/SDK change.

