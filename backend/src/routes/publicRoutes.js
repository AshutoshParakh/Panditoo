const express = require("express");

const { listPublicPoojaTypes } = require("../controllers/poojaTypeController");
const { listNearbyPandits } = require("../controllers/panditController");

const router = express.Router();

router.get("/pooja-types", listPublicPoojaTypes);
router.get("/pandits/nearby", listNearbyPandits);

module.exports = router;
