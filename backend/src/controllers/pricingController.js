const { getBookingConfig, getPriceQuote } = require("../services/pricingService");

const getPublicBookingConfig = async (_req, res, next) => { try { res.json({ success: true, data: await getBookingConfig() }); } catch (e) { next(e); } };
const quotePrice = async (req, res, next) => { try { const { pooja_type_id, booking_date, coupon_code } = req.body; if (!pooja_type_id || !booking_date) return res.status(400).json({ success:false, message:"Pooja type and booking date are required" }); res.json({ success:true, data:await getPriceQuote({ poojaTypeId:pooja_type_id, bookingDate:booking_date, couponCode:coupon_code }) }); } catch(e) { if(e.status) return res.status(e.status).json({success:false,message:e.message}); next(e); } };
module.exports = { getPublicBookingConfig, quotePrice };
