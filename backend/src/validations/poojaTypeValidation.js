const Joi = require("joi");

const samagriItemSchema = Joi.object({
  item: Joi.string().trim().min(1).max(255).optional(),
  item_en: Joi.string().trim().min(1).max(255).optional(),
  item_hi: Joi.string().trim().min(1).max(255).optional().allow("", null),
  brought_by: Joi.string().trim().lowercase().valid("pandit", "user").required(),
})
  .custom((value, helpers) => {
    const item_en = value.item_en || value.item;
    const item_hi = value.item_hi || value.item || item_en;

    if (!item_en) {
      return helpers.message('"item" or "item_en" is required');
    }

    return {
      item_en,
      item_hi,
      brought_by: value.brought_by,
    };
  })
  .unknown(true);

const createPoojaTypeSchema = Joi.object({
  name_en: Joi.string().trim().min(2).max(255).required(),
  name_hi: Joi.string().trim().min(2).max(255).required(),
  description_en: Joi.string().trim().allow("", null).optional(),
  description_hi: Joi.string().trim().allow("", null).optional(),
  base_price: Joi.number().min(0).required(),
  duration_minutes: Joi.number().integer().min(1).default(60),
  samagri_list: Joi.array().items(samagriItemSchema).min(1).required(),
  is_active: Joi.boolean().optional(),
});

const updatePoojaTypeSchema = Joi.object({
  name_en: Joi.string().trim().min(2).max(255).optional(),
  name_hi: Joi.string().trim().min(2).max(255).optional(),
  description_en: Joi.string().trim().allow("", null).optional(),
  description_hi: Joi.string().trim().allow("", null).optional(),
  base_price: Joi.number().min(0).optional(),
  duration_minutes: Joi.number().integer().min(1).optional(),
  samagri_list: Joi.array().items(samagriItemSchema).min(1).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

module.exports = {
  createPoojaTypeSchema,
  updatePoojaTypeSchema,
};

