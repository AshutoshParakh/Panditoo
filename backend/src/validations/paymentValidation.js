const Joi = require("joi");

const createPaymentOrderSchema = Joi.object({
  booking_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
});

const verifyPaymentSchema = Joi.object({
  booking_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
  razorpay_order_id: Joi.string().trim().required(),
  razorpay_payment_id: Joi.string().trim().required(),
  razorpay_signature: Joi.string().trim().required(),
});

module.exports = {
  createPaymentOrderSchema,
  verifyPaymentSchema,
};
