import React, { useEffect, useMemo, useState } from "react";
import { api, money } from "./api";
import "./customer-features.css";

const ADDRESS_KEY = "panditoo-saved-addresses-v1";
const getStoredReferral = () => {
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
const REASONS = [
  ["change_of_plan", "Change in plan"],
  ["pandit_asked_to_cancel", "Pandit asked me to cancel"],
  ["wrong_date_or_location", "Wrong date or location"],
  ["duplicate_booking", "Booked by mistake / duplicate"],
  ["other", "Other reason"],
];
const isoDate = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + Number(days || 30));
  return isoDate(date);
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
const readSaved = () => { try { return JSON.parse(localStorage.getItem(ADDRESS_KEY) || "[]"); } catch { return []; } };
const slotAvailable = (date, time) => {
  if (date !== isoDate()) return true;
  const [hours, minutes] = String(time || "").split(":").map(Number);
  const now = new Date();
  return hours * 60 + minutes > now.getHours() * 60 + now.getMinutes();
};

function InlineNotice({ children, good = false }) {
  return children ? <div className={`customer-notice ${good ? "good" : ""}`}>{children}</div> : null;
}

function PriceDetails({ quote }) {
  if (!quote) return null;
  return <div className="price-details">
    {quote.festival_title && <div className="pricing-banner"><b>{quote.festival_title} special pricing</b><span>Admin-configured pricing applies to this date.</span></div>}
    {quote.promotional_offer && <div className="pricing-banner offer"><b>🎉 {quote.promotional_offer.title}</b><span>{quote.promotional_offer.subtitle || "Special offer applied automatically"} · Save {money(quote.discount_amount)}</span></div>}
    {quote.coupon && <InlineNotice good>✓ Coupon {quote.coupon.code} applied · You save {money(quote.discount_amount)}</InlineNotice>}
    {quote.referral && <InlineNotice good>✓ Referral {quote.referral.code} ({quote.referral.name}) applied{quote.discount_amount ? ` · You save ${money(quote.discount_amount)}` : ""}</InlineNotice>}
    <div className="bill enhanced-bill">
      {Number(quote.list_price) > Number(quote.total_price) && <span>Listed ceremony price <del>{money(quote.list_price)}</del></span>}
      <span>Ceremony total <b>{money(quote.total_price)}</b></span>
      {Number(quote.discount_amount) > 0 && <span>You save <b className="saving">− {money(quote.discount_amount)}</b></span>}
      <span>Secure payment now <strong>{money(quote.payable_now)} <small>{quote.payment_percent}%</small></strong></span>
      <span>Balance on ceremony day <b>{money(quote.remaining_amount)}</b></span>
    </div>
  </div>;
}

