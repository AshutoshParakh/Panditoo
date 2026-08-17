import React from "react";

export const POLICY_METADATA = {
  effectiveDate: "11/07/2026",
  lastUpdated: "11/07/2026",
  version: "2026-11-07",
  brand: "Panditoo",
  operator: "Pandito",
  office: "Indore, Madhya Pradesh",
  privacyEmail: "panditoo.official@gmail.com",
  supportEmail: "panditoo.official@gmail.com",
  phone: "+91 916647714",
  grievanceOfficer: "Ashutosh & Piyush | Co-Founders & CEOs",
};

export const PRIVACY_POLICY_SECTIONS = [
  {
    id: "about",
    heading: "1. ABOUT PANDITOO",
    content: "Panditoo is a technology-enabled marketplace that facilitates Customers in discovering and booking independent Pandits and religious service providers.\n\nPanditoo primarily acts as a technology and facilitation platform and does not itself perform the religious services unless expressly stated otherwise.\n\nThis Privacy Policy applies specifically to Customers using the Panditoo Customer Application, website, and related services (\"Platform\")."
  },
  {
    id: "collect",
    heading: "2. INFORMATION WE COLLECT",
    content: "Depending on your use of the Platform, we may collect the following information:",
    subsections: [
      { title: "2.1 Account Information", text: "When you create an account, we may collect: Full name, Mobile number, Email address, Profile photograph (where provided), OTP/authentication information, Account preferences, and Communication preferences." },
      { title: "2.2 Booking Information", text: "When you make a booking, we may collect: Selected service, Booking date and time, Service address, Number of participants (where relevant), Puja/service requirements, Special instructions, Booking status, Cancellation information, and Service history." },
      { title: "2.3 Location Information", text: "With your permission, Panditoo may access your device location to identify your service location, show relevant Pandits, facilitate bookings, assist with service coordination, and provide location-based functionality. You may disable location permissions at any time through your device or browser settings." },
      { title: "2.4 Payment Information", text: "When you make a payment through Panditoo, we process: Transaction ID, Payment amount, Payment status, Payment method, Refund status, and Payment reference information. Payments are processed securely through third-party payment gateways (such as Razorpay). Panditoo generally does not store complete card numbers, CVV, or complete payment credentials." },
      { title: "2.5 Communication Information", text: "If you contact us or communicate with a Pandit through the Platform, we may process relevant messages, support requests, communication records, booking-related communications, and complaint information." },
      { title: "2.6 Reviews and Feedback", text: "If you submit ratings, reviews, photographs, videos, or feedback, Panditoo may collect and use such content for Platform operations, service quality maintenance, and customer experience improvement." }
    ]
  },
  {
    id: "device",
    heading: "3. DEVICE AND TECHNICAL INFORMATION",
    content: "We may automatically collect information such as: Device type, Operating system, App version/browser type, IP address, Device or installation identifiers, Network information, Crash reports, Technical logs, and Performance information. This information is used to maintain security, troubleshoot technical issues, and improve the Platform."
  },
  {
    id: "use",
    heading: "4. HOW WE USE CUSTOMER INFORMATION",
    content: "Panditoo uses customer information for explicit operational and compliance goals:",
    list: [
      "Account & Authentication: Create and manage your account, verify mobile numbers, authenticate access, and provide account support.",
      "Booking & Service Delivery: Process bookings, match suitable Pandits, share necessary booking details with assigned Pandits, coordinate service delivery, and send confirmations.",
      "Payments: Process payments, verify transactions, process refunds, and resolve payment disputes.",
      "Customer Support: Respond to queries, resolve complaints, investigate booking issues, and provide after-sales support.",
      "Safety & Fraud Prevention: Detect fraudulent activity, prevent fake bookings, protect Customers and Pandits, and investigate platform misuse.",
      "Platform Improvement: Analyse usage, improve features, fix technical issues, and develop new services.",
      "Marketing: Send promotional offers and discounts (where permitted by applicable law). You may opt out of promotional communications at any time."
    ]
  },
  {
    id: "shared-pandits",
    heading: "5. INFORMATION SHARED WITH PANDITS",
    content: "To facilitate a Booking, Panditoo shares relevant Customer information with the assigned or selected Pandit, including: Customer name, Service address, Booking date and time, Relevant contact information, Service requirements, and Special instructions necessary for performing the ceremony."
  },
  {
    id: "shared-third-parties",
    heading: "6. INFORMATION SHARED WITH THIRD PARTIES",
    content: "Panditoo may share necessary information with trusted third parties to run the Platform, including:\n• Payment gateways (e.g. Razorpay)\n• Cloud and hosting infrastructure providers\n• Communication, SMS, and OTP delivery services\n• Maps and location API providers\n• Customer support and analytics tools\n• Cybersecurity and audit providers\n• Government or regulatory authorities where legally required under Indian law."
  },
  {
    id: "reviews",
    heading: "7. CUSTOMER REVIEWS",
    content: "Customer reviews and ratings may be displayed publicly on the Platform. You should not include private contact details, financial credentials, passwords, OTPs, or sensitive personal data in public reviews."
  },
  {
    id: "retention",
    heading: "8. DATA RETENTION",
    content: "Panditoo retains Customer information for as long as reasonably necessary for providing services, maintaining booking history, customer support, payment reconciliation, fraud prevention, legal and tax compliance under Indian law, dispute resolution, and security."
  },
  {
    id: "security",
    heading: "9. DATA SECURITY",
    content: "Panditoo employs technical and organisational security measures to protect Customer information against unauthorized access, loss, misuse, or alteration. You remain responsible for keeping your login credentials and OTPs confidential."
  },
  {
    id: "marketing",
    heading: "10. MARKETING COMMUNICATIONS",
    content: "Where permitted, Panditoo may send promotional updates. You may opt out at any time through account preferences or support requests. Essential operational messages (booking confirmations, payment receipts, OTPs) will continue to be sent."
  },
  {
    id: "children",
    heading: "11. CHILDREN'S DATA",
    content: "The Platform is intended for use by adults (18 years of age or older). Minors should only use the Platform under parental or guardian supervision."
  },
  {
    id: "rights",
    heading: "12. YOUR PRIVACY RIGHTS",
    content: "Subject to applicable laws, you have rights to request access to your personal data, request correction of inaccurate data, request account/data deletion, withdraw consent, or submit a privacy grievance by contacting our Privacy team."
  },
  {
    id: "requests",
    heading: "13. PRIVACY REQUESTS",
    content: "To exercise privacy rights or request account deletion, contact:\nEmail: panditoo.official@gmail.com\nSupport Email: panditoo.official@gmail.com"
  },
  {
    id: "grievance",
    heading: "14. GRIEVANCE OFFICER",
    content: "In accordance with the Information Technology Act, 2000 and rules made thereunder, the details of the Grievance Officer are:\n\nName: Ashutosh & Piyush | Co-Founders & CEOs\nDesignation: Nodal & Grievance Officer\nEmail: panditoo.official@gmail.com\nPhone: +91 916647714\nAddress: Panditoo, Registered Office, Indore, Madhya Pradesh, India"
  },
  {
    id: "changes",
    heading: "15. CHANGES TO THIS POLICY",
    content: "Panditoo may update this Privacy Policy periodically. The revised policy will be posted on the Platform with an updated Effective Date."
  },
  {
    id: "governing-law",
    heading: "16. GOVERNING LAW",
    content: "This Privacy Policy is governed by the laws of India. Courts in Indore, Madhya Pradesh shall have jurisdiction over legal disputes."
  },
  {
    id: "contact",
    heading: "17. CONTACT US",
    content: "Panditoo (Operated by: Pandito)\nRegistered Office: Indore, Madhya Pradesh, India\nPrivacy Email: panditoo.official@gmail.com\nCustomer Support: panditoo.official@gmail.com | Phone: +91 916647714\nGrievance Officer: Ashutosh & Piyush | Co-Founders & CEOs"
  }
];

