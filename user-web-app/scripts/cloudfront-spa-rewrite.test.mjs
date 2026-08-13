import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const source = fs.readFileSync(
  fileURLToPath(new URL("../deploy/cloudfront-spa-rewrite.js", import.meta.url)),
  "utf8",
);
const context = {};
vm.runInNewContext(source, context);

const rewrite = (uri) =>
  context.handler({ request: { method: "GET", uri, headers: {}, querystring: {} } }).uri;

for (const route of [
  "/poojas",
  "/pandits",
  "/how-it-works",
  "/about",
  "/dashboard",
  "/bookings",
  "/account",
  "/pooja/44444444-4444-4444-8444-444444444444",
  "/book/44444444-4444-4444-8444-444444444444",
  "/nested/route/",
]) {
  assert.equal(rewrite(route), "/index.html", `${route} should load the SPA entry point`);
}

for (const resource of [
  "/",
  "/api",
  "/api/pooja-types",
  "/assets/index-Dd3x.js",
  "/images/panditoo-sacred-hero.png",
  "/favicon.svg",
]) {
  assert.equal(rewrite(resource), resource, `${resource} should not be rewritten`);
}

console.log("PASS: CloudFront rewrites app routes and preserves API/static requests");
