const { query } = require("../config/db");

const listAllPandits = async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        address, 
        is_verified, 
        is_active, 
        rating, 
        experience_years, 
        service_radius_km, 
        latitude, 
        longitude, 
        bank_account_details, 
        id_proof_url, 
        created_at 
      FROM pandits 
      ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPandit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verify } = req.body; // boolean

    const verifyVal = verify !== false; // default to true

    const result = await query(
      `
      UPDATE pandits
      SET 
        is_verified = $1, 
        is_active = $1, 
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, phone, is_verified, is_active
      `,
      [verifyVal, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: verifyVal ? "Pandit verified successfully" : "Pandit verification revoked",
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listAllPandits,
  verifyPandit,
};
