const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const signAuthToken = ({ id, phone, email, type }) => {
  return jwt.sign(
    {
      sub: id,
      phone,
      email,
      type,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const verifyAuthToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
