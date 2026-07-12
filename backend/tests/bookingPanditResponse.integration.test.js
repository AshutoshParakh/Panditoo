process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/pandit_booking";

const request = require("supertest");

const app = require("../src/app");
const { query, pool } = require("../src/config/db");
const { signAuthToken } = require("../src/utils/jwt");

jest.setTimeout(30000);

describe("POST /api/bookings/:bookingId/pandit-response", () => {
  const ids = {};
  let panditOneToken;
  let panditTwoToken;

  beforeAll(async () => {
    const userResult = await query(
      `
        INSERT INTO users (name, phone, preferred_language)
        VALUES ('Race Test User', '9990001001', 'en')
        RETURNING id
      `
    );
    ids.userId = userResult.rows[0].id;

    const panditOneResult = await query(
      `
        INSERT INTO pandits (name, phone, is_active)
        VALUES ('Race Pandit One', '9990002001', TRUE)
        RETURNING id
      `
    );
    ids.panditOneId = panditOneResult.rows[0].id;

    const panditTwoResult = await query(
      `
        INSERT INTO pandits (name, phone, is_active)
        VALUES ('Race Pandit Two', '9990002002', TRUE)
        RETURNING id
      `
    );
    ids.panditTwoId = panditTwoResult.rows[0].id;

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
          'Race Test Pooja',
          'रेस टेस्ट पूजा',
          'Race test description',
          'रेस टेस्ट विवरण',
          3000,
          60,
          '[]'::jsonb,
          TRUE
        )
        RETURNING id
      `
    );
    ids.poojaTypeId = poojaTypeResult.rows[0].id;

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
          CURRENT_DATE + INTERVAL '1 day',
          '10:00:00',
          'Race Condition Test Address',
          28.6139,
          77.2090,
          'pending',
          1,
          15,
          3000,
          900,
          'paid',
          2100,
          'pending'
        )
        RETURNING id
      `,
      [ids.userId, ids.poojaTypeId]
    );
    ids.bookingId = bookingResult.rows[0].id;

    await query(
      `
        INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status)
        VALUES ($1, $2, 1, 'pending'), ($1, $3, 1, 'pending')
      `,
      [ids.bookingId, ids.panditOneId, ids.panditTwoId]
    );

    panditOneToken = signAuthToken({
      id: ids.panditOneId,
      phone: '9990002001',
      email: null,
      type: 'pandit',
    });

    panditTwoToken = signAuthToken({
      id: ids.panditTwoId,
      phone: '9990002002',
      email: null,
      type: 'pandit',
    });
  });

  afterAll(async () => {
    await query("DELETE FROM booking_requests WHERE booking_id = $1", [ids.bookingId]);
    await query("DELETE FROM payments WHERE booking_id = $1", [ids.bookingId]);
    await query("DELETE FROM bookings WHERE id = $1", [ids.bookingId]);
    await query("DELETE FROM pooja_types WHERE id = $1", [ids.poojaTypeId]);
    await query("DELETE FROM pandits WHERE id = ANY($1::uuid[])", [[ids.panditOneId, ids.panditTwoId]]);
    await query("DELETE FROM users WHERE id = $1", [ids.userId]);
    await pool.end();
  });

  test("only one pandit wins when two respond interested at the same time", async () => {
    const [responseOne, responseTwo] = await Promise.all([
      request(app)
        .post(`/api/bookings/${ids.bookingId}/pandit-response`)
        .set("Authorization", `Bearer ${panditOneToken}`)
        .send({ response: "interested" }),
      request(app)
        .post(`/api/bookings/${ids.bookingId}/pandit-response`)
        .set("Authorization", `Bearer ${panditTwoToken}`)
        .send({ response: "interested" }),
    ]);

    const successResponses = [responseOne.body, responseTwo.body].filter(
      (body) => body.success === true && body.message === "won"
    );
    const loserResponses = [responseOne.body, responseTwo.body].filter(
      (body) => body.success === false && body.message === "already_booked"
    );

    expect(successResponses).toHaveLength(1);
    expect(loserResponses).toHaveLength(1);

    const bookingResult = await query(
      "SELECT status, confirmed_pandit_id FROM bookings WHERE id = $1",
      [ids.bookingId]
    );
    expect(bookingResult.rows[0].status).toBe("confirmed");

    const requestsResult = await query(
      `
        SELECT pandit_id, status
        FROM booking_requests
        WHERE booking_id = $1
        ORDER BY pandit_id
      `,
      [ids.bookingId]
    );

    const wonRequests = requestsResult.rows.filter((row) => row.status === "won");
    const lostRequests = requestsResult.rows.filter((row) => row.status === "lost");

    expect(wonRequests).toHaveLength(1);
    expect(lostRequests).toHaveLength(1);
    expect(bookingResult.rows[0].confirmed_pandit_id).toBe(wonRequests[0].pandit_id);
  });
});
