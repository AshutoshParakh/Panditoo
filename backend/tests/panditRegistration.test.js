process.env.JWT_SECRET = "pandit-registration-test-secret";
process.env.NODE_ENV = "production";
jest.mock("../src/config/db", () => ({ query: jest.fn(), pool: {} }));
jest.mock("../src/utils/otpService", () => ({ sendOTP: jest.fn() }));
const { query } = require("../src/config/db");
const { registerPandit, verifyPanditOtp } = require("../src/controllers/authController");
const { signPanditRegistrationToken, signAuthToken, verifyAuthToken } = require("../src/utils/jwt");
const phone = "9123456780";
const body = () => ({ phone, name: "Test Pandit", registration_token: signPanditRegistrationToken(phone), terms_accepted: true, privacy_accepted: true, terms_version: "2026-08-09", privacy_version: "2026-08-09" });
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
beforeEach(() => query.mockReset());
test.each([
  ["missing proof", () => ({ registration_token: undefined })],
  ["wrong phone", () => ({ registration_token: signPanditRegistrationToken("9123456781") })],
  ["login token", () => ({ registration_token: signAuthToken({ id: "p1", phone, type: "pandit" }) })],
  ["tampered proof", () => ({ registration_token: "invalid-token" })],
  ["expired proof", () => ({ registration_token: require("jsonwebtoken").sign({ phone, type: "pandit-registration" }, process.env.JWT_SECRET, { expiresIn: -1 }) })],
])("rejects registration with %s", async (_, extra) => {
  const res = response();
  await registerPandit({ body: { ...body(), ...extra() } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(401);
  expect(query).not.toHaveBeenCalled();
});
test("invalid OTP cannot obtain registration proof", async () => {
  query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
  const res = response();
  await verifyPanditOtp({ body: { phone, otp: "654321" } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0].registrationToken).toBeUndefined();
});
test("verified website registration is the same profile returned on app login", async () => {
  query.mockResolvedValueOnce({ rows: [{ id: "otp1" }], rowCount: 1 }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [], rowCount: 0 });
  const verified = response();
  await verifyPanditOtp({ body: { phone, otp: "654321" } }, verified, jest.fn());
  const proof = verified.json.mock.calls[0][0].registrationToken;
  expect(verifyAuthToken(proof)).toMatchObject({ phone, type: "pandit-registration" });
  const pandit = { id: "pandit1", phone, name: "Test Pandit", source: "Self Registered (Web)" };
  query.mockResolvedValueOnce({ rows: [pandit] }).mockResolvedValueOnce({ rows: [] });
  const registered = response();
  await registerPandit({ body: { ...body(), registration_token: proof }, headers: {} }, registered, jest.fn());
  expect(registered.status).toHaveBeenCalledWith(201);
  expect(registered.json.mock.calls[0][0].pandit).toEqual(pandit);
  query.mockResolvedValueOnce({ rows: [{ id: "otp2" }], rowCount: 1 }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [pandit], rowCount: 1 });
  const login = response();
  await verifyPanditOtp({ body: { phone, otp: "654321" } }, login, jest.fn());
  expect(login.json.mock.calls[0][0]).toMatchObject({ isNewUser: false, pandit });
  expect(verifyAuthToken(login.json.mock.calls[0][0].token)).toMatchObject({ sub: pandit.id, type: "pandit" });
});
test("replaying registration cannot overwrite an existing profile", async () => {
  query.mockResolvedValueOnce({ rows: [] });
  const res = response();
  await registerPandit({ body: body(), headers: {} }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(409);
  expect(query.mock.calls[0][0]).toContain("ON CONFLICT (phone) DO NOTHING");
});
