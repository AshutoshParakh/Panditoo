export const API_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
export const token = () => localStorage.getItem("panditoo-token");

export async function api(path, { method = "GET", body, auth = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(auth && token() ? { Authorization: `Bearer ${token()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `Request failed (${response.status}). Please try again.`);
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out. Please check your connection.");
    if (error.message === "Failed to fetch") throw new Error("Could not connect to backend server. Please check if the server is running.");
    throw error;
  } finally { clearTimeout(timer); }
}

export const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
