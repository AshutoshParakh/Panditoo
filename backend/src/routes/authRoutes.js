const express = require("express");

const {
  sendUserOtp,
  verifyUserOtp,
  sendPanditOtp,
  verifyPanditOtp,
  registerUser,
  registerPandit,
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
  adminLogin,
  verifyFirebaseToken,
} = require("../controllers/authController");
const { verifyAuthToken } = require("../utils/jwt");

const authenticateGeneric = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authorization token required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAuthToken(token);
    req.user = {
      id: payload.sub,
      phone: payload.phone,
      email: payload.email,
      type: payload.type,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

const router = express.Router();

router.post("/user/send-otp", sendUserOtp);
router.post("/user/verify-otp", verifyUserOtp);
router.post("/verify-firebase", verifyFirebaseToken);
router.post("/user/register", registerUser);
router.post("/pandit/send-otp", sendPanditOtp);
router.post("/pandit/verify-otp", verifyPanditOtp);
router.post("/pandit/register", registerPandit);
router.post("/admin/login", adminLogin);
router.get("/me", authenticateGeneric, getCurrentUser);
router.patch("/me", authenticateGeneric, updateCurrentUser);
router.delete("/me", authenticateGeneric, deleteCurrentUser);

module.exports = router;
