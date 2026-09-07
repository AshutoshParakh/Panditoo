const { query } = require("../config/db");
const { verifyAuthToken } = require("../utils/jwt");

// Record customer journey event (Public / Non-blocking)
const recordJourneyEvent = async (req, res, next) => {
  try {
    const {
      sessionId,
      platform = "web",
      eventType,
      pagePath = null,
      poojaId = null,
      poojaName = null,
      dropoffStage = null,
      metadata = {},
    } = req.body;

    if (!sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        message: "sessionId and eventType are required",
      });
    }

    let userId = req.user?.id || req.body.userId || null;

    if (!userId && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.slice(7);
        const payload = verifyAuthToken(token);
        if (payload && payload.sub) {
          userId = payload.sub;
        }
      } catch (_) { }
    }

    await query(
      `
      INSERT INTO customer_journey_events (
        session_id, user_id, platform, event_type, page_path,
        pooja_id, pooja_name, dropoff_stage, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        sessionId,
        userId,
        platform,
        eventType,
        pagePath,
        poojaId,
        poojaName,
        dropoffStage,
        JSON.stringify(metadata || {}),
      ]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Analytics] Error recording event:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get Customer Journey & Funnel Analytics with Authenticated Devotee Details
const getJourneyAnalytics = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? String(req.query.startDate).trim() : null;
    const endDate = req.query.endDate ? String(req.query.endDate).trim() : null;

    const values = [];
    const timeFilters = [];

    if (startDate) {
      values.push(startDate);
      timeFilters.push(`created_at >= $${values.length}`);
    }
    if (endDate) {
      values.push(`${endDate} 23:59:59`);
      timeFilters.push(`created_at <= $${values.length}`);
    }

    const whereClause = timeFilters.length ? `WHERE ${timeFilters.join(" AND ")}` : "";

    // 1. Funnel Aggregates (Cumulative funnel stage metrics)
    const funnelResult = await query(
      `
      SELECT
        COUNT(DISTINCT session_id)::int AS session_start,
        COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN session_id END)::int AS authed_session_start,

        COUNT(DISTINCT CASE WHEN event_type = 'pooja_view' OR (pooja_id IS NOT NULL AND event_type != 'booking_completed') THEN session_id END)::int AS pooja_view,
        COUNT(DISTINCT CASE WHEN (event_type = 'pooja_view' OR pooja_id IS NOT NULL) AND user_id IS NOT NULL THEN session_id END)::int AS authed_pooja_view,

        COUNT(DISTINCT CASE WHEN event_type IN ('booking_start', 'date_time_select', 'address_enter', 'pandit_select', 'checkout_view', 'payment_initiated', 'booking_completed') THEN session_id END)::int AS booking_started,
        COUNT(DISTINCT CASE WHEN event_type IN ('booking_start', 'date_time_select', 'address_enter', 'pandit_select', 'checkout_view', 'payment_initiated', 'booking_completed') AND user_id IS NOT NULL THEN session_id END)::int AS authed_booking_started,

        COUNT(DISTINCT CASE WHEN event_type IN ('checkout_view', 'address_enter', 'pandit_select', 'payment_initiated', 'booking_completed') THEN session_id END)::int AS checkout_view,
        COUNT(DISTINCT CASE WHEN event_type IN ('checkout_view', 'address_enter', 'pandit_select', 'payment_initiated', 'booking_completed') AND user_id IS NOT NULL THEN session_id END)::int AS authed_checkout_view,

        COUNT(DISTINCT CASE WHEN event_type IN ('payment_initiated', 'booking_completed') THEN session_id END)::int AS payment_initiated,
        COUNT(DISTINCT CASE WHEN event_type IN ('payment_initiated', 'booking_completed') AND user_id IS NOT NULL THEN session_id END)::int AS authed_payment_initiated,

        COUNT(DISTINCT CASE WHEN event_type = 'booking_completed' THEN session_id END)::int AS booking_completed,
        COUNT(DISTINCT CASE WHEN event_type = 'booking_completed' AND user_id IS NOT NULL THEN session_id END)::int AS authed_booking_completed
      FROM customer_journey_events
      ${whereClause}
      `,
      values
    );

    const funnelCounts = funnelResult.rows[0] || {};

    // 2. CTE for uncompleted sessions to find exact final drop-off stage per session
    const dropoffResult = await query(
      `
      WITH completed_sessions AS (
        SELECT DISTINCT session_id
        FROM customer_journey_events
        ${whereClause} ${whereClause ? "AND" : "WHERE"} event_type = 'booking_completed'
      ),
      session_max_stage AS (
        SELECT
          e.session_id,
          (ARRAY_AGG(e.user_id ORDER BY e.created_at DESC) FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id,
          (ARRAY_AGG(e.pooja_name ORDER BY e.created_at DESC) FILTER (WHERE e.pooja_name IS NOT NULL))[1] AS pooja_name,
          MAX(e.created_at) AS last_active_at,
          CASE
            WHEN BOOL_OR(e.event_type = 'payment_initiated') THEN 'payment_gateway'
            WHEN BOOL_OR(e.event_type IN ('checkout_view', 'address_enter')) THEN 'address_entry'
            WHEN BOOL_OR(e.event_type = 'date_time_select') THEN 'date_time_selection'
            WHEN BOOL_OR(e.event_type = 'pooja_view') OR BOOL_OR(e.dropoff_stage = 'pooja_details') THEN 'pooja_details'
            ELSE COALESCE((ARRAY_AGG(e.dropoff_stage ORDER BY e.created_at DESC) FILTER (WHERE e.dropoff_stage IS NOT NULL))[1], 'browsing_exit')
          END AS final_dropoff_stage
        FROM customer_journey_events e
        ${whereClause} ${whereClause ? "AND" : "WHERE"} e.session_id NOT IN (SELECT session_id FROM completed_sessions)
        GROUP BY e.session_id
      )
      SELECT
        final_dropoff_stage AS stage,
        COUNT(*)::int AS count,
        COUNT(user_id)::int AS authed_count
      FROM session_max_stage
      GROUP BY final_dropoff_stage
      ORDER BY count DESC
      `,
      values
    );

    // 3. Authenticated Customers Details per Dropoff Stage
    const authedDropoffResult = await query(
      `
      WITH completed_sessions AS (
        SELECT DISTINCT session_id
        FROM customer_journey_events
        ${whereClause} ${whereClause ? "AND" : "WHERE"} event_type = 'booking_completed'
      ),
      session_max_stage AS (
        SELECT
          e.session_id,
          (ARRAY_AGG(e.user_id ORDER BY e.created_at DESC) FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id,
          (ARRAY_AGG(e.pooja_name ORDER BY e.created_at DESC) FILTER (WHERE e.pooja_name IS NOT NULL))[1] AS pooja_name,
          MAX(e.created_at) AS last_active_at,
          CASE
            WHEN BOOL_OR(e.event_type = 'payment_initiated') THEN 'payment_gateway'
            WHEN BOOL_OR(e.event_type IN ('checkout_view', 'address_enter')) THEN 'address_entry'
            WHEN BOOL_OR(e.event_type = 'date_time_select') THEN 'date_time_selection'
            WHEN BOOL_OR(e.event_type = 'pooja_view') OR BOOL_OR(e.dropoff_stage = 'pooja_details') THEN 'pooja_details'
            ELSE COALESCE((ARRAY_AGG(e.dropoff_stage ORDER BY e.created_at DESC) FILTER (WHERE e.dropoff_stage IS NOT NULL))[1], 'browsing_exit')
          END AS final_dropoff_stage
        FROM customer_journey_events e
        ${whereClause} ${whereClause ? "AND" : "WHERE"} e.session_id NOT IN (SELECT session_id FROM completed_sessions)
        GROUP BY e.session_id
      )
      SELECT DISTINCT ON (sms.user_id, sms.final_dropoff_stage)
        sms.final_dropoff_stage AS stage,
        sms.session_id,
        sms.last_active_at,
        sms.pooja_name,
        u.id AS user_id,
        u.name AS user_name,
        u.phone AS user_phone,
        u.email AS user_email
      FROM session_max_stage sms
      JOIN users u ON u.id = sms.user_id
      ORDER BY sms.user_id, sms.final_dropoff_stage, sms.last_active_at DESC
      `,
      values
    );

    const authedCustomersByStage = {};
    authedDropoffResult.rows.forEach((row) => {
      if (!authedCustomersByStage[row.stage]) {
        authedCustomersByStage[row.stage] = [];
      }
      authedCustomersByStage[row.stage].push(row);
    });

    // 4. Authenticated Customers per Funnel Stage
    const authedFunnelResult = await query(
      `
      SELECT DISTINCT ON (e.user_id, f_stage)
        f_stage,
        u.id AS user_id,
        u.name AS user_name,
        u.phone AS user_phone,
        u.email AS user_email,
        e.pooja_name,
        e.session_id,
        e.created_at AS last_active_at
      FROM customer_journey_events e
      JOIN users u ON u.id = e.user_id
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN e.event_type = 'booking_completed' THEN 'booking_completed'
          WHEN e.event_type = 'payment_initiated' THEN 'payment_initiated'
          WHEN e.event_type IN ('checkout_view', 'address_enter') THEN 'checkout_view'
          WHEN e.event_type IN ('booking_start', 'date_time_select') THEN 'booking_started'
          WHEN e.event_type = 'pooja_view' OR e.pooja_id IS NOT NULL THEN 'pooja_view'
          ELSE 'session_start'
        END AS f_stage
      ) s
      ${whereClause}
      ORDER BY e.user_id, f_stage, e.created_at DESC
      `,
      values
    );

    const authedCustomersByFunnelStage = {};
    authedFunnelResult.rows.forEach((row) => {
      if (!authedCustomersByFunnelStage[row.f_stage]) {
        authedCustomersByFunnelStage[row.f_stage] = [];
      }
      authedCustomersByFunnelStage[row.f_stage].push(row);
    });

    // 5. Recent Sessions Clickstream (Timeline of journeys)
    const sessionsResult = await query(
      `
      WITH session_summary AS (
        SELECT
          e.session_id,
          (ARRAY_AGG(e.user_id ORDER BY e.created_at DESC) FILTER (WHERE e.user_id IS NOT NULL))[1] AS user_id,
          (ARRAY_AGG(e.platform ORDER BY e.created_at DESC) FILTER (WHERE e.platform IS NOT NULL))[1] AS platform,
          MIN(e.created_at) AS started_at,
          MAX(e.created_at) AS last_active_at,
          COUNT(e.id)::int AS event_count,
          BOOL_OR(e.event_type = 'booking_completed') AS is_completed,
          CASE
            WHEN BOOL_OR(e.event_type = 'payment_initiated') THEN 'payment_gateway'
            WHEN BOOL_OR(e.event_type IN ('checkout_view', 'address_enter')) THEN 'address_entry'
            WHEN BOOL_OR(e.event_type = 'date_time_select') THEN 'date_time_selection'
            WHEN BOOL_OR(e.event_type = 'pooja_view') OR BOOL_OR(e.dropoff_stage = 'pooja_details') THEN 'pooja_details'
            ELSE COALESCE((ARRAY_AGG(e.dropoff_stage ORDER BY e.created_at DESC) FILTER (WHERE e.dropoff_stage IS NOT NULL))[1], 'browsing_exit')
          END AS last_dropoff_stage,
          (
            ARRAY_AGG(
              e.pooja_name ORDER BY e.created_at DESC
            ) FILTER (WHERE e.pooja_name IS NOT NULL)
          )[1] AS target_pooja
        FROM customer_journey_events e
        ${whereClause}
        GROUP BY e.session_id
        ORDER BY MAX(e.created_at) DESC
        LIMIT 100
      )
      SELECT
        s.*,
        u.name AS user_name,
        u.phone AS user_phone,
        u.email AS user_email
      FROM session_summary s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.last_active_at DESC
      `,
      values
    );

    // 6. Fetch detailed clickstream events for sessions
    const sessionIds = sessionsResult.rows.map((r) => r.session_id);
    let eventsMap = {};

    if (sessionIds.length > 0) {
      const eventsResult = await query(
        `
        SELECT
          e.id, e.session_id, e.event_type, e.page_path, e.pooja_name, e.dropoff_stage, e.metadata, e.created_at,
          u.name AS user_name, u.phone AS user_phone
        FROM customer_journey_events e
        LEFT JOIN users u ON u.id = e.user_id
        WHERE e.session_id = ANY($1)
        ORDER BY e.created_at ASC
        `,
        [sessionIds]
      );

      eventsResult.rows.forEach((evt) => {
        if (!eventsMap[evt.session_id]) {
          eventsMap[evt.session_id] = [];
        }
        eventsMap[evt.session_id].push(evt);
      });
    }

    const sessionJourneys = sessionsResult.rows.map((sess) => ({
      ...sess,
      events: eventsMap[sess.session_id] || [],
    }));

    return res.status(200).json({
      success: true,
      data: {
        funnel: funnelCounts,
        dropoffs: dropoffResult.rows,
        authedCustomersByStage,
        authedCustomersByFunnelStage,
        sessions: sessionJourneys,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  recordJourneyEvent,
  getJourneyAnalytics,
};
