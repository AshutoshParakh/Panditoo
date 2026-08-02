const { query } = require("../config/db");

const normalizeReferralCode = (value) => String(value || "").trim().toUpperCase();

const getReferralCampaign = async (code, { requireDiscount = false } = {}) => {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const result = await query(
    `SELECT * FROM referral_campaigns
     WHERE UPPER(code) = $1 AND is_active = TRUE
       AND (starts_at IS NULL OR starts_at <= NOW())
       AND (ends_at IS NULL OR ends_at >= NOW())
       AND (usage_limit IS NULL OR used_count < usage_limit)
     LIMIT 1`,
    [normalized]
  );
  const campaign = result.rows[0] || null;
  if (!campaign) throw Object.assign(new Error("Referral code is invalid or expired"), { status: 400 });
  if (requireDiscount && !campaign.discount_type) {
    throw Object.assign(new Error("Referral code is valid for attribution but has no booking discount"), { status: 400 });
  }
  return campaign;
};

const calculateReferralDiscount = (campaign, amount) => {
  if (!campaign?.discount_type) return 0;
  const orderAmount = Number(amount);
  if (orderAmount < Number(campaign.min_order_amount || 0)) {
    throw Object.assign(new Error(`Minimum order for this referral is Rs ${campaign.min_order_amount}`), { status: 400 });
  }
  let discount = campaign.discount_type === "percent"
    ? orderAmount * Number(campaign.discount_value) / 100
    : Number(campaign.discount_value);
  if (campaign.max_discount_amount != null) discount = Math.min(discount, Number(campaign.max_discount_amount));
  return Math.min(orderAmount, Number(discount.toFixed(2)));
};

module.exports = { normalizeReferralCode, getReferralCampaign, calculateReferralDiscount };

