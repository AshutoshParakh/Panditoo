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

router.use(authenticateAdmin);

router.get("/dashboard-stats", getDashboardStats);

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


