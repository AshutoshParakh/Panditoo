const cron = require("node-cron");
const { query } = require("../config/db");
const { getNextBatch } = require("../utils/geo");
const {
  notifySelectedPanditsPrepaymentConfirmed,
  notifyUserSearchingWiderArea,
  sendBookingReminderNotifications,
  notifyUserBookingExpired,
} = require("./notificationService");

const runBatchTimeoutJob = async () => {
  const jobName = "batch_timeout_job";
  let logId = null;
  const actionsTaken = [];

  try {
    // 1. Insert running log row
    const logResult = await query(
      `
        INSERT INTO cron_logs (job_name, status, started_at)
        VALUES ($1, 'running', NOW())
        RETURNING id
      `,
      [jobName]
    );
    logId = logResult.rows[0].id;

    // 2. Fetch bookings
    const bookingsResult = await query(
      `
        SELECT b.id, b.user_id, b.latitude, b.longitude, b.current_batch, b.current_radius_km, b.updated_at
        FROM bookings b
        WHERE b.status = 'pending'
          AND b.prepaid_status = 'paid'
      `
    );

    const TIMEOUT_HOURS = Number(process.env.TIMEOUT_HOURS || 2);

    for (const booking of bookingsResult.rows) {
      // Get current batch requests
      const requestsResult = await query(
        `
          SELECT id, status, created_at, pandit_id
          FROM booking_requests
          WHERE booking_id = $1
            AND batch_number = $2
        `,
        [booking.id, booking.current_batch]
      );

      const hasWonRequest = requestsResult.rows.some((r) => r.status === "won");
      if (hasWonRequest) {
        continue;
      }

      // Check timeout: current batch's booking_requests were created more than TIMEOUT_HOURS ago
      const latestRequestTime = requestsResult.rowCount > 0
        ? new Date(Math.max(...requestsResult.rows.map((r) => new Date(r.created_at))))
        : new Date(booking.updated_at);

      const hoursElapsed = (new Date() - latestRequestTime) / (1000 * 60 * 60);
      const hasTimedOut = hoursElapsed >= TIMEOUT_HOURS;

      if (hasTimedOut) {
        if (booking.current_radius_km <= 25) {
          const nextBatchNumber = booking.current_batch + 1;
          let nextRadiusKm = booking.current_radius_km;

          // Expand radius by 10km if this is the 2nd expansion
          // Batch 1 -> Batch 2 is 1st expansion
          // Batch 2 -> Batch 3 is 2nd expansion
          if (nextBatchNumber === 3) {
            nextRadiusKm += 10;
          } else if (nextBatchNumber > 3) {
            // Also expand by 10km for subsequent batches so it can cross 25km and trigger expiration
            nextRadiusKm += 10;
          }

          // Fetch all already notified pandits
          const excludedResult = await query(
            `SELECT DISTINCT pandit_id FROM booking_requests WHERE booking_id = $1`,
            [booking.id]
          );
          const excludedPanditIds = excludedResult.rows.map((r) => r.pandit_id);

          const nextPandits = await getNextBatch(
            booking.latitude,
            booking.longitude,
            nextRadiusKm,
            excludedPanditIds,
            10000
          );

          if (nextPandits.length > 0) {
            await query(
              `
                UPDATE bookings
                SET current_batch = $1,
                    current_radius_km = $2,
                    updated_at = NOW()
                WHERE id = $3
              `,
              [nextBatchNumber, nextRadiusKm, booking.id]
            );

            for (const pandit of nextPandits) {
              await query(
                `
                  INSERT INTO booking_requests (booking_id, pandit_id, batch_number, status)
                  VALUES ($1, $2, $3, 'pending'::booking_request_status)
                `,
                [booking.id, pandit.id, nextBatchNumber]
              );
            }

            const panditIds = nextPandits.map((p) => p.id);
            await notifySelectedPanditsPrepaymentConfirmed({
              bookingId: booking.id,
              panditIds,
            });

            await notifyUserSearchingWiderArea({ bookingId: booking.id });

            actionsTaken.push({
              booking_id: booking.id,
              action: "incremented_batch",
              details: {
                from_batch: booking.current_batch,
                to_batch: nextBatchNumber,
                radius: nextRadiusKm,
                new_pandits_count: panditIds.length,
              },
            });
          } else {
            // No new pandits found.
            // If the expanded radius is > 25, expire the booking immediately.
            // Otherwise, we still increment batch/radius so it can expand further on next runs.
            if (nextRadiusKm > 25) {
              await expireBooking(booking, actionsTaken);
            } else {
              await query(
                `
                  UPDATE bookings
                  SET current_batch = $1,
                      current_radius_km = $2,
                      updated_at = NOW()
                  WHERE id = $3
                `,
                [nextBatchNumber, nextRadiusKm, booking.id]
              );

              actionsTaken.push({
                booking_id: booking.id,
                action: "incremented_batch_no_pandits",
                details: {
                  from_batch: booking.current_batch,
                  to_batch: nextBatchNumber,
                  radius: nextRadiusKm,
                },
              });
            }
          }
        } else {
          // current_radius_km > 25 and still no pandit
          await expireBooking(booking, actionsTaken);
        }
      }
    }

    if (logId) {
      await query(
        `
          UPDATE cron_logs
          SET completed_at = NOW(),
              status = 'success',
              actions_summary = $1
          WHERE id = $2
        `,
        [JSON.stringify(actionsTaken), logId]
      );
    }
  } catch (error) {
    console.error("Error in runBatchTimeoutJob:", error);
    if (logId) {
      try {
        await query(
          `
            UPDATE cron_logs
            SET completed_at = NOW(),
                status = 'failed',
                error_message = $1
            WHERE id = $2
          `,
          [error.message, logId]
        );
      } catch (logErr) {
        console.error("Failed to update failed cron log:", logErr);
      }
    }
  }
};

