const { query } = require("../config/db");
const { getReferralCampaign, calculateReferralDiscount } = require("./referralService");

const getBookingConfig = async () => {
  const [settings, slots] = await Promise.all([
    query("SELECT advance_booking_days FROM marketplace_settings WHERE id = 1"),
    query("SELECT id, label, to_char(time_value, 'HH24:MI') AS time_value FROM booking_time_slots WHERE is_active = TRUE ORDER BY time_value"),
  ]);
  return { advance_booking_days: settings.rows[0]?.advance_booking_days || 30, slots: slots.rows };
};

const getPriceQuote = async ({ poojaTypeId, bookingDate, couponCode, referralCode }) => {
  const poojaResult = await query("SELECT id, name_en, base_price FROM pooja_types WHERE id = $1 AND is_active = TRUE", [poojaTypeId]);
  if (!poojaResult.rowCount) throw Object.assign(new Error("Pooja type not found"), { status: 404 });
  const pooja = poojaResult.rows[0];
  const ruleResult = await query(
    `SELECT id, title, sale_price, list_price, payment_percent FROM date_pricing_rules
     WHERE $1::date BETWEEN pricing_date AND pricing_end_date AND is_active = TRUE AND (pooja_type_id = $2 OR pooja_type_id IS NULL)
     ORDER BY (pooja_type_id IS NOT NULL) DESC, pricing_date DESC LIMIT 1`, [bookingDate, poojaTypeId]
  );
  const rule = ruleResult.rows[0];
  const salePrice = Number(rule?.sale_price ?? pooja.base_price);
  const listPrice = Number(rule?.list_price ?? salePrice);
  let paymentPercent = Number(rule?.payment_percent || 30);
  const offerResult = await query(
    `SELECT o.* FROM promotional_offers o
     WHERE o.is_active=TRUE AND $2::date BETWEEN o.starts_at::date AND o.ends_at::date
       AND (o.usage_limit IS NULL OR o.used_count < o.usage_limit)
       AND (o.applies_to_all=TRUE OR EXISTS (SELECT 1 FROM promotional_offer_poojas op WHERE op.offer_id=o.id AND op.pooja_type_id=$1))
     ORDER BY o.created_at DESC LIMIT 1`, [poojaTypeId, bookingDate]
  );
  const offer = offerResult.rows[0] || null;
  let coupon = null;
  const referral = referralCode ? await getReferralCampaign(referralCode) : null;
  let discountAmount = 0;
  if (couponCode && offer) throw Object.assign(new Error("Coupons cannot be combined with an active promotional offer"), { status: 400 });
  if (offer) {
    const promotionalPrice = offer.offer_type === "percent" ? salePrice * (1 - Number(offer.offer_value) / 100) : Number(offer.offer_value);
    discountAmount = Math.max(0, Number((salePrice - Math.min(salePrice, promotionalPrice)).toFixed(2)));
    paymentPercent = 100;
  } else if (couponCode) {
    const couponResult = await query(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = TRUE
       AND NOW() BETWEEN starts_at AND ends_at AND (usage_limit IS NULL OR used_count < usage_limit) LIMIT 1`, [couponCode.trim()]
    );
    coupon = couponResult.rows[0];
    if (!coupon) throw Object.assign(new Error("Coupon is invalid or expired"), { status: 400 });
    if (salePrice < Number(coupon.min_order_amount)) throw Object.assign(new Error(`Minimum order for this coupon is Rs ${coupon.min_order_amount}`), { status: 400 });
    discountAmount = coupon.discount_type === "percent" ? salePrice * Number(coupon.discount_value) / 100 : Number(coupon.discount_value);
    if (coupon.max_discount_amount != null) discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
    discountAmount = Math.min(salePrice, Number(discountAmount.toFixed(2)));
  } else if (referral) {
    discountAmount = calculateReferralDiscount(referral, salePrice);
  }
  const totalPrice = Number((salePrice - discountAmount).toFixed(2));
  return {
    pooja_type_id: pooja.id, booking_date: bookingDate, rule_id: rule?.id || null,
    festival_title: rule?.title || null, list_price: listPrice, sale_price: salePrice,
    discount_amount: discountAmount, total_price: totalPrice, payment_percent: paymentPercent,
    payable_now: Number((totalPrice * paymentPercent / 100).toFixed(2)),
    remaining_amount: Number((totalPrice * (100 - paymentPercent) / 100).toFixed(2)),
    payout_basis_amount: salePrice,
    promotional_offer: offer ? { id: offer.id, title: offer.title, subtitle: offer.subtitle, offer_type: offer.offer_type, offer_value: Number(offer.offer_value) } : null,
    coupon: coupon ? { id: coupon.id, code: coupon.code } : null,
    referral: referral ? { id: referral.id, code: referral.code, name: referral.name, channel: referral.channel, has_discount: Boolean(referral.discount_type) } : null,
  };
};

module.exports = { getBookingConfig, getPriceQuote };
