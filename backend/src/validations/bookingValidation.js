const Joi = require("joi");

const createBookingSchema = Joi.object({
  pooja_type_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
  booking_date: Joi.date().iso().required(),
  booking_time: Joi.string().pattern(/^(([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?)|((0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM|am|pm))$/).required(),
  address: Joi.string().trim().min(5).max(1000).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  selected_pandit_ids: Joi.array()
    .items(Joi.string().guid({ version: ["uuidv4", "uuidv5"] }))
    .min(1)
    .max(10)
    .unique()
    .required(),
});

const panditResponseSchema = Joi.object({
  response: Joi.string().valid("interested", "not_interested").required(),
});

module.exports = {
  createBookingSchema,
  panditResponseSchema,
};
