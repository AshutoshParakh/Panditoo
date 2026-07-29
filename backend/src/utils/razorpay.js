const crypto = require("crypto");

const getRazorpayConfig = () => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  currency: process.env.RAZORPAY_CURRENCY || "INR",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET,
});

const isStubMode = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  return !keyId || !keySecret || keyId.startsWith("your-") || keySecret.startsWith("your-");
};

const createRazorpayOrder = async ({ amount, receipt, notes = {} }) => {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    throw new Error("Razorpay amount must be a positive number");
  }

  const { keyId, keySecret, currency } = getRazorpayConfig();

  if (isStubMode()) {
    return {
      id: `order_stub_${crypto.randomUUID()}`,
      entity: "order",
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency,
      receipt,
      status: "created",
      notes,
      is_stub: true,
    };
  }

  const Razorpay = require("razorpay");
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
    notes,
  });

  return {
    ...order,
    is_stub: false,
  };
};

const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
  if (
    (isStubMode() || isDevMode) &&
    (signature === "stub_signature" || signature === "test_signature" || signature === "simulated_success")
  ) {
    return true;
  }

  const { keySecret } = getRazorpayConfig();

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};

const verifyWebhookSignature = ({ rawBody, signature }) => {
  if (isStubMode()) {
    return signature === "stub_signature";
  }

  const { webhookSecret } = getRazorpayConfig();

  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
