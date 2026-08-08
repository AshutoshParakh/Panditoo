# Panditoo legal release checklist

The in-app Terms and Privacy Policy are implementation-ready templates, not a substitute for advice from counsel familiar with the actual operator and commercial model. Do not release until every item below is confirmed and the policy text is updated where necessary.

## Required operator facts

- Replace the release-blocking values in `user-app/src/legal/policies.js` with the exact legal entity/trading name, registered/principal address, working support/privacy/grievance emails, named grievance officer, and lawful jurisdiction wording.
- Confirm that `support@panditoo.com`, `privacy@panditoo.com`, and `grievance@panditoo.com` exist and are monitored, or replace them.
- Publish the operator and grievance information prominently outside the policy where the Consumer Protection (E-Commerce) Rules require it.
- Display each provider's legally required seller/service-provider and grievance information in the relevant listing or booking view.

## Commercial facts counsel must approve

- Final price components, taxes, platform fee, provider share, credit denomination/expiry/refund treatment, payout timing, minimum withdrawal and tax-withholding/invoice process.
- A precise cancellation/refund/no-show matrix and dispute deadline that exactly match backend and checkout behaviour.
- Provider classification, required registrations, insurance position, verification claims and rules for ceremony materials, travel, delays and unsafe venues.
- Governing court/venue and whether any optional mediation or arbitration clause is appropriate without limiting consumer forums.

## Privacy operations

- Document every production vendor, data category, purpose, hosting region, contractual role, retention period and deletion mechanism.
- Confirm encryption, access review, backups, breach response, audit logging, grievance handling and rights-request procedures match the published statements.
- Provide a working in-app and web account-deletion path, including treatment of active bookings, payouts, refunds, disputes and legally retained records.
- Prepare a clear Hindi version before offering Hindi as the user's policy/notice language, and have both language versions legally reviewed.
- Keep Google Play Data safety disclosures and any public web privacy-policy URL consistent with actual app behaviour.

## Versioning and deployment

- Apply migration `021_add_policy_acceptance` before deploying the apps/backend.
- Keep `POLICY_VERSION` in `user-app/src/legal/policies.js` and `CURRENT_POLICY_VERSION` in `backend/src/controllers/authController.js` identical.
- For a material policy change, increment both versions, show the revised documents, and implement re-consent for existing accounts when required.
- Preserve acceptance records only for the documented legal/audit retention period and restrict access to them.
