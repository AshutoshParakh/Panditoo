const express = require("express");

const {
  createBooking,
  getBookingById,
  listBookingsForUser,
  cancelBookingByUser,
  handlePanditBookingResponse,
  markBookingCompletedByPandit,
  listRequestsForPandit,
  listBookingsForPandit,
  getBookingByIdForPandit,
} = require("../controllers/bookingController");
const { authenticateUser, authenticatePandit } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createBookingSchema, panditResponseSchema } = require("../validations/bookingValidation");

const router = express.Router();

router.post("/create", authenticateUser, validate(createBookingSchema), createBooking);
router.get("/user/:userId", authenticateUser, listBookingsForUser);
router.patch("/:bookingId/cancel", authenticateUser, cancelBookingByUser);
router.get("/pandit/requests", authenticatePandit, listRequestsForPandit);
router.get("/pandit/bookings", authenticatePandit, listBookingsForPandit);
router.get("/pandit/bookings/:id", authenticatePandit, getBookingByIdForPandit);
router.get("/:id", authenticateUser, getBookingById);
router.post(
  "/:bookingId/pandit-response",
  authenticatePandit,
  validate(panditResponseSchema),
  handlePanditBookingResponse
);
router.post("/:bookingId/complete", authenticatePandit, markBookingCompletedByPandit);
router.patch("/:bookingId/complete", authenticatePandit, markBookingCompletedByPandit);

module.exports = router;
