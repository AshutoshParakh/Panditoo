const express = require("express");

const {
  createPaymentOrder,
  verifyPayment,
} = require("../controllers/paymentController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createPaymentOrderSchema, verifyPaymentSchema } = require("../validations/paymentValidation");

const router = express.Router();

router.post("/create-order", authenticateUser, validate(createPaymentOrderSchema), createPaymentOrder);
router.post("/verify", authenticateUser, validate(verifyPaymentSchema), verifyPayment);

module.exports = router;
