import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const port = 5177;
const webUrl = `http://127.0.0.1:${port}`;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const waitForWeb = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(webUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Vite server did not start");
};

let vite;
let browser;
try {
  await mkdir(".e2e-artifacts", { recursive: true });
  vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForWeb();

  const catalogueResponse = await fetch(`${webUrl}/api/pooja-types`);
  const catalogue = await catalogueResponse.json();
  if (!catalogueResponse.ok || !catalogue.success || catalogue.data.length < 1) throw new Error("Live pooja catalogue is unavailable");
  const configResponse = await fetch(`${webUrl}/api/booking-config`);
  const config = await configResponse.json();
  if (!configResponse.ok || !config.success || !config.data?.slots?.length) throw new Error("Live admin booking slots are unavailable");
  const bookingDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const quoteResponse = await fetch(`${webUrl}/api/pricing/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pooja_type_id: catalogue.data[0].id, booking_date: bookingDate }) });
  const quote = await quoteResponse.json();
  if (!quoteResponse.ok || !quote.success || Number(quote.data?.total_price) <= 0 || Number(quote.data?.payment_percent) <= 0) throw new Error("Live admin pricing quote is unavailable");

  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto(`${webUrl}/poojas`, { waitUntil: "networkidle" });
  await page.getByText("Rudrabhishek", { exact: true }).first().waitFor();
  if (await page.getByText("Booking service is temporarily unavailable").count()) throw new Error("Website displayed its backend-offline state");
  await page.goto(`${webUrl}/pooja/${catalogue.data[0].id}`, { waitUntil: "networkidle" });
  await page.getByText(catalogue.data[0].name, { exact: true }).first().waitFor();
  const firstSamagri = catalogue.data[0].samagri_list?.[0];
  if (firstSamagri) await page.getByText(typeof firstSamagri === "string" ? firstSamagri : firstSamagri.item_en, { exact: true }).waitFor();
  await page.screenshot({ path: ".e2e-artifacts/live-backend.png", fullPage: true });
  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
  console.log(`PASS: live backend connected; ${catalogue.data.length} poojas, ${config.data.slots.length} admin slots and a ${quote.data.payment_percent}% payment quote loaded from https://13.206.175.173/api`);
} finally {
  await browser?.close().catch(() => {});
  vite?.kill();
}
