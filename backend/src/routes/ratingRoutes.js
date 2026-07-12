const express = require("express");

const { createRating } = require("../controllers/ratingController");
const { authenticateUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticateUser, createRating);

module.exports = router;
