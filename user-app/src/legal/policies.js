export const POLICY_VERSION = "2026-08-09";

export const LEGAL_CONTACT = {
  operator: "Panditoo",
  address: "Indore, Madhya Pradesh, India",
  supportEmail: "panditoo.official@gmail.com",
  privacyEmail: "panditoo.official@gmail.com",
  grievanceOfficer: "Nodal & Grievance Officer, Panditoo",
  grievanceEmail: "panditoo.official@gmail.com",
  phone: "+91 9407474774, +91 9166477214",
  jurisdiction: "courts and competent tribunals located at Indore, Madhya Pradesh",
};

const commonPrivacy = [
  ["Who we are", `Panditoo is operated by ${LEGAL_CONTACT.operator} (${LEGAL_CONTACT.address}). This Privacy Policy applies to the Panditoo customer and partner apps, website, support and religious marketplace services.`],
  ["Information we collect", "We collect account and contact details (name, phone, email, address); booking and ceremony requirements; provider qualifications, identity proof (Aadhar/PAN/Voter ID), availability and service area; payment, refund, bank payout and earnings records; ratings, support messages and referral details. Where a feature requires it, we process location permissions, photo uploads, device identifiers and security logs."],
  ["Why we use it", "We use data to create and secure accounts, verify pandit partners, match and fulfill bookings, calculate transparent pricing, process payments/payouts, send OTPs and service updates, prevent fraud/fake bookings, provide customer support, and meet legal obligations under Indian law."],
  ["Permissions", "Location, camera, photo gallery and notification permissions are requested solely for relevant features. You can toggle them in device settings. Manual address entry remains available."],
  ["How information is shared", "Necessary booking details are shared between customers and assigned pandits to facilitate ceremony delivery. We also utilize verified technology providers for hosting, SMS/OTP, notification, payments (including Razorpay), banking settlements, and security. We do not sell personal data."],
  ["Payments", "Payments are processed securely via authorized third-party payment gateways (such as Razorpay). Panditoo stores transaction references, status, amount and limited payment details needed for reconciliation and refunds."],
  ["Retention", "We keep personal data as long as needed to operate your account and fulfill bookings. Financial, tax, KYC and dispute records are retained for the statutory period required under applicable Indian laws."],
  ["Security and incidents", "We employ administrative, technical and organizational safeguards to protect data against unauthorized access, loss or disclosure. Confidential credentials (OTPs, passwords) must be kept secure by users."],
  ["Your choices and rights", `You may request data access, correction, erasure, consent withdrawal or grievance redressal by emailing ${LEGAL_CONTACT.privacyEmail}. Identity verification may be required before processing requests.`],
  ["Account deletion", "Account deletion controls are accessible inside profile settings or by contacting customer support. Deleting an account erases personal profile data while preserving required transaction logs under legal obligations."],
  ["Children", "The Platform is intended for individuals aged 18 or older. We do not knowingly collect data from children."],
  ["International processing", "Authorized technology providers may process data on cloud infrastructure compliant with applicable Indian data protection laws and cross-border standards."],
  ["Changes", "Policy updates will be published on the Platform with a revised effective date. Material updates will prompt fresh user consent where required."],
  ["Contact and grievance", `Privacy: ${LEGAL_CONTACT.privacyEmail}\nCustomer Support: ${LEGAL_CONTACT.supportEmail}\nPhone: ${LEGAL_CONTACT.phone}\nGrievance Officer: ${LEGAL_CONTACT.grievanceOfficer}\nGrievance Email: ${LEGAL_CONTACT.grievanceEmail}\nRegistered Address: ${LEGAL_CONTACT.address}`],
];

const commonTerms = [
  ["Eligibility and acceptance", "You must be at least 18 years old and legally capable of entering into binding contracts under Indian law. By registering, clicking 'I Agree' or using Panditoo, you enter into a binding agreement with Panditoo."],
  ["Marketplace role", "Panditoo operates as a technology-enabled marketplace connecting customers with independent pandits and religious service providers. Panditoo facilitates bookings and payments but does not directly perform religious rituals."],
  ["Customer responsibilities", "Customers must provide accurate booking details, correct service location, safe and respectful venue access, and complete timely payments. Unlawful or unsafe requests to service providers are prohibited."],
  ["Provider responsibilities", "Independent pandit partners must provide truthful identity and qualification details, perform accepted bookings with care and professionalism, protect customer privacy, and refrain from off-platform fee evasion."],
  ["Nature of religious services", "Rituals and Vidhi traditions may vary by region and provider. Panditoo does not guarantee specific spiritual, astrological, or personal outcomes."],
  ["Prices and payments", "Total booking pricing (service fees, platform fees, taxes) is transparently displayed before confirmation. Payments are processed securely via integrated payment gateways."],
  ["Cancellation and refunds", "Cancellations and refunds are governed by the Panditoo Cancellation & Refund Policy shown at the time of booking."],
  ["Safety and prohibited conduct", "Fraudulent accounts, fake reviews, harassment, unauthorized scraping, fee evasion, and unlawful conduct are strictly prohibited."],
  ["Content and ratings", "User ratings and reviews must reflect genuine experiences. Panditoo reserves the right to moderate inappropriate content."],
  ["Intellectual property", "All platform branding, software, logos, trademarks, and design assets belong to Panditoo."],
  ["Suspension and termination", "Panditoo may suspend or terminate accounts in cases of terms violation, payment fraud, safety concerns, or legal requirements."],
  ["Disclaimers and liability", "Panditoo's liability is limited to the maximum extent permitted under applicable law. Statutory consumer rights under the Consumer Protection Act, 2019 are preserved."],
  ["Governing law and jurisdiction", `These Terms are governed by the laws of India. Any disputes or legal proceedings shall be subject to the exclusive jurisdiction of ${LEGAL_CONTACT.jurisdiction}.`],
  ["Changes and contact", `Material changes will be notified on the Platform. Support Email: ${LEGAL_CONTACT.supportEmail} | Phone: ${LEGAL_CONTACT.phone} | Grievance Officer: ${LEGAL_CONTACT.grievanceEmail}`],
];

export const LEGAL_DOCUMENTS = {
  customer_privacy: { title: "Customer Privacy Policy", effectiveDate: "9 August 2026", version: POLICY_VERSION, sections: commonPrivacy },
  partner_privacy: { title: "Pandit / Partner Privacy Policy", effectiveDate: "9 August 2026", version: POLICY_VERSION, sections: commonPrivacy },
  customer_terms: { title: "Customer Terms & Conditions", effectiveDate: "9 August 2026", version: POLICY_VERSION, sections: commonTerms },
  partner_terms: { title: "Pandit / Partner Terms & Conditions", effectiveDate: "9 August 2026", version: POLICY_VERSION, sections: commonTerms },
  privacy: { title: "Privacy Policy", effectiveDate: "9 August 2026", version: POLICY_VERSION, sections: commonPrivacy },
  terms: { title: "Terms & Conditions", effectiveDate: "9 August 2026", version: POLICY_VERSION, sections: commonTerms },
};
