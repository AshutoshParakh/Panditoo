const express = require("express");

const {
  listAdminPoojaTypes,
  createPoojaType,
  updatePoojaType,
  deletePoojaType,
} = require("../controllers/poojaTypeController");
const {
  listAllPandits,
  verifyPandit,
} = require("../controllers/adminController");
const { authenticateAdmin } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const {
  createPoojaTypeSchema,
  updatePoojaTypeSchema,
} = require("../validations/poojaTypeValidation");

const router = express.Router();

router.use(authenticateAdmin);

// Pooja Type Management
router.get("/pooja-types", listAdminPoojaTypes);
router.post("/pooja-types", validate(createPoojaTypeSchema), createPoojaType);
router.put("/pooja-types/:id", validate(updatePoojaTypeSchema), updatePoojaType);
router.delete("/pooja-types/:id", deletePoojaType);

// Pandit Verification Management
router.get("/pandits", listAllPandits);
router.put("/pandits/:id/verify", verifyPandit);

module.exports = router;
