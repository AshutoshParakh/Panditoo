const admin = require("firebase-admin");

const { pool, query } = require("../config/db");

const columnCache = new Map();
let firebaseInitialized = false;

const getFirebaseCredentials = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
};

const ensureFirebase = () => {
  if (firebaseInitialized) {
    return true;
  }

  const credentials = getFirebaseCredentials();
  if (!credentials) {
    return false;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
  }

  firebaseInitialized = true;
  return true;
};

const hasColumn = async (tableName, columnName) => {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey);
  }

  const result = await query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [tableName, columnName]
  );

  const exists = result.rows[0].exists;
  columnCache.set(cacheKey, exists);
  return exists;
};

const logNotification = async ({ recipientType, recipientId, channel, message, status }) => {
  await query(
    `
      INSERT INTO notifications_log (recipient_type, recipient_id, channel, message, status)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [recipientType, recipientId, channel, message, status]
  );
};

const getRecipient = async (tableName, id) => {
  const hasFcmToken = await hasColumn(tableName, "fcm_token");
  const selectToken = hasFcmToken ? "fcm_token" : "NULL::text AS fcm_token";

  const result = await query(
    `
      SELECT id, name, phone, ${selectToken}
      FROM ${tableName}
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rowCount ? result.rows[0] : null;
};

const sendPush = async ({ recipientType, recipientId, title, body, data }) => {
  const tableName = recipientType === "user" ? "users" : recipientType === "pandit" ? "pandits" : "admins";
  const recipient = await getRecipient(tableName, recipientId);
  const message = `${title}: ${body}`;

  if (!recipient) {
    await logNotification({ recipientType, recipientId, channel: "push", message, status: "recipient_not_found" });
    return { success: false, status: "recipient_not_found" };
  }

  if (!recipient.fcm_token) {
    await logNotification({ recipientType, recipientId, channel: "push", message, status: "skipped_no_fcm_token" });
    return { success: false, status: "skipped_no_fcm_token" };
  }

  if (!ensureFirebase()) {
    await logNotification({ recipientType, recipientId, channel: "push", message, status: "skipped_missing_firebase_config" });
    return { success: false, status: "skipped_missing_firebase_config" };
  }

  try {
    await admin.messaging().send({
      token: recipient.fcm_token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [key, String(value)])
      ),
    });

    await logNotification({ recipientType, recipientId, channel: "push", message, status: "sent" });
    return { success: true, status: "sent" };
  } catch (error) {
    await logNotification({ recipientType, recipientId, channel: "push", message, status: `failed:${error.message}` });
    return { success: false, status: "failed" };
  }
};

const sendWhatsApp = async (phone, templateName, params) => {
  console.log(`[whatsapp] template=${templateName} phone=${phone} params=${JSON.stringify(params)}`);
  return { success: true, status: "sent_stub" };
};

const sendWhatsAppToRecipient = async ({ recipientType, recipientId, templateName, params, message }) => {
  const tableName = recipientType === "user" ? "users" : recipientType === "pandit" ? "pandits" : "admins";
  const recipient = await getRecipient(tableName, recipientId);

  if (!recipient) {
    await logNotification({ recipientType, recipientId, channel: "whatsapp", message, status: "recipient_not_found" });
    return { success: false, status: "recipient_not_found" };
  }

  const result = await sendWhatsApp(recipient.phone, templateName, params);
  await logNotification({ recipientType, recipientId, channel: "whatsapp", message, status: result.status });
  return result;
};

const sendPushToUser = async (userId, title, body, data = {}) => {
  return sendPush({ recipientType: "user", recipientId: userId, title, body, data });
};

const sendPushToPandit = async (panditId, title, body, data = {}) => {
  return sendPush({ recipientType: "pandit", recipientId: panditId, title, body, data });
};

