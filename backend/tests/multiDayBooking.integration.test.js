process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/pandit_booking";

const otpService = require("../src/utils/otpService");
const sentOtps = [];
jest.spyOn(otpService, "sendOTP").mockImplementation(async (_phone, otp) => {
  sentOtps.push(otp);
  return { success: true, provider: "test" };
});

const request = require("supertest");
const app = require("../src/app");
const { query, pool } = require("../src/config/db");
const { signAuthToken } = require("../src/utils/jwt");
const { runReminderJob } = require("../src/services/cronService");

jest.setTimeout(30000);

describe("multi-day bundle lifecycle", () => {
  const ids = {};
  let panditToken;

  beforeAll(async () => {
    const user = await query(
      "INSERT INTO users (name, phone, preferred_language) VALUES ('Bundle Test User', '9990005101', 'en') RETURNING id"
    );
    ids.userId = user.rows[0].id;

    const pandit = await query(
      "INSERT INTO pandits (name, phone, is_active, is_verified) VALUES ('Bundle Test Pandit', '9990005102', TRUE, TRUE) RETURNING id"
    );
    ids.panditId = pandit.rows[0].id;

    const pooja = await query(
      `INSERT INTO pooja_types (name_en, name_hi, base_price, credit_cost, service_days, duration_minutes, samagri_list, is_active)
       VALUES ('Bundle Lifecycle Test Pooja', 'बंडल जीवनचक्र टेस्ट पूजा', 11000, 20, 11, 660, '[]'::jsonb, TRUE)
       RETURNING id`
    );
    ids.poojaTypeId = pooja.rows[0].id;

    const booking = await query(
      `INSERT INTO bookings (
         user_id, pooja_type_id, booking_date, booking_time, address, latitude, longitude,
         status, current_batch, current_radius_km, total_price, prepaid_amount, prepaid_status,
         pandit_payout_amount, pandit_payout_status, service_days
       ) VALUES ($1, $2, CURRENT_DATE, '09:00', 'Bundle Test Address', 22.7196, 75.8577,
         'pending', 1, 15, 11000, 3300, 'paid', 7700, 'pending', 11)
       RETURNING id`,
      [ids.userId, ids.poojaTypeId]
    );
    ids.bookingId = booking.rows[0].id;

    await query(
      `INSERT INTO booking_service_visits (booking_id, visit_number, scheduled_date, scheduled_time)
       SELECT $1, day_number, CURRENT_DATE + (day_number - 1), '09:00'::time
       FROM generate_series(1, 11) AS day_number`,
      [ids.bookingId]
    );
    await query(
      "INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status) VALUES ($1, $2, 1, 'pending')",
      [ids.bookingId, ids.panditId]
    );

    panditToken = signAuthToken({ id: ids.panditId, phone: "9990005102", type: "pandit" });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await query("DELETE FROM notifications_log WHERE recipient_id = ANY($1::uuid[])", [[ids.userId, ids.panditId]]);
    await query("DELETE FROM payments WHERE booking_id = $1", [ids.bookingId]);
    await query("DELETE FROM bookings WHERE id = $1", [ids.bookingId]);
    await query("DELETE FROM pooja_types WHERE id = $1", [ids.poojaTypeId]);
    await query("DELETE FROM pandits WHERE id = $1", [ids.panditId]);
    await query("DELETE FROM users WHERE id = $1", [ids.userId]);
    await pool.end();
  });

  test("requires commitment and keeps the booking active after day one", async () => {
    const refused = await request(app)
      .post(`/api/bookings/${ids.bookingId}/pandit-response`)
      .set("Authorization", `Bearer ${panditToken}`)
      .send({ response: "interested" });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toContain("11-day bundle");

    const accepted = await request(app)
      .post(`/api/bookings/${ids.bookingId}/pandit-response`)
      .set("Authorization", `Bearer ${panditToken}`)
      .send({ response: "interested", bundle_commitment_confirmed: true });
    expect(accepted.body).toMatchObject({ success: true, message: "won" });

    const startOtp = await request(app)
      .post(`/api/bookings/${ids.bookingId}/service/start-otp`)
      .set("Authorization", `Bearer ${panditToken}`);
    expect(startOtp.body).toMatchObject({ success: true, visit_number: 1, service_days: 11 });

    const started = await request(app)
      .post(`/api/bookings/${ids.bookingId}/service/start`)
      .set("Authorization", `Bearer ${panditToken}`)
      .send({ otp: sentOtps.at(-1) });
    expect(started.body).toMatchObject({ success: true, visit_number: 1, service_days: 11 });

    const endOtp = await request(app)
      .post(`/api/bookings/${ids.bookingId}/service/end-otp`)
      .set("Authorization", `Bearer ${panditToken}`);
    expect(endOtp.body).toMatchObject({ success: true, visit_number: 1, service_days: 11 });

    const completedDay = await request(app)
      .post(`/api/bookings/${ids.bookingId}/service/end`)
      .set("Authorization", `Bearer ${panditToken}`)
      .send({ otp: sentOtps.at(-1) });
    expect(completedDay.body).toMatchObject({
      success: true,
      booking_completed: false,
      completed_visit_number: 1,
      service_days: 11,
      next_visit: { visit_number: 2 },
    });

    const state = await query(
      `SELECT b.status,
              COUNT(*) FILTER (WHERE visits.completed_at IS NOT NULL)::int AS completed_visits
       FROM bookings b
       INNER JOIN booking_service_visits visits ON visits.booking_id = b.id
       WHERE b.id = $1 GROUP BY b.id`,
      [ids.bookingId]
    );
    expect(state.rows[0]).toMatchObject({ status: "confirmed", completed_visits: 1 });

    await runReminderJob();
    const reminder = await query(
      `SELECT message FROM notifications_log
       WHERE recipient_id = $1 AND message LIKE '%day 2 of 11%'
       ORDER BY sent_at DESC LIMIT 1`,
      [ids.panditId]
    );
    expect(reminder.rowCount).toBe(1);
  });
});
