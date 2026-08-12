// User Journey Analytics Tracker for Web App
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

function getSessionId() {
  let id = sessionStorage.getItem("panditoo_session_id");
  if (!id) {
    id = "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem("panditoo_session_id", id);
  }
  return id;
}

export function trackJourneyEvent({
  eventType,
  pagePath = window.location.pathname,
  poojaId = null,
  poojaName = null,
  dropoffStage = null,
  metadata = {},
}) {
  try {
    const sessionId = getSessionId();
    const token = localStorage.getItem("panditoo-token") || localStorage.getItem("panditoo_user_token");
    const userId = localStorage.getItem("panditoo-user-id") || localStorage.getItem("panditoo_user_id");

    const payload = {
      sessionId,
      userId: userId || undefined,
      platform: "web",
      eventType,
      pagePath,
      poojaId,
      poojaName,
      dropoffStage,
      metadata: {
        ...metadata,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
      },
    };

    fetch(`${API_BASE_URL}/analytics/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    // Non-intrusive fail-safe
  }
}
