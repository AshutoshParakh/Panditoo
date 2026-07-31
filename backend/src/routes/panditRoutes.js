const express = require("express");
const { listPanditRequests, getPanditEarnings, updatePanditProfile, requestWithdrawal } = require("../controllers/panditController");
const { authenticatePandit } = require("../middleware/authMiddleware");

const router = express.Router();
const credits = require("../controllers/creditController");

router.get("/:id/requests", authenticatePandit, listPanditRequests);
router.get("/:id/earnings", authenticatePandit, getPanditEarnings);
router.post("/:id/withdrawals", authenticatePandit, requestWithdrawal);
router.get("/:id/credits", authenticatePandit, credits.getCreditWallet);
router.post("/:id/credits/create-order", authenticatePandit, credits.createCreditOrder);
router.post("/:id/credits/verify", authenticatePandit, credits.verifyCreditPurchase);
router.patch("/:id", authenticatePandit, updatePanditProfile);

module.exports = router;
