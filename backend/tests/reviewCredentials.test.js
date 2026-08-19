const { getReviewCredential, isReviewPhone, isReviewOtp } = require("../src/utils/reviewCredentials");

describe("Play Console review credentials", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REVIEW_USER_PHONE;
    delete process.env.REVIEW_PANDIT_PHONE;
    delete process.env.REVIEW_OTP;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("accepts the default customer review credential", () => {
    expect(getReviewCredential("user")).toEqual({ phone: "9999999999", otp: "123456" });
    expect(isReviewOtp("+91 99999 99999", "123456", "user")).toBe(true);
  });

  test("accepts the default pandit review credential", () => {
    expect(getReviewCredential("pandit")).toEqual({ phone: "9876543210", otp: "123456" });
    expect(isReviewOtp("9876543210", "123456", "pandit")).toBe(true);
  });

  test("does not allow the credential for another phone or actor type", () => {
    expect(isReviewOtp("9999999998", "123456", "user")).toBe(false);
    expect(isReviewOtp("9999999999", "123456", "pandit")).toBe(false);
    expect(isReviewOtp("9999999999", "654321", "user")).toBe(false);
    expect(isReviewPhone("9876543210", "user")).toBe(false);
  });
});
