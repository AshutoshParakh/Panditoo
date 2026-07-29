const { pool, query } = require("../config/db");
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require("../utils/razorpay");
const { triggerPendingPanditNotifications } = require("../utils/notifications");

const activateBookingAfterPrepayment = async (client, { bookingId, orderId, paymentId, paymentStatus = "paid" }) => {
  const paymentResult = await client.query(
    `
      SELECT p.id, p.booking_id, p.type, p.status, b.user_id, b.prepaid_status
      FROM payments p
      INNER JOIN bookings b ON b.id = p.booking_id
      WHERE p.booking_id = $1
        AND p.razorpay_order_id = $2
        AND p.type = 'prepayment'
      ORDER BY p.created_at DESC
      LIMIT 1
    `,
    [bookingId, orderId]
  );

  if (paymentResult.rowCount === 0) {
    throw new Error("Matching prepayment record not found");
  }

  const payment = paymentResult.rows[0];

  if (payment.prepaid_status === "paid") {
    return {
      paymentId: payment.id,
      panditIds: [],
      alreadyActivated: true,
    };
  }

  await client.query(
    `
      UPDATE payments
      SET razorpay_payment_id = $1,
          status = $2
      WHERE id = $3
    `,
    [paymentId, paymentStatus, payment.id]
  );

  await client.query(
    `
      UPDATE bookings
      SET prepaid_status = 'paid', updated_at = NOW()
      WHERE id = $1
    `,
    [bookingId]
  );

  const panditRows = await client.query(
    `
      SELECT pandit_id
      FROM booking_requests
      WHERE booking_id = $1
      ORDER BY created_at ASC
    `,
    [bookingId]
  );

  return {
    paymentId: payment.id,
    panditIds: panditRows.rows.map((row) => row.pandit_id),
    alreadyActivated: false,
  };
};

const createPaymentOrder = async (req, res, next) => {
  try {
    const { booking_id } = req.body;

    const bookingResult = await query(
      `
        SELECT id, user_id, prepaid_amount, prepaid_status, status
        FROM bookings
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [booking_id, req.user.id]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const booking = bookingResult.rows[0];

    if (booking.prepaid_status === "paid") {
      return res.status(400).json({ success: false, message: "Prepayment already completed" });
    }

    const order = await createRazorpayOrder({
      amount: booking.prepaid_amount,
      receipt: `rcpt_${booking.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        booking_id: booking.id,
        user_id: booking.user_id,
        payment_type: "prepayment",
      },
    });

    const paymentResult = await query(
      `
        INSERT INTO payments (
          booking_id,
          amount,
          type,
          razorpay_order_id,
          status
        )
        VALUES ($1, $2, 'prepayment', $3, 'created')
        RETURNING id, booking_id, amount, type, razorpay_order_id, status, created_at
      `,
      [booking.id, booking.prepaid_amount, order.id]
    );

    return res.status(201).json({
      success: true,
      booking_id: booking.id,
      payment: paymentResult.rows[0],
      razorpay_order: order,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || "",
    });
  } catch (error) {
    return next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const bookingResult = await client.query(
      `
        SELECT id, user_id, prepaid_status
        FROM bookings
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [booking_id, req.user.id]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" });
    }

    await client.query("BEGIN");
    const activation = await activateBookingAfterPrepayment(client, {
      bookingId: booking_id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
    await client.query("COMMIT");

    if (!activation.alreadyActivated) {
      await triggerPendingPanditNotifications({
        bookingId: booking_id,
        panditIds: activation.panditIds,
      });
    }

    return res.status(200).json({
      success: true,
      message: activation.alreadyActivated ? "payment_already_verified" : "payment_verified",
      booking_id,
      prepaid_status: "paid",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackError) {
      // Ignore rollback failures.
    }
    return next(error);
  } finally {
    client.release();
  }
};

const handleRazorpayWebhook = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

    const isValid = verifyWebhookSignature({ rawBody, signature });

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = JSON.parse(rawBody.toString("utf8"));
    const eventName = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity || !paymentEntity.order_id) {
      return res.status(200).json({ success: true, message: "ignored" });
    }

    if (eventName !== "payment.captured" && eventName !== "order.paid") {
      return res.status(200).json({ success: true, message: "ignored" });
    }

    const paymentRecordResult = await client.query(
      `
        SELECT booking_id
        FROM payments
        WHERE razorpay_order_id = $1
          AND type = 'prepayment'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [paymentEntity.order_id]
    );

    if (paymentRecordResult.rowCount === 0) {
      return res.status(200).json({ success: true, message: "ignored" });
    }

    const bookingId = paymentRecordResult.rows[0].booking_id;

    await client.query("BEGIN");
    const activation = await activateBookingAfterPrepayment(client, {
      bookingId,
      orderId: paymentEntity.order_id,
      paymentId: paymentEntity.id,
    });
    await client.query("COMMIT");

    if (!activation.alreadyActivated) {
      await triggerPendingPanditNotifications({
        bookingId,
        panditIds: activation.panditIds,
      });
    }

    return res.status(200).json({ success: true, message: activation.alreadyActivated ? "already_processed" : "processed" });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackError) {
      // Ignore rollback failures.
    }
    return next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
};
