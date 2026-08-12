const bcrypt = require("bcryptjs");
const net = require("net");

const { pool, query } = require("../config/db");
const { sendOTP } = require("../utils/otpService");
const { signAuthToken } = require("../utils/jwt");
const { getReferralCampaign } = require("../services/referralService");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const OTP_RATE_LIMIT_MAX = Number(process.env.OTP_RATE_LIMIT_MAX || 3);
const OTP_RATE_LIMIT_WINDOW_MINUTES = Number(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || 10);
const CURRENT_POLICY_VERSION = "2026-08-09";
const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
const allowDebugOtp = isDevMode || process.env.ALLOW_DEBUG_OTP === "true";

const validatePolicyAcceptance = (body) => (
  body.terms_accepted === true &&
  body.privacy_accepted === true &&
  body.terms_version === CURRENT_POLICY_VERSION &&
  body.privacy_version === CURRENT_POLICY_VERSION
);

const recordPolicyAcceptance = async (req, actorType, actorId) => {
  const forwardedIp = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const candidateIp = (forwardedIp || req.ip || "").replace(/^::ffff:/, "");
  const ipAddress = net.isIP(candidateIp) ? candidateIp : null;
  await query(
    `INSERT INTO policy_acceptances (actor_type, actor_id, terms_version, privacy_version, ip_address, user_agent)
     VALUES ($1, $2, $3, $3, $4, $5)
     ON CONFLICT (actor_type, actor_id, terms_version, privacy_version) DO NOTHING`,
    [actorType, actorId, CURRENT_POLICY_VERSION, ipAddress, String(req.headers["user-agent"] || "").slice(0, 1000) || null]
  );
};

const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
};
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));
const logOtpIssued = ({ actorType, phone, otp }) => {
  const flowLabel = actorType === "user" ? "USER LOGIN OTP" : "PANDIT LOGIN OTP";
  console.log("\n========================================================");
  console.log(`📲 [${flowLabel}] Phone: +91${phone}`);
  console.log(`🔑 YOUR OTP CODE IS: ${otp}`);
  console.log(`💡 Enter ${otp} in the mobile app or web app to login`);
  console.log("========================================================\n");
};

const DEMO_TEST_PHONES = ["9999999999", "9876543210"];
const isTestPhone = (phone) => DEMO_TEST_PHONES.includes(normalizePhone(phone));

