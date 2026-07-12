process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/pandit_booking";
process.env.TIMEOUT_HOURS = "2";

const { query, pool } = require("../src/config/db");
const { runBatchTimeoutJob, runReminderJob } = require("../src/services/cronService");

describe("cronService background jobs", () => {
  const ids = {};

  beforeAll(async () => {
    // 1. Create a user
    const userResult = await query(
      `
        INSERT INTO users (name, phone, preferred_language)
        VALUES ('Cron Test User', '9990003001', 'en')
        RETURNING id
      `
    );
    ids.userId = userResult.rows[0].id;

    // 2. Create pandits (within 15km and 25km radius)
    const panditOneResult = await query(
      `
        INSERT INTO pandits (name, phone, latitude, longitude, service_radius_km, is_active)
        VALUES ('Near Pandit 1', '9990004001', 28.6139, 77.2090, 15, TRUE)
        RETURNING id
      `
    );
    ids.panditOneId = panditOneResult.rows[0].id;

    const panditTwoResult = await query(
      `
        INSERT INTO pandits (name, phone, latitude, longitude, service_radius_km, is_active)
        VALUES ('Near Pandit 2', '9990004002', 28.7000, 77.2500, 15, TRUE)
        RETURNING id
      `
    );
    ids.panditTwoId = panditTwoResult.rows[0].id;

    const panditThreeResult = await query(
      `
        INSERT INTO pandits (name, phone, latitude, longitude, service_radius_km, is_active)
        VALUES ('Mid Pandit 3', '9990004003', 28.8000, 77.3000, 30, TRUE)
        RETURNING id
      `
    );
    ids.panditThreeId = panditThreeResult.rows[0].id;

    // 3. Create a pooja type
    const poojaTypeResult = await query(
      `
        INSERT INTO pooja_types (
          name_en,
          name_hi,
          description_en,
          description_hi,
          base_price,
          duration_minutes,
          samagri_list,
          is_active
        )
        VALUES (
          'Cron Test Pooja',
          'क्रॉन टेस्ट पूजा',
          'Cron test description',
          'क्रॉन टेस्ट विवरण',
          2000,
          60,
          '[]'::jsonb,
          TRUE
        )
        RETURNING id
      `
    );
    ids.poojaTypeId = poojaTypeResult.rows[0].id;
  });

  afterAll(async () => {
    await query("DELETE FROM booking_requests WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)", [ids.userId]);
    await query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)", [ids.userId]);
    await query("DELETE FROM bookings WHERE user_id = $1", [ids.userId]);
    await query("DELETE FROM pooja_types WHERE id = $1", [ids.poojaTypeId]);
    await query("DELETE FROM pandits WHERE id = ANY($1::uuid[])", [[ids.panditOneId, ids.panditTwoId, ids.panditThreeId]]);
    await query("DELETE FROM users WHERE id = $1", [ids.userId]);
    await query("DELETE FROM cron_logs");
    await pool.end();
  });

  test("runBatchTimeoutJob triggers next batch when all current requests are lost and timed out", async () => {
    // Create a pending paid booking
    const bookingResult = await query(
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
        VALUES (
          $1,
          $2,
          CURRENT_DATE + INTERVAL '5 days',
          '10:00:00',
          'Cron Test Address',
          28.6139,
          77.2090,
          'pending',
          1,
          15,
          2000,
          600,
          'paid',
          1400,
          'pending'
        )
        RETURNING id
      `,
      [ids.userId, ids.poojaTypeId]
    );
    const bookingId = bookingResult.rows[0].id;

    // Create booking request for Near Pandit 1 but mark as lost and created 3 hours ago (timed out)
    await query(
      `
        INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status, created_at)
        VALUES ($1, $2, 1, 'lost'::booking_request_status, NOW() - INTERVAL '3 hours')
      `,
      [bookingId, ids.panditOneId]
    );

    // Run the job
    await runBatchTimeoutJob();

    // Verify it updated to batch 2 and radius 15 (next batch number is 2, which is not the 2nd expansion, so radius remains 15)
    const updatedBooking = await query(
      "SELECT current_batch, current_radius_km FROM bookings WHERE id = $1",
      [bookingId]
    );
    expect(updatedBooking.rows[0].current_batch).toBe(2);
    expect(updatedBooking.rows[0].current_radius_km).toBe(15);

    // Verify that user was notified searching wider area
    const logCheck = await query(
      `
        SELECT 1 FROM notifications_log
        WHERE recipient_type = 'user'
          AND recipient_id = $1
          AND channel = 'push'
          AND message = 'Searching wider area: Searching wider area for available pandits.'
        LIMIT 1
      `,
      [ids.userId]
    );
    expect(logCheck.rowCount).toBe(1);
  });

  test("runBatchTimeoutJob expires booking when current_radius_km > 25 and times out", async () => {
    // Create a pending paid booking with radius 35
    const bookingResult = await query(
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
        VALUES (
          $1,
          $2,
          CURRENT_DATE + INTERVAL '5 days',
          '12:00:00',
          'Expired Test Address',
          28.6139,
          77.2090,
          'pending',
          3,
          35,
          2000,
          600,
          'paid',
          1400,
          'pending'
        )
        RETURNING id
      `,
      [ids.userId, ids.poojaTypeId]
    );
    const bookingId = bookingResult.rows[0].id;

    // Create a booking request created 3 hours ago
    await query(
      `
        INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status, created_at)
        VALUES ($1, $2, 3, 'lost'::booking_request_status, NOW() - INTERVAL '3 hours')
      `,
      [bookingId, ids.panditThreeId]
    );

    // Run job
    await runBatchTimeoutJob();

    // Verify booking is expired and flagged
    const updated = await query(
      "SELECT status, flagged_for_manual_intervention FROM bookings WHERE id = $1",
      [bookingId]
    );
    expect(updated.rows[0].status).toBe("expired");
    expect(updated.rows[0].flagged_for_manual_intervention).toBe(true);

    // Verify user notification for expiration was sent
    const logCheck = await query(
      `
        SELECT message FROM notifications_log
        WHERE recipient_type = 'user'
          AND recipient_id = $1
          AND channel = 'whatsapp'
          AND message LIKE '%No pandits available%'
        LIMIT 1
      `,
      [ids.userId]
    );
    expect(logCheck.rowCount).toBe(1);

    // Verify cron_logs table has a record
    const cronLogs = await query(
      "SELECT status, actions_summary FROM cron_logs WHERE job_name = 'batch_timeout_job' ORDER BY started_at DESC LIMIT 1"
    );
    expect(cronLogs.rowCount).toBe(1);
    expect(cronLogs.rows[0].status).toBe("success");
    const summary = cronLogs.rows[0].actions_summary;
    expect(summary.some((action) => action.booking_id === bookingId && action.action === "expired")).toBe(true);
  });

  test("runReminderJob sends WhatsApp reminder 1 day before booking_date", async () => {
    // Create a confirmed booking for tomorrow
    const bookingResult = await query(
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
          confirmed_pandit_id,
          pandit_payout_amount,
          pandit_payout_status
        )
        VALUES (
          $1,
          $2,
          CURRENT_DATE + INTERVAL '1 day',
          '11:00:00',
          'Tomorrow Pooja Address',
          28.6139,
          77.2090,
          'confirmed',
          1,
          15,
          2000,
          600,
          'paid',
          $3,
          1400,
          'pending'
        )
        RETURNING id
      `,
      [ids.userId, ids.poojaTypeId, ids.panditTwoId]
    );
    const bookingId = bookingResult.rows[0].id;

    // Run the reminder job
    await runReminderJob();

    // Verify reminder was logged in notifications_log for user
    const userLogCheck = await query(
      `
        SELECT message, status FROM notifications_log
        WHERE recipient_type = 'user'
          AND recipient_id = $1
          AND channel = 'whatsapp'
        ORDER BY sent_at DESC
        LIMIT 1
      `,
      [ids.userId]
    );
    expect(userLogCheck.rowCount).toBe(1);
    expect(userLogCheck.rows[0].message).toContain("Reminder: Cron Test Pooja is scheduled on");
    expect(userLogCheck.rows[0].status).toBe("sent_stub");

    // Verify reminder was logged in notifications_log for pandit
    const panditLogCheck = await query(
      `
        SELECT message, status FROM notifications_log
        WHERE recipient_type = 'pandit'
          AND recipient_id = $1
          AND channel = 'whatsapp'
        ORDER BY sent_at DESC
        LIMIT 1
      `,
      [ids.panditTwoId]
    );
    expect(panditLogCheck.rowCount).toBe(1);
    expect(panditLogCheck.rows[0].message).toContain("Reminder: Cron Test Pooja is scheduled on");
    expect(panditLogCheck.rows[0].status).toBe("sent_stub");
  });
});
