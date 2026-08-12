const express = require("express");
const { recordJourneyEvent } = require("../controllers/analyticsController");

const router = express.Router();

router.post("/event", recordJourneyEvent);

module.exports = router;
