process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/pandit_booking";

const request = require("supertest");
const app = require("../src/app");
const { query, pool } = require("../src/config/db");
const { signAuthToken } = require("../src/utils/jwt");

jest.setTimeout(30000);

describe("POST /api/ratings", () => {
  const ids = {};
  let userToken;

  beforeAll(async () => {
    // 1. Create User
    const userResult = await query(
      `
        INSERT INTO users (name, phone, preferred_language)
        VALUES ('Rating Test User', '9991113001', 'en')
        RETURNING id
      `
    );
    ids.userId = userResult.rows[0].id;
    userToken = signAuthToken({ id: ids.userId, phone: "9991113001", type: "user" });

    // 2. Create Pandit
    const panditResult = await query(
      `
        INSERT INTO pandits (name, phone, rating, total_ratings_count, is_active)
        VALUES ('Rating Test Pandit', '9991114002', 4.0, 1, TRUE)
        RETURNING id
      `
    );
    ids.panditId = panditResult.rows[0].id;

    // 3. Create Pooja Type
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
          'Rating Test Pooja',
          'रेटिंग टेस्ट पूजा',
          'Rating test description',
          'विवरण',
          1000.00,
          60,
          '[]'::jsonb,
          TRUE
        )
        RETURNING id
      `
    );
    ids.poojaTypeId = poojaTypeResult.rows[0].id;

    // 4. Create Completed Booking
    const completedBookingResult = await query(
      `
        INSERT INTO bookings (
          user_id,
          pooja_type_id,
          booking_date,
          booking_time,
          address,
          status,
          total_price,
          prepaid_amount,
          prepaid_status,
          confirmed_pandit_id
        )
        VALUES ($1, $2, '2026-07-10', '10:00:00', 'Test Completed Address', 'completed', 1000.00, 300.00, 'paid', $3)
        RETURNING id
      `,
      [ids.userId, ids.poojaTypeId, ids.panditId]
    );
    ids.completedBookingId = completedBookingResult.rows[0].id;

    // 5. Create Pending Booking
    const pendingBookingResult = await query(
      `
        INSERT INTO bookings (
          user_id,
          pooja_type_id,
          booking_date,
          booking_time,
          address,
          status,
          total_price,
          prepaid_amount,
          prepaid_status
        )
        VALUES ($1, $2, '2026-07-12', '10:00:00', 'Test Pending Address', 'pending', 1000.00, 300.00, 'pending')
        RETURNING id
      `,
      [ids.userId, ids.poojaTypeId]
    );
    ids.pendingBookingId = pendingBookingResult.rows[0].id;
  });

  afterAll(async () => {
    await query("DELETE FROM ratings WHERE booking_id IN ($1, $2)", [
      ids.completedBookingId,
      ids.pendingBookingId,
    ]);
    await query("DELETE FROM bookings WHERE id IN ($1, $2)", [
      ids.completedBookingId,
      ids.pendingBookingId,
    ]);
    await query("DELETE FROM pooja_types WHERE id = $1", [ids.poojaTypeId]);
    await query("DELETE FROM pandits WHERE id = $1", [ids.panditId]);
    await query("DELETE FROM users WHERE id = $1", [ids.userId]);
  });

  it("should return 401 Unauthorized if no token is provided", async () => {
    const res = await request(app)
      .post("/api/ratings")
      .send({
        booking_id: ids.completedBookingId,
        rating: 5,
        comment: "Excellent service!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if booking is not completed", async () => {
    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        booking_id: ids.pendingBookingId,
        rating: 5,
        comment: "Excellent service!",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Only completed bookings can be rated");
  });

  it("should successfully create a rating and update pandit metrics", async () => {
    // Check initial pandit metrics
    const initialPandit = await query("SELECT rating, total_ratings_count FROM pandits WHERE id = $1", [
      ids.panditId,
    ]);
    expect(Number(initialPandit.rows[0].rating)).toBe(4.0);
    expect(initialPandit.rows[0].total_ratings_count).toBe(1);

    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        booking_id: ids.completedBookingId,
        rating: 5,
        comment: "Very professional pandit!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.rating.rating).toBe(5);

    // Verify pandit metrics updated: rating: (4.0 * 1 + 5) / 2 = 4.5
    const updatedPandit = await query("SELECT rating, total_ratings_count FROM pandits WHERE id = $1", [
      ids.panditId,
    ]);
    expect(Number(updatedPandit.rows[0].rating)).toBe(4.5);
    expect(updatedPandit.rows[0].total_ratings_count).toBe(2);
  });

  it("should prevent double rating for the same booking", async () => {
    const res = await request(app)
      .post("/api/ratings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        booking_id: ids.completedBookingId,
        rating: 3,
        comment: "Second rating attempt",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("already rated");
  });
});
