# Proposed Google Play Data safety declarations

Complete and validate one form per package. These answers are based on repository behavior, not a production traffic/SDK audit. “Collected” includes data sent off-device to your backend or processors. Do not submit until every row is confirmed against production.

## Top-level answers for both apps

- Does the app collect or share required user data types? **Yes**
- Is all user data encrypted in transit? **Answer Yes only after confirming every production endpoint and vendor uses HTTPS/TLS.**
- Can users request deletion? **Yes only after the in-app and web deletion flow is implemented and operational.**
- Is data processed ephemerally? Generally **No**, except short-lived values explicitly designed and verified as ephemeral.
- “Shared” should be selected when data is transferred to a third party and no Play exception applies. Re-evaluate Razorpay, SMS, hosting, notification, analytics and storage vendors under Google's service-provider rules.

## Customer app

| Play data type | Collected | Likely purpose(s) | Required/optional | Notes |
|---|---|---|---|---|
| Name | Yes | App functionality, account management, fraud prevention | Required | Account and booking identity |
| Phone number | Yes | Authentication, app functionality, communications, fraud prevention | Required | OTP login |
| Email address | Yes if supplied | Account management, communications | Optional | Confirm UI behavior |
| Address | Yes | App functionality | Required for booking; optional otherwise | Service location |
| Precise location | Yes when used | App functionality | Optional permission | Foreground detection; booking coordinates retained |
| Approximate location | Yes when used | App functionality | Optional permission | Android may provide approximate location |
| User payment info | Yes (limited) | App functionality, fraud prevention | Required for paid booking | Razorpay handles credentials; app/backend keep order/payment IDs, amount/status |
| Purchase history | Yes | App functionality, account management, analytics | Required for paid booking | Booking/payment/refund history |
| Other user-generated content | Yes | App functionality | Optional | Rating comments, cancellation reasons/support content |
| App interactions | Yes | App functionality, analytics | Required | Booking actions/status; declare analytics only if used for analytics |
| Other actions | Yes | App functionality, fraud prevention | Required | Service OTP workflow |
| Device or other IDs | Confirm | App functionality, fraud prevention | Confirm | Declare if push, analytics, crash or payment SDK collects them |
| Crash logs/diagnostics | Confirm | Analytics | Optional/automatic | No explicit crash SDK found; audit production SDK transitive collection |

## Provider app

| Play data type | Collected | Likely purpose(s) | Required/optional | Notes |
|---|---|---|---|---|
| Name | Yes | App functionality, account management, fraud prevention | Required | Provider profile |
| Phone number | Yes | Authentication, communications, fraud prevention | Required | OTP login |
| Email address | Yes if supplied/generated | Account management, communications | Confirm | Do not generate fake email addresses in production |
| Address | Yes | App functionality | Required by current registration | Service base |
| Precise/approximate location | Yes when used | App functionality | Optional permission, but coordinates currently expected | Foreground service-area setup |
| Photos | Yes | App functionality, fraud prevention | Required by current registration | Identity proof; confirm actual secure upload |
| Other personal info | Yes | App functionality, fraud prevention | Required | Experience, specializations, service radius, verification status |
| User payment info | Yes | App functionality, fraud prevention | Required for payouts/credit purchase as applicable | Bank account/IFSC and Razorpay identifiers |
| Purchase history | Yes | App functionality, account management | Required if credits purchased | Credits and payment history |
| Financial info — other | Yes | App functionality | Required for payouts | Earnings, withdrawals, payout status |
| App interactions | Yes | App functionality, analytics | Required | Request responses, bookings, availability |
| Other user-generated content | Yes | App functionality | Optional | Ratings/support/dispute content |
| Device or other IDs | Likely yes | App functionality | Optional | Push token/notification SDK; confirm exact classification |
| Crash logs/diagnostics | Confirm | Analytics | Optional/automatic | Audit Expo and all production SDKs |

## Sharing/processor audit to complete

For each vendor, record legal entity, data types, purpose, retention, deletion route, encryption, contractual role and whether Play's “service provider” exception applies:

- `[HOSTING/CLOUD PROVIDER]`
- `[POSTGRES/DATABASE PROVIDER]`
- `[FILE/ID STORAGE PROVIDER]`
- `[SMS/OTP PROVIDER]`
- Razorpay and payout/banking partners
- Expo notification services and any Firebase components
- `[EMAIL/SUPPORT PROVIDER]`
- `[ANALYTICS/CRASH PROVIDER, OR NONE]`

## Accuracy checks before submission

- Inspect the final merged Android manifests and Play SDK Index warnings for each release AAB.
- Test network calls through a controlled proxy or backend logs and inventory every off-device field.
- Ensure optional/required choices match the real UI; a permission can be optional even if manual data entry is required for a transaction.
- Update the form whenever an SDK, field, permission, retention practice, or sharing arrangement changes.

