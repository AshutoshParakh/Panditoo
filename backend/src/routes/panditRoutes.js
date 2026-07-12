const express = require("express");
const { listPanditRequests, getPanditEarnings, updatePanditProfile } = require("../controllers/panditController");
const { authenticatePandit } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:id/requests", authenticatePandit, listPanditRequests);
router.get("/:id/earnings", authenticatePandit, getPanditEarnings);
router.patch("/:id", authenticatePandit, updatePanditProfile);

module.exports = router;
