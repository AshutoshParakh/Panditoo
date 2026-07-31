const { query } = require("../config/db");

const getBookingConfig = async () => {
  const [settings, slots] = await Promise.all([
    query("SELECT advance_booking_days FROM marketplace_settings WHERE id = 1"),
    query("SELECT id, label, to_char(time_value, 'HH24:MI') AS time_value FROM booking_time_slots WHERE is_active = TRUE ORDER BY time_value"),
  ]);
  return { advance_booking_days: settings.rows[0]?.advance_booking_days || 30, slots: slots.rows };
};

const getPriceQuote = async ({ poojaTypeId, bookingDate, couponCode }) => {
  const poojaResult = await query("SELECT id, name_en, base_price FROM pooja_types WHERE id = $1 AND is_active = TRUE", [poojaTypeId]);
  if (!poojaResult.rowCount) throw Object.assign(new Error("Pooja type not found"), { status: 404 });
  const pooja = poojaResult.rows[0];
  const ruleResult = await query(
    `SELECT id, title, sale_price, list_price, payment_percent FROM date_pricing_rules
     WHERE pricing_date = $1 AND is_active = TRUE AND (pooja_type_id = $2 OR pooja_type_id IS NULL)
     ORDER BY pooja_type_id NULLS LAST LIMIT 1`, [bookingDate, poojaTypeId]
  );
  const rule = ruleResult.rows[0];
  const salePrice = Number(rule?.sale_price ?? pooja.base_price);
  const listPrice = Number(rule?.list_price ?? salePrice);
  const paymentPercent = Number(rule?.payment_percent || 30);
  let coupon = null;
  let discountAmount = 0;
  if (couponCode) {
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
  }
  const totalPrice = Number((salePrice - discountAmount).toFixed(2));
  return {
    pooja_type_id: pooja.id, booking_date: bookingDate, rule_id: rule?.id || null,
    festival_title: rule?.title || null, list_price: listPrice, sale_price: salePrice,
    discount_amount: discountAmount, total_price: totalPrice, payment_percent: paymentPercent,
    payable_now: Number((totalPrice * paymentPercent / 100).toFixed(2)),
    remaining_amount: Number((totalPrice * (100 - paymentPercent) / 100).toFixed(2)),
    coupon: coupon ? { id: coupon.id, code: coupon.code } : null,
  };
};

module.exports = { getBookingConfig, getPriceQuote };
