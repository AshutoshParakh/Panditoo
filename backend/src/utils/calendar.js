const lockPanditCalendar = async ({ panditId, bookingId, bookingDate, bookingTime }) => {
  console.log(
    `[calendar] locking pandit ${panditId} for booking ${bookingId} on ${bookingDate} ${bookingTime}`
  );
};

module.exports = {
  lockPanditCalendar,
};
