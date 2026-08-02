const { query } = require("../config/db");
const { getReferralCampaign, normalizeReferralCode } = require("../services/referralService");

const validateReferral = async (req, res, next) => {
  try {
    const campaign = await getReferralCampaign(req.body.code);
    return res.json({ success: true, data: { code: campaign.code, name: campaign.name, channel: campaign.channel, has_discount: Boolean(campaign.discount_type) } });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return next(error);
  }
};

const listCampaigns = async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT c.*, COALESCE(u.signups,0)::int AS signups,
        COALESCE(b.paid_bookings,0)::int AS paid_bookings,
        COALESCE(b.revenue,0)::numeric(12,2) AS revenue,
        COALESCE(b.discounts_given,0)::numeric(12,2) AS discounts_given
      FROM referral_campaigns c
      LEFT JOIN (SELECT referral_campaign_id,COUNT(*) AS signups FROM users WHERE referral_campaign_id IS NOT NULL GROUP BY referral_campaign_id) u ON u.referral_campaign_id=c.id
      LEFT JOIN (SELECT referral_campaign_id,COUNT(*) FILTER (WHERE prepaid_status='paid') AS paid_bookings,
        SUM(total_price) FILTER (WHERE prepaid_status='paid') AS revenue,
        SUM(referral_discount_amount) FILTER (WHERE prepaid_status='paid') AS discounts_given
        FROM bookings WHERE referral_campaign_id IS NOT NULL GROUP BY referral_campaign_id) b ON b.referral_campaign_id=c.id
      ORDER BY c.created_at DESC`);
    res.json({ success: true, data: result.rows.map((row) => {
      const cost = Number(row.campaign_cost || 0); const revenue = Number(row.revenue || 0); const signups = Number(row.signups || 0);
      return { ...row, cost_per_signup: signups ? Number((cost / signups).toFixed(2)) : null, roi_percent: cost ? Number(((revenue - cost) / cost * 100).toFixed(2)) : null };
    }) });
  } catch (error) { next(error); }
};

const saveCampaign = async (req, res, next) => {
  try {
    const code = normalizeReferralCode(req.body.code);
    const { name, channel, location, campaign_cost, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, starts_at, ends_at } = req.body;
    if (!code || !name || !channel || !/^[A-Z0-9_-]{2,40}$/.test(code)) return res.status(400).json({ success: false, message: "Code, campaign name and channel are required" });
    if (discount_type === "percent" && Number(discount_value) > 100) return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100" });
    const params = [code, String(name).trim(), String(channel).trim(), location || null, Number(campaign_cost || 0), discount_type || null, discount_type ? Number(discount_value) : null, Number(min_order_amount || 0), max_discount_amount ?? null, usage_limit ?? null, starts_at || null, ends_at || null, req.body.is_active !== false];
    const result = req.params.id
      ? await query(`UPDATE referral_campaigns SET code=$1,name=$2,channel=$3,location=$4,campaign_cost=$5,discount_type=$6,discount_value=$7,min_order_amount=$8,max_discount_amount=$9,usage_limit=$10,starts_at=$11,ends_at=$12,is_active=$13,updated_at=NOW() WHERE id=$14 RETURNING *`, [...params, req.params.id])
      : await query(`INSERT INTO referral_campaigns(code,name,channel,location,campaign_cost,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,starts_at,ends_at,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, params);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Referral campaign not found" });
    res.status(req.params.id ? 200 : 201).json({ success: true, data: result.rows[0] });
  } catch (error) { if (error.code === "23505") return res.status(409).json({ success: false, message: "Referral code already exists" }); next(error); }
};

const toggleCampaign = async (req, res, next) => { try { const result=await query("UPDATE referral_campaigns SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING *",[Boolean(req.body.is_active),req.params.id]);if(!result.rowCount)return res.status(404).json({success:false,message:"Referral campaign not found"});res.json({success:true,data:result.rows[0]});}catch(error){next(error);} };

module.exports = { validateReferral, listCampaigns, saveCampaign, toggleCampaign };