export const TERMS_CONDITIONS_SECTIONS = [
  {
    heading: "1. ELIGIBILITY AND ACCEPTANCE",
    content: "By registering, accessing or using Panditoo, you represent that you are at least 18 years of age and legally competent to enter into binding agreements under Indian law. Using the Platform constitutes full acceptance of these Terms."
  },
  {
    heading: "2. MARKETPLACE PLATFORM ROLE",
    content: "Panditoo is a technology marketplace connecting customers with independent pandit service providers. Panditoo facilitates discovery, booking, pricing transparency, and secure payment processing, but does not itself perform religious rituals unless explicitly specified."
  },
  {
    heading: "3. CUSTOMER RESPONSIBILITIES",
    content: "Customers must provide accurate ceremony details, location address, safe access for pandits, and timely payment. Any unlawful, unsafe, or abusive demand toward pandit partners is strictly prohibited."
  },
  {
    heading: "4. PANDIT PARTNER RESPONSIBILITIES",
    content: "Independent pandits must present truthful credentials, perform accepted bookings with diligence and respect for tradition, maintain punctuality, and adhere to platform safety standards."
  },
  {
    heading: "5. NATURE OF RELIGIOUS SERVICES",
    content: "Ritual traditions and Vidhi practices vary by regional and family customs. Panditoo makes no guarantee regarding specific personal, spiritual, or astrological outcomes."
  },
  {
    heading: "6. PRICING AND PAYMENTS",
    content: "All booking prices, applicable platform fees, prepayments, and balance amounts are displayed prior to booking confirmation. Payments are processed securely via integrated gateways (Razorpay)."
  },
  {
    heading: "7. CANCELLATION AND REFUNDS",
    content: "Cancellations and refunds are governed by the specific booking rules displayed at checkout. Customers can request eligible cancellations directly through their account dashboard."
  },
  {
    heading: "8. PROHIBITED CONDUCT & SAFETY",
    content: "Fraud, fake bookings, unauthorized data collection, off-platform payment side-stepping, harassment, and violation of Indian laws will result in immediate account termination."
  },
  {
    heading: "9. ACCOUNT DELETION & DATA CONTROL",
    content: "Users may request permanent deletion of their account and associated profile data at any time under our Privacy Policy."
  },
  {
    heading: "10. GOVERNING LAW & JURISDICTION",
    content: "These Terms are governed by Indian law. Disputes shall be subject to the exclusive jurisdiction of competent courts located at Indore, Madhya Pradesh."
  }
];

