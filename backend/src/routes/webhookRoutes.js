const express = require("express");

const { handleRazorpayWebhook } = require("../controllers/paymentController");

const router = express.Router();

router.post("/razorpay", handleRazorpayWebhook);

module.exports = router;
