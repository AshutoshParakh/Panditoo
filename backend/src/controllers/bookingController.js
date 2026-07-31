const { pool, query } = require("../config/db");
const {
  triggerBookingWonNotifications,
  notifyPanditAlreadyBooked,
} = require("../utils/notifications");
const { lockPanditCalendar } = require("../utils/calendar");
const crypto = require("crypto");
const { sendOTP } = require("../utils/otpService");

const serviceOtpHash = (bookingId, phase, otp) =>
  crypto.createHash("sha256").update(`${bookingId}:${phase}:${otp}`).digest("hex");
const generateServiceOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const parsePagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "10", 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const createBooking = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      pooja_type_id,
      booking_date,
      booking_time,
      address,
      selected_pandit_ids,
    } = req.body;

    const latVal = Number(req.body.latitude);
    const lngVal = Number(req.body.longitude);
    const latitude = !Number.isNaN(latVal) ? latVal : 22.7196;
    const longitude = !Number.isNaN(lngVal) ? lngVal : 75.8577;

    await client.query("BEGIN");

    const poojaTypeResult = await client.query(
      `
        SELECT id, name_en, name_hi, base_price, is_active
        FROM pooja_types
        WHERE id = $1
        LIMIT 1
      `,
      [pooja_type_id]
    );

    if (poojaTypeResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Pooja type not found" });
    }

    const poojaType = poojaTypeResult.rows[0];
    if (!poojaType.is_active) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Selected pooja type is inactive" });
    }

    // Filter pandit IDs and sanitize UUIDs
    const rawPanditIds = Array.isArray(selected_pandit_ids) ? selected_pandit_ids : [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validUuidPandits = rawPanditIds.filter((id) => uuidRegex.test(id));

    let panditIdsToAssign = validUuidPandits;

    if (validUuidPandits.length > 0) {
      const panditResult = await client.query(
        `
          SELECT id
          FROM pandits
          WHERE id = ANY($1::uuid[])
            AND is_active = TRUE
        `,
        [validUuidPandits]
      );
      panditIdsToAssign = panditResult.rows.map((r) => r.id);
    }

    // Fallback if no valid UUID pandits exist in DB
    if (panditIdsToAssign.length === 0) {
      const activePanditsRes = await client.query(
        `SELECT id FROM pandits WHERE is_active = TRUE LIMIT 3`
      );
      panditIdsToAssign = activePanditsRes.rows.map((r) => r.id);
    }

    const basePrice = Number(poojaType.base_price);
    const prepaidAmount = Number((basePrice * 0.3).toFixed(2));
    const panditPayoutAmount = Number((basePrice * 0.7).toFixed(2));

    const bookingResult = await client.query(
      `
        INSERT INTO bookings (
          user_id,
          pooja_type_id,
          booking_date,
          booking_time,
          address,
          latitude,
          longitude,
          status,
          current_batch,
          current_radius_km,
          total_price,
          prepaid_amount,
          prepaid_status,
          pandit_payout_amount,
          pandit_payout_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 1, 15, $8, $9, 'pending', $10, 'pending')
        RETURNING id, user_id, pooja_type_id, status, total_price, prepaid_amount, prepaid_status, pandit_payout_amount, pandit_payout_status, created_at
      `,
      [
        req.user.id,
        pooja_type_id,
        booking_date,
        booking_time,
        address,
        latitude,
        longitude,
        basePrice,
        prepaidAmount,
        panditPayoutAmount,
      ]
    );

    const booking = bookingResult.rows[0];

    for (const panditId of panditIdsToAssign) {
      await client.query(
        `
          INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status)
          VALUES ($1, $2, 1, 'pending')
        `,
        [booking.id, panditId]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      booking_id: booking.id,
      booking,
      prepayment: {
        total_price: basePrice,
        prepaid_amount: prepaidAmount,
        pandit_payout_amount: panditPayoutAmount,
        currency: process.env.RAZORPAY_CURRENCY || "INR",
      },
      next_step: "Call POST /api/payments/create-order to create the Razorpay prepayment order.",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackError) {}
    console.error("[Booking Creation Error]:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  } finally {
    client.release();
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT
          b.id,
          b.user_id,
          b.pooja_type_id,
          b.booking_date,
          b.booking_time,
          b.address,
          b.latitude,
          b.longitude,
          b.status,
          b.current_batch,
          b.current_radius_km,
          b.total_price,
          b.prepaid_amount,
          b.prepaid_status,
          b.confirmed_pandit_id,
          b.pandit_payout_amount,
          b.pandit_payout_status,
          b.created_at,
          b.updated_at,
          pt.name_en,
          pt.name_hi,
          pt.description_en,
          pt.description_hi
        FROM bookings b
        INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
        WHERE b.id = $1
          AND b.user_id = $2
        LIMIT 1
      `,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = result.rows[0];

    // Fetch total notified requests count
    const requestsResult = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM booking_requests
        WHERE booking_id = $1
      `,
      [booking.id]
    );
    booking.notified_pandits_count = requestsResult.rows[0]?.count || 0;

    // Fetch confirmed pandit details if any
    if (booking.confirmed_pandit_id) {
      const panditResult = await query(
        `
          SELECT name, rating
          FROM pandits
          WHERE id = $1
          LIMIT 1
        `,
        [booking.confirmed_pandit_id]
      );
      if (panditResult.rowCount > 0) {
        booking.confirmed_pandit = panditResult.rows[0];
      }
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    return next(error);
  }
};

const listBookingsForUser = async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "You can only access your own bookings" });
    }

    const { page, limit, offset } = parsePagination(req);

    const [countResult, bookingsResult] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM bookings WHERE user_id = $1", [req.user.id]),
      query(
        `
          SELECT
            b.id,
            b.user_id,
            b.pooja_type_id,
            b.booking_date,
            b.booking_time,
            b.address,
            b.status,
            b.total_price,
            b.prepaid_amount,
            b.prepaid_status,
            b.confirmed_pandit_id,
            b.pandit_payout_amount,
            b.pandit_payout_status,
            b.created_at,
            b.updated_at,
            pt.name_en,
            pt.name_hi,
            CASE WHEN p.id IS NOT NULL THEN json_build_object(
              'id', p.id,
              'name', p.name,
              'rating', p.rating
            ) ELSE NULL END AS confirmed_pandit
          FROM bookings b
          INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
          LEFT JOIN pandits p ON p.id = b.confirmed_pandit_id
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC
          LIMIT $2 OFFSET $3
        `,
        [req.user.id, limit, offset]
      ),
    ]);

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      data: bookingsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const cancelBookingByUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE bookings
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND status IN ('pending', 'confirmed')
       RETURNING *`,
      [req.params.bookingId, req.user.id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "This booking cannot be cancelled." });
    }

    await client.query(
      `UPDATE booking_requests
       SET status = 'lost', responded_at = COALESCE(responded_at, NOW())
       WHERE booking_id = $1 AND status IN ('pending', 'won')`,
      [req.params.bookingId]
    );
    await client.query("COMMIT");
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    return next(error);
  } finally {
    client.release();
  }
};

const handlePanditBookingResponse = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { bookingId } = req.params;
    const { response } = req.body;
    const panditId = req.pandit.id;

    await client.query("BEGIN");

    const requestResult = await client.query(
      `
        SELECT br.id, br.status, br.booking_id, b.booking_date, b.booking_time, b.prepaid_status
        FROM booking_requests br
        INNER JOIN bookings b ON b.id = br.booking_id
        WHERE br.booking_id = $1
          AND br.pandit_id = $2
        LIMIT 1
      `,
      [bookingId, panditId]
    );

    if (requestResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Booking request not found" });
    }

    const bookingRequest = requestResult.rows[0];

    if (bookingRequest.prepaid_status !== "paid") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "payment_pending" });
    }

    if (response === "not_interested") {
      await client.query(
        `
          UPDATE booking_requests
          SET status = 'lost', responded_at = NOW()
          WHERE booking_id = $1
            AND pandit_id = $2
        `,
        [bookingId, panditId]
      );

      await client.query("COMMIT");
      return res.status(200).json({ success: true, message: "response_recorded" });
    }

    const bookingUpdateResult = await client.query(
      `
        UPDATE bookings
        SET status = 'confirmed', confirmed_pandit_id = $1, updated_at = NOW()
        WHERE id = $2 AND status = 'pending'
        RETURNING *
      `,
      [panditId, bookingId]
    );

    if (bookingUpdateResult.rowCount === 1) {
      const updatedBooking = bookingUpdateResult.rows[0];

      await client.query(
        `
          UPDATE booking_requests
          SET status = CASE WHEN pandit_id = $1 THEN 'won'::booking_request_status ELSE 'lost'::booking_request_status END,
              responded_at = NOW()
          WHERE booking_id = $2
        `,
        [panditId, bookingId]
      );

      await client.query("COMMIT");

      await triggerBookingWonNotifications({ bookingId, panditId });
      await lockPanditCalendar({
        panditId,
        bookingId,
        bookingDate: bookingRequest.booking_date,
        bookingTime: bookingRequest.booking_time,
      });

      return res.status(200).json({
        success: true,
        message: "won",
        data: {
          booking_id: bookingId,
          status: updatedBooking.status,
          confirmed_pandit_id: updatedBooking.confirmed_pandit_id,
        },
      });
    }

    await client.query(
      `
        UPDATE booking_requests
        SET status = 'lost', responded_at = NOW()
        WHERE booking_id = $1
          AND pandit_id = $2
      `,
      [bookingId, panditId]
    );

    await client.query("COMMIT");
    await notifyPanditAlreadyBooked({ bookingId, panditId });

    return res.status(200).json({ success: false, message: "already_booked" });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackError) {
      // Ignore rollback failures.
    }
    return next(error);
  } finally {
    client.release();
  }
};

const markBookingCompletedByPandit = async (req, res, next) => {
  return res.status(400).json({ success: false, message: "End OTP verification is required to complete this booking" });
};

const sendServiceOtp = (phase) => async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const result = await query(
      `SELECT b.id, b.status, b.service_started_at, u.phone
       FROM bookings b INNER JOIN users u ON u.id = b.user_id
       WHERE b.id = $1 AND b.confirmed_pandit_id = $2 LIMIT 1`,
      [bookingId, req.pandit.id]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Booking not found" });
    const booking = result.rows[0];
    if (booking.status !== "confirmed") return res.status(400).json({ success: false, message: "Booking is not active" });
    if (phase === "start" && booking.service_started_at) return res.status(400).json({ success: false, message: "Pooja has already started" });
    if (phase === "end" && !booking.service_started_at) return res.status(400).json({ success: false, message: "Start the pooja first" });
    const otp = generateServiceOtp();
    await query(
      `UPDATE bookings SET ${phase}_otp_hash = $1, ${phase}_otp_expires_at = NOW() + INTERVAL '5 minutes', updated_at = NOW() WHERE id = $2`,
      [serviceOtpHash(bookingId, phase, otp), bookingId]
    );
    const delivery = await sendOTP(booking.phone, otp);
    if (!delivery.success) return res.status(502).json({ success: false, message: "Could not send OTP" });
    return res.json({ success: true, message: `${phase}_otp_sent`, expiresInMinutes: 5, ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}) });
  } catch (error) { return next(error); }
};

const verifyStartServiceOtp = async (req, res, next) => {
  try {
    const otp = String(req.body.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Enter a valid 6-digit OTP" });
    const result = await query(
      `UPDATE bookings SET service_started_at = NOW(), start_otp_hash = NULL, start_otp_expires_at = NULL, updated_at = NOW()
       WHERE id = $1 AND confirmed_pandit_id = $2 AND status = 'confirmed' AND service_started_at IS NULL
         AND start_otp_hash = $3 AND start_otp_expires_at > NOW()
       RETURNING service_started_at`,
      [req.params.bookingId, req.pandit.id, serviceOtpHash(req.params.bookingId, "start", otp)]
    );
    if (!result.rowCount) return res.status(400).json({ success: false, message: "Invalid or expired start OTP" });
    return res.json({ success: true, message: "pooja_started", service_started_at: result.rows[0].service_started_at });
  } catch (error) { return next(error); }
};

const verifyEndServiceOtp = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const otp = String(req.body.otp || "").trim();
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Enter a valid 6-digit OTP" });
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE bookings SET status = 'completed', service_completed_at = NOW(), end_otp_hash = NULL, end_otp_expires_at = NULL, updated_at = NOW()
       WHERE id = $1 AND confirmed_pandit_id = $2 AND status = 'confirmed' AND service_started_at IS NOT NULL
         AND end_otp_hash = $3 AND end_otp_expires_at > NOW()
       RETURNING id, pandit_payout_amount, service_started_at, service_completed_at`,
      [req.params.bookingId, req.pandit.id, serviceOtpHash(req.params.bookingId, "end", otp)]
    );
    if (!result.rowCount) { await client.query("ROLLBACK"); return res.status(400).json({ success: false, message: "Invalid or expired completion OTP" }); }
    await client.query(
      `INSERT INTO payments (booking_id, amount, type, status)
       SELECT $1, $2, 'pandit_payout', 'created'
       WHERE NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = $1 AND type = 'pandit_payout')`,
      [req.params.bookingId, result.rows[0].pandit_payout_amount]
    );
    await client.query("COMMIT");
    return res.json({ success: true, message: "booking_completed", service_started_at: result.rows[0].service_started_at, service_completed_at: result.rows[0].service_completed_at });
  } catch (error) { try { await client.query("ROLLBACK"); } catch {} return next(error); }
  finally { client.release(); }
};