const notifySelectedPanditsPrepaymentConfirmed = async ({ bookingId, panditIds }) => {
  const bookingResult = await query(
    `
      SELECT b.id, b.booking_date, b.booking_time, pt.name_en, pt.name_hi, u.name AS user_name
      FROM bookings b
      INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
      INNER JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  if (!bookingResult.rowCount) {
    return;
  }

  const booking = bookingResult.rows[0];
  const title = "New Pooja Booking Available";
  const body = `${booking.name_en} on ${booking.booking_date} at ${booking.booking_time}`;

  for (const panditId of panditIds) {
    await sendPushToPandit(panditId, title, body, {
      bookingId,
      poojaName: booking.name_en,
      bookingDate: booking.booking_date,
      bookingTime: booking.booking_time,
      userName: booking.user_name,
    });

    await sendWhatsAppToRecipient({
      recipientType: "pandit",
      recipientId: panditId,
      templateName: "pandit_prepayment_confirmed",
      params: [booking.name_en, booking.booking_date, booking.booking_time, booking.user_name],
      message: `${title}: ${body}`,
    });
  }
};

const notifyBookingConfirmed = async ({ bookingId, panditId }) => {
  const result = await query(
    `
      SELECT
        b.id,
        b.user_id,
        b.address,
        b.booking_date,
        b.booking_time,
        u.name AS user_name,
        p.name AS pandit_name,
        pt.name_en
      FROM bookings b
      INNER JOIN users u ON u.id = b.user_id
      INNER JOIN pandits p ON p.id = $2
      INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
      WHERE b.id = $1
      LIMIT 1
    `,
    [bookingId, panditId]
  );

  if (!result.rowCount) {
    return;
  }

  const booking = result.rows[0];

  await sendPushToUser(
    booking.user_id,
    "Booking Confirmed",
    `Booking Confirmed with ${booking.pandit_name}`,
    { bookingId, panditId, poojaName: booking.name_en }
  );
  await sendWhatsAppToRecipient({
    recipientType: "user",
    recipientId: booking.user_id,
    templateName: "user_booking_confirmed",
    params: [booking.pandit_name, booking.name_en, booking.booking_date, booking.booking_time],
    message: `Booking Confirmed with ${booking.pandit_name}`,
  });

  await sendPushToPandit(
    panditId,
    "Congratulations, booking confirmed",
    `${booking.name_en} confirmed. Address: ${booking.address}`,
    { bookingId, userName: booking.user_name, address: booking.address }
  );
  await sendWhatsAppToRecipient({
    recipientType: "pandit",
    recipientId: panditId,
    templateName: "pandit_booking_confirmed",
    params: [booking.name_en, booking.booking_date, booking.booking_time, booking.address],
    message: `Congratulations, booking confirmed. Address: ${booking.address}`,
  });
};

const notifyPanditAlreadyBooked = async ({ bookingId, panditId }) => {
  await sendPushToPandit(
    panditId,
    "Already booked by another pandit",
    "This booking was confirmed by another pandit first.",
    { bookingId }
  );
  await sendWhatsAppToRecipient({
    recipientType: "pandit",
    recipientId: panditId,
    templateName: "pandit_booking_lost",
    params: [bookingId],
    message: "Already booked by another pandit",
  });
};

const notifyUserSearchingWiderArea = async ({ bookingId }) => {
  const result = await query(
    `
      SELECT user_id
      FROM bookings
      WHERE id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  if (!result.rowCount) {
    return;
  }

  await sendPushToUser(
    result.rows[0].user_id,
    "Searching wider area",
    "Searching wider area for available pandits.",
    { bookingId }
  );
};

const sendBookingReminderNotifications = async ({ bookingId }) => {
  const result = await query(
    `
      SELECT b.user_id, b.confirmed_pandit_id, b.booking_date, b.booking_time, pt.name_en
      FROM bookings b
      INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
      WHERE b.id = $1
        AND b.confirmed_pandit_id IS NOT NULL
      LIMIT 1
    `,
    [bookingId]
  );

  if (!result.rowCount) {
    return;
  }

  const booking = result.rows[0];
  const message = `Reminder: ${booking.name_en} is scheduled on ${booking.booking_date} at ${booking.booking_time}`;

  await sendWhatsAppToRecipient({
    recipientType: "user",
    recipientId: booking.user_id,
    templateName: "user_booking_reminder",
    params: [booking.name_en, booking.booking_date, booking.booking_time],
    message,
  });

  await sendWhatsAppToRecipient({
    recipientType: "pandit",
    recipientId: booking.confirmed_pandit_id,
    templateName: "pandit_booking_reminder",
    params: [booking.name_en, booking.booking_date, booking.booking_time],
    message,
  });
};

const notifyUserBookingExpired = async ({ bookingId, userId, supportLink }) => {
  await sendPushToUser(
    userId,
    "No pandits available",
    "No pandits available, please contact support",
    { bookingId, supportLink }
  );

  await sendWhatsAppToRecipient({
    recipientType: "user",
    recipientId: userId,
    templateName: "user_booking_expired",
    params: [supportLink],
    message: `No pandits available, please contact support. Contact support at: ${supportLink}`,
  });
};

const notifyPanditVerificationDecision = async ({ panditId, approved, reason = "" }) => {
  const message = approved
    ? "Your pandit profile verification has been approved. You can now start receiving bookings."
    : `Your pandit profile verification was rejected. Reason: ${reason}`;

  await sendWhatsAppToRecipient({
    recipientType: "pandit",
    recipientId: panditId,
    templateName: approved ? "pandit_verification_approved" : "pandit_verification_rejected",
    params: approved ? [] : [reason],
    message,
  });

  await sendPushToPandit(
    panditId,
    approved ? "Verification approved" : "Verification rejected",
    approved ? "Your profile is now active for bookings." : `Reason: ${reason}`,
    { approved, reason }
  );
};

const notifyPanditDeactivated = async ({ panditId, reason }) => {
  const message = `Your pandit profile has been deactivated. Reason: ${reason}`;

  await sendWhatsAppToRecipient({
    recipientType: "pandit",
    recipientId: panditId,
    templateName: "pandit_deactivated",
    params: [reason],
    message,
  });

  await sendPushToPandit(
    panditId,
    "Profile deactivated",
    `Reason: ${reason}`,
    { reason }
  );
};
module.exports = {
  sendPushToUser,
  sendPushToPandit,
  sendWhatsApp,
  sendWhatsAppToRecipient,
  notifySelectedPanditsPrepaymentConfirmed,
  notifyBookingConfirmed,
  notifyPanditAlreadyBooked,
  notifyUserSearchingWiderArea,
  sendBookingReminderNotifications,
  notifyUserBookingExpired,
  notifyPanditVerificationDecision,
  notifyPanditDeactivated,
};


