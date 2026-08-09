import React, { useEffect, useMemo, useState } from "react";
import { api, money, token } from "./api";
import { sendFirebaseOtp } from "./firebase";
import "./card-interactions.css";
import {
  CustomerBookingFlow,
  CustomerBookings,
  CustomerProfile,
} from "./CustomerFeatures";

const POLICY_VERSION = "2026-08-09";
const icons = { home: "⌂", explore: "✦", bookings: "▣", profile: "◉" };
const expectations = [
  [
    "Understand the ceremony, duration and payment schedule before you confirm anything.",
    "Clarity from the start",
    "Transparent booking details",
  ],
  [
    "Review relevant experience and specialisations before choosing your pandit preference.",
    "Guidance you can evaluate",
    "Provider information",
  ],
  [
    "Follow ceremony status and important updates from one calm, organised account.",
    "Support beyond booking",
    "One connected journey",
  ],
];
const legal = {
  terms: [
    "Customer Terms & Conditions",
    "Panditoo is a technology marketplace connecting adult customers with independent pandit providers. Operated by Panditoo (Indore, Madhya Pradesh). You must provide accurate booking information and a safe, lawful venue. Prices, payment timing, cancellation and refund terms shown before confirmation apply to the booking. Providers must supply truthful credentials, perform accepted services with reasonable care and protect customer information. Verification is not a guarantee of availability or a religious outcome. Misuse, fraud, harassment, payment evasion and unlawful conduct are prohibited. Mandatory Indian consumer rights are preserved. Disputes are subject to courts/tribunals located at Indore, Madhya Pradesh. Contact: panditoo.official@gmail.com | Phone: +91 9407474774, +91 9166477214.",
  ],
  privacy: [
    "Customer Privacy Policy",
    "Panditoo (Indore, Madhya Pradesh) uses account, booking, location, payment-reference and support information to authenticate users, arrange ceremonies, process payments/refunds via Razorpay, prevent fraud, communicate updates and meet legal obligations under Indian law. Necessary information is shared with eligible or confirmed pandits and contracted providers (hosting, OTP, payment, SMS). We do not sell personal data. You may request access, correction, erasure, consent withdrawal or grievance redressal by emailing panditoo.official@gmail.com or contacting our Nodal & Grievance Officer at +91 9407474774. Financial, booking and dispute records are retained as required by Indian law.",
  ],
};

export const refFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref") || params.get("referral") || params.get("referral_code") || params.get("code");
    if (code) {
      const clean = code.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (clean) {
        localStorage.setItem("panditoo-ref", clean);
        return clean;
      }
    }
  } catch (_) {}
  return localStorage.getItem("panditoo-ref") || "";
};
const niceDate = (value) => {
  if (!value) return "—";
  try {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return "—";
      return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    let str = String(value).trim();
    if (str.includes("T")) str = str.split("T")[0];
    else if (str.includes(" ")) str = str.split(" ")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const d = new Date(`${str}T00:00:00`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      }
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    return "—";
  } catch (_) {
    return "—";
  }
};
const scrollToId = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Brand({ inverse = false }) {
  return (
    <div className={`brand ${inverse ? "inverse" : ""}`}>
      <span className="brand-mark">ॐ</span>
      <span>
        <b>PANDITOO</b>
        <small>Sacredly arranged</small>
      </span>
    </div>
  );
}
function Loader({ full = false }) {
  return (
    <div className={`loader ${full ? "full-loader" : ""}`}>
      <i />
      Preparing your experience…
    </div>
  );
}
function Notice({ children, type = "error" }) {
  return children ? <div className={`notice ${type}`}>{children}</div> : null;
}
function ServiceUnavailable({ retry }) {
  return (
    <div className="service-unavailable">
      <span>ॐ</span>
      <div>
        <h3>Booking service is temporarily unavailable</h3>
        <p>
          We could not connect to the Panditoo backend. Start the API and
          database, then retry—no sample ceremony will be shown as bookable.
        </p>
      </div>
      <button className="button primary" onClick={retry}>
        Retry connection
      </button>
    </div>
  );
}

function PublicHeader({
  authed = false,
  profile = null,
  logout,
  onLogin,
  lang,
  setLang,
  navigate = (path) => {
    location.href = path;
  },
  subpage = false,
}) {
  const [open, setOpen] = useState(false);
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isActive = (route) => {
    if (route === "/dashboard") return path === "/dashboard";
    if (route === "/") return path === "/";
    if (route === "/poojas") return path === "/poojas" || path.startsWith("/pooja/");
    if (route === "/pandits") return path === "/pandits";
    if (route === "/how-it-works") return path === "/how-it-works";
    if (route === "/about") return path === "/about";
    return path === route;
  };
  const go = (p) => {
    navigate(p);
    setOpen(false);
  };
  return (
    <header className={`site-header ${subpage ? "subpage" : ""}`}>
      <button className="brand-button" onClick={() => go(authed ? "/dashboard" : "/")}>
        <Brand />
      </button>
      <button
        className="menu-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? "×" : "☰"}
      </button>
      <nav className={open ? "open" : ""}>
        {authed && (
          <button className={isActive("/dashboard") ? "active" : ""} onClick={() => go("/dashboard")}>
            Dashboard
          </button>
        )}
        <button className={isActive("/poojas") ? "active" : ""} onClick={() => go("/poojas")}>Ceremonies</button>
        <button className={isActive("/pandits") ? "active" : ""} onClick={() => go("/pandits")}>Find pandits</button>
        <button className={isActive("/how-it-works") ? "active" : ""} onClick={() => go("/how-it-works")}>How it works</button>
        <button className={isActive("/about") ? "active" : ""} onClick={() => go("/about")}>About us</button>
        <button
          className="language"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
        >
          {lang === "en" ? "हिं" : "EN"}
        </button>
        {authed ? (
          <div
            className="account-pill"
            onClick={() => go("/account")}
            style={{ cursor: "pointer", marginLeft: "12px" }}
          >
            <span>{profile?.name?.[0] || "U"}</span>
            <div>
              <b>{profile?.name || "Devotee"}</b>
              <small>My account</small>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (logout) logout();
                else go("/account");
              }}
              title="My Account"
            >
              ↗
            </button>
          </div>
        ) : (
          <button className="nav-login" onClick={onLogin}>
            Sign in
          </button>
        )}
        {!authed && (
          <button className="nav-book" onClick={() => go("/poojas")}>
            Book a pooja <span>↗</span>
          </button>
        )}
      </nav>
    </header>
  );
}