const sendStartServiceOtp = sendServiceOtp("start");
const sendEndServiceOtp = sendServiceOtp("end");

const listRequestsForPandit = async (req, res, next) => {
  try {
    const panditId = req.pandit.id;
    const { page, limit, offset } = parsePagination(req);

    const [countResult, requestsResult] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total 
         FROM booking_requests br
         INNER JOIN bookings b ON b.id = br.booking_id
         WHERE br.pandit_id = $1 AND br.status = 'pending' AND b.status = 'pending' AND b.prepaid_status = 'paid'`,
        [panditId]
      ),
      query(
        `SELECT 
           br.id AS request_id,
           br.status AS request_status,
           br.created_at AS request_created_at,
           b.id AS booking_id,
           b.booking_date,
           b.booking_time,
           b.address,
           b.total_price,
           b.pandit_payout_amount,
           pt.name_en AS pooja_name_en,
           pt.name_hi AS pooja_name_hi,
           u.name AS user_name
         FROM booking_requests br
         INNER JOIN bookings b ON b.id = br.booking_id
         INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
         INNER JOIN users u ON u.id = b.user_id
         WHERE br.pandit_id = $1 
           AND br.status = 'pending' 
           AND b.status = 'pending'
           AND b.prepaid_status = 'paid'
         ORDER BY br.created_at DESC
         LIMIT $2 OFFSET $3`,
        [panditId, limit, offset]
      )
    ]);

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      data: requestsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    return next(error);
  }
};

const listBookingsForPandit = async (req, res, next) => {
  try {
    const panditId = req.pandit.id;
    const { page, limit, offset } = parsePagination(req);

    const [countResult, bookingsResult] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total 
         FROM bookings 
         WHERE confirmed_pandit_id = $1`,
        [panditId]
      ),
      query(
        `SELECT 
           b.id AS booking_id,
           b.booking_date,
           b.booking_time,
           b.address,
           b.status AS booking_status,
           b.total_price,
           b.pandit_payout_amount,
           b.pandit_payout_status,
           (to_jsonb(b)->>'service_started_at')::timestamptz AS service_started_at,
           (to_jsonb(b)->>'service_completed_at')::timestamptz AS service_completed_at,
           pt.name_en AS pooja_name_en,
           pt.name_hi AS pooja_name_hi,
           u.name AS user_name,
           r.rating AS customer_rating
         FROM bookings b
         INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
         INNER JOIN users u ON u.id = b.user_id
         LEFT JOIN ratings r ON r.booking_id = b.id
         WHERE b.confirmed_pandit_id = $1
         ORDER BY b.booking_date DESC, b.booking_time DESC
         LIMIT $2 OFFSET $3`,
        [panditId, limit, offset]
      )
    ]);

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      data: bookingsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    return next(error);
  }
};

