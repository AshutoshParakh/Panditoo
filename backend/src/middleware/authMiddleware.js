const { verifyAuthToken } = require("../utils/jwt");

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
};

const createAuthenticator = (expectedType, requestKey) => {
  return (req, res, next) => {
    try {
      const token = getBearerToken(req);

      if (!token) {
        return res.status(401).json({ success: false, message: "Authentication token missing" });
      }

      const payload = verifyAuthToken(token);

      if (payload.type !== expectedType) {
        return res.status(403).json({ success: false, message: "Insufficient token scope" });
      }

      req[requestKey] = {
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
};

const authenticateUser = createAuthenticator("user", "user");
const authenticatePandit = createAuthenticator("pandit", "pandit");
const authenticateAdmin = createAuthenticator("admin", "admin");

module.exports = {
  authenticateUser,
  authenticatePandit,
  authenticateAdmin,
};