function PoojaCard({ pooja, index, onBook }) {
  const symbols = ["दीप", "श्री", "ॐ", "स्वस्ति", "शुभ", "मंगल"];
  const name = pooja.name || pooja.name_en;
  const openDetails = () => onBook(pooja);
  return (
    <article
      className="ceremony-card"
      role="link"
      tabIndex={0}
      aria-label={`View details for ${name}`}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
    >
      <div className="ceremony-art">
        <span>{symbols[index % symbols.length]}</span>
        <i>0{index + 1}</i>
      </div>
      <div className="ceremony-copy">
        <div className="card-kicker">AUTHENTIC VEDIC VIDHI</div>
        <h3>{name}</h3>
        <p>
          {pooja.description ||
            pooja.description_en ||
            "A complete traditional ceremony led by an experienced, verified pandit."}
        </p>
        <div className="ceremony-meta">
          <span>{pooja.duration_minutes || 90} min</span>
          <b>From {money(pooja.base_price)}</b>
        </div>
        <div className="ceremony-cta" aria-hidden="true">
          View & book <span>→</span>
        </div>
      </div>
    </article>
  );
}

function Landing({
  poojas,
  offers = [],
  onBook,
  onLogin,
  authed,
  profile,
  lang,
  setLang,
  openLegal,
  navigate,
  serviceError,
  retry,
}) {
  return (
    <div className="landing">
      <PublicHeader
        authed={authed}
        profile={profile}
        onLogin={onLogin}
        lang={lang}
        setLang={setLang}
        navigate={navigate}
      />
      <main>
        <section className="hero">
          <div className="hero-grain" />
          <div className="hero-content">
            <div className="hero-proof">
              <span>✦</span> BUILT FOR MEANINGFUL BEGINNINGS
            </div>
            <p className="hero-script">Parampara, with peace of mind.</p>
            <h1>
              Every sacred moment,
              <br />
              <em>beautifully arranged.</em>
            </h1>
            <p className="hero-sub">
              Book verified pandits for authentic poojas—thoughtfully matched,
              transparently priced and lovingly coordinated.
            </p>
            <div className="hero-actions">
              <button
                className="button gold"
                onClick={() => navigate("/poojas")}
              >
                Explore ceremonies <span>→</span>
              </button>
              <button
                className="button ghost"
                onClick={() => navigate("/how-it-works")}
              >
                <i>▷</i> See how it works
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <strong>✓</strong>
                <span>verified profiles</span>
              </div>
              <div>
                <strong>₹</strong>
                <span>clear pricing</span>
              </div>
              <div>
                <strong>♡</strong>
                <span>booking support</span>
              </div>
            </div>
          </div>
          <div className="hero-side-label">॥ शुभारम्भ ॥</div>
        </section>
        <section className="blessing-strip">
          <span>ॐ</span>
          <p>
            From a new home to a new beginning, find the right vidhi and the
            right guidance.
          </p>
          <span>ॐ</span>
        </section>
        {!!offers.length && (
          <section className="live-offers" aria-label="Current offers">
            {offers.slice(0, 3).map((offer) => (
              <article key={offer.id}>
                <span>LIVE OFFER</span>
                <div>
                  <b>{offer.title}</b>
                  <small>{offer.subtitle || "Automatically applied on eligible ceremony dates"}</small>
                </div>
                <button onClick={() => navigate("/poojas")}>Explore →</button>
              </article>
            ))}
          </section>
        )}
        <section className="section ceremonies" id="ceremonies">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">OUR SACRED SERVICES</p>
              <h2>
                Ceremonies for every
                <br />
                <em>auspicious beginning</em>
              </h2>
            </div>
            <p>
              Rooted in tradition. Arranged for today.
              <br />
              Each ceremony is performed with complete vidhi.
            </p>
          </div>
          {serviceError ? (
            <ServiceUnavailable retry={retry} />
          ) : (
            <>
              <div className="ceremony-grid">
                {poojas.slice(0, 6).map((p, i) => (
                  <PoojaCard key={p.id} pooja={p} index={i} onBook={onBook} />
                ))}
              </div>
              <button
                className="all-services"
                onClick={() => navigate("/poojas")}
              >
                Explore all ceremonies <span>→</span>
              </button>
            </>
          )}
        </section>
        <section className="process" id="process">
          <div className="process-intro">
            <p className="eyebrow light">EFFORTLESSLY SACRED</p>
            <h2>
              From intention
              <br />
              to <em>anushthan.</em>
            </h2>
            <p>
              We handle the coordination, so your family can stay present in the
              moment.
            </p>
            <div className="process-ornament">ॐ</div>
          </div>
          <div className="process-steps">
            {[
              [
                "01",
                "Choose your ceremony",
                "Explore poojas and understand the complete vidhi, duration and transparent price.",
              ],
              [
                "02",
                "Share your preferences",
                "Select a date, muhurat, language, location and any family traditions.",
              ],
              [
                "03",
                "Meet your pandit",
                "Choose from nearby verified pandits or let us thoughtfully match one.",
              ],
              [
                "04",
                "Welcome the sacred",
                "Pay securely, receive updates and experience your ceremony with peace of mind.",
              ],
            ].map(([n, t, d]) => (
              <div className="process-step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="section promise" id="promise">
          <div className="promise-visual">
            <div className="arch">
              <span>ॐ</span>
              <small>शुभं करोति कल्याणम्</small>
            </div>
          </div>
          <div className="promise-copy">
            <p className="eyebrow">THE PANDITOO PROMISE</p>
            <h2>
              Tradition deserves
              <br />
              <em>thoughtful care.</em>
            </h2>
            <p>
              Finding the right pandit should feel reassuring, not uncertain.
              Every detail is designed around trust, clarity and respect for
              your family’s traditions.
            </p>
            {[
              [
                "✓",
                "Verified, experienced pandits",
                "Identity, experience and specialisations are reviewed.",
              ],
              [
                "₹",
                "Clear, upfront pricing",
                "Know the ceremony fee and payment schedule before booking.",
              ],
              [
                "♡",
                "Respect for your traditions",
                "Share regional preferences, language and family customs.",
              ],
              [
                "♢",
                "Support at every step",
                "From booking to completion, help is always close by.",
              ],
            ].map(([i, t, d]) => (
              <div className="promise-item" key={t}>
                <i>{i}</i>
                <div>
                  <b>{t}</b>
                  <span>{d}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="stories section">
          <div className="section-heading centered">
            <p className="eyebrow">DESIGNED AROUND YOUR FAMILY</p>
            <h2>
              Less uncertainty.
              <br />
              <em>More presence.</em>
            </h2>
          </div>
          <div className="story-grid">
            {expectations.map(([copy, title, meta], i) => (
              <figure key={title}>
                <div className="stars">PANDITOO PROMISE</div>
                <blockquote>{copy}</blockquote>
                <figcaption>
                  <span>{i + 1}</span>
                  <div>
                    <b>{title}</b>
                    <small>{meta}</small>
                  </div>
                </figcaption>
                <i>0{i + 1}</i>
              </figure>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <p className="hero-script">A beautiful beginning awaits.</p>
          <h2>
            Bring peace to the planning.
            <br />
            <em>Keep devotion at the centre.</em>
          </h2>
          <button className="button gold" onClick={() => navigate("/poojas")}>
            Book your pooja <span>→</span>
          </button>
        </section>
      </main>
      <footer>
        <div className="footer-main">
          <div>
            <Brand inverse />
            <p>
              Authentic ceremonies. Trusted guidance.
              <br />
              Sacred moments, beautifully arranged.
            </p>
          </div>
          <div>
            <b>Discover</b>
            <button onClick={() => scrollToId("ceremonies")}>
              All ceremonies
            </button>
            <button onClick={() => scrollToId("process")}>How it works</button>
            <button onClick={() => scrollToId("promise")}>Why Panditoo</button>
          </div>
          <div>
            <b>Support</b>
            <button onClick={onLogin}>My account</button>
            <button onClick={() => openLegal("terms")}>
              Terms & conditions
            </button>
            <button onClick={() => openLegal("privacy")}>Privacy policy</button>
          </div>
          <div>
            <b>For pandits</b>
            <a href="#partner">Join as a pandit</a>
            <span>Serve devotees through a trusted digital platform.</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Panditoo. Made with श्रद्धा in India.</span>
          <span>Secure payments · Privacy first · Verified partners</span>
        </div>
      </footer>
    </div>
  );
}

function PublicPage({ children, authed, profile, onLogin, lang, setLang, navigate }) {
  return (
    <div className="public-page">
      <PublicHeader
        subpage
        authed={authed}
        profile={profile}
        onLogin={onLogin}
        lang={lang}
        setLang={setLang}
        navigate={navigate}
      />
      {children}
      <footer className="compact-footer">
        <Brand inverse />
        <span>Authentic ceremonies · Verified profiles · Secure booking</span>
        <button onClick={() => navigate("/")}>Back to home</button>
      </footer>
    </div>
  );
}

function PoojaCatalogue({ poojas, onView, serviceError, retry, ...shell }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("popular");
  const rows = useMemo(
    () =>
      poojas
        .filter((p) =>
          `${p.name || p.name_en} ${p.description || p.description_en}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "price"
            ? Number(a.base_price) - Number(b.base_price)
            : sort === "duration"
              ? Number(a.duration_minutes) - Number(b.duration_minutes)
              : 0,
        ),
    [poojas, q, sort],
  );
  return (
    <PublicPage {...shell}>
      <main className="market-page">
        <section className="market-hero">
          <p className="eyebrow">POOJA MARKETPLACE</p>
          <h1>
            Find a ceremony for
            <br />
            <em>every sacred milestone.</em>
          </h1>
          <p>
            Explore authentic vidhi, understand what is included and book with
            confidence.
          </p>
          <div className="market-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Satyanarayan, Griha Pravesh, Rudrabhishek…"
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="popular">Recommended</option>
              <option value="price">Price: low to high</option>
              <option value="duration">Shortest duration</option>
            </select>
          </div>
        </section>
        {serviceError ? (
          <ServiceUnavailable retry={retry} />
        ) : (
          <>
            <div className="results-head">
              <div>
                <b>{rows.length}</b> ceremonies available
              </div>
              <span>Live prices from Panditoo</span>
            </div>
            <div className="market-grid">
              {rows.map((p, i) => (
                <PoojaCard
                  key={p.id}
                  pooja={p}
                  index={i}
                  onBook={() => onView(p)}
                />
              ))}
            </div>
            {!rows.length && (
              <div className="empty-state">
                <span>ॐ</span>
                <h3>No matching ceremony found</h3>
                <p>Try another pooja name or browse all ceremonies.</p>
              </div>
            )}
          </>
        )}
      </main>
    </PublicPage>
  );
}

function PoojaDetail({ pooja, onBook, ...shell }) {
  if (!pooja)
    return (
      <PublicPage {...shell}>
        <div className="market-page">
          <div className="empty-state">
            <h3>Ceremony not found</h3>
            <button
              className="button primary"
              onClick={() => shell.navigate("/poojas")}
            >
              Browse ceremonies
            </button>
          </div>
        </div>
      </PublicPage>
    );
  const list = Array.isArray(pooja.samagri_list) ? pooja.samagri_list : [];
  return (
    <PublicPage {...shell}>
      <main className="detail-page">
        <div className="breadcrumbs">
          <button onClick={() => shell.navigate("/")}>Home</button> /{" "}
          <button onClick={() => shell.navigate("/poojas")}>Ceremonies</button>{" "}
          / <span>{pooja.name || pooja.name_en}</span>
        </div>
        <section className="detail-hero">
          <div className="detail-art">
            <div className="detail-arch">
              <span>ॐ</span>
              <small>सर्व मंगल मांगल्ये</small>
            </div>
          </div>
          <div className="detail-copy">
            <p className="eyebrow">COMPLETE VEDIC CEREMONY</p>
            <h1>{pooja.name || pooja.name_en}</h1>
            <p>
              {pooja.description ||
                pooja.description_en ||
                "A complete traditional ceremony performed with authentic mantras, thoughtful guidance and respect for your family traditions."}
            </p>
            <div className="detail-facts">
              <span>
                <small>DURATION</small>
                <b>{pooja.duration_minutes || 90} minutes</b>
              </span>
              <span>
                <small>STARTING FROM</small>
                <b>{money(pooja.base_price)}</b>
              </span>
              <span>
                <small>FORMAT</small>
                <b>At your location</b>
              </span>
            </div>
            <button
              className="button primary detail-book"
              onClick={() => onBook(pooja)}
            >
              Select date & book <span>→</span>
            </button>
            <small className="price-note">
              Final price and payment schedule are shown before confirmation.
            </small>
          </div>
        </section>
        <section className="detail-sections">
          <article>
            <p className="eyebrow">ABOUT THE CEREMONY</p>
            <h2>
              A meaningful ritual,
              <br />
              <em>carefully performed.</em>
            </h2>
            <p>
              {pooja.description ||
                pooja.description_en ||
                "Your pandit leads the ceremony step by step and explains the important rituals along the way."}
            </p>
            <ul>
              <li>Experienced pandit matching</li>
              <li>Complete mantra and vidhi guidance</li>
              <li>Language and tradition preferences</li>
              <li>Booking updates in your account</li>
            </ul>
          </article>
          <aside>
            <h3>Samagri information</h3>
            {list.length ? (
              <ul>
                {list.map((item, i) => (
                  <li key={i}>
                    {typeof item === "string"
                      ? item
                      : item.item_en || item.name_en || item.name || "Ceremony item"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                The required samagri list will be shared with your booking
                details. Confirm any regional preferences with the selected
                pandit.
              </p>
            )}
            <button onClick={() => onBook(pooja)}>Continue to booking →</button>
          </aside>
        </section>
      </main>
    </PublicPage>
  );
}

function HowItWorks(shell) {
  const steps = [
    [
      "01",
      "Discover",
      "Search ceremonies and review duration, purpose and live pricing.",
    ],
    [
      "02",
      "Personalise",
      "Choose your preferred date, time, address and pandit preferences.",
    ],
    [
      "03",
      "Confirm",
      "Review the exact payment schedule and pay securely through Razorpay.",
    ],
    [
      "04",
      "Experience",
      "Track confirmation and ceremony updates from your Panditoo account.",
    ],
  ];
  return (
    <PublicPage {...shell}>
      <main className="editorial-page">
        <section className="editorial-hero">
          <p className="eyebrow">HOW PANDITOO WORKS</p>
          <h1>
            A calmer way to arrange
            <br />
            <em>sacred ceremonies.</em>
          </h1>
          <p>
            Built like a modern marketplace, grounded in respect for tradition.
          </p>
        </section>
        <section className="editorial-steps">
          {steps.map(([n, t, d]) => (
            <article key={n}>
              <span>{n}</span>
              <h2>{t}</h2>
              <p>{d}</p>
            </article>
          ))}
        </section>
        <section className="editorial-cta">
          <h2>Ready to find your ceremony?</h2>
          <button
            className="button gold"
            onClick={() => shell.navigate("/poojas")}
          >
            Explore poojas →
          </button>
        </section>
      </main>
    </PublicPage>
  );
}

function About(shell) {
  return (
    <PublicPage {...shell}>
      <main className="editorial-page">
        <section className="editorial-hero about">
          <p className="eyebrow">OUR PURPOSE</p>
          <h1>
            Technology in service
            <br />
            of <em>tradition.</em>
          </h1>
          <p>
            Panditoo brings discovery, transparent information, secure booking
            and trusted coordination into one respectful experience.
          </p>
        </section>
        <section className="about-grid">
          <article>
            <span>ॐ</span>
            <h2>Why we exist</h2>
            <p>
              Families should be able to arrange important ceremonies without
              uncertainty around availability, communication or pricing.
            </p>
          </article>
          <article>
            <span>✦</span>
            <h2>What we protect</h2>
            <p>
              Regional practices, languages and family traditions matter. The
              platform helps customers communicate them clearly.
            </p>
          </article>
          <article>
            <span>♡</span>
            <h2>What we improve</h2>
            <p>
              Better discovery, accountable booking records and clear
              information for both devotees and independent pandits.
            </p>
          </article>
        </section>
      </main>
    </PublicPage>
  );
}

function PanditDiscovery(shell) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locate = () => {
    setBusy(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Location is not supported in this browser.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const r = await api(
            `/pandits/nearby?lat=${p.coords.latitude}&lng=${p.coords.longitude}&radius=50`,
          );
          setRows(r.data || []);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      },
      () => {
        setError("Allow location access to find nearby pandits.");
        setBusy(false);
      },
    );
  };
  return (
    <PublicPage {...shell}>
      <main className="market-page">
        <section className="market-hero pandit-market">
          <p className="eyebrow">PANDIT DISCOVERY</p>
          <h1>
            Trusted guidance,
            <br />
            <em>closer to home.</em>
          </h1>
          <p>
            Use your location to discover active pandit profiles serving your
            area.
          </p>
          <button className="button gold" onClick={locate} disabled={busy}>
            {busy ? "Finding nearby pandits…" : "⌖ Find pandits near me"}
          </button>
        </section>
        <Notice>{error}</Notice>
        <div className="pandit-market-grid">
          {rows.map((p) => (
            <article key={p.id}>
              <span>{p.name?.[0] || "P"}</span>
              <div>
                <p>VERIFIED PROFILE</p>
                <h3>{p.name}</h3>
                <small>
                  {p.experience_years || 0} years experience ·{" "}
                  {Number(p.distance_km || 0).toFixed(1)} km away
                </small>
                <div>
                  {(p.specializations || []).slice(0, 3).map((x) => (
                    <i key={x}>{x}</i>
                  ))}
                </div>
              </div>
              <button onClick={() => shell.navigate("/poojas")}>
                View ceremonies →
              </button>
            </article>
          ))}
        </div>
        {!rows.length && !busy && (
          <div className="empty-state">
            <span>⌖</span>
            <h3>Discover pandits serving your location</h3>
            <p>Location is used only to calculate nearby availability.</p>
          </div>
        )}
      </main>
    </PublicPage>
  );
}

function AuthModal({ close, done, openLegal }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const referral = refFromUrl();
  const act = async () => {
    setBusy(true);
    setError("");
    try {
      if (step === "phone") {
        if (["9999999999", "9876543210"].includes(phone)) {
          const res = await api("/auth/user/send-otp", { method: "POST", body: { phone } });
          if (res && (res.debugOtp || res.otp)) {
            setError(`✓ OTP Sent! Code: ${res.debugOtp || res.otp}`);
          }
          setStep("otp");
        } else {
          try {
            await sendFirebaseOtp(phone, "recaptcha-container");
            setError(`✓ Firebase SMS sent to +91 ${phone}. Please check your phone.`);
            setStep("otp");
          } catch (fbErr) {
            console.warn("Firebase OTP error, fallback to backend:", fbErr.message);
            const res = await api("/auth/user/send-otp", { method: "POST", body: { phone } });
            if (res && (res.debugOtp || res.otp)) {
              setError(`✓ OTP Sent! Code: ${res.debugOtp || res.otp}`);
            } else {
              setError(`✓ OTP Sent! (If SMS delayed, check server log).`);
            }
            setStep("otp");
          }
        }
      } else if (step === "otp") {
        if (["9999999999", "9876543210"].includes(phone) || !window.confirmationResult) {
          const r = await api("/auth/user/verify-otp", {
            method: "POST",
            body: { phone, otp },
          });
          if (r.isNewUser) setStep("register");
          else {
            localStorage.setItem("panditoo-token", r.token);
            localStorage.setItem("panditoo-user-id", r.user.id);
            done();
          }
        } else {
          try {
            const userCred = await window.confirmationResult.confirm(otp);
            const idToken = await userCred.user.getIdToken();
            const r = await api("/auth/verify-firebase", {
              method: "POST",
              body: { idToken, actorType: "user" },
            });
            if (r.isNewUser) setStep("register");
            else {
              localStorage.setItem("panditoo-token", r.token);
              localStorage.setItem("panditoo-user-id", r.user.id);
              done();
            }
          } catch (fbVerErr) {
            console.warn("Firebase confirmation error, fallback to backend verify:", fbVerErr.message);
            const r = await api("/auth/user/verify-otp", {
              method: "POST",
              body: { phone, otp },
            });
            if (r.isNewUser) setStep("register");
            else {
              localStorage.setItem("panditoo-token", r.token);
              localStorage.setItem("panditoo-user-id", r.user.id);
              done();
            }
          }
        }
      } else {
        if (!accepted)
          throw new Error("Please accept the policies to create your account.");
        const r = await api("/auth/user/register", {
          method: "POST",
          body: {
            ...form,
            phone,
            referral_code: referral || undefined,
            source: referral ? "web-referral" : "web",
            terms_accepted: true,
            privacy_accepted: true,
            terms_version: POLICY_VERSION,
            privacy_version: POLICY_VERSION,
          },
        });
        localStorage.setItem("panditoo-token", r.token);
        localStorage.setItem("panditoo-user-id", r.user.id);
        done();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <div className="auth-modal">
        <button className="modal-close" onClick={close}>
          ×
        </button>
        <div className="auth-visual">
          <Brand inverse />
          <div>
            <p className="hero-script">Your sacred journey</p>
            <h2>
              Guidance you can trust.
              <br />
              Traditions you cherish.
            </h2>
            <span>Verified pandits · Transparent pricing · Secure booking</span>
          </div>
        </div>
        <div className="auth-panel">
          <p className="eyebrow">
            {step === "register"
              ? "ONE LAST STEP"
              : step === "otp"
                ? "SECURE VERIFICATION"
                : "WELCOME TO PANDITOO"}
          </p>
          <h2>
            {step === "register"
              ? "Create your profile"
              : step === "otp"
                ? "Enter your OTP"
                : "Sign in to continue"}
          </h2>
          <p>
            {step === "otp"
              ? `We sent a 6-digit code to +91 ${phone}`
              : "Use your mobile number to access bookings and personalised services."}
          </p>
          <Notice>{error}</Notice>
          {step === "phone" && (
            <label>
              Mobile number
              <div className="phone-field">
                <b>+91</b>
                <input
                  inputMode="numeric"
                  maxLength="10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                />
              </div>
            </label>
          )}
          {step === "otp" && (
            <label>
              6-digit OTP
              <input
                className="field otp"
                inputMode="numeric"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
              />
            </label>
          )}
          {step === "register" && (
            <div className="form-grid">
              <label>
                Full name *
                <input
                  className="field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="wide">
                Address
                <input
                  className="field"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>
              {referral && (
                <div className="ref-tag wide">
                  ✓ Referral {referral} applied
                </div>
              )}
              <label className="consent wide">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>
                  I am 18+, accept the{" "}
                  <button type="button" onClick={() => openLegal("terms")}>
                    Terms & Conditions
                  </button>{" "}
                  and consent to processing under the{" "}
                  <button type="button" onClick={() => openLegal("privacy")}>
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>
          )}
          <button
            className="button primary wide-button"
            disabled={
              busy ||
              (step === "phone" && phone.length !== 10) ||
              (step === "otp" && otp.length !== 6) ||
              (step === "register" && (!form.name || !accepted))
            }
            onClick={act}
          >
            {busy
              ? "Please wait…"
              : step === "phone"
                ? "Send secure OTP"
                : step === "otp"
                  ? "Verify & continue"
                  : "Create my account"}{" "}
            <span>→</span>
          </button>
          {step !== "phone" && (
            <button className="change-number" onClick={() => setStep("phone")}>
              Change mobile number
            </button>
          )}
          <small className="secure-note">
            ▣ Your information is protected and securely transmitted.
          </small>
          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  );
}

function LegalModal({ type, close, logout }) {
  const [title, copy] = legal[type];
  const handleDelete = async () => {
    if (!confirm("Permanently delete your Panditoo account? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("panditoo_token");
      await fetch("/api/auth/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      close();
      if (logout) logout();
      else window.location.reload();
    } catch (e) {
      alert("Failed to delete account: " + e.message);
    }
  };
  return (
    <div className="modal-backdrop">
      <article className="legal-modal">
        <button className="modal-close" onClick={close}>
          ×
        </button>
        <p className="eyebrow">VERSION {POLICY_VERSION}</p>
        <h2>{title}</h2>
        <p>{copy}</p>
        {type === "privacy" && (
          <div style={{ marginTop: "20px", padding: "16px", background: "#fdf5f4", borderRadius: "8px", border: "1px dashed #e8b8b4" }}>
            <b style={{ color: "#7a3e39", display: "block", marginBottom: "4px" }}>Account & Data Deletion</b>
            <p style={{ fontSize: "12px", color: "#8a524d", margin: "0 0 12px" }}>
              You have the right to request permanent deletion of your profile and booking records under our privacy rules.
            </p>
            <button
              style={{ background: "#a33a31", color: "#fff", border: 0, padding: "8px 14px", borderRadius: "4px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
              onClick={handleDelete}
            >
              Permanently delete my account
            </button>
          </div>
        )}
        <p style={{ marginTop: "16px" }}>
          This in-app summary must be completed with the verified legal entity,
          registered address, grievance officer, contact details and final
          commercial rules before public launch.
        </p>
        <button className="button primary" onClick={close}>
          I understand
        </button>
      </article>
    </div>
  );
}

function AppHeader({ navigate, profile, logout, lang, setLang }) {
  return (
    <PublicHeader
      authed={true}
      profile={profile}
      logout={logout}
      lang={lang}
      setLang={setLang}
      navigate={navigate}
      subpage={true}
    />
  );
}
function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="dashboard-title">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action && <button onClick={action}>View all →</button>}
    </div>
  );
}

function DashboardHome({ data, navigate, onBook }) {
  const active = data.bookings.find((b) =>
    ["pending", "confirmed"].includes(b.status),
  );
  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p>नमस्ते, {data.profile?.name?.split(" ")[0]}</p>
          <h1>
            Let’s plan something
            <br />
            <em>sacred today.</em>
          </h1>
          <button className="button gold" onClick={() => navigate("/poojas")}>
            Book a ceremony →
          </button>
        </div>
      </section>
      {active && (
        <section>
          <SectionTitle eyebrow="UPCOMING" title="Your next ceremony" />
          <article className="upcoming">
            <div className="date-tile">
              <b>{niceDate(active.booking_date).split(" ")[0]}</b>
              <span>{niceDate(active.booking_date).split(" ")[1]}</span>
            </div>
            <div>
              <h3>{active.pooja_name_en || "Pooja ceremony"}</h3>
              <p>
                {niceDate(active.booking_date)} ·{" "}
                {String(active.booking_time || "").slice(0, 5)}
              </p>
            </div>
            <span className={`status ${active.status}`}>{active.status}</span>
            <button onClick={() => navigate("/bookings")}>
              View details →
            </button>
          </article>
        </section>
      )}
      <section>
        <SectionTitle
          eyebrow="POPULAR WITH DEVOTEES"
          title="Sacred ceremonies"
          action={() => navigate("/poojas")}
        />
        <div className="dashboard-cards">
          {data.poojas.slice(0, 3).map((p, i) => (
            <PoojaCard pooja={p} index={i} onBook={onBook} key={p.id} />
          ))}
        </div>
      </section>
      <section className="dashboard-trust">
        <div>
          <i>✓</i>
          <b>Verified pandits</b>
          <span>Identity and experience reviewed</span>
        </div>
        <div>
          <i>₹</i>
          <b>Transparent prices</b>
          <span>Know what you pay before booking</span>
        </div>
        <div>
          <i>♢</i>
          <b>Secure payment</b>
          <span>Protected online transactions</span>
        </div>
      </section>
    </div>
  );
}
function Explore({ poojas, onBook }) {
  const [q, setQ] = useState("");
  const rows = useMemo(
    () =>
      poojas.filter((p) =>
        `${p.name || p.name_en} ${p.description || p.description_en}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [poojas, q],
  );
  return (
    <div className="dashboard-page">
      <div className="catalogue-head">
        <p>POOJA & CEREMONIES</p>
        <h1>
          Find the right <em>ceremony.</em>
        </h1>
        <span>Authentic rituals, thoughtfully arranged for your family.</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="⌕  Search ceremonies…"
        />
      </div>
      <div className="dashboard-cards catalogue">
        {rows.map((p, i) => (
          <PoojaCard pooja={p} index={i} onBook={onBook} key={p.id} />
        ))}
      </div>
    </div>
  );
}
function Bookings({ rows, reload }) {
  const cancel = async (id) => {
    if (!confirm("Cancel this pending booking?")) return;
    try {
      await api(`/bookings/${id}/cancel`, {
        method: "PATCH",
        auth: true,
        body: { reason: "other", note: "Cancelled by customer from web" },
      });
      reload();
    } catch (e) {
      alert(e.message);
    }
  };
  return (
    <div className="dashboard-page narrow">
      <div className="catalogue-head">
        <p>YOUR SACRED CALENDAR</p>
        <h1>
          My <em>bookings.</em>
        </h1>
        <span>Track every upcoming and completed ceremony.</span>
      </div>
      <div className="booking-list">
        {rows.length ? (
          rows.map((b) => (
            <article className="booking" key={b.id || b.booking_id}>
              <div className="booking-icon">ॐ</div>
              <div>
                <span className={`status ${b.status}`}>{b.status}</span>
                <h3>{b.pooja_name_en || b.pooja_name || "Pooja ceremony"}</h3>
                <p>
                  {niceDate(b.booking_date)} ·{" "}
                  {String(b.booking_time || "").slice(0, 5)}
                </p>
                <small>
                  #
                  {String(b.id || b.booking_id)
                    .slice(0, 8)
                    .toUpperCase()}
                </small>
              </div>
              <div className="booking-price">
                <b>{money(b.total_price)}</b>
                {b.status === "pending" && (
                  <button onClick={() => cancel(b.id || b.booking_id)}>
                    Cancel
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <span>ॐ</span>
            <h3>Your sacred calendar is waiting.</h3>
            <p>Once you book a ceremony, every update will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
function Profile({ profile, reload, logout, openLegal }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile || {});
  useEffect(() => setForm(profile || {}), [profile]);
  const save = async () => {
    await api("/auth/me", {
      method: "PATCH",
      auth: true,
      body: { name: form.name, email: form.email, address: form.address },
    });
    setEditing(false);
    reload();
  };
  return (
    <div className="dashboard-page narrow">
      <div className="profile-banner">
        <span>{profile?.name?.[0] || "U"}</span>
        <div>
          <p>MY PANDITOO ACCOUNT</p>
          <h1>{profile?.name}</h1>
          <small>+91 {profile?.phone}</small>
        </div>
        <button onClick={() => setEditing(!editing)}>
          {editing ? "Cancel" : "Edit profile"}
        </button>
      </div>
      <section className="profile-box">
        <SectionTitle eyebrow="PERSONAL DETAILS" title="Your information" />
        {editing ? (
          <div className="form-grid">
            <label>
              Name
              <input
                className="field"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                className="field"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="wide">
              Address
              <input
                className="field"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <button className="button primary" onClick={save}>
              Save changes
            </button>
          </div>
        ) : (
          <div className="detail-rows">
            <span>
              Email <b>{profile?.email || "Not added"}</b>
            </span>
            <span>
              Address <b>{profile?.address || "Not added"}</b>
            </span>
          </div>
        )}
      </section>
      <section className="profile-links">
        <button onClick={() => openLegal("terms")}>
          <span>§</span>
          <div>
            <b>Terms & Conditions</b>
            <small>Service rules and responsibilities</small>
          </div>
          →
        </button>
        <button onClick={() => openLegal("privacy")}>
          <span>♢</span>
          <div>
            <b>Privacy Policy</b>
            <small>How your information is handled</small>
          </div>
          →
        </button>
      </section>
      <button className="signout" onClick={logout}>
        Sign out of Panditoo
      </button>
    </div>
  );
}

function BookingFlow({ pooja, close, refresh }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState(null);
  const [pandits, setPandits] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({
    date: "",
    time: "",
    address: "",
    lat: 22.7196,
    lng: 75.8577,
    coupon: "",
  });
  const [quote, setQuote] = useState(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/booking-config").then((r) => setConfig(r.data));
    api("/auth/me", { auth: true })
      .then((r) =>
        setRef(r.user?.referral_eligible ? r.user.referral_code || "" : ""),
      )
      .catch(() => {});
    navigator.geolocation?.getCurrentPosition((pos) =>
      setForm((f) => ({
        ...f,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      })),
    );
  }, []);
  useEffect(() => {
    if (step === 2)
      api(`/pandits/nearby?lat=${form.lat}&lng=${form.lng}&radius=50`)
        .then((r) => setPandits(r.data || []))
        .catch(() => setPandits([]));
  }, [step]);
  const getQuote = async (coupon = form.coupon) => {
    const r = await api("/pricing/quote", {
      method: "POST",
      body: {
        pooja_type_id: pooja.id,
        booking_date: form.date,
        coupon_code: coupon || undefined,
        referral_code: ref || undefined,
      },
    });
    setQuote(r.data);
    return r.data;
  };
  const next = async () => {
    setError("");
    if (step === 0 && (!form.date || !form.time))
      return setError("Please select a date and time.");
    if (step === 1 && !form.address.trim())
      return setError("Please enter the complete ceremony address.");
    if (step === 2)
      try {
        await getQuote();
      } catch (e) {
        return setError(e.message);
      }
    setStep((s) => s + 1);
  };
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const b = await api("/bookings/create", {
        method: "POST",
        auth: true,
        body: {
          pooja_type_id: pooja.id,
          booking_date: form.date,
          booking_time: form.time,
          address: form.address,
          latitude: form.lat,
          longitude: form.lng,
          selected_pandit_ids: selected,
          coupon_code: quote?.coupon?.code,
          referral_code: quote?.referral?.code,
        },
      });
      const order = await api("/payments/create-order", {
        method: "POST",
        auth: true,
        body: { booking_id: b.booking.id },
      });
      if (order.razorpay_order?.is_stub) {
        await api("/payments/verify", {
          method: "POST",
          auth: true,
          body: {
            booking_id: b.booking.id,
            razorpay_order_id: order.razorpay_order.id,
            razorpay_payment_id: `pay_stub_${Date.now()}`,
            razorpay_signature: "stub_signature",
          },
        });
        refresh();
        setStep(4);
        return;
      }
      if (!window.Razorpay)
        await new Promise((ok, no) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = ok;
          s.onerror = no;
          document.head.appendChild(s);
        });
      await new Promise((resolve, reject) => {
        new window.Razorpay({
          key: order.razorpay_key_id,
          amount: order.razorpay_order.amount,
          currency: "INR",
          name: "Panditoo",
          description: pooja.name || pooja.name_en,
          order_id: order.razorpay_order.id,
          handler: async (response) => {
            try {
              await api("/payments/verify", {
                method: "POST",
                auth: true,
                body: { booking_id: b.booking.id, ...response },
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          theme: { color: "#7E241F" },
        }).open();
      });
      refresh();
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="booking-overlay">
      <div className="booking-flow">
        <header>
          <button
            onClick={step > 0 && step < 4 ? () => setStep((s) => s - 1) : close}
          >
            {step > 0 && step < 4 ? "←" : "×"}
          </button>
          <Brand />
          <span>STEP {Math.min(step + 1, 4)} OF 4</span>
        </header>
        {step < 4 && (
          <div className="progress">
            {[0, 1, 2, 3].map((n) => (
              <i className={n <= step ? "active" : ""} key={n} />
            ))}
          </div>
        )}
        <Notice>{error}</Notice>
        <div className="booking-body">
          {!config && step === 0 ? (
            <Loader />
          ) : step === 0 ? (
            <>
              <p className="eyebrow">MUHURAT & TIME</p>
              <h2>
                When shall we
                <br />
                <em>begin?</em>
              </h2>
              <label>
                Ceremony date
                <input
                  className="field"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <div className="slot-grid">
                {config?.slots?.map((s) => (
                  <button
                    className={form.time === s.time_value ? "selected" : ""}
                    onClick={() => setForm({ ...form, time: s.time_value })}
                    key={s.id}
                  >
                    {s.label || s.time_value}
                  </button>
                ))}
              </div>
            </>
          ) : step === 1 ? (
            <>
              <p className="eyebrow">CEREMONY LOCATION</p>
              <h2>
                Where will the
                <br />
                <em>pooja take place?</em>
              </h2>
              <label>
                Complete address
                <textarea
                  className="field"
                  rows="5"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="House, street, area, city and pincode"
                />
              </label>
              <button
                className="location-button"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition((p) =>
                    setForm({
                      ...form,
                      lat: p.coords.latitude,
                      lng: p.coords.longitude,
                    }),
                  )
                }
              >
                ⌖ Use current location
              </button>
            </>
          ) : step === 2 ? (
            <>
              <p className="eyebrow">YOUR PANDIT</p>
              <h2>
                Choose trusted
                <br />
                <em>guidance.</em>
              </h2>
              <p className="muted">
                Optional—select preferences or let us find the best available
                pandit.
              </p>
              <div className="pandit-list">
                {pandits.length ? (
                  pandits.map((p) => (
                    <button
                      className={
                        selected.includes(p.id) ? "pandit selected" : "pandit"
                      }
                      onClick={() =>
                        setSelected((x) =>
                          x.includes(p.id)
                            ? x.filter((id) => id !== p.id)
                            : [...x, p.id],
                        )
                      }
                      key={p.id}
                    >
                      <span>{p.name?.[0] || "P"}</span>
                      <div>
                        <b>{p.name}</b>
                        <small>
                          {p.experience_years || 0} years ·{" "}
                          {Number(p.distance_km || 0).toFixed(1)} km away
                        </small>
                      </div>
                      <i>{selected.includes(p.id) ? "✓" : "+"}</i>
                    </button>
                  ))
                ) : (
                  <div className="empty-state small">
                    <span>ॐ</span>
                    <p>We’ll assign the best available verified pandit.</p>
                  </div>
                )}
              </div>
            </>
          ) : step === 3 ? (
            <>
              <p className="eyebrow">FINAL REVIEW</p>
              <h2>
                Your sacred
                <br />
                <em>arrangement.</em>
              </h2>
              <div className="booking-summary">
                <div>
                  <span>ॐ</span>
                  <div>
                    <b>{pooja.name || pooja.name_en}</b>
                    <small>
                      {niceDate(form.date)} · {form.time}
                    </small>
                  </div>
                </div>
                <p>{form.address}</p>
              </div>
              <div className="coupon">
                <input
                  className="field"
                  value={form.coupon}
                  onChange={(e) =>
                    setForm({ ...form, coupon: e.target.value.toUpperCase() })
                  }
                  placeholder="Coupon code"
                />
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await getQuote(form.coupon);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Apply
                </button>
              </div>
              <div className="bill">
                <span>
                  Ceremony total <b>{money(quote?.total_price)}</b>
                </span>
                <span>
                  Secure payment now{" "}
                  <strong>{money(quote?.payable_now)}</strong>
                </span>
                <span>
                  Balance on ceremony day{" "}
                  <b>{money(quote?.remaining_amount)}</b>
                </span>
              </div>
            </>
          ) : (
            <div className="success">
              <span>✓</span>
              <p className="eyebrow">शुभारम्भ</p>
              <h2>
                Your booking request
                <br />
                <em>is on its way.</em>
              </h2>
              <p>
                Nearby verified pandits are being notified. Follow every update
                in My Bookings.
              </p>
              <button className="button primary" onClick={close}>
                Go to my dashboard →
              </button>
            </div>
          )}
        </div>
        {step < 3 && (
          <button className="button primary flow-action" onClick={next}>
            Continue →
          </button>
        )}
        {step === 3 && (
          <button
            className="button primary flow-action"
            disabled={busy}
            onClick={pay}
          >
            {busy
              ? "Preparing secure payment…"
              : `Pay ${money(quote?.payable_now)} securely →`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(token()));
  const [path, setPath] = useState(location.pathname);
  const [lang, setLang] = useState(
    localStorage.getItem("panditoo-lang") || "en",
  );
  const [data, setData] = useState({ poojas: [], offers: [], bookings: [], profile: null });
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [legalType, setLegalType] = useState(null);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  const loadPoojas = async () => {
    setLoading(true);
    try {
      const [result, offerResult] = await Promise.all([
        api(`/pooja-types?lang=${lang}`),
        api("/offers/active").catch(() => ({ data: [] })),
      ]);
      setData((d) => ({ ...d, poojas: result.data || [], offers: offerResult.data || [] }));
      setServiceError("");
    } catch (e) {
      setData((d) => ({ ...d, poojas: [] }));
      setServiceError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const ref = refFromUrl();
    if (ref) localStorage.setItem("panditoo-ref", ref);
    loadPoojas();
    localStorage.setItem("panditoo-lang", lang);
  }, [lang]);
  const load = async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const uid = localStorage.getItem("panditoo-user-id");
      const [p, offers, u, b] = await Promise.all([
        api(`/pooja-types?lang=${lang}`),
        api("/offers/active").catch(() => ({ data: [] })),
        api("/auth/me", { auth: true }),
        uid
          ? api(`/bookings/user/${uid}?limit=100`, { auth: true })
          : Promise.resolve({ data: [] }),
      ]);
      setData({
        poojas: p.data || [],
        offers: offers.data || [],
        profile: u.user,
        bookings: b.data || [],
      });
      setServiceError("");
    } catch (e) {
      setServiceError(e.message);
      if (/token|unauthorized|expired/i.test(e.message)) {
        localStorage.removeItem("panditoo-token");
        localStorage.removeItem("panditoo-user-id");
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (authed) load();
  }, [authed, lang]);
  const navigate = (target) => {
    history.pushState({}, "", target);
    setPath(target);
    scrollTo(0, 0);
  };
  const viewPooja = (p) => navigate(`/pooja/${p.id}`);
  const requestBook = (p) => {
    if (!authed) {
      setPending(p);
      setAuthOpen(true);
    } else navigate(`/book/${p.id}`);
  };
  const authDone = () => {
    setAuthOpen(false);
    setAuthed(true);
    if (pending) {
      navigate(`/book/${pending.id}`);
      setPending(null);
    } else navigate("/dashboard");
  };
  const logout = () => {
    localStorage.removeItem("panditoo-token");
    localStorage.removeItem("panditoo-user-id");
    setAuthed(false);
    navigate("/");
  };
  if (loading && !data.poojas.length && !serviceError) return <Loader full />;
  const poojaId = path.split("/")[2];
  const pooja = data.poojas.find(
    (p) => String(p.id) === decodeURIComponent(poojaId || ""),
  );
  const shell = {
    authed,
    profile: data.profile,
    onLogin: () => (authed ? navigate("/dashboard") : setAuthOpen(true)),
    lang,
    setLang,
    navigate,
    serviceError,
    retry: loadPoojas,
  };
  let page;
  if (path === "/")
    page = (
      <Landing
        poojas={data.poojas}
        offers={data.offers}
        onBook={viewPooja}
        openLegal={setLegalType}
        {...shell}
      />
    );
  else if (path === "/poojas")
    page = (
      <PoojaCatalogue poojas={data.poojas} onView={viewPooja} {...shell} />
    );
  else if (path.startsWith("/pooja/"))
    page = <PoojaDetail pooja={pooja} onBook={requestBook} {...shell} />;
  else if (path === "/pandits") page = <PanditDiscovery {...shell} />;
  else if (path === "/how-it-works") page = <HowItWorks {...shell} />;
  else if (path === "/about") page = <About {...shell} />;
  else if (path.startsWith("/book/") && authed && pooja)
    page = (
      <CustomerBookingFlow
        pooja={pooja}
        profile={data.profile}
        close={() => navigate("/dashboard")}
        refresh={load}
      />
    );
  else if (path.startsWith("/book/") && !authed && pooja)
    page = <PoojaDetail pooja={pooja} onBook={requestBook} {...shell} />;
  else if (["/dashboard", "/bookings", "/account"].includes(path) && authed) {
    const tab =
      path === "/bookings"
        ? "bookings"
        : path === "/account"
          ? "profile"
          : "home";
    page = (
      <div className="web-app">
        <AppHeader
          tab={tab}
          navigate={navigate}
          profile={data.profile}
          logout={logout}
          lang={lang}
          setLang={setLang}
        />
        <main>
          {loading && !data.profile ? (
            <Loader />
          ) : path === "/dashboard" ? (
            <DashboardHome data={data} navigate={navigate} onBook={viewPooja} />
          ) : path === "/bookings" ? (
            <CustomerBookings rows={data.bookings} reload={load} />
          ) : (
            <CustomerProfile
              profile={data.profile}
              bookings={data.bookings}
              reload={load}
              logout={logout}
              openLegal={setLegalType}
            />
          )}
        </main>
        <nav className="mobile-nav">
          {{
            home: "/dashboard",
            explore: "/poojas",
            bookings: "/bookings",
            profile: "/account",
          } &&
            Object.entries({
              home: "/dashboard",
              explore: "/poojas",
              bookings: "/bookings",
              profile: "/account",
            }).map(([k, v]) => (
              <button
                className={tab === k ? "active" : ""}
                onClick={() => navigate(v)}
                key={k}
              >
                <i>{icons[k]}</i>
                {k}
              </button>
            ))}
        </nav>
      </div>
    );
  } else
    page = (
      <Landing
        poojas={data.poojas}
        offers={data.offers}
        onBook={viewPooja}
        openLegal={setLegalType}
        {...shell}
      />
    );
  return (
    <>
      {page}
      {!authed && ["/dashboard", "/bookings", "/account"].includes(path) && (
        <AuthModal
          close={() => navigate("/")}
          done={authDone}
          openLegal={setLegalType}
        />
      )}{" "}
      {authOpen && (
        <AuthModal
          close={() => {
            setAuthOpen(false);
            setPending(null);
          }}
          done={authDone}
          openLegal={setLegalType}
        />
      )}{" "}
      {legalType && (
        <LegalModal type={legalType} logout={logout} close={() => setLegalType(null)} />
      )}
    </>
  );
}
