const {
  notifySelectedPanditsPrepaymentConfirmed,
  notifyBookingConfirmed,
  notifyPanditAlreadyBooked,
  notifyUserSearchingWiderArea,
  sendBookingReminderNotifications,
} = require("../services/notificationService");

const triggerPendingPanditNotifications = async ({ bookingId, panditIds }) => {
  return notifySelectedPanditsPrepaymentConfirmed({ bookingId, panditIds });
};

const triggerBookingWonNotifications = async ({ bookingId, panditId }) => {
  return notifyBookingConfirmed({ bookingId, panditId });
};

module.exports = {
  triggerPendingPanditNotifications,
  triggerBookingWonNotifications,
  notifyPanditAlreadyBooked,
  notifyUserSearchingWiderArea,
  sendBookingReminderNotifications,
};
