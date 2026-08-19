const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

const getReviewCredential = (actorType) => ({
  phone: normalizePhone(actorType === "pandit"
    ? process.env.REVIEW_PANDIT_PHONE || "9876543210"
    : process.env.REVIEW_USER_PHONE || "9999999999"),
  otp: String(process.env.REVIEW_OTP || "123456").trim(),
});

const isReviewPhone = (phone, actorType) => (
  normalizePhone(phone) === getReviewCredential(actorType).phone
);

const isReviewOtp = (phone, otp, actorType) => {
  const credential = getReviewCredential(actorType);
  return normalizePhone(phone) === credential.phone && String(otp || "").trim() === credential.otp;
};

module.exports = { getReviewCredential, isReviewPhone, isReviewOtp };