export function PrivacyPolicyPage({ navigate, authed, logout }) {
  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to permanently delete your Panditoo account? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("panditoo-token");
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete account");
      alert("Your account has been deleted.");
      if (logout) logout();
      else {
        localStorage.removeItem("panditoo-token");
        localStorage.removeItem("panditoo-user-id");
        navigate("/");
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  return (
    <main className="legal-standalone-page">
      <section className="legal-hero">
        <div className="legal-hero-badge">OFFICIAL PRIVACY POLICY</div>
        <h1>Panditoo Customer <em>Privacy Policy</em></h1>
        <p className="legal-meta">
          Effective Date: <strong>{POLICY_METADATA.effectiveDate}</strong> · Last Updated: <strong>{POLICY_METADATA.lastUpdated}</strong> · Version: <strong>{POLICY_METADATA.version}</strong>
        </p>
      </section>

      <div className="legal-container">
        <aside className="legal-sidebar">
          <h3>Table of Contents</h3>
          <ul>
            {PRIVACY_POLICY_SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a href={`#${sec.id}`}>{sec.heading}</a>
              </li>
            ))}
          </ul>

          <div className="legal-side-box">
            <h4>Privacy Contact</h4>
            <p>Email: <strong>{POLICY_METADATA.privacyEmail}</strong></p>
            <p>Phone: <strong>{POLICY_METADATA.phone}</strong></p>
            <p>Office: {POLICY_METADATA.office}</p>
          </div>
        </aside>

        <article className="legal-content">
          <div className="legal-intro-callout">
            <p>
              This Privacy Policy explains how <strong>{POLICY_METADATA.operator}</strong>, operating under the brand name <strong>"{POLICY_METADATA.brand}"</strong>, collects, uses, stores, processes, and protects personal information of customers using our application, website, and services.
            </p>
          </div>

          {PRIVACY_POLICY_SECTIONS.map((sec) => (
            <section id={sec.id} key={sec.id} className="policy-block">
              <h2>{sec.heading}</h2>
              {sec.content && <p className="pre-line">{sec.content}</p>}

              {sec.subsections && sec.subsections.map((sub, idx) => (
                <div key={idx} className="policy-subblock">
                  <h3>{sub.title}</h3>
                  <p>{sub.text}</p>
                </div>
              ))}

              {sec.list && (
                <ul className="policy-bullets">
                  {sec.list.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {authed && (
            <div className="account-delete-callout">
              <div>
                <h3>Account & Data Controls</h3>
                <p>You have the right to request permanent deletion of your profile, saved addresses, and account history.</p>
              </div>
              <button className="delete-acc-btn" onClick={handleDeleteAccount}>
                Permanently Delete My Account
              </button>
            </div>
          )}

          <div className="legal-nav-footer">
            <button className="button gold" onClick={() => navigate("/poojas")}>
              Explore Ceremonies →
            </button>
            <button className="button outline" onClick={() => navigate("/terms")}>
              View Terms & Conditions
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}

export function TermsConditionsPage({ navigate }) {
  return (
    <main className="legal-standalone-page">
      <section className="legal-hero">
        <div className="legal-hero-badge">TERMS OF SERVICE</div>
        <h1>Customer <em>Terms & Conditions</em></h1>
        <p className="legal-meta">
          Effective Date: <strong>{POLICY_METADATA.effectiveDate}</strong> · Version: <strong>{POLICY_METADATA.version}</strong>
        </p>
      </section>

      <div className="legal-container narrow-legal">
        <article className="legal-content">
          <div className="legal-intro-callout">
            <p>
              These Terms & Conditions govern your access to and use of <strong>Panditoo</strong> marketplace services. By using our website or mobile application, you enter into a legally binding agreement with Panditoo.
            </p>
          </div>

          {TERMS_CONDITIONS_SECTIONS.map((sec, idx) => (
            <section key={idx} className="policy-block">
              <h2>{sec.heading}</h2>
              <p>{sec.content}</p>
            </section>
          ))}

          <div className="legal-nav-footer">
            <button className="button gold" onClick={() => navigate("/privacy")}>
              View Privacy Policy →
            </button>
            <button className="button outline" onClick={() => navigate("/")}>
              Return to Home Page
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}
