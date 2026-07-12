const { pool, query } = require("../config/db");

const createRating = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { booking_id, rating, comment } = req.body;
    const ratingValue = Number(rating);

    if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating is required and must be an integer between 1 and 5",
      });
    }

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    // 1. Fetch booking details to verify ownership and completion state
    const bookingResult = await client.query(
      `
        SELECT id, user_id, status, confirmed_pandit_id
        FROM bookings
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [booking_id, req.user.id]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or access denied",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed bookings can be rated",
      });
    }

    if (!booking.confirmed_pandit_id) {
      return res.status(400).json({
        success: false,
        message: "This booking has no confirmed pandit to rate",
      });
    }

    // 2. Check if user already rated this booking
    const existingResult = await client.query(
      `
        SELECT id
        FROM ratings
        WHERE booking_id = $1
          AND rated_by = 'user'
        LIMIT 1
      `,
      [booking_id]
    );

    if (existingResult.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this booking",
      });
    }

    // 3. Insert rating and update pandit rating metrics in a transaction
    await client.query("BEGIN");

    const insertRatingResult = await client.query(
      `
        INSERT INTO ratings (booking_id, rated_by, rating, comment)
        VALUES ($1, 'user', $2, $3)
        RETURNING id, booking_id, rated_by, rating, comment, created_at
      `,
      [booking_id, ratingValue, comment || null]
    );

    // Update pandit rating details
    await client.query(
      `
        UPDATE pandits
        SET rating = ((rating * total_ratings_count) + $1) / (total_ratings_count + 1),
            total_ratings_count = total_ratings_count + 1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [ratingValue, booking.confirmed_pandit_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      rating: insertRatingResult.rows[0],
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_rollbackError) {
      // Ignore rollback failures
    }
    return next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  createRating,
};