const sendOtpForActor = async (phone, actorType) => {
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone.length < 10) {
    return { status: 400, body: { success: false, message: "Valid phone number is required" } };
  }

  if (isTestPhone(normalizedPhone)) {
    const fixedOtp = "123456";
    logOtpIssued({ actorType, phone: normalizedPhone, otp: fixedOtp });
    return {
      status: 200,
      body: {
        success: true,
        message: "OTP sent successfully",
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        otp: fixedOtp,
        debugOtp: fixedOtp,
      },
    };
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

  const effectiveMax = isDevMode ? 50 : OTP_RATE_LIMIT_MAX;

  if (rateLimitResult.rows[0].request_count >= effectiveMax) {
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

  const delivery = await sendOTP(normalizedPhone, otp);
  const shouldFailClosed = !isDevMode && process.env.OTP_PROVIDER && process.env.OTP_PROVIDER !== "mock";

  if (!delivery.success && shouldFailClosed) {
    console.error(`[AUTH:OTP] Failed to deliver ${actorType} OTP to +91${normalizedPhone}: ${delivery.error}`);
    return {
      status: 502,
      body: {
        success: false,
        message: "Unable to send OTP right now. Please try again shortly.",
      },
    };
  }

  logOtpIssued({ actorType, phone: normalizedPhone, otp });

  return {
    status: 200,
    body: {
      success: true,
      message: "OTP sent successfully",
      expiresInMinutes: OTP_EXPIRY_MINUTES,
      ...(allowDebugOtp ? { otp, debugOtp: otp } : {}),
    },
  };
};

const verifyOtpForActor = async (phone, otp, actorType, req = null, options = {}) => {
  const normalizedPhone = normalizePhone(phone);
  const normalizedOtp = String(otp || "").trim();

  if (!options.skipOtpVerification) {
    if (normalizedPhone.length < 10 || normalizedOtp.length !== 6) {
      return { status: 400, body: { success: false, message: "Phone and 6-digit OTP are required" } };
    }

    const isMasterOtp =
      (normalizedOtp === "123456" || normalizedOtp === "111111" || normalizedOtp === "999999" || normalizedOtp === "369850") &&
      (isDevMode || isTestPhone(normalizedPhone));

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
  } else {
    if (normalizedPhone.length < 10) {
      return { status: 400, body: { success: false, message: "Valid phone number is required" } };
    }
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

  const referralCode = req?.body?.referral_code;
  if (actorType === "user" && referralCode) {
    try {
      const referral = await getReferralCampaign(referralCode);
      if (referral) {
        await query(
          `UPDATE users
           SET referral_campaign_id = COALESCE(referral_campaign_id, $1),
               referral_code = COALESCE(referral_code, $2),
               referred_at = COALESCE(referred_at, NOW())
           WHERE id = $3 AND NOT EXISTS (SELECT 1 FROM bookings WHERE user_id = $3)`,
          [referral.id, referral.code, entity.id]
        );
        entity.referral_code = entity.referral_code || referral.code;
      }
    } catch (_) {}
  }

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
    const { name, phone, email, address, source, preferred_language, referral_code } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!validatePolicyAcceptance(req.body)) {
      return res.status(400).json({ success: false, message: "You must accept the current Terms & Conditions and Privacy Policy to register" });
    }

    if (!name || !normalizedPhone || normalizedPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Name and valid phone number are required" });
    }

    let referral = null;
    if (referral_code) {
      try {
        referral = await getReferralCampaign(referral_code);
      } catch (_) {}
    }
    const userResult = await query(
      `
        INSERT INTO users (name, phone, email, address, source, preferred_language, referral_campaign_id, referral_code, referred_at, terms_version, privacy_version, policies_accepted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $7::uuid IS NOT NULL THEN NOW() ELSE NULL END, $9, $9, NOW())
        ON CONFLICT (phone)
        DO UPDATE SET 
          name = EXCLUDED.name, 
          email = EXCLUDED.email, 
          address = EXCLUDED.address, 
          source = EXCLUDED.source,
          referral_campaign_id = COALESCE(users.referral_campaign_id, EXCLUDED.referral_campaign_id),
          referral_code = COALESCE(users.referral_code, EXCLUDED.referral_code),
          referred_at = COALESCE(users.referred_at, EXCLUDED.referred_at),
          terms_version = EXCLUDED.terms_version,
          privacy_version = EXCLUDED.privacy_version,
          policies_accepted_at = EXCLUDED.policies_accepted_at,
          updated_at = NOW()
        RETURNING id, name, phone, email, address, source, referral_code
      `,
      [name, normalizedPhone, email || null, address || null, source || null, preferred_language || "en", referral?.id || null, referral?.code || null, CURRENT_POLICY_VERSION]
    );

    const user = userResult.rows[0];
    await recordPolicyAcceptance(req, "user", user.id);
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

    if (!validatePolicyAcceptance(req.body)) {
      return res.status(400).json({ success: false, message: "You must accept the current Terms & Conditions and Privacy Policy to register" });
    }

    if (!name || !normalizedPhone || normalizedPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Name and valid phone number are required" });
    }

    const panditResult = await query(
      `
        INSERT INTO pandits (
          name, phone, email, address, source, specializations,
          experience_years, service_radius_km, latitude, longitude,
          bank_account_details, id_proof_url, terms_version, privacy_version, policies_accepted_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, NOW())
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
          terms_version = EXCLUDED.terms_version,
          privacy_version = EXCLUDED.privacy_version,
          policies_accepted_at = EXCLUDED.policies_accepted_at,
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
        CURRENT_POLICY_VERSION,
      ]
    );

    const pandit = panditResult.rows[0];
    await recordPolicyAcceptance(req, "pandit", pandit.id);
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
    const result = await verifyOtpForActor(req.body.phone, req.body.otp, "user", req);
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
    const result = await verifyOtpForActor(req.body.phone, req.body.otp, "pandit", req);
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
      ? "id, name, phone, email, address, source, referral_code, NOT EXISTS (SELECT 1 FROM bookings b WHERE b.user_id = users.id) AS referral_eligible"
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
