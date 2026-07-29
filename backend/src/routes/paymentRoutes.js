const express = require("express");

const {
  createPaymentOrder,
  verifyPayment,
  listUserPayments,
} = require("../controllers/paymentController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createPaymentOrderSchema, verifyPaymentSchema } = require("../validations/paymentValidation");

const router = express.Router();

router.post("/create-order", authenticateUser, validate(createPaymentOrderSchema), createPaymentOrder);
router.post("/verify", authenticateUser, validate(verifyPaymentSchema), verifyPayment);
router.get("/history", authenticateUser, listUserPayments);

module.exports = router;
