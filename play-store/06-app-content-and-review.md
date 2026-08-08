# App content declarations and reviewer notes

## Recommended declarations

| Question | Customer app | Provider app |
|---|---|---|
| Contains ads | No, based on current code | No, based on current code |
| Target audience | 18+ | 18+ |
| News app | No | No |
| Government app | No | No |
| Health app | No | No |
| Primary category | Lifestyle | Business or Lifestyle; choose after competitor review |
| Account creation | Yes, phone OTP | Yes, phone OTP plus profile verification |
| Location | Foreground, user-initiated | Foreground, user-initiated |
| Financial features | Customer payment for physical services | Provider credits, earnings and payouts; declare accurately |

Answer the IARC content-rating questionnaire truthfully. The expected rating is low, but religious subject matter does not justify selecting a younger audience; the marketplace, payments, address sharing and provider work make 18+ the safer intended audience.

## App access instructions — customer app

Paste and complete this in Play Console:

> Panditoo uses mobile-number OTP authentication. Reviewers can use the dedicated account below. It is connected to a seeded test environment and does not require access to a real SMS inbox.
>
> Phone: `[REVIEW PHONE]`  
> OTP: `[REVIEW OTP]`  
> Test payment method: `[RAZORPAY TEST INSTRUCTIONS]`
>
> Steps: launch the app, select English or Hindi, enter the phone number, request OTP, and enter the review OTP. The account contains sample ceremonies and booking history. To exercise a new booking, select a ceremony, choose a date/time and use the provided test address. No real provider will be dispatched and no real money will be charged.
>
> Account deletion: Profile → Account → Delete account. Web deletion page: `[DELETION URL]`.
>
> Support during review: `[EMAIL]`, `[PHONE WITH COUNTRY CODE]`, available `[HOURS AND TIMEZONE]`.

## App access instructions — provider app

> Panditoo Partner uses mobile-number OTP authentication and provider verification. Use the pre-approved reviewer account below; do not submit real identity or bank information.
>
> Phone: `[PARTNER REVIEW PHONE]`  
> OTP: `[REVIEW OTP]`
>
> Steps: launch the app, select a language, sign in, and open Requests, Bookings, Availability, Earnings, Credits, and Profile. Seeded test requests may be accepted without affecting a real customer. Credit/payment testing uses `[TEST MODE DETAILS]`; no real money moves.
>
> Account deletion: Profile → Delete account. Web deletion page: `[PARTNER DELETION URL]`.
>
> Support during review: `[EMAIL]`, `[PHONE]`, available `[HOURS AND TIMEZONE]`.

## Reviewer-account requirements

- Keep credentials valid, globally accessible, and free of expiring OTP dependencies for the full review period.
- Never expose a production master OTP. Route only the allowlisted reviewer phone to a non-production review mechanism.
- Seed every major state reviewers need without real personal data.
- Explain location, notification, camera/photo and payment prompts in the review notes.
- If some cities are unsupported, use a supported test address and explain the limitation.

## Permissions explanations (for review and in-app disclosure)

**Customer location:** “Allow location while using the app to detect your service address and show relevant pandits. You can enter an address manually.”

**Provider location:** “Allow location while using the app to set your service area and receive relevant requests. Panditoo does not need background location.”

**Provider camera/photos:** “Allow access to capture or select the identity document you choose to submit for provider verification.”

**Provider notifications:** “Allow notifications to receive time-sensitive booking requests and booking-status updates.”

