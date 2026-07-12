const { query } = require("../src/config/db");

const fallbackPandits = [
  {
    id: "85a1efba-8e7c-473d-9d41-3b7fa2540001",
    name: "Pandit Rajesh Shastri",
    phone: "9999999001",
    rating: 4.90,
    specializations: ["Havan", "Katha", "Marriage"],
    latitude: 22.7634,
    longitude: 75.9101,
  },
  {
    id: "85a1efba-8e7c-473d-9d41-3b7fa2540002",
    name: "Pandit Sunil Dwivedi",
    phone: "9999999002",
    rating: 4.80,
    specializations: ["Vastu Pooja", "Katha"],
    latitude: 22.7634,
    longitude: 75.9101,
  },
  {
    id: "85a1efba-8e7c-473d-9d41-3b7fa2540003",
    name: "Pandit Amit Sharma",
    phone: "9999999003",
    rating: 4.70,
    specializations: ["Havan", "Katha", "Namkaran"],
    latitude: 22.7634,
    longitude: 75.9101,
  },
  {
    id: "85a1efba-8e7c-473d-9d41-3b7fa2540004",
    name: "Pandit Devendra Dixit",
    phone: "9999999004",
    rating: 4.60,
    specializations: ["Rudrabhishek", "Katha"],
    latitude: 22.7634,
    longitude: 75.9101,
  }
];

async function seed() {
  console.log("Seeding fallback pandits...");
  for (const p of fallbackPandits) {
    try {
      await query(
        `
          INSERT INTO pandits (id, name, phone, rating, specializations, latitude, longitude, is_active, is_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            rating = EXCLUDED.rating,
            specializations = EXCLUDED.specializations,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude
        `,
        [p.id, p.name, p.phone, p.rating, p.specializations, p.latitude, p.longitude]
      );
      console.log(`Seeded: ${p.name}`);
    } catch (err) {
      console.error(`Failed to seed ${p.name}:`, err.message);
    }
  }
  console.log("Seeding completed.");
  process.exit(0);
}

seed();
