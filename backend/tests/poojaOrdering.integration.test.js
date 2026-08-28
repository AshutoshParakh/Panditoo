process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/pandit_booking";

const request = require("supertest");
const crypto = require("crypto");
const app = require("../src/app");
const { query, pool } = require("../src/config/db");
const { signAuthToken } = require("../src/utils/jwt");

describe("admin pooja ordering", () => {
  const ids = [];
  const names = ["Ordering Test A", "Ordering Test B", "Ordering Test C"];
  const adminToken = signAuthToken({ id: crypto.randomUUID(), email: "ordering@test.local", type: "admin" });

  beforeAll(async () => {
    for (const name of names) {
      const result = await query(
        `INSERT INTO pooja_types (
           name_en, name_hi, base_price, credit_cost, service_days, duration_minutes,
           samagri_list, is_active, display_order
         ) VALUES ($1, $1, 100, 1, 1, 30, '[]'::jsonb, TRUE,
           (SELECT COALESCE(MAX(display_order), 0) + 1 FROM pooja_types))
         RETURNING id`,
        [name]
      );
      ids.push(result.rows[0].id);
    }
  });

  afterAll(async () => {
    await query("DELETE FROM pooja_types WHERE id = ANY($1::uuid[])", [ids]);
    await pool.end();
  });

  test("moves a pooja up and changes public catalogue order", async () => {
    const moved = await request(app)
      .patch(`/api/admin/pooja-types/${ids[1]}/reorder`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ direction: "up" });
    expect(moved.body).toMatchObject({ success: true, message: "Pooja moved up" });

    const catalogue = await request(app).get("/api/pooja-types?lang=en");
    const orderedTestNames = catalogue.body.data
      .filter((item) => names.includes(item.name))
      .map((item) => item.name);
    expect(orderedTestNames).toEqual(["Ordering Test B", "Ordering Test A", "Ordering Test C"]);
  });
});
