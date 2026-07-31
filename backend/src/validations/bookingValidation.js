const Joi = require("joi");

const createBookingSchema = Joi.object({
  pooja_type_id: Joi.string().required(),
  booking_date: Joi.string().required(),
  booking_time: Joi.string().required(),
  address: Joi.string().trim().min(1).required(),
  latitude: Joi.number().allow(null, "").optional(),
  longitude: Joi.number().allow(null, "").optional(),
  selected_pandit_ids: Joi.array().items(Joi.string()).optional(),
  coupon_code: Joi.string().trim().max(40).allow("").optional(),
});

const panditResponseSchema = Joi.object({
  response: Joi.string().valid("interested", "not_interested").required(),
});

module.exports = {
  createBookingSchema,
  panditResponseSchema,
};
