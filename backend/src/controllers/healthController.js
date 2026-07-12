const { query } = require("../config/db");

const getHealth = async (_req, res, next) => {
  try {
    await query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "API healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
};
