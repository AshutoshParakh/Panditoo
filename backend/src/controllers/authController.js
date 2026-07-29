const bcrypt = require("bcryptjs");

const { pool, query } = require("../config/db");
const { sendOTP } = require("../utils/otpService");
const { signAuthToken } = require("../utils/jwt");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const OTP_RATE_LIMIT_MAX = Number(process.env.OTP_RATE_LIMIT_MAX || 3);
const OTP_RATE_LIMIT_WINDOW_MINUTES = Number(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || 10);

const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "");
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpForActor = async (phone, actorType) => {
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone.length < 10) {
    return { status: 400, body: { success: false, message: "Valid phone number is required" } };
  }

  const rateLimitResult = await query(
    `
      SELECT COUNT(*)::int AS request_count
      FROM otp_verifications
      WHERE phone = $1
        AND actor_type = $2
        AND created_at >= NOW() - ($3::text || ' minutes')::interval
    `,
    [normalizedPhone, actorType, OTP_RATE_LIMIT_WINDOW_MINUTES]
  );

  if (rateLimitResult.rows[0].request_count >= OTP_RATE_LIMIT_MAX) {
    return {
      status: 429,
      body: {
        success: false,
        message: `Too many OTP requests. Try again after ${OTP_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      },
    };
  }

  const otp = generateOTP();

  await query(
    `
      INSERT INTO otp_verifications (phone, actor_type, otp, expires_at)
      VALUES ($1, $2, $3, NOW() + ($4::text || ' minutes')::interval)
    `,
    [normalizedPhone, actorType, otp, OTP_EXPIRY_MINUTES]
  );

  await sendOTP(normalizedPhone, otp);

  return {
    status: 200,
    body: {
      success: true,
      message: "OTP sent successfully",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    },
  };
};

const verifyOtpForActor = async (phone, otp, actorType) => {
  const normalizedPhone = normalizePhone(phone);
  const normalizedOtp = String(otp || "").trim();

  if (normalizedPhone.length < 10 || normalizedOtp.length !== 6) {
    return { status: 400, body: { success: false, message: "Phone and 6-digit OTP are required" } };
  }

  const isDevMode = process.env.NODE_ENV === "development";
  const isMasterOtp = isDevMode && (normalizedOtp === "123456" || normalizedOtp === "111111");

  let otpId = null;
  if (!isMasterOtp) {
    const otpResult = await query(
      `
        SELECT id
        FROM otp_verifications
        WHERE phone = $1
          AND actor_type = $2
          AND otp = $3
          AND consumed_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [normalizedPhone, actorType, normalizedOtp]
    );

    if (otpResult.rowCount === 0) {
      return { status: 400, body: { success: false, message: "Invalid or expired OTP" } };
    }
    otpId = otpResult.rows[0].id;
  }

  if (otpId) {
    await query(
      `
        UPDATE otp_verifications
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [otpId]
    );
  }

  const tableName = actorType === "user" ? "users" : "pandits";
  const fields = actorType === "user"
    ? "id, name, phone, email, address, source"
    : "id, name, phone, email, address, source, specializations, experience_years, service_radius_km, latitude, longitude, bank_account_details, id_proof_url, is_verified, is_active";
  const existingResult = await query(
    `SELECT ${fields} FROM ${tableName} WHERE phone = $1 LIMIT 1`,
    [normalizedPhone]
  );

  if (existingResult.rowCount === 0) {
    // User does not exist, return isNewUser: true so frontend can collect details
    return {
      status: 200,
      body: {
        success: true,
        isNewUser: true,
        phone: normalizedPhone,
      },
    };
  }

  const entity = existingResult.rows[0];
  const token = signAuthToken({
    id: entity.id,
    phone: entity.phone,
    email: entity.email,
    type: actorType,
  });

  return {
    status: 200,
    body: {
      success: true,
      isNewUser: false,
      token,
      [actorType]: entity,
    },
  };
};

const registerUser = async (req, res, next) => {
  try {
    const { name, phone, email, address, source, preferred_language } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || !normalizedPhone || normalizedPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Name and valid phone number are required" });
    }

    const userResult = await query(
      `
        INSERT INTO users (name, phone, email, address, source, preferred_language)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (phone)
        DO UPDATE SET 
          name = EXCLUDED.name, 
          email = EXCLUDED.email, 
          address = EXCLUDED.address, 
          source = EXCLUDED.source,
          updated_at = NOW()
        RETURNING id, name, phone, email, address, source
      `,
      [name, normalizedPhone, email || null, address || null, source || null, preferred_language || "en"]
    );

    const user = userResult.rows[0];
    const token = signAuthToken({
      id: user.id,
      phone: user.phone,
      email: user.email,
      type: "user",
    });

    return res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const registerPandit = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      source,
      specializations,
      experience_years,
      service_radius_km,
      latitude,
      longitude,
      bank_account_details,
      id_proof_url,
    } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || !normalizedPhone || normalizedPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Name and valid phone number are required" });
    }

    const panditResult = await query(
      `
        INSERT INTO pandits (
          name, phone, email, address, source, specializations,
          experience_years, service_radius_km, latitude, longitude,
          bank_account_details, id_proof_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (phone)
        DO UPDATE SET 
          name = EXCLUDED.name, 
          email = EXCLUDED.email, 
          address = EXCLUDED.address, 
          source = EXCLUDED.source,
          specializations = EXCLUDED.specializations,
          experience_years = EXCLUDED.experience_years,
          service_radius_km = EXCLUDED.service_radius_km,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          bank_account_details = EXCLUDED.bank_account_details,
          id_proof_url = EXCLUDED.id_proof_url,
          updated_at = NOW()
        RETURNING id, name, phone, email, address, source, specializations, experience_years, service_radius_km, latitude, longitude, bank_account_details, id_proof_url, is_verified, is_active
      `,
      [
        name,
        normalizedPhone,
        email || null,
        address || null,
        source || null,
        specializations || [],
        experience_years ? parseInt(experience_years) : null,
        service_radius_km ? parseInt(service_radius_km) : 15,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        bank_account_details ? (typeof bank_account_details === "object" ? JSON.stringify(bank_account_details) : bank_account_details) : "{}",
        id_proof_url || null,
      ]
    );

    const pandit = panditResult.rows[0];
    const token = signAuthToken({
      id: pandit.id,
      phone: pandit.phone,
      email: pandit.email,
      type: "pandit",
    });

    return res.status(201).json({
      success: true,
      token,
      pandit,
    });
  } catch (error) {
    return next(error);
  }
};

const sendUserOtp = async (req, res, next) => {
  try {
    const result = await sendOtpForActor(req.body.phone, "user");
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
};

const verifyUserOtp = async (req, res, next) => {
  try {
    const result = await verifyOtpForActor(req.body.phone, req.body.otp, "user");
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
};

const sendPanditOtp = async (req, res, next) => {
  try {
    const result = await sendOtpForActor(req.body.phone, "pandit");
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
};

const verifyPanditOtp = async (req, res, next) => {
  try {
    const result = await verifyOtpForActor(req.body.phone, req.body.otp, "pandit");
    return res.status(result.status).json(result.body);
  } catch (error) {
    return next(error);
  }
};

const adminLogin = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const adminResult = await query(
      `
        SELECT id, name, email, password_hash, role
        FROM admins
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
      [email]
    );

    if (adminResult.rowCount === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const admin = adminResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = signAuthToken({
      id: admin.id,
      phone: null,
      email: admin.email,
      type: "admin",
    });

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const actorType = req.user.type;
    const userId = req.user.id;

    const tableName = actorType === "user" ? "users" : "pandits";
    const fields = actorType === "user"
      ? "id, name, phone, email, address, source"
      : "id, name, phone, email, address, source, specializations, experience_years, service_radius_km, latitude, longitude, bank_account_details, id_proof_url, is_verified, is_active";
    const result = await query(
      `SELECT ${fields} FROM ${tableName} WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      [actorType]: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const updateCurrentUser = async (req, res, next) => {
  try {
    if (req.user.type !== "user") return res.status(403).json({ success: false, message: "User account required" });
    const name = String(req.body.name || "").trim();
    const email = req.body.email ? String(req.body.email).trim() : null;
    const address = req.body.address ? String(req.body.address).trim() : null;
    if (!name || name.length > 150) return res.status(400).json({ success: false, message: "A valid name is required" });
    const result = await query(
      `UPDATE users SET name = $1, email = $2, address = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, name, phone, email, address, source`,
      [name, email, address, req.user.id]
    );
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) { return next(error); }
};

const deleteCurrentUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (req.user.type !== "user") return res.status(403).json({ success: false, message: "User account required" });
    await client.query("BEGIN");
    await client.query("DELETE FROM ratings WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)", [req.user.id]);
    await client.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)", [req.user.id]);
    await client.query("DELETE FROM booking_requests WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)", [req.user.id]);
    await client.query("DELETE FROM bookings WHERE user_id = $1", [req.user.id]);
    await client.query("DELETE FROM users WHERE id = $1", [req.user.id]);
    await client.query("COMMIT");
    return res.status(200).json({ success: true });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    return next(error);
  } finally { client.release(); }
};

module.exports = {
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
};
