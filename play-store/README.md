# Panditoo Google Play submission pack

Prepared from the repository on 7 August 2026. This pack covers both products:

1. **Panditoo** — the customer app in `user-app/`
2. **Panditoo Partner** — the pandit/provider app in `pandit-app/`

Replace every value in square brackets before publishing. Legal and tax language should be reviewed by an Indian lawyer/accountant before it becomes public.

## Documents in this pack

- `01-release-readiness.md` — technical and Play Console launch checklist
- `02-store-listings.md` — ready-to-paste English and Hindi listing copy
- `03-privacy-policy.md` — public privacy-policy draft for both apps
- `04-terms-of-service.md` — customer and provider terms draft
- `05-data-safety.md` — proposed Play Console Data safety answers
- `06-app-content-and-review.md` — content rating, app access, ads, audience, and review notes
- `07-account-deletion.md` — public deletion-page copy and operating procedure
- `08-support-and-release-notes.md` — support-page copy and first release notes
- `09-asset-checklist.md` — required store graphics and screenshot plan

## Facts that still need owner confirmation

- Legal entity/developer name, registered address, support email, grievance contact, website, and deletion-page URLs
- Final brand spelling and the geographic service area
- Production retention periods, infrastructure vendors, SMS provider, cloud/file storage, analytics/crash SDKs, and whether data is encrypted in transit and at rest
- Refund/cancellation rules, platform fees, provider payout schedule, tax treatment, and dispute process
- Whether provider credits will remain in the app; obtain a Google Play payments-policy review before release
- Whether advertising or tracking SDKs will be added

## Current blockers found in the code

- `user-app/android/app/build.gradle` signs the release build with `debug.keystore`. Create a private upload key and use Play App Signing.
- Customer application ID is `com.anonymous.panditbookinguser`. Choose a permanent branded ID before the first Play upload; it cannot be changed afterward.
- `pandit-app/app.json` has no `android.package`, and `pandit-app/` has no native Android project. Configure and generate its production Android build.
- Neither app exposes account deletion in-app, and the backend has no authenticated deletion endpoint. Play requires both in-app initiation and an external deletion URL.
- The customer manifest declares legacy storage and overlay permissions (`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`) that do not appear essential. Remove unused permissions before submission.
- The provider registration collects ID proof and bank details. Confirm secure upload/storage; the current code appears to send a local image URI rather than upload the document.
- Development fallbacks include mock location and development OTP behavior. Ensure production builds cannot use test OTPs, stub payments, fake coordinates, or debug API endpoints.
- Provider credit purchases use Razorpay. Because credits unlock app functionality, this may require Google Play Billing even though the end service is physical. Resolve this with Play policy support/counsel before publishing.

## Recommended order

1. Resolve the blockers above and confirm the bracketed business facts.
2. Host the privacy policy, terms, deletion page, and support page on public HTTPS URLs without a login.
3. Build signed Android App Bundles (`.aab`) and test them on physical devices.
4. Create separate Play Console apps and complete each app's forms using this pack.
5. Run internal testing, then the required closed test if the developer account is subject to it.
6. Address the pre-launch report, submit for production access, and use a staged rollout.

