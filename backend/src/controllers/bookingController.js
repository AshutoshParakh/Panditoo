const { pool, query } = require("../config/db");
const {
  triggerBookingWonNotifications,
  notifyPanditAlreadyBooked,
} = require("../utils/notifications");
const { lockPanditCalendar } = require("../utils/calendar");

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
      latitude,
      longitude,
      selected_pandit_ids,
    } = req.body;

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

    const panditResult = await client.query(
      `
        SELECT id
        FROM pandits
        WHERE id = ANY($1::uuid[])
          AND is_active = TRUE
      `,
      [selected_pandit_ids]
    );

    if (panditResult.rowCount !== selected_pandit_ids.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "One or more selected pandits are invalid or inactive" });
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

    for (const panditId of selected_pandit_ids) {
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
      activation_note: "Booking requests are stored but should not be treated as active for pandit notifications until prepayment is confirmed.",
    });
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
          SELECT name, phone, rating
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
            pt.name_hi
          FROM bookings b
          INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
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
  const client = await pool.connect();

  try {
    const { bookingId } = req.params;
    const panditId = req.pandit.id;

    await client.query("BEGIN");

    const bookingResult = await client.query(
      `
        UPDATE bookings
        SET status = 'completed', updated_at = NOW()
        WHERE id = $1
          AND confirmed_pandit_id = $2
          AND status = 'confirmed'
        RETURNING id, pandit_payout_amount, pandit_payout_status
      `,
      [bookingId, panditId]
    );

    if (bookingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Confirmed booking not found" });
    }

    const booking = bookingResult.rows[0];
    const existingPayoutResult = await client.query(
      `
        SELECT id, status, amount
        FROM payments
        WHERE booking_id = $1
          AND type = 'pandit_payout'
        LIMIT 1
      `,
      [bookingId]
    );

    let payoutPayment;
    if (existingPayoutResult.rowCount === 0) {
      const payoutResult = await client.query(
        `
          INSERT INTO payments (booking_id, amount, type, status)
          VALUES ($1, $2, 'pandit_payout', 'created')
          RETURNING id, booking_id, amount, type, status, created_at
        `,
        [bookingId, booking.pandit_payout_amount]
      );
      payoutPayment = payoutResult.rows[0];
    } else {
      payoutPayment = existingPayoutResult.rows[0];
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "booking_completed",
      booking_id: bookingId,
      payout_payment: payoutPayment,
    });
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
           u.name AS user_name,
           u.phone AS user_phone
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
           pt.name_en AS pooja_name_en,
           pt.name_hi AS pooja_name_hi,
           u.name AS user_name,
           u.phone AS user_phone
         FROM bookings b
         INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
         INNER JOIN users u ON u.id = b.user_id
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
         pt.name_en AS pooja_name_en,
         pt.name_hi AS pooja_name_hi,
         pt.samagri_list,
         u.name AS user_name,
         u.phone AS user_phone
       FROM bookings b
       INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
       INNER JOIN users u ON u.id = b.user_id
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
  handlePanditBookingResponse,
  markBookingCompletedByPandit,
  listRequestsForPandit,
  listBookingsForPandit,
  getBookingByIdForPandit,
};
