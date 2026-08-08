# Account deletion page and procedure

Publish this content at a public HTTPS URL that works without login. Enter that URL in both Play Console account-deletion fields (or publish separate customer/provider pages).

## Public page copy

# Delete your Panditoo account

You can request permanent deletion of a Panditoo customer or Panditoo Partner account.

### Delete from the app

1. Sign in to the relevant app.
2. Open **Profile** or **Account**.
3. Select **Delete account**.
4. Review the effects, verify your mobile number if asked, and confirm.

### Delete from the web

Submit the secure form below or email `[PRIVACY EMAIL]` from your registered contact details with the subject “Delete my Panditoo account.” Include:

- account type: Customer or Pandit Partner;
- registered mobile number (masked where email is not secure); and
- your name.

**Secure request form:** `[FORM URL OR EMBED FORM]`

We will verify that you control the account. Never send an OTP, password, complete bank-account number or identity document by email.

### What is deleted

After verification, we delete or de-identify account/profile details, saved addresses and location, notification tokens, identity-verification material when no longer legally needed, and other data linked solely to the account. Deletion also removes access to the account and cannot be undone.

### What may be retained

We may retain limited booking, payment, payout, invoice, tax, fraud-prevention, safety and dispute records where required by law or necessary to establish or defend legal claims. Retained records are restricted from ordinary product use and removed after the applicable retention period described in our Privacy Policy.

We aim to complete verified requests within `[NUMBER]` days and will confirm completion. Questions: `[PRIVACY EMAIL]`.

## Internal operating procedure

1. Create a ticket with request time, account type, actor ID and verification state. Do not copy excess personal data into the ticket.
2. Verify control using a short-lived OTP or authenticated in-app confirmation. Support staff must never ask for an OTP value over phone/email.
3. Freeze new activity during processing while clearly treating this as an interim step, not final deletion.
4. Check active bookings, refunds, chargebacks, withdrawals, legal holds and open disputes. Explain any narrow delay.
5. Delete/anonymize dependent records transactionally. Preserve only fields required by the approved retention schedule.
6. Revoke JWT/session access, delete push tokens, detach uploaded documents, and propagate deletion to processors/backups under their schedules.
7. Record completion without retaining the deleted profile. Notify the requester.
8. Test deletion monthly for customer and provider accounts and retain audit evidence.

## Implementation acceptance criteria

- A clearly labelled Delete account action exists in both apps without contacting support.
- The confirmation names major consequences and does not use manipulative language.
- Re-authentication is proportionate and accessible.
- Backend authorization prevents deleting another person's account.
- Related files, tokens and processor data are covered—not only the main database row.
- Referential constraints are handled using deletion or irreversible anonymization while required financial records remain valid.
- The public URL is indexed/accessible, mobile-friendly and does not require app installation.

