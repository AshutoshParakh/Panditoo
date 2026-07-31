const express = require("express");
const { getPublicBookingConfig, getActiveOffers, quotePrice } = require("../controllers/pricingController");

const { listPublicPoojaTypes } = require("../controllers/poojaTypeController");
const { listNearbyPandits } = require("../controllers/panditController");

const router = express.Router();
router.get("/booking-config", getPublicBookingConfig);
router.get("/offers/active", getActiveOffers);
router.post("/pricing/quote", quotePrice);

router.get("/pooja-types", listPublicPoojaTypes);
router.get("/pandits/nearby", listNearbyPandits);

module.exports = router;
