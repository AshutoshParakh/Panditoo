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
    credit_cost: 10,
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
    credit_cost: 10,
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
    credit_cost: 10,
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
    credit_cost: 10,
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
    credit_cost: 10,
    duration_minutes: 150,
    samagri_list: [
      { item_en: "Bel patra", item_hi: "\u092c\u0947\u0932 \u092a\u0924\u094d\u0930", brought_by: "user" },
      { item_en: "Raw milk and curd", item_hi: "\u0915\u091a\u094d\u091a\u093e \u0926\u0942\u0927 \u0914\u0930 \u0926\u0939\u0940", brought_by: "user" },
      { item_en: "Honey", item_hi: "\u0936\u0939\u0926", brought_by: "user" },
      { item_en: "Rudra path book", item_hi: "\u0930\u0941\u0926\u094d\u0930 \u092a\u093e\u0920 \u092a\u0941\u0938\u094d\u0924\u0915", brought_by: "pandit" },
      { item_en: "Bhasma and sandalwood", item_hi: "\u092d\u0938\u094d\u092e \u0914\u0930 \u091a\u0902\u0926\u0928", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Vastu Shanti",
    name_hi: "वास्तु शांति",
    description_en: "A Vedic ceremony to harmonize a home or workplace and seek peace, prosperity, and protection. Packages generally range from Rs 3,500 to Rs 4,500.",
    description_hi: "घर या कार्यस्थल में शांति, समृद्धि और सकारात्मक ऊर्जा के लिए वैदिक वास्तु शांति अनुष्ठान। सामान्य पैकेज ₹3,500 से ₹4,500 तक होते हैं।",
    base_price: 3500,
    credit_cost: 10,
    duration_minutes: 120,
    samagri_list: [
      { item_en: "Kalash and coconut", item_hi: "कलश और नारियल", brought_by: "user" },
      { item_en: "Mango leaves and flowers", item_hi: "आम के पत्ते और फूल", brought_by: "user" },
      { item_en: "Vastu shanti and havan samagri", item_hi: "वास्तु शांति और हवन सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Bhoomi Pujan",
    name_hi: "भूमि पूजन",
    description_en: "A foundation ceremony performed before construction to honor the land and seek blessings for a safe, successful project. Packages generally range from Rs 2,500 to Rs 3,500.",
    description_hi: "निर्माण आरंभ करने से पहले भूमि का सम्मान और कार्य की सफलता व सुरक्षा के लिए किया जाने वाला पूजन। सामान्य पैकेज ₹2,500 से ₹3,500 तक होते हैं।",
    base_price: 2500,
    credit_cost: 8,
    duration_minutes: 90,
    samagri_list: [
      { item_en: "Bricks, soil and water", item_hi: "ईंट, मिट्टी और जल", brought_by: "user" },
      { item_en: "Coconut, flowers and sweets", item_hi: "नारियल, फूल और मिठाई", brought_by: "user" },
      { item_en: "Bhoomi pujan ritual kit", item_hi: "भूमि पूजन विधि सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Sundarkand Path",
    name_hi: "सुंदरकांड पाठ",
    description_en: "A devotional recitation from the Ramcharitmanas for courage, protection, devotion, and relief from obstacles. Packages generally range from Rs 1,100 to Rs 1,500.",
    description_hi: "साहस, रक्षा, भक्ति और बाधाओं की निवृत्ति के लिए रामचरितमानस के सुंदरकांड का श्रद्धापूर्वक पाठ। सामान्य पैकेज ₹1,100 से ₹1,500 तक होते हैं।",
    base_price: 1100,
    credit_cost: 5,
    duration_minutes: 90,
    samagri_list: [
      { item_en: "Ramcharitmanas", item_hi: "रामचरितमानस", brought_by: "pandit" },
      { item_en: "Flowers and Hanuman prasad", item_hi: "फूल और हनुमान प्रसाद", brought_by: "user" },
      { item_en: "Diya, incense and camphor", item_hi: "दीपक, धूप और कपूर", brought_by: "user" }
    ]
  },
  {
    name_en: "Mahamrityunjaya Jaap (11/21 Rounds)",
    name_hi: "महामृत्युंजय जाप (11/21 आवृत्ति)",
    description_en: "An 11- or 21-round Mahamrityunjaya mantra package for wellbeing, healing prayers, protection, and inner strength. Packages generally range from Rs 3,500 to Rs 5,000.",
    description_hi: "स्वास्थ्य, आरोग्य, रक्षा और आत्मबल के लिए 11 या 21 आवृत्ति का महामृत्युंजय मंत्र जाप। सामान्य पैकेज ₹3,500 से ₹5,000 तक होते हैं।",
    base_price: 3500,
    credit_cost: 10,
    duration_minutes: 150,
    samagri_list: [
      { item_en: "Rudraksha mala", item_hi: "रुद्राक्ष माला", brought_by: "pandit" },
      { item_en: "Bel patra and flowers", item_hi: "बेल पत्र और फूल", brought_by: "user" },
      { item_en: "Milk, honey and Gangajal", item_hi: "दूध, शहद और गंगाजल", brought_by: "user" }
    ]
  },
  {
    name_en: "Ganesh Sthapana Pooja",
    name_hi: "गणेश स्थापना पूजा",
    description_en: "The complete ritual for installing and invoking Lord Ganesha in a home or community pandal.",
    description_hi: "घर या पंडाल में भगवान गणेश की मूर्ति स्थापना और प्राण-आवाहन की संपूर्ण पूजा विधि।",
    base_price: 2100,
    credit_cost: 8,
    duration_minutes: 90,
    samagri_list: [
      { item_en: "Ganesh murti and platform", item_hi: "गणेश मूर्ति और चौकी", brought_by: "user" },
      { item_en: "Red cloth, durva and flowers", item_hi: "लाल वस्त्र, दूर्वा और फूल", brought_by: "user" },
      { item_en: "Sthapana ritual kit", item_hi: "स्थापना पूजन सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Ganesh Visarjan Pooja",
    name_hi: "गणेश विसर्जन पूजा",
    description_en: "The concluding uttar pooja and farewell rituals performed before Ganesh immersion, including the traditional eleventh-day observance.",
    description_hi: "गणेश विसर्जन से पहले की जाने वाली उत्तर पूजा, आरती और विदाई की विधि, विशेषकर ग्यारहवें दिन के लिए।",
    base_price: 1100,
    credit_cost: 5,
    duration_minutes: 60,
    samagri_list: [
      { item_en: "Flowers, garland and durva", item_hi: "फूल, माला और दूर्वा", brought_by: "user" },
      { item_en: "Coconut and prasad", item_hi: "नारियल और प्रसाद", brought_by: "user" },
      { item_en: "Visarjan pooja essentials", item_hi: "विसर्जन पूजा सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Modak Naivedya Pooja",
    name_hi: "मोदक नैवेद्य पूजा",
    description_en: "A short add-on ritual for offering modak naivedya to Lord Ganesha with mantra, bhog, and aarti.",
    description_hi: "भगवान गणेश को मंत्र, भोग और आरती के साथ मोदक नैवेद्य अर्पित करने की संक्षिप्त ऐड-ऑन पूजा।",
    base_price: 501,
    credit_cost: 3,
    duration_minutes: 30,
    samagri_list: [
      { item_en: "Modak", item_hi: "मोदक", brought_by: "user" },
      { item_en: "Flowers and durva", item_hi: "फूल और दूर्वा", brought_by: "user" },
      { item_en: "Naivedya pooja essentials", item_hi: "नैवेद्य पूजा सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Ganesh Chaturthi Sankashti Bundle",
    name_hi: "गणेश चतुर्थी संकष्टी बंडल",
    description_en: "An eleven-day Ganesh festival package with daily pooja and aarti, from sthapana through the concluding observance.",
    description_hi: "स्थापना से समापन तक ग्यारह दिनों की दैनिक गणेश पूजा और आरती का संपूर्ण उत्सव पैकेज।",
    base_price: 11000,
    credit_cost: 20,
    service_days: 11,
    duration_minutes: 660,
    samagri_list: [
      { item_en: "Ganesh murti and daily prasad", item_hi: "गणेश मूर्ति और दैनिक प्रसाद", brought_by: "user" },
      { item_en: "Flowers, durva and diya supplies", item_hi: "फूल, दूर्वा और दीपक सामग्री", brought_by: "user" },
      { item_en: "Daily pooja and aarti kit", item_hi: "दैनिक पूजा और आरती सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Kalash Sthapana",
    name_hi: "कलश स्थापना",
    description_en: "The auspicious opening-day ritual to establish the sacred kalash, commonly booked for the first day of Navratri and other observances.",
    description_hi: "नवरात्रि और अन्य अनुष्ठानों के प्रथम दिन पवित्र कलश स्थापित करने की मांगलिक विधि।",
    base_price: 1100,
    credit_cost: 5,
    duration_minutes: 60,
    samagri_list: [
      { item_en: "Kalash, coconut and red cloth", item_hi: "कलश, नारियल और लाल वस्त्र", brought_by: "user" },
      { item_en: "Barley, soil and mango leaves", item_hi: "जौ, मिट्टी और आम के पत्ते", brought_by: "user" },
      { item_en: "Sthapana pooja essentials", item_hi: "स्थापना पूजा सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Durga Pooja / Devi Pooja",
    name_hi: "दुर्गा पूजा / देवी पूजा",
    description_en: "Traditional worship of Maa Durga or the chosen Devi, available for a single auspicious day or as a daily Navratri service.",
    description_hi: "माँ दुर्गा या इष्ट देवी की पारंपरिक पूजा, किसी विशेष शुभ दिन या नवरात्रि की दैनिक सेवा के रूप में।",
    base_price: 2100,
    credit_cost: 8,
    duration_minutes: 90,
    samagri_list: [
      { item_en: "Red cloth, chunri and flowers", item_hi: "लाल वस्त्र, चुनरी और फूल", brought_by: "user" },
      { item_en: "Fruits, sweets and sindoor", item_hi: "फल, मिठाई और सिंदूर", brought_by: "user" },
      { item_en: "Devi pooja ritual kit", item_hi: "देवी पूजा विधि सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Kunwari Kanya Pooja & Bhojan",
    name_hi: "कुँवारी कन्या पूजन एवं भोजन",
    description_en: "Ashtami or Navami kanya pooja with the traditional worship and meal service for young girls.",
    description_hi: "अष्टमी या नवमी पर कन्याओं का पारंपरिक पूजन और श्रद्धापूर्वक भोजन कराने की विधि।",
    base_price: 2500,
    credit_cost: 8,
    duration_minutes: 120,
    samagri_list: [
      { item_en: "Kanya bhojan and prasad", item_hi: "कन्या भोजन और प्रसाद", brought_by: "user" },
      { item_en: "Chunri, gifts and dakshina", item_hi: "चुनरी, उपहार और दक्षिणा", brought_by: "user" },
      { item_en: "Kanya pooja essentials", item_hi: "कन्या पूजन सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Navratri Havan",
    name_hi: "नवरात्रि हवन",
    description_en: "A sacred Ashtami or Navami fire ritual marking the culmination of Navratri worship with Devi mantras and offerings.",
    description_hi: "देवी मंत्रों और आहुतियों के साथ अष्टमी या नवमी पर नवरात्रि साधना के समापन का पवित्र हवन।",
    base_price: 3500,
    credit_cost: 10,
    duration_minutes: 120,
    samagri_list: [
      { item_en: "Havan kund and wood", item_hi: "हवन कुंड और समिधा", brought_by: "user" },
      { item_en: "Ghee, coconut and fruits", item_hi: "घी, नारियल और फल", brought_by: "user" },
      { item_en: "Navratri havan samagri", item_hi: "नवरात्रि हवन सामग्री", brought_by: "pandit" }
    ]
  },
  {
    name_en: "Durga Saptashati Path",
    name_hi: "दुर्गा सप्तशती पाठ",
    description_en: "A complete recitation of Durga Saptashati for divine protection, courage, wellbeing, and the blessings of Maa Durga.",
    description_hi: "दैवीय रक्षा, साहस, कल्याण और माँ दुर्गा की कृपा के लिए संपूर्ण दुर्गा सप्तशती पाठ।",
    base_price: 5100,
    credit_cost: 10,
    duration_minutes: 240,
    samagri_list: [
      { item_en: "Durga Saptashati scripture", item_hi: "दुर्गा सप्तशती ग्रंथ", brought_by: "pandit" },
      { item_en: "Red flowers, chunri and sindoor", item_hi: "लाल फूल, चुनरी और सिंदूर", brought_by: "user" },
      { item_en: "Fruits, sweets and diya supplies", item_hi: "फल, मिठाई और दीपक सामग्री", brought_by: "user" }
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
            credit_cost,
            service_days,
            duration_minutes,
            samagri_list,
            is_active,
            display_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, TRUE,
            (SELECT COALESCE(MAX(display_order), 0) + 1 FROM pooja_types))
          ON CONFLICT (name_en)
          DO UPDATE SET
            name_hi = EXCLUDED.name_hi,
            description_en = EXCLUDED.description_en,
            description_hi = EXCLUDED.description_hi,
            base_price = EXCLUDED.base_price,
            credit_cost = EXCLUDED.credit_cost,
            service_days = EXCLUDED.service_days,
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
          poojaType.credit_cost,
          poojaType.service_days || 1,
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