const getBookingByIdForPandit = async (req, res, next) => {
  try {
    const panditId = req.pandit.id;
    const result = await query(
      `SELECT 
         b.id AS booking_id,
         b.booking_date,
         b.booking_time,
         b.address,
         b.latitude,
         b.longitude,
         b.status AS booking_status,
         b.total_price,
         b.pandit_payout_amount,
         b.pandit_payout_status,
         (to_jsonb(b)->>'service_started_at')::timestamptz AS service_started_at,
         (to_jsonb(b)->>'service_completed_at')::timestamptz AS service_completed_at,
         pt.name_en AS pooja_name_en,
         pt.name_hi AS pooja_name_hi,
         pt.samagri_list,
         u.name AS user_name,
         CASE
           WHEN b.status <> 'completed'
             AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata') >= (b.booking_date + b.booking_time - INTERVAL '3 hours')
           THEN u.phone
           ELSE NULL
         END AS user_phone,
         r.rating AS customer_rating
       FROM bookings b
       INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
       INNER JOIN users u ON u.id = b.user_id
       LEFT JOIN ratings r ON r.booking_id = b.id
       WHERE b.id = $1 AND b.confirmed_pandit_id = $2
       LIMIT 1`,
      [req.params.id, panditId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createBooking,
  getBookingById,
  listBookingsForUser,
  cancelBookingByUser,
  handlePanditBookingResponse,
  markBookingCompletedByPandit,
  listRequestsForPandit,
  listBookingsForPandit,
  getBookingByIdForPandit,
  sendStartServiceOtp,
  verifyStartServiceOtp,
  sendEndServiceOtp,
  verifyEndServiceOtp,
};