export function CustomerBookingFlow({ pooja, profile, close, refresh }) {
  const today = isoDate();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState(null);
  const [pandits, setPandits] = useState([]);
  const [panditSort, setPanditSort] = useState("recommended");
  const [selected, setSelected] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState(readSaved);
  const [form, setForm] = useState(() => {
    const storedRef = getStoredReferral();
    const autoRef = (profile?.referral_eligible && profile?.referral_code)
      ? profile.referral_code
      : (profile?.referral_code || storedRef);
    return {
      date: today,
      time: "",
      address: profile?.address || "",
      lat: null,
      lng: null,
      coupon: "",
      referral: autoRef || "",
    };
  });
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [quote, setQuote] = useState(null);
  const [draftBooking, setDraftBooking] = useState(null);
  const [completedBooking, setCompletedBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [panditsLoading, setPanditsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasActiveReferral = Boolean(form.referral || quote?.referral || showReferralInput);

  const availableSlots = useMemo(() => (config?.slots || []).filter((slot) => slotAvailable(form.date, slot.time_value)), [config, form.date]);
  const sortedPandits = useMemo(() => [...pandits].sort((a, b) => panditSort === "nearest" ? Number(a.distance_km || 999) - Number(b.distance_km || 999) : panditSort === "experience" ? Number(b.experience_years || 0) - Number(a.experience_years || 0) : Number(b.ranking_score || 0) - Number(a.ranking_score || 0)), [pandits, panditSort]);

  useEffect(() => {
    api("/booking-config").then((result) => setConfig(result.data)).catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const storedRef = getStoredReferral();
    const autoRef = (profile?.referral_eligible && profile?.referral_code)
      ? profile.referral_code
      : (profile?.referral_code || storedRef);
    setForm((current) => ({
      ...current,
      address: current.address || profile?.address || "",
      referral: current.referral || autoRef || "",
    }));
  }, [profile]);
  useEffect(() => {
    if (!availableSlots.some((slot) => slot.time_value === form.time)) setForm((current) => ({ ...current, time: availableSlots[0]?.time_value || "" }));
  }, [config, form.date]);
  useEffect(() => {
    if (!form.date) return;
    let current = true;
    const effectiveReferral = form.referral || (profile?.referral_eligible && profile?.referral_code ? profile.referral_code : getStoredReferral());
    quotePrice(form.coupon, effectiveReferral).then((value) => current && setQuote(value)).catch(() => current && setQuote(null));
    return () => { current = false; };
  }, [form.date, form.referral, form.coupon, profile]);
  useEffect(() => {
    if (step === 1 && (form.lat == null || form.lng == null)) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setForm((curr) => ({ ...curr, lat: pos.coords.latitude, lng: pos.coords.longitude })),
          () => setForm((curr) => ({ ...curr, lat: curr.lat ?? 22.7196, lng: curr.lng ?? 75.8577 })),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setForm((curr) => ({ ...curr, lat: curr.lat ?? 22.7196, lng: curr.lng ?? 75.8577 }));
      }
    }
  }, [step]);

  const quotePrice = async (coupon = form.coupon, referral = form.referral) => {
    const result = await api("/pricing/quote", { method: "POST", body: { pooja_type_id: pooja.id, booking_date: form.date, coupon_code: coupon.trim() || undefined, referral_code: referral.trim() || undefined } });
    return result.data;
  };
  const applyDiscounts = async () => {
    setBusy(true); setError("");
    try { setQuote(await quotePrice()); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const useLocation = () => {
    setLocating(true); setError("");
    if (!navigator.geolocation) {
      setForm((current) => ({ ...current, lat: current.lat ?? 22.7196, lng: current.lng ?? 75.8577 }));
      setLocating(false);
      return setError("Geolocation is not supported by your browser. Default GPS coordinates (22.7196, 75.8577) set.");
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({ ...current, lat: position.coords.latitude, lng: position.coords.longitude }));
        setLocating(false);
      },
      (err) => {
        setForm((current) => ({ ...current, lat: current.lat ?? 22.7196, lng: current.lng ?? 75.8577 }));
        setError("GPS location permission was denied. Default GPS coordinates (22.7196, 75.8577) captured.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  const selectSavedAddress = (item) => {
    setForm((current) => ({
      ...current,
      address: item.address,
      lat: item.lat ?? current.lat ?? 22.7196,
      lng: item.lng ?? current.lng ?? 75.8577,
    }));
  };
  const saveAddress = () => {
    const address = form.address.trim();
    if (!address) return;
    const existing = savedAddresses.find((item) => item.address.toLowerCase() === address.toLowerCase());
    const next = existing ? savedAddresses.map((item) => item.id === existing.id ? { ...item, lat: form.lat ?? 22.7196, lng: form.lng ?? 75.8577 } : item) : [{ id: String(Date.now()), label: savedAddresses.length ? `Saved place ${savedAddresses.length + 1}` : "Home", address, lat: form.lat ?? 22.7196, lng: form.lng ?? 75.8577 }, ...savedAddresses].slice(0, 8);
    setSavedAddresses(next); localStorage.setItem(ADDRESS_KEY, JSON.stringify(next));
  };
  const loadPandits = async () => {
    setPanditsLoading(true); setError("");
    try {
      const params = new URLSearchParams({ lat: String(form.lat ?? 22.7196), lng: String(form.lng ?? 75.8577), radius: "50", poojaTypeId: String(pooja.id), bookingDate: form.date, bookingTime: form.time });
      const result = await api(`/pandits/nearby?${params}`);
      setPandits(result.data || []);
    } catch (e) { setPandits([]); setError(e.message); }
    finally { setPanditsLoading(false); }
  };
  const next = async () => {
    setError("");
    if (step === 0) {
      if (!form.date || !form.time) return setError("Please select an available date and time.");
      setStep(1); return;
    }
    if (step === 1) {
      if (form.address.trim().length < 5) return setError("Please enter the complete ceremony address.");
      const lat = form.lat ?? 22.7196;
      const lng = form.lng ?? 75.8577;
      setForm((current) => ({ ...current, lat, lng }));
      saveAddress(); await loadPandits(); setStep(2); return;
    }
    if (step === 2) {
      try { setQuote(await quotePrice()); setStep(3); } catch (e) { setError(e.message); }
    }
  };
  const togglePandit = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 10 ? [...current, id] : current);
  const selectRecommended = () => setSelected(sortedPandits.slice(0, 3).map((pandit) => pandit.id));

  const verifyPayment = async (bookingId, response) => api("/payments/verify", { method: "POST", auth: true, body: { booking_id: bookingId, ...response } });
  const pay = async () => {
    setBusy(true); setError("");
    try {
      const booking = draftBooking || (await api("/bookings/create", { method: "POST", auth: true, body: { pooja_type_id: pooja.id, booking_date: form.date, booking_time: form.time, address: form.address.trim(), latitude: form.lat, longitude: form.lng, selected_pandit_ids: selected, coupon_code: quote?.coupon?.code, referral_code: quote?.referral?.code } })).booking;
      setDraftBooking(booking);
      const order = await api("/payments/create-order", { method: "POST", auth: true, body: { booking_id: booking.id } });
      if (order.razorpay_order?.is_stub) {
        await verifyPayment(booking.id, { razorpay_order_id: order.razorpay_order.id, razorpay_payment_id: `pay_stub_${Date.now()}`, razorpay_signature: "stub_signature" });
      } else {
        if (!order.razorpay_key_id || !order.razorpay_order?.id) throw new Error("Online payment is not configured. Please contact support.");
        if (!window.Razorpay) await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Payment gateway could not be loaded.")); document.head.appendChild(script); });
        await new Promise((resolve, reject) => new window.Razorpay({ key: order.razorpay_key_id, amount: order.razorpay_order.amount, currency: "INR", name: "Panditoo", description: `Prepayment for ${pooja.name || pooja.name_en}`, order_id: order.razorpay_order.id, prefill: { name: profile?.name, email: profile?.email, contact: profile?.phone }, handler: async (response) => { try { await verifyPayment(booking.id, response); resolve(); } catch (e) { reject(e); } }, modal: { ondismiss: () => reject(new Error("Payment cancelled. Your booking draft is saved; retry payment to continue.")) }, theme: { color: "#7E241F" } }).open());
      }
      setCompletedBooking(booking); await refresh(); setStep(4);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <div className="booking-overlay"><div className="booking-flow customer-flow">
    <header><button onClick={step > 0 && step < 4 ? () => setStep((value) => value - 1) : close}>{step > 0 && step < 4 ? "←" : "×"}</button><b>PANDITOO</b><span>STEP {Math.min(step + 1, 4)} OF 4</span></header>
    {step < 4 && <div className="progress">{[0, 1, 2, 3].map((value) => <i className={value <= step ? "active" : ""} key={value} />)}</div>}
    <InlineNotice>{error}</InlineNotice>
    <div className="booking-body">
      {step === 0 && <><p className="eyebrow">MUHURAT & TIME</p><h2>Choose your <em>schedule.</em></h2>
        {!config ? <div className="customer-loading">Loading admin booking settings…</div> : <>
          <label>Ceremony date<input className="field" type="date" min={today} max={addDays(today, config.advance_booking_days)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <small className="field-help">Booking is available up to {config.advance_booking_days} days ahead.</small>
          <div className="slot-grid">{availableSlots.map((slot) => <button className={form.time === slot.time_value ? "selected" : ""} onClick={() => setForm({ ...form, time: slot.time_value })} key={slot.id}>{slot.label || slot.time_value}</button>)}</div>
          {!availableSlots.length && <InlineNotice>No future time slots remain for this date. Choose another date.</InlineNotice>}
          <PriceDetails quote={quote} />
        </>}
      </>}
      {step === 1 && <><p className="eyebrow">CEREMONY LOCATION</p><h2>Choose the exact <em>location.</em></h2>
        {!!savedAddresses.length && <div className="saved-addresses">{savedAddresses.map((item) => <button key={item.id} className={form.address === item.address ? "active" : ""} onClick={() => selectSavedAddress(item)}><b>{item.label}</b><span>{item.address}</span></button>)}</div>}
        <label>Complete address<textarea className="field" rows="5" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House, street, area, city and pincode" /></label>
        <button className="location-button" disabled={locating} onClick={useLocation}>⌖ {locating ? "Detecting location…" : "Use current GPS location"}</button>
        {form.lat != null && form.lng != null ? (
          <small className="coordinates success-coords">✓ Precise GPS coordinates captured: {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}</small>
        ) : (
          <small className="coordinates required-coords">⚠️ GPS coordinates are compulsory. Click "Use current GPS location" above.</small>
        )}
      </>}
      {step === 2 && <><p className="eyebrow">YOUR PANDIT</p><h2>Choose trusted <em>guidance.</em></h2><p className="muted">Select up to 10 preferred pandits, or leave empty for the best available match.</p>
        <div className="pandit-tools"><div>{["recommended", "nearest", "experience"].map((value) => <button className={panditSort === value ? "active" : ""} onClick={() => setPanditSort(value)} key={value}>{value}</button>)}</div><button onClick={selectRecommended}>Select top 3</button></div>
        <small className="selection-count">{selected.length}/10 preferences selected</small>
        {panditsLoading ? <div className="customer-loading">Finding available pandits for your schedule…</div> : <div className="pandit-list">{sortedPandits.length ? sortedPandits.map((pandit, index) => <button className={selected.includes(pandit.id) ? "pandit selected" : "pandit"} disabled={!selected.includes(pandit.id) && selected.length >= 10} onClick={() => togglePandit(pandit.id)} key={pandit.id}><span>{pandit.name?.[0] || "P"}</span><div><b>{pandit.name} {index === 0 && <em>Recommended</em>}</b><small>{pandit.experience_years || 0} years · {Number(pandit.distance_km || 0).toFixed(1)} km · ★ {Number(pandit.rating || 0).toFixed(1)}</small><small>{(pandit.specializations || []).slice(0, 3).join(" · ")}</small></div><i>{selected.includes(pandit.id) ? "✓" : "+"}</i></button>) : <div className="empty-state small"><span>ॐ</span><p>No matching pandit is visible yet. The backend can notify other eligible pandits after payment.</p></div>}</div>}
      </>}
      {step === 3 && <><p className="eyebrow">FINAL REVIEW</p><h2>Your sacred <em>arrangement.</em></h2>
        <div className="booking-summary"><div><span>ॐ</span><div><b>{pooja.name || pooja.name_en}</b><small>{niceDate(form.date)} · {form.time}</small></div></div><p>{form.address}</p><small>{selected.length ? `${selected.length} preferred pandit${selected.length > 1 ? "s" : ""}` : "Any available verified pandit"}</small></div>
        <div className={`discount-grid ${hasActiveReferral ? "has-referral" : "single-code"}`}>
          <label>Coupon code<input className="field" value={form.coupon} onChange={(e) => setForm({ ...form, coupon: e.target.value.toUpperCase() })} placeholder="ENTER COUPON" /></label>
          {hasActiveReferral && (
            <label>Referral code<input className="field" value={form.referral} onChange={(e) => setForm({ ...form, referral: e.target.value.toUpperCase() })} placeholder="REFERRAL CODE" /></label>
          )}
          <button disabled={busy || (!form.coupon.trim() && !form.referral.trim())} onClick={applyDiscounts}>{busy ? "Checking…" : "Apply codes"}</button>
        </div>
        {!hasActiveReferral && (
          <button type="button" className="toggle-referral-btn" onClick={() => setShowReferralInput(true)}>+ Have a referral code?</button>
        )}
        <PriceDetails quote={quote} />
        {draftBooking && <InlineNotice good>Your booking draft is saved. Retrying will only reopen payment and will not create a duplicate.</InlineNotice>}
        <p className="booking-terms">By paying, you agree to the displayed booking, payment and cancellation terms.</p>
      </>}
      {step === 4 && <div className="success"><span>✓</span><p className="eyebrow">शुभारम्भ</p><h2>Your booking request <em>is on its way.</em></h2><p>Reference #{String(completedBooking?.id || "").slice(0, 8).toUpperCase()}. Nearby verified pandits are being notified.</p><button className="button primary" onClick={close}>Go to my dashboard →</button></div>}
    </div>
    {step < 3 && <button className="button primary flow-action" disabled={busy || (step === 0 && (!form.time || !config))} onClick={next}>{step === 0 ? "Choose location" : step === 1 ? "Choose pandits" : "Review booking"} →</button>}
    {step === 3 && <button className="button primary flow-action" disabled={busy || !quote} onClick={pay}>{busy ? "Preparing secure payment…" : `${draftBooking ? "Retry" : "Pay"} ${money(quote?.payable_now)} securely →`}</button>}
  </div></div>;
}

function RatingModal({ booking, close, reload }) {
  const [rating, setRating] = useState(5); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async () => { setBusy(true); setError(""); try { await api("/ratings", { method: "POST", auth: true, body: { booking_id: booking.id, rating, comment: comment.trim() } }); await reload(); close(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <div className="modal-backdrop"><div className="customer-modal"><button className="modal-close" onClick={close}>×</button><p className="eyebrow">YOUR FEEDBACK</p><h2>How was your ceremony?</h2><InlineNotice>{error}</InlineNotice><div className="stars">{[1,2,3,4,5].map((value) => <button className={value <= rating ? "active" : ""} onClick={() => setRating(value)} key={value}>★</button>)}</div><textarea className="field" rows="5" maxLength="500" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)"/><small>{comment.length}/500</small><button className="button primary" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit feedback"}</button></div></div>;
}

function CancelModal({ booking, close, reload }) {
  const [reason, setReason] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const fullPaid = booking.prepaid_status === "paid" && Number(booking.prepaid_amount) >= Number(booking.total_price);
  const blocked = booking.status !== "pending" ? "Cancellation is unavailable after a pandit accepts the request." : fullPaid ? "Fully paid bookings cannot be cancelled here. Please contact support." : "";
  const submit = async () => { if (!reason) return setError("Please select a cancellation reason."); if (reason === "other" && note.trim().length < 3) return setError("Please tell us why you are cancelling."); setBusy(true); try { await api(`/bookings/${booking.id}/cancel`, { method: "PATCH", auth: true, body: { reason, note: note.trim() } }); await reload(); close(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <div className="modal-backdrop"><div className="customer-modal"><button className="modal-close" onClick={close}>×</button><p className="eyebrow">CANCELLATION</p><h2>{blocked ? "Cancellation unavailable" : "Why are you cancelling?"}</h2><InlineNotice>{error || blocked}</InlineNotice>{!blocked && <><div className="cancel-reasons">{REASONS.map(([value,label]) => <label key={value}><input type="radio" name="cancel-reason" value={value} checked={reason === value} onChange={() => setReason(value)}/><span>{label}</span></label>)}</div><textarea className="field" rows="4" maxLength="500" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional note (required for Other)"/><small>{note.length}/500</small>{Number(booking.prepaid_amount) > 0 && <div className="refund-warning">Prepayment of {money(booking.prepaid_amount)} is non-refundable under the displayed cancellation rule.</div>}<button className="button primary" disabled={busy || !reason} onClick={submit}>{busy ? "Cancelling…" : "Confirm cancellation"}</button></>}</div></div>;
}

function BookingDetails({ booking, close, reload, cancel, rate }) {
  const [details, setDetails] = useState(booking); const [error, setError] = useState("");
  useEffect(() => { let active = true; const fetchDetails = () => api(`/bookings/${booking.id}`, { auth: true }).then((result) => active && setDetails(result.data)).catch((e) => active && setError(e.message)); fetchDetails(); const timer = setInterval(() => ["pending","confirmed"].includes(details?.status) && fetchDetails(), 10000); return () => { active = false; clearInterval(timer); }; }, [booking.id, details?.status]);
  return <div className="modal-backdrop"><div className="customer-modal booking-detail-modal"><button className="modal-close" onClick={close}>×</button><p className="eyebrow">BOOKING #{String(details.id).slice(0,8).toUpperCase()}</p><h2>{details.name_en || details.pooja_name_en || "Pooja ceremony"}</h2><InlineNotice>{error}</InlineNotice><span className={`status ${details.status}`}>{details.status}</span>{details.status === "pending" && <p className="waiting-copy">We’re contacting eligible pandits. This status refreshes automatically.</p>}{details.confirmed_pandit && <div className="confirmed-pandit"><span>{details.confirmed_pandit.name?.[0]}</span><div><b>{details.confirmed_pandit.name}</b><small>Verified pandit · ★ {Number(details.confirmed_pandit.rating || 0).toFixed(1)}</small></div></div>}{details.service_otp && <div className="service-otp"><small>{details.service_otp.phase === "start" ? "START POOJA" : "COMPLETE POOJA"} OTP</small><b>{details.service_otp.code}</b><span>Share this code only with your confirmed pandit.</span></div>}<div className="detail-rows"><span>Date & time <b>{niceDate(details.booking_date)} · {String(details.booking_time || "").slice(0,5)}</b></span><span>Location <b>{details.address}</b></span><span>Total <b>{money(details.total_price)}</b></span><span>Paid online <b>{money(details.prepaid_amount)}</b></span><span>Payment <b>{details.prepaid_status}</b></span></div><div className="modal-actions">{details.status === "pending" && <button onClick={() => cancel(details)}>Cancel request</button>}{details.status === "completed" && <button onClick={() => rate(details)}>Rate experience</button>}<button className="button primary" onClick={async () => { await reload(); close(); }}>Done</button></div></div></div>;
}

export function CustomerBookings({ rows, reload }) {
  const [detail, setDetail] = useState(null); const [cancelBooking, setCancelBooking] = useState(null); const [ratingBooking, setRatingBooking] = useState(null);
  return <div className="dashboard-page narrow"><div className="catalogue-head"><p>YOUR SACRED CALENDAR</p><h1>My <em>bookings.</em></h1><span>Track confirmation, service OTPs, payments and completed ceremonies.</span></div><div className="booking-list">{rows.length ? rows.map((booking) => <article className="booking" key={booking.id}><div className="booking-icon">ॐ</div><div><span className={`status ${booking.status}`}>{booking.status}</span><h3>{booking.name_en || booking.pooja_name_en || "Pooja ceremony"}</h3><p>{niceDate(booking.booking_date)} · {String(booking.booking_time || "").slice(0,5)}</p><small>#{String(booking.id).slice(0,8).toUpperCase()}</small></div><div className="booking-price"><b>{money(booking.total_price)}</b><button onClick={() => setDetail(booking)}>View details</button>{booking.status === "pending" && <button onClick={() => setCancelBooking(booking)}>Cancel</button>}{booking.status === "completed" && <button onClick={() => setRatingBooking(booking)}>Rate</button>}</div></article>) : <div className="empty-state"><span>ॐ</span><h3>Your sacred calendar is waiting.</h3><p>Once you book a ceremony, every update will appear here.</p></div>}</div>{detail && <BookingDetails booking={detail} close={() => setDetail(null)} reload={reload} cancel={(value) => { setDetail(null); setCancelBooking(value); }} rate={(value) => { setDetail(null); setRatingBooking(value); }}/>} {cancelBooking && <CancelModal booking={cancelBooking} close={() => setCancelBooking(null)} reload={reload}/>} {ratingBooking && <RatingModal booking={ratingBooking} close={() => setRatingBooking(null)} reload={reload}/>}</div>;
}

export function CustomerProfile({ profile, bookings, reload, logout, openLegal }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile || {});
  const [payments, setPayments] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => setForm(profile || {}), [profile]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/auth/me", { method: "PATCH", auth: true, body: { name: form.name, email: form.email, address: form.address } });
      setEditing(false);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const loadPayments = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api("/payments/history", { auth: true });
      setPayments(result.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Permanently delete your Panditoo account? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api("/auth/me", { method: "DELETE", auth: true });
      logout();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const completed = bookings.filter((booking) => booking.status === "completed").length;

  return (
    <div className="dashboard-page narrow">
      <div className="profile-banner">
        <span>{profile?.name?.[0] || "U"}</span>
        <div>
          <p>MY PANDITOO ACCOUNT</p>
          <h1>{profile?.name}</h1>
          <small>+91 {profile?.phone}</small>
        </div>
        <button onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit profile"}</button>
      </div>
      <InlineNotice>{error}</InlineNotice>
      <div className="account-stats">
        <span><b>{bookings.length}</b>Bookings</span>
        <span><b>{completed}</b>Completed</span>
        <span><b>{readSaved().length || (profile?.address ? 1 : 0)}</b>Addresses</span>
      </div>
      <section className="profile-box">
        <h2>Your information</h2>
        {editing ? (
          <div className="form-grid">
            <label>Name<input className="field" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
            <label>Email<input className="field" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
            <label className="wide">Primary address<input className="field" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })}/></label>
            <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--line)" }}>
              <button className="button primary" disabled={busy || !form.name?.trim()} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
              <button disabled={busy} onClick={deleteAccount} style={{ border: 0, background: "none", color: "#a33a31", fontSize: "12px", textDecoration: "underline", cursor: "pointer" }}>Delete account</button>
            </div>
          </div>
        ) : (
          <div className="detail-rows">
            <span>Email <b>{profile?.email || "Not added"}</b></span>
            <span>Primary address <b>{profile?.address || "Not added"}</b></span>
            <span>Referral <b>{profile?.referral_eligible ? profile.referral_code || "Eligible" : "Not active"}</b></span>
          </div>
        )}
      </section>
      <section className="profile-links">
        <button onClick={loadPayments}><span>₹</span><div><b>Payment History</b><small>Past online transactions</small></div>→</button>
        <button onClick={() => openLegal("terms")}><span>§</span><div><b>Terms & Conditions</b><small>Service and cancellation rules</small></div>→</button>
        <button onClick={() => openLegal("privacy")}><span>♢</span><div><b>Privacy Policy</b><small>Data and account controls</small></div>→</button>
      </section>
      {payments && (
        <section className="payment-history">
          <div>
            <h2>Payment history</h2>
            <button onClick={() => setPayments(null)}>Close</button>
          </div>
          {payments.length ? payments.map((payment) => (
            <article key={payment.id}>
              <div>
                <b>{payment.name_en}</b>
                <small>{new Date(payment.created_at).toLocaleDateString("en-IN")} · {payment.status}</small>
              </div>
              <strong>{money(payment.amount)}</strong>
              {payment.razorpay_payment_id && <code>{payment.razorpay_payment_id}</code>}
            </article>
          )) : <p>No payment transactions found.</p>}
        </section>
      )}
      <div className="profile-actions">
        <button className="signout-btn" onClick={logout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out of Panditoo
        </button>
      </div>
    </div>
  );
}
