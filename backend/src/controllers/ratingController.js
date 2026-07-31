const { pool } = require("../config/db");

const createRating = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { booking_id, rating, comment } = req.body;
    const ratingValue = Number(rating);

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
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

    // Serialize ratings for the same pandit so concurrent reviews cannot lose a count.
    await client.query("SELECT id FROM pandits WHERE id = $1 FOR UPDATE", [booking.confirmed_pandit_id]);
    const lockedExistingResult = await client.query(
      "SELECT id FROM ratings WHERE booking_id = $1 AND rated_by = 'user' LIMIT 1",
      [booking_id]
    );
    if (lockedExistingResult.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "You have already rated this booking" });
    }

    const insertRatingResult = await client.query(
      `
        INSERT INTO ratings (booking_id, rated_by, rating, comment)
        VALUES ($1, 'user', $2, $3)
        RETURNING id, booking_id, rated_by, rating, comment, created_at
      `,
      [booking_id, ratingValue, comment || null]
    );

    // Recalculate from the source reviews so cached pandit metrics cannot drift.
    const panditRatingResult = await client.query(
      `
        UPDATE pandits p
        SET rating = stats.average_rating,
            total_ratings_count = stats.ratings_count,
            updated_at = NOW()
        FROM (
          SELECT
            ROUND(AVG(r.rating)::numeric, 2) AS average_rating,
            COUNT(*)::int AS ratings_count
          FROM ratings r
          INNER JOIN bookings b ON b.id = r.booking_id
          WHERE b.confirmed_pandit_id = $1
            AND b.status = 'completed'
            AND r.rated_by = 'user'
        ) stats
        WHERE p.id = $1
        RETURNING p.id, p.rating, p.total_ratings_count
      `,
      [booking.confirmed_pandit_id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      rating: insertRatingResult.rows[0],
      pandit: panditRatingResult.rows[0],
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