const expireBooking = async (booking, actionsTaken) => {
  await query(
    `
      UPDATE bookings
      SET status = 'expired',
          flagged_for_manual_intervention = TRUE,
          updated_at = NOW()
      WHERE id = $1
    `,
    [booking.id]
  );

  const supportLink = process.env.SUPPORT_CONTACT_LINK || "https://example.com/support";

  await notifyUserBookingExpired({
    bookingId: booking.id,
    userId: booking.user_id,
    supportLink,
  });

  actionsTaken.push({
    booking_id: booking.id,
    action: "expired",
    details: {
      radius: booking.current_radius_km,
      support_link: supportLink,
    },
  });
};

const runReminderJob = async () => {
  try {
    const bookingsResult = await query(
      `
        SELECT b.id, b.user_id, b.confirmed_pandit_id, b.booking_date, b.booking_time, pt.name_en
        FROM bookings b
        INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
        WHERE b.status = 'confirmed'
          AND b.confirmed_pandit_id IS NOT NULL
          AND b.booking_date = CURRENT_DATE + INTERVAL '1 day'
      `
    );

    for (const booking of bookingsResult.rows) {
      const message = `Reminder: ${booking.name_en} is scheduled on ${booking.booking_date} at ${booking.booking_time}`;

      const userLogCheck = await query(
        `
          SELECT 1 FROM notifications_log
          WHERE recipient_id = $1
            AND channel = 'whatsapp'
            AND message = $2
          LIMIT 1
        `,
        [booking.user_id, message]
      );

      if (userLogCheck.rowCount === 0) {
        await sendBookingReminderNotifications({ bookingId: booking.id });
      }
    }
  } catch (error) {
    console.error("Error in runReminderJob:", error);
  }
};

let cronJobs = [];

const startScheduler = () => {
  if (cronJobs.length > 0) return;

  // Batch timeout job runs every 15 minutes by default
  const batchTimeoutSchedule = process.env.BATCH_TIMEOUT_CRON || "*/15 * * * *";
  const batchJob = cron.schedule(batchTimeoutSchedule, async () => {
    console.log(`[Cron] Running batch timeout job at ${new Date().toISOString()}`);
    await runBatchTimeoutJob();
  });
  cronJobs.push(batchJob);

  // Reminder job runs every hour by default
  const reminderSchedule = process.env.REMINDER_CRON || "0 * * * *";
  const reminderJob = cron.schedule(reminderSchedule, async () => {
    console.log(`[Cron] Running reminder job at ${new Date().toISOString()}`);
    await runReminderJob();
  });
  cronJobs.push(reminderJob);

  console.log(`[Cron] Scheduler started. Timeout: ${batchTimeoutSchedule}, Reminder: ${reminderSchedule}`);
};

const stopScheduler = () => {
  for (const job of cronJobs) {
    job.stop();
  }
  cronJobs = [];
  console.log("[Cron] Scheduler stopped.");
};

module.exports = {
  runBatchTimeoutJob,
  runReminderJob,
  startScheduler,
  stopScheduler,
};
