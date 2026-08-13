const express = require("express");

const {
  listAdminPoojaTypes,
  createPoojaType,
  updatePoojaType,
  deletePoojaType,
} = require("../controllers/poojaTypeController");
const {
  listAllPandits,
  listAdminUsers,
  listAdminPayments,
  getAdminPanditById,
  getDashboardStats,
  listAdminBookings,
  getAdminBookingTimeline,
  forceExpireBooking,
  manuallyAssignPandit,
  markPayoutPaid,
  verifyPandit,
  deactivatePandit,
} = require("../controllers/adminController");
const { authenticateAdmin } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const {
  createPoojaTypeSchema,
  updatePoojaTypeSchema,
} = require("../validations/poojaTypeValidation");

const router = express.Router();
const pricingAdmin = require("../controllers/pricingAdminController");
const walletAdmin = require("../controllers/walletAdminController");
const referrals = require("../controllers/referralController");
const analytics = require("../controllers/analyticsController");

router.use(authenticateAdmin);

router.get("/dashboard-stats", getDashboardStats);
router.get("/analytics/journey-funnel", analytics.getJourneyAnalytics);
router.get("/referrals", referrals.listCampaigns);
router.post("/referrals", referrals.saveCampaign);
router.put("/referrals/:id", referrals.saveCampaign);
router.patch("/referrals/:id", referrals.toggleCampaign);
router.get("/pricing-control", pricingAdmin.getPricingControl);
router.get("/withdrawals", walletAdmin.listWithdrawals);
router.patch("/withdrawals/:id", walletAdmin.processWithdrawal);
router.put("/pricing-control/settings", pricingAdmin.updateSettings);
router.post("/pricing-control/slots", pricingAdmin.saveSlot);
router.put("/pricing-control/slots/:id", pricingAdmin.saveSlot);
router.patch("/pricing-control/slots/:id", pricingAdmin.toggleSlot);
router.post("/pricing-control/rules", pricingAdmin.saveRule);
router.put("/pricing-control/rules/:id", pricingAdmin.saveRule);
router.patch("/pricing-control/rules/:id", pricingAdmin.toggleRule);
router.post("/pricing-control/credit-rules", pricingAdmin.saveCreditRule);
router.put("/pricing-control/credit-rules/:id", pricingAdmin.saveCreditRule);
router.patch("/pricing-control/credit-rules/:id", pricingAdmin.toggleCreditRule);
router.post("/pricing-control/coupons", pricingAdmin.saveCoupon);
router.put("/pricing-control/coupons/:id", pricingAdmin.saveCoupon);
router.patch("/pricing-control/coupons/:id", pricingAdmin.toggleCoupon);
router.post("/pricing-control/offers", pricingAdmin.saveOffer);
router.put("/pricing-control/offers/:id", pricingAdmin.saveOffer);
router.patch("/pricing-control/offers/:id", pricingAdmin.toggleOffer);

router.get("/bookings", listAdminBookings);
router.get("/bookings/:id/timeline", getAdminBookingTimeline);
router.patch("/bookings/:id/force-expire", forceExpireBooking);
router.patch("/bookings/:id/manual-assign", manuallyAssignPandit);
router.patch("/bookings/:id/mark-payout-paid", markPayoutPaid);

router.get("/users", listAdminUsers);
router.get("/payments", listAdminPayments);

router.get("/pooja-types", listAdminPoojaTypes);
router.post("/pooja-types", validate(createPoojaTypeSchema), createPoojaType);
router.put("/pooja-types/:id", validate(updatePoojaTypeSchema), updatePoojaType);
router.delete("/pooja-types/:id", deletePoojaType);

router.get("/pandits", listAllPandits);
router.get("/pandits/:id", getAdminPanditById);
router.put("/pandits/:id/verify", verifyPandit);
router.patch("/pandits/:id/verify", verifyPandit);
router.patch("/pandits/:id/deactivate", deactivatePandit);

module.exports = router;


