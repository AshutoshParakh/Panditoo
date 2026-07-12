const { query } = require("../config/db");
const {
  notifyPanditVerificationDecision,
  notifyPanditDeactivated,
} = require("../services/notificationService");

const parsePagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "10", 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const SORT_COLUMNS = {
  created_at: "b.created_at",
  booking_date: "b.booking_date",
  status: "b.status",
  prepaid_status: "b.prepaid_status",
  pandit_payout_status: "b.pandit_payout_status",
  total_price: "b.total_price",
};

const buildBookingFilters = ({ status, poojaTypeId, startDate, endDate }) => {
  const clauses = [];
  const values = [];

  if (status) {
    values.push(status);
    clauses.push(`b.status = $${values.length}`);
  }

  if (poojaTypeId) {
    values.push(poojaTypeId);
    clauses.push(`b.pooja_type_id = $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    clauses.push(`b.booking_date >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    clauses.push(`b.booking_date <= $${values.length}`);
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const logPanditAdminAction = async ({ panditId, adminId, actionType, reason = null, metadata = {} }) => {
  await query(
    `
    INSERT INTO pandit_admin_action_logs (pandit_id, admin_id, action_type, reason, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [panditId, adminId || null, actionType, reason, JSON.stringify(metadata || {})]
  );
};

const listAllPandits = async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT
        p.id,
        p.name,
        p.phone,
        p.email,
        p.address,
        p.source,
        p.rating,
        p.total_ratings_count,
        p.specializations,
        p.experience_years,
        p.service_radius_km,
        p.latitude,
        p.longitude,
        p.bank_account_details,
        p.id_proof_url,
        p.is_verified,
        p.is_active,
        p.created_at,
        COUNT(b.id)::int AS total_bookings
      FROM pandits p
      LEFT JOIN bookings b ON b.confirmed_pandit_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
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

const getAdminPanditById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [profileResult, bookingHistoryResult, ratingsResult, actionLogResult] = await Promise.all([
      query(
        `
        SELECT
          p.id,
          p.name,
          p.phone,
          p.email,
          p.address,
          p.source,
          p.rating,
          p.total_ratings_count,
          p.specializations,
          p.experience_years,
          p.service_radius_km,
          p.latitude,
          p.longitude,
          p.bank_account_details,
          p.id_proof_url,
          p.is_verified,
          p.is_active,
          p.created_at,
          COUNT(b.id)::int AS total_bookings
        FROM pandits p
        LEFT JOIN bookings b ON b.confirmed_pandit_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        LIMIT 1
        `,
        [id]
      ),
      query(
        `
        SELECT
          b.id,
          b.booking_date,
          b.booking_time,
          b.status,
          b.prepaid_status,
          b.pandit_payout_status,
          b.total_price::float AS total_price,
          b.pandit_payout_amount::float AS pandit_payout_amount,
          u.name AS user_name,
          pt.name_en AS pooja_type_name,
          b.created_at
        FROM bookings b
        INNER JOIN users u ON u.id = b.user_id
        INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
        WHERE b.confirmed_pandit_id = $1
        ORDER BY b.booking_date DESC, b.booking_time DESC, b.created_at DESC
        LIMIT 50
        `,
        [id]
      ),
      query(
        `
        SELECT
          r.id,
          r.rating,
          r.comment,
          r.rated_by,
          r.created_at,
          b.id AS booking_id,
          b.booking_date,
          pt.name_en AS pooja_type_name
        FROM ratings r
        INNER JOIN bookings b ON b.id = r.booking_id
        INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
        WHERE b.confirmed_pandit_id = $1
        ORDER BY r.created_at DESC
        LIMIT 50
        `,
        [id]
      ),
      query(
        `
        SELECT
          l.id,
          l.action_type,
          l.reason,
          l.metadata,
          l.created_at,
          a.name AS admin_name,
          a.email AS admin_email
        FROM pandit_admin_action_logs l
        LEFT JOIN admins a ON a.id = l.admin_id
        WHERE l.pandit_id = $1
        ORDER BY l.created_at DESC
        LIMIT 20
        `,
        [id]
      ),
    ]);

    if (profileResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: profileResult.rows[0],
        bookingHistory: bookingHistoryResult.rows,
        ratings: ratingsResult.rows,
        adminActions: actionLogResult.rows,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listAdminUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = String(req.query.search || "").trim();

    const filters = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(u.name ILIKE $${values.length} OR u.phone ILIKE $${values.length})`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [countResult, usersResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM users u ${whereClause}`, values),
      query(
        `
        SELECT
          u.id,
          u.name,
          u.phone,
          u.email,
          u.address,
          u.source,
          u.created_at,
          COUNT(b.id)::int AS total_bookings
        FROM users u
        LEFT JOIN bookings b ON b.user_id = u.id
        ${whereClause}
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `,
        [...values, limit, offset]
      ),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: usersResult.rows,
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

const listAdminPayments = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();
    const search = String(req.query.search || "").trim();

    const filters = [];
    const values = [];

    if (status) {
      values.push(status);
      filters.push(`p.status = $${values.length}`);
    }

    if (type) {
      values.push(type);
      filters.push(`p.type = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      filters.push(`(p.razorpay_payment_id ILIKE $${values.length} OR p.razorpay_order_id ILIKE $${values.length} OR b.id::text ILIKE $${values.length})`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [countResult, paymentsResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id ${whereClause}`, values),
      query(
        `
        SELECT
          p.id,
          p.booking_id,
          p.amount::float AS amount,
          p.type,
          p.status,
          p.razorpay_payment_id,
          p.razorpay_order_id,
          p.created_at,
          b.status AS booking_status,
          b.booking_date,
          pt.name_en AS pooja_type_name,
          u.name AS user_name,
          pd.name AS pandit_name
        FROM payments p
        LEFT JOIN bookings b ON b.id = p.booking_id
        LEFT JOIN pooja_types pt ON pt.id = b.pooja_type_id
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN pandits pd ON pd.id = b.confirmed_pandit_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `,
        [...values, limit, offset]
      ),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: paymentsResult.rows,
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
const getDashboardStats = async (req, res, next) => {
  try {
    const [bookingTotalsResult, revenueTotalsResult, revenueTrendResult, statusBreakdownResult, panditCountsResult, expiredBookingsResult, pendingApprovalsResult] = await Promise.all([
      query(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE created_at >= CURRENT_DATE
              AND created_at < CURRENT_DATE + INTERVAL '1 day'
          )::int AS today,
          COUNT(*) FILTER (
            WHERE created_at >= date_trunc('week', CURRENT_DATE::timestamp)
              AND created_at < date_trunc('week', CURRENT_DATE::timestamp) + INTERVAL '1 week'
          )::int AS week,
          COUNT(*) FILTER (
            WHERE created_at >= date_trunc('month', CURRENT_DATE::timestamp)
              AND created_at < date_trunc('month', CURRENT_DATE::timestamp) + INTERVAL '1 month'
          )::int AS month
        FROM bookings
        `
      ),
      query(
        `
        SELECT
          COALESCE(SUM(prepaid_amount) FILTER (
            WHERE prepaid_status = 'paid'
              AND created_at >= CURRENT_DATE
              AND created_at < CURRENT_DATE + INTERVAL '1 day'
          ), 0)::float AS today,
          COALESCE(SUM(prepaid_amount) FILTER (
            WHERE prepaid_status = 'paid'
              AND created_at >= date_trunc('week', CURRENT_DATE::timestamp)
              AND created_at < date_trunc('week', CURRENT_DATE::timestamp) + INTERVAL '1 week'
          ), 0)::float AS week,
          COALESCE(SUM(prepaid_amount) FILTER (
            WHERE prepaid_status = 'paid'
              AND created_at >= date_trunc('month', CURRENT_DATE::timestamp)
              AND created_at < date_trunc('month', CURRENT_DATE::timestamp) + INTERVAL '1 month'
          ), 0)::float AS month
        FROM bookings
        `
      ),
      query(
        `
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        )
        SELECT
          TO_CHAR(days.day, 'DD Mon') AS label,
          COALESCE(SUM(b.prepaid_amount), 0)::float AS revenue,
          COUNT(b.id)::int AS bookings
        FROM days
        LEFT JOIN bookings b
          ON b.prepaid_status = 'paid'
         AND b.created_at >= days.day
         AND b.created_at < days.day + INTERVAL '1 day'
        GROUP BY days.day
        ORDER BY days.day ASC
        `
      ),
      query(
        `
        SELECT status, COUNT(*)::int AS count
        FROM bookings
        GROUP BY status
        ORDER BY status ASC
        `
      ),
      query(
        `
        SELECT
          COUNT(*)::int AS total_registered,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
          COUNT(*) FILTER (WHERE is_verified = FALSE)::int AS pending_approval
        FROM pandits
        `
      ),
      query(
        `
        SELECT
          b.id,
          b.status,
          b.booking_date,
          b.booking_time,
          b.address,
          b.total_price::float AS total_price,
          b.prepaid_amount::float AS platform_cut,
          b.flagged_for_manual_intervention,
          b.created_at,
          u.name AS user_name,
          u.phone AS user_phone,
          pt.name_en AS pooja_name
        FROM bookings b
        INNER JOIN users u ON u.id = b.user_id
        INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
        WHERE b.status = 'expired'
          AND b.flagged_for_manual_intervention = TRUE
        ORDER BY b.updated_at DESC, b.created_at DESC
        LIMIT 10
        `
      ),
      query(
        `
        SELECT
          id,
          name,
          phone,
          email,
          experience_years,
          service_radius_km,
          created_at
        FROM pandits
        WHERE is_verified = FALSE
        ORDER BY created_at DESC
        LIMIT 10
        `
      ),
    ]);

    const bookingTotals = bookingTotalsResult.rows[0] || { today: 0, week: 0, month: 0 };
    const revenueTotals = revenueTotalsResult.rows[0] || { today: 0, week: 0, month: 0 };
    const panditCounts = panditCountsResult.rows[0] || {
      total_registered: 0,
      active: 0,
      pending_approval: 0,
    };

    const statuses = ["pending", "confirmed", "completed", "cancelled", "expired"];
    const statusMap = new Map(statusBreakdownResult.rows.map((row) => [row.status, Number(row.count)]));
    const bookingStatusBreakdown = statuses.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        bookings: {
          today: Number(bookingTotals.today || 0),
          week: Number(bookingTotals.week || 0),
          month: Number(bookingTotals.month || 0),
        },
        revenue: {
          today: Number(revenueTotals.today || 0),
          week: Number(revenueTotals.week || 0),
          month: Number(revenueTotals.month || 0),
          trend: revenueTrendResult.rows.map((row) => ({
            label: row.label,
            revenue: Number(row.revenue || 0),
            bookings: Number(row.bookings || 0),
          })),
        },
        pandits: {
          active: Number(panditCounts.active || 0),
          totalRegistered: Number(panditCounts.total_registered || 0),
          pendingApproval: Number(panditCounts.pending_approval || 0),
        },
        bookingStatusBreakdown,
        needsAttention: {
          expiredBookings: expiredBookingsResult.rows,
          pendingPanditApprovals: pendingApprovalsResult.rows,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listAdminBookings = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const status = req.query.status ? String(req.query.status).trim() : "";
    const poojaTypeId = req.query.poojaTypeId ? String(req.query.poojaTypeId).trim() : "";
    const startDate = req.query.startDate ? String(req.query.startDate).trim() : "";
    const endDate = req.query.endDate ? String(req.query.endDate).trim() : "";
    const sortBy = SORT_COLUMNS[req.query.sortBy] ? req.query.sortBy : "created_at";
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const { whereClause, values } = buildBookingFilters({ status, poojaTypeId, startDate, endDate });
    const countParams = [...values];
    const listParams = [...values, limit, offset];

    const [countResult, bookingsResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM bookings b ${whereClause}`, countParams),
      query(
        `
        SELECT
          b.id,
          b.user_id,
          u.name AS user_name,
          u.phone AS user_phone,
          b.confirmed_pandit_id,
          p.name AS pandit_name,
          p.phone AS pandit_phone,
          b.pooja_type_id,
          pt.name_en AS pooja_type_name,
          b.booking_date,
          b.booking_time,
          b.status,
          b.prepaid_status,
          b.pandit_payout_status,
          b.total_price::float AS total_price,
          b.prepaid_amount::float AS prepaid_amount,
          b.pandit_payout_amount::float AS pandit_payout_amount,
          b.flagged_for_manual_intervention,
          b.created_at,
          b.updated_at
        FROM bookings b
        INNER JOIN users u ON u.id = b.user_id
        INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
        LEFT JOIN pandits p ON p.id = b.confirmed_pandit_id
        ${whereClause}
        ORDER BY ${SORT_COLUMNS[sortBy]} ${sortOrder}, b.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `,
        listParams
      ),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: bookingsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        status,
        poojaTypeId,
        startDate,
        endDate,
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAdminBookingTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bookingResult = await query(
      `
      SELECT
        b.id,
        b.user_id,
        u.name AS user_name,
        u.phone AS user_phone,
        u.email AS user_email,
        b.pooja_type_id,
        pt.name_en AS pooja_type_name,
        pt.name_hi AS pooja_type_name_hi,
        b.booking_date,
        b.booking_time,
        b.address,
        b.status,
        b.prepaid_status,
        b.pandit_payout_status,
        b.total_price::float AS total_price,
        b.prepaid_amount::float AS prepaid_amount,
        b.pandit_payout_amount::float AS pandit_payout_amount,
        b.confirmed_pandit_id,
        cp.name AS confirmed_pandit_name,
        cp.phone AS confirmed_pandit_phone,
        b.current_batch,
        b.current_radius_km,
        b.flagged_for_manual_intervention,
        b.created_at,
        b.updated_at
      FROM bookings b
      INNER JOIN users u ON u.id = b.user_id
      INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
      LEFT JOIN pandits cp ON cp.id = b.confirmed_pandit_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const requestsResult = await query(
      `
      SELECT
        br.id,
        br.booking_id,
        br.pandit_id,
        p.name AS pandit_name,
        p.phone AS pandit_phone,
        br.batch_number,
        br.status,
        br.created_at,
        br.responded_at
      FROM booking_requests br
      INNER JOIN pandits p ON p.id = br.pandit_id
      WHERE br.booking_id = $1
      ORDER BY br.batch_number ASC, br.created_at ASC
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        booking: bookingResult.rows[0],
        timeline: requestsResult.rows,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const forceExpireBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      UPDATE bookings
      SET status = 'expired',
          flagged_for_manual_intervention = TRUE,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, flagged_for_manual_intervention, updated_at
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    await query(
      `
      UPDATE booking_requests
      SET status = CASE WHEN status = 'pending' THEN 'expired'::booking_request_status ELSE status END,
          responded_at = COALESCE(responded_at, NOW())
      WHERE booking_id = $1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Booking force expired successfully",
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const manuallyAssignPandit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pandit_id } = req.body;

    if (!pandit_id) {
      return res.status(400).json({ success: false, message: "pandit_id is required" });
    }

    const bookingResult = await query(
      `
      SELECT id, status, prepaid_status, confirmed_pandit_id
      FROM bookings
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = bookingResult.rows[0];

    const panditResult = await query(
      `
      SELECT id, name, is_verified, is_active
      FROM pandits
      WHERE id = $1
      LIMIT 1
      `,
      [pandit_id]
    );

    if (panditResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    const pandit = panditResult.rows[0];

    if (!pandit.is_active || !pandit.is_verified) {
      return res.status(400).json({
        success: false,
        message: "Only active and verified pandits can be manually assigned",
      });
    }

    const nextStatus = booking.prepaid_status === "paid" ? "confirmed" : "pending";

    const updateResult = await query(
      `
      UPDATE bookings
      SET confirmed_pandit_id = $1,
          status = $2,
          flagged_for_manual_intervention = FALSE,
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, status, confirmed_pandit_id, flagged_for_manual_intervention, updated_at
      `,
      [pandit_id, nextStatus, id]
    );

    await query(
      `
      INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status, responded_at)
      VALUES ($1, $2, 0, $3::booking_request_status, NOW())
      ON CONFLICT (booking_id, pandit_id, batch_number)
      DO UPDATE SET status = EXCLUDED.status, responded_at = EXCLUDED.responded_at
      `,
      [id, pandit_id, nextStatus === "confirmed" ? "won" : "pending"]
    );

    await query(
      `
      UPDATE booking_requests
      SET status = CASE
            WHEN pandit_id = $2 AND $3 = 'confirmed' THEN 'won'::booking_request_status
            WHEN status = 'pending' THEN 'lost'::booking_request_status
            ELSE status
          END,
          responded_at = CASE
            WHEN pandit_id = $2 AND $3 = 'confirmed' THEN NOW()
            WHEN status = 'pending' THEN COALESCE(responded_at, NOW())
            ELSE responded_at
          END
      WHERE booking_id = $1
        AND batch_number <> 0
      `,
      [id, pandit_id, nextStatus]
    );

    return res.status(200).json({
      success: true,
      message: nextStatus === "confirmed"
        ? "Pandit assigned and booking confirmed"
        : "Pandit assigned. Booking remains pending until prepayment is completed",
      data: updateResult.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const markPayoutPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bookingResult = await query(
      `
      SELECT id, confirmed_pandit_id, pandit_payout_amount, pandit_payout_status
      FROM bookings
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = bookingResult.rows[0];

    if (!booking.confirmed_pandit_id) {
      return res.status(400).json({ success: false, message: "Cannot mark payout paid without a confirmed pandit" });
    }

    const updateResult = await query(
      `
      UPDATE bookings
      SET pandit_payout_status = 'paid',
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, pandit_payout_status, updated_at
      `,
      [id]
    );

    const payoutPaymentResult = await query(
      `
      SELECT id
      FROM payments
      WHERE booking_id = $1
        AND type = 'pandit_payout'
      LIMIT 1
      `,
      [id]
    );

    if (payoutPaymentResult.rowCount === 0) {
      await query(
        `
        INSERT INTO payments (booking_id, amount, type, status)
        VALUES ($1, $2, 'pandit_payout', 'paid')
        `,
        [id, booking.pandit_payout_amount]
      );
    } else {
      await query(
        `
        UPDATE payments
        SET status = 'paid'
        WHERE id = $1
        `,
        [payoutPaymentResult.rows[0].id]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Pandit payout marked as paid",
      data: updateResult.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPandit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const verifyVal = req.body.verify !== false;
    const reason = String(req.body.reason || "").trim();

    if (!verifyVal && !reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when rejecting verification",
      });
    }

    const result = await query(
      `
      UPDATE pandits
      SET
        is_verified = $1,
        is_active = CASE WHEN $1 = TRUE THEN TRUE ELSE is_active END,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, phone, is_verified, is_active
      `,
      [verifyVal, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    await logPanditAdminAction({
      panditId: id,
      adminId: req.admin?.id,
      actionType: verifyVal ? "verification_approved" : "verification_rejected",
      reason: verifyVal ? null : reason,
    });

    await notifyPanditVerificationDecision({
      panditId: id,
      approved: verifyVal,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: verifyVal ? "Pandit verified successfully" : "Pandit verification rejected",
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const deactivatePandit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "").trim();

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required to deactivate a pandit" });
    }

    const result = await query(
      `
      UPDATE pandits
      SET is_active = FALSE,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, phone, is_verified, is_active
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    await logPanditAdminAction({
      panditId: id,
      adminId: req.admin?.id,
      actionType: "deactivated",
      reason,
    });

    await notifyPanditDeactivated({ panditId: id, reason });

    return res.status(200).json({
      success: true,
      message: "Pandit deactivated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listAdminUsers,
  listAdminPayments,
  listAdminUsers,
  listAdminPayments,
  listAllPandits,
  getAdminPanditById,
  getDashboardStats,
  listAdminBookings,
  getAdminBookingTimeline,
  forceExpireBooking,
  manuallyAssignPandit,
  markPayoutPaid,
  verifyPandit,
  deactivatePandit,
};





