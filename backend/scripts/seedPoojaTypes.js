const dotenv = require("dotenv");

dotenv.config();

const { query, pool } = require("../src/config/db");

const poojaTypes = [
  {
    name_en: "Satyanarayan Pooja",
    name_hi: "\u0938\u0924\u094d\u092f\u0928\u093e\u0930\u093e\u092f\u0923 \u092a\u0942\u091c\u093e",
    description_en:
      "A devotional Vishnu pooja commonly performed for prosperity, family wellbeing, and thanksgiving.",
    description_hi:
      "\u0938\u092e\u0943\u0926\u094d\u0927\u093f, \u092a\u093e\u0930\u093f\u0935\u093e\u0930\u093f\u0915 \u0938\u0941\u0916-\u0936\u093e\u0902\u0924\u093f \u0914\u0930 \u0915\u0943\u0924\u091c\u094d\u091e\u0924\u093e \u0915\u0947 \u0932\u093f\u090f \u0915\u0940 \u091c\u093e\u0928\u0947 \u0935\u093e\u0932\u0940 \u092d\u0917\u0935\u093e\u0928 \u0935\u093f\u0937\u094d\u0923\u0941 \u0915\u0940 \u092d\u0915\u094d\u0924\u093f\u092a\u0942\u0930\u094d\u0923 \u092a\u0942\u091c\u093e\u0964",
    base_price: 3500,
    duration_minutes: 150,
    samagri_list: [
      { item_en: "Kalash", item_hi: "\u0915\u0932\u0936", brought_by: "user" },
      { item_en: "Panchamrit ingredients", item_hi: "\u092a\u0902\u091a\u093e\u092e\u0943\u0924 \u0938\u093e\u092e\u0917\u094d\u0930\u0940", brought_by: "user" },
      { item_en: "Tulsi leaves", item_hi: "\u0924\u0941\u0932\u0938\u0940 \u092a\u0924\u094d\u0924\u0947", brought_by: "user" },
      { item_en: "Pooja book and katha", item_hi: "\u092a\u0942\u091c\u093e \u092a\u0941\u0938\u094d\u0924\u0915 \u0914\u0930 \u0915\u0925\u093e", brought_by: "pandit" },
      { item_en: "Havan samagri", item_hi: "\u0939\u0935\u0928 \u0938\u093e\u092e\u0917\u094d\u0930\u0940", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Griha Pravesh",
    name_hi: "\u0917\u0943\u0939 \u092a\u094d\u0930\u0935\u0947\u0936",
    description_en:
      "Housewarming ritual for entering a new home with vastu shanti and blessings for harmony.",
    description_hi:
      "\u0928\u090f \u0918\u0930 \u092e\u0947\u0902 \u092a\u094d\u0930\u0935\u0947\u0936 \u0915\u0947 \u0932\u093f\u090f \u0935\u093e\u0938\u094d\u0924\u0941 \u0936\u093e\u0902\u0924\u093f \u0914\u0930 \u0938\u0941\u0916-\u0938\u092e\u0943\u0926\u094d\u0927\u093f \u0915\u0947 \u0906\u0936\u0940\u0930\u094d\u0935\u093e\u0926 \u0938\u0939\u093f\u0924 \u0917\u0943\u0939 \u092a\u094d\u0930\u0935\u0947\u0936 \u0905\u0928\u0941\u0937\u094d\u0920\u093e\u0928\u0964",
    base_price: 6500,
    duration_minutes: 240,
    samagri_list: [
      { item_en: "Coconut", item_hi: "\u0928\u093e\u0930\u093f\u092f\u0932", brought_by: "user" },
      { item_en: "Milk and rice", item_hi: "\u0926\u0942\u0927 \u0914\u0930 \u091a\u093e\u0935\u0932", brought_by: "user" },
      { item_en: "Mango leaves", item_hi: "\u0906\u092e \u0915\u0947 \u092a\u0924\u094d\u0924\u0947", brought_by: "user" },
      { item_en: "Navgrah items", item_hi: "\u0928\u0935\u0917\u094d\u0930\u0939 \u0938\u093e\u092e\u0917\u094d\u0930\u0940", brought_by: "pandit" },
      { item_en: "Vastu shanti samagri", item_hi: "\u0935\u093e\u0938\u094d\u0924\u0941 \u0936\u093e\u0902\u0924\u093f \u0938\u093e\u092e\u0917\u094d\u0930\u0940", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Navgrah Shanti",
    name_hi: "\u0928\u0935\u0917\u094d\u0930\u0939 \u0936\u093e\u0902\u0924\u093f",
    description_en:
      "A remedial pooja for balancing planetary influences and reducing graha dosha effects.",
    description_hi:
      "\u0917\u094d\u0930\u0939 \u0926\u094b\u0937 \u0915\u0947 \u092a\u094d\u0930\u092d\u093e\u0935 \u0915\u094b \u0915\u092e \u0915\u0930\u0928\u0947 \u0914\u0930 \u0917\u094d\u0930\u0939\u094b\u0902 \u0915\u0947 \u0938\u0902\u0924\u0941\u0932\u0928 \u0939\u0947\u0924\u0941 \u0915\u093f\u092f\u093e \u091c\u093e\u0928\u0947 \u0935\u093e\u0932\u093e \u0936\u093e\u0902\u0924\u093f \u0905\u0928\u0941\u0937\u094d\u0920\u093e\u0928\u0964",
    base_price: 5100,
    duration_minutes: 180,
    samagri_list: [
      { item_en: "Nine colored cloth pieces", item_hi: "\u0928\u094c \u0930\u0902\u0917 \u0915\u0947 \u0915\u092a\u0921\u093c\u0947", brought_by: "user" },
      { item_en: "Flowers and garlands", item_hi: "\u092b\u0942\u0932 \u0914\u0930 \u092e\u093e\u0932\u093e", brought_by: "user" },
      { item_en: "Navdhanya", item_hi: "\u0928\u0935\u0927\u093e\u0928\u094d\u092f", brought_by: "pandit" },
      { item_en: "Havan kund setup", item_hi: "\u0939\u0935\u0928 \u0915\u0941\u0902\u0921 \u0935\u094d\u092f\u0935\u0938\u094d\u0925\u093e", brought_by: "pandit" },
      { item_en: "Ghee and camphor", item_hi: "\u0918\u0940 \u0914\u0930 \u0915\u092a\u0942\u0930", brought_by: "user" }
    ]
  },
  {
    name_en: "Ganesh Pooja",
    name_hi: "\u0917\u0923\u0947\u0936 \u092a\u0942\u091c\u093e",
    description_en:
      "An auspicious pooja to seek Lord Ganesha's blessings before new beginnings and important events.",
    description_hi:
      "\u0928\u090f \u0915\u093e\u0930\u094d\u092f \u092f\u093e \u0936\u0941\u092d \u0905\u0935\u0938\u0930 \u0938\u0947 \u092a\u0939\u0932\u0947 \u092d\u0917\u0935\u093e\u0928 \u0917\u0923\u0947\u0936 \u0915\u093e \u0906\u0936\u0940\u0930\u094d\u0935\u093e\u0926 \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u0915\u0930\u0928\u0947 \u0939\u0947\u0924\u0941 \u0915\u0940 \u091c\u093e\u0928\u0947 \u0935\u093e\u0932\u0940 \u092e\u0902\u0917\u0932\u092e\u092f \u092a\u0942\u091c\u093e\u0964",
    base_price: 2100,
    duration_minutes: 90,
    samagri_list: [
      { item_en: "Modak or laddoo", item_hi: "\u092e\u094b\u0926\u0915 \u092f\u093e \u0932\u0921\u094d\u0921\u0942", brought_by: "user" },
      { item_en: "Durva grass", item_hi: "\u0926\u0942\u0930\u094d\u0935\u093e \u0918\u093e\u0938", brought_by: "user" },
      { item_en: "Red cloth", item_hi: "\u0932\u093e\u0932 \u0935\u0938\u094d\u0924\u094d\u0930", brought_by: "user" },
      { item_en: "Ganesh mantra book", item_hi: "\u0917\u0923\u0947\u0936 \u092e\u0902\u0924\u094d\u0930 \u092a\u0941\u0938\u094d\u0924\u0915", brought_by: "pandit" },
      { item_en: "Pooja thali setup", item_hi: "\u092a\u0942\u091c\u093e \u0925\u093e\u0932\u0940 \u0935\u094d\u092f\u0935\u0938\u094d\u0925\u093e", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Rudrabhishek",
    name_hi: "\u0930\u0941\u0926\u094d\u0930\u093e\u092d\u093f\u0937\u0947\u0915",
    description_en:
      "A Shiva abhishek ritual for spiritual protection, inner peace, and removal of obstacles.",
    description_hi:
      "\u0906\u0927\u094d\u092f\u093e\u0924\u094d\u092e\u093f\u0915 \u0938\u0902\u0930\u0915\u094d\u0937\u0923, \u092e\u0928 \u0915\u0940 \u0936\u093e\u0902\u0924\u093f \u0914\u0930 \u0935\u093f\u0918\u094d\u0928\u094b\u0902 \u0915\u0940 \u0928\u093f\u0935\u0943\u0924\u094d\u0924\u093f \u0915\u0947 \u0932\u093f\u090f \u0915\u093f\u092f\u093e \u091c\u093e\u0928\u0947 \u0935\u093e\u0932\u093e \u0936\u093f\u0935 \u0905\u092d\u093f\u0937\u0947\u0915 \u0905\u0928\u0941\u0937\u094d\u0920\u093e\u0928\u0964",
    base_price: 4500,
    duration_minutes: 150,
    samagri_list: [
      { item_en: "Bel patra", item_hi: "\u092c\u0947\u0932 \u092a\u0924\u094d\u0930", brought_by: "user" },
      { item_en: "Raw milk and curd", item_hi: "\u0915\u091a\u094d\u091a\u093e \u0926\u0942\u0927 \u0914\u0930 \u0926\u0939\u0940", brought_by: "user" },
      { item_en: "Honey", item_hi: "\u0936\u0939\u0926", brought_by: "user" },
      { item_en: "Rudra path book", item_hi: "\u0930\u0941\u0926\u094d\u0930 \u092a\u093e\u0920 \u092a\u0941\u0938\u094d\u0924\u0915", brought_by: "pandit" },
      { item_en: "Bhasma and sandalwood", item_hi: "\u092d\u0938\u094d\u092e \u0914\u0930 \u091a\u0902\u0926\u0928", brought_by: "pandit" }
    ]
  }
];

const run = async () => {
  try {
    for (const poojaType of poojaTypes) {
      await query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, TRUE)
          ON CONFLICT (name_en)
          DO UPDATE SET
            name_hi = EXCLUDED.name_hi,
            description_en = EXCLUDED.description_en,
            description_hi = EXCLUDED.description_hi,
            base_price = EXCLUDED.base_price,
            duration_minutes = EXCLUDED.duration_minutes,
            samagri_list = EXCLUDED.samagri_list,
            is_active = EXCLUDED.is_active
        `,
        [
          poojaType.name_en,
          poojaType.name_hi,
          poojaType.description_en,
          poojaType.description_hi,
          poojaType.base_price,
          poojaType.duration_minutes,
          JSON.stringify(poojaType.samagri_list),
        ]
      );
    }

    console.log("Seeded sample pooja types");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
