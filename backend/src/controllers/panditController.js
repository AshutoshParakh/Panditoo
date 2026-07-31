const { findPanditsWithinRadius, haversineDistanceKm } = require("../utils/geo");
const { pool, query } = require("../config/db");

const listNearbyPandits = async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 15);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required and must be valid numbers",
      });
    }

    const pandits = await findPanditsWithinRadius(lat, lng, radius);

    return res.status(200).json({
      success: true,
      data: pandits,
    });
  } catch (error) {
    return next(error);
  }
};

const listPanditRequests = async (req, res, next) => {
  try {
    const panditId = req.params.id;

    // Security check: Make sure the logged-in pandit is requesting their own data
    if (req.pandit.id !== panditId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own requests",
      });
    }

    const { status } = req.query;
    const statusVal = status || "pending";

    const result = await query(
      `
      SELECT 
        br.id AS request_id,
        br.status AS request_status,
        br.batch_number,
        b.id AS booking_id,
        b.booking_date,
        b.booking_time,
        b.latitude AS booking_latitude,
        b.longitude AS booking_longitude,
        b.address,
        b.total_price,
        b.pandit_payout_amount,
        u.name AS user_name,
        pt.name_en AS pooja_name_en,
        pt.name_hi AS pooja_name_hi,
        effective_pooja_credit_cost(pt.id,b.booking_date) AS credit_cost,
        pt.samagri_list,
        p.latitude AS pandit_latitude,
        p.longitude AS pandit_longitude,
        p.service_radius_km
      FROM booking_requests br
      INNER JOIN bookings b ON b.id = br.booking_id
      INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
      INNER JOIN pandits p ON p.id = br.pandit_id
      INNER JOIN users u ON u.id = b.user_id
      WHERE br.pandit_id = $1
        AND br.status = $2
        AND br.batch_number = b.current_batch
        AND b.status = 'pending'
        AND b.prepaid_status = 'paid'
      ORDER BY br.created_at DESC
      `,
      [panditId, statusVal]
    );

    const data = result.rows.map((row) => {
      let distanceKm = null;
      if (
        row.booking_latitude != null &&
        row.booking_longitude != null &&
        row.pandit_latitude != null &&
        row.pandit_longitude != null
      ) {
        try {
          distanceKm = haversineDistanceKm(
            Number(row.pandit_latitude),
            Number(row.pandit_longitude),
            Number(row.booking_latitude),
            Number(row.booking_longitude)
          );
        } catch (err) {
          console.error("Haversine calculation failed:", err.message);
        }
      }

      if (distanceKm == null || distanceKm > Number(row.service_radius_km || 0)) return null;

      return {
        request_id: row.request_id,
        booking_id: row.booking_id,
        pooja_name_en: row.pooja_name_en,
        pooja_name_hi: row.pooja_name_hi,
        booking_date: row.booking_date,
        booking_time: row.booking_time,
        address: row.address,
        total_price: row.total_price,
        pandit_payout_amount: row.pandit_payout_amount,
        user_name: row.user_name,
        credit_cost: Number(row.credit_cost || 10),
        samagri_list: row.samagri_list,
        distance_km: Number(distanceKm.toFixed(1)),
      };
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getPanditEarnings = async (req, res, next) => {
  try {
    const panditId = req.params.id;

    // Security check: Make sure the logged-in pandit is requesting their own data
    if (req.pandit.id !== panditId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own earnings",
      });
    }

    const result = await query(
      `
      SELECT 
        b.id AS booking_id,
        b.booking_date,
        b.booking_time,
        b.pandit_payout_amount,
        b.pandit_payout_status,
        pt.name_en AS pooja_name_en,
        pt.name_hi AS pooja_name_hi
      FROM bookings b
      INNER JOIN pooja_types pt ON pt.id = b.pooja_type_id
      WHERE b.confirmed_pandit_id = $1 
        AND b.status = 'completed'
      ORDER BY b.booking_date DESC, b.booking_time DESC
      `,
      [panditId]
    );

    const allBookings = result.rows;
    const [walletResult, withdrawalsResult, walletTransactionsResult] = await Promise.all([
      query("SELECT available_balance,lifetime_credited,updated_at FROM pandit_wallets WHERE pandit_id=$1",[panditId]),
      query("SELECT id,amount,status,admin_note,requested_at,processed_at FROM withdrawal_requests WHERE pandit_id=$1 ORDER BY requested_at DESC LIMIT 20",[panditId]),
      query("SELECT id,booking_id,transaction_type,direction,amount,description,created_at FROM wallet_transactions WHERE pandit_id=$1 ORDER BY created_at DESC LIMIT 30",[panditId]),
    ]);
    let totalAllTime = 0;
    let totalThisMonth = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Last 6 months trend setup
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      last6Months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-US", { month: "short" }),
        amount: 0,
      });
    }

    allBookings.forEach((b) => {
      const amount = Number(b.pandit_payout_amount);
      totalAllTime += amount;

      const bDate = new Date(b.booking_date);
      const bYear = bDate.getFullYear();
      const bMonth = bDate.getMonth();

      // Current month check
      if (bYear === currentYear && bMonth === currentMonth) {
        totalThisMonth += amount;
      }

      // Last 6 months trend check
      last6Months.forEach((m) => {
        if (m.year === bYear && m.month === bMonth) {
          m.amount += amount;
        }
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        total_earned_all_time: totalAllTime,
        total_earned_this_month: totalThisMonth,
        monthly_trend: last6Months.map((m) => ({ label: m.label, amount: m.amount })),
        bookings: allBookings.map((b) => ({
          booking_id: b.booking_id,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          pooja_name_en: b.pooja_name_en,
          pooja_name_hi: b.pooja_name_hi,
          payout_amount: b.pandit_payout_amount,
          payout_status: b.pandit_payout_status,
        })),
        wallet: walletResult.rows[0] || { available_balance: 0, lifetime_credited: 0 },
        withdrawals: withdrawalsResult.rows,
        wallet_transactions: walletTransactionsResult.rows,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const requestWithdrawal = async (req,res,next) => {
  const client=await pool.connect();
  try {
    if(req.params.id!==req.pandit.id)return res.status(403).json({success:false,message:"You can only withdraw your own balance"});
    await client.query("BEGIN");
    const panditResult=await client.query("SELECT bank_account_details FROM pandits WHERE id=$1",[req.pandit.id]);
    const bank=panditResult.rows[0]?.bank_account_details||{};
    if(!bank.accountNo&&!bank.accountNumber){await client.query("ROLLBACK");return res.status(400).json({success:false,message:"Add your bank account before requesting withdrawal"});}
    await client.query("INSERT INTO pandit_wallets(pandit_id) VALUES($1) ON CONFLICT DO NOTHING",[req.pandit.id]);
    const wallet=await client.query("SELECT available_balance FROM pandit_wallets WHERE pandit_id=$1 FOR UPDATE",[req.pandit.id]);
    const available=Number(wallet.rows[0].available_balance); const requested=req.body.amount==null?available:Number(req.body.amount);
    if(!Number.isFinite(requested)||requested<=0||requested>available){await client.query("ROLLBACK");return res.status(400).json({success:false,message:"Withdrawal amount exceeds available wallet balance"});}
    const withdrawal=await client.query("INSERT INTO withdrawal_requests(pandit_id,amount,bank_snapshot) VALUES($1,$2,$3) RETURNING *",[req.pandit.id,requested,bank]);
    await client.query("UPDATE pandit_wallets SET available_balance=available_balance-$1,updated_at=NOW() WHERE pandit_id=$2",[requested,req.pandit.id]);
    await client.query("INSERT INTO wallet_transactions(pandit_id,withdrawal_request_id,transaction_type,direction,amount,description) VALUES($1,$2,'withdrawal_hold','debit',$3,'Withdrawal requested; payout expected in 2-3 working days')",[req.pandit.id,withdrawal.rows[0].id,requested]);
    await client.query("COMMIT");res.status(201).json({success:true,message:"Withdrawal requested. Payout is expected in 2-3 working days.",data:withdrawal.rows[0]});
  }catch(e){try{await client.query("ROLLBACK");}catch{}next(e);}finally{client.release();}
};

const updatePanditProfile = async (req, res, next) => {
  try {
    const panditId = req.pandit.id;
    const {
      name,
      specializations,
      service_radius_km,
      address,
      bank_account_details,
      is_active,
    } = req.body;

    // Fetch existing details first to merge or handle defaults
    const checkRes = await query(`SELECT * FROM pandits WHERE id = $1 LIMIT 1`, [panditId]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }

    const current = checkRes.rows[0];

    const newName = name !== undefined ? name : current.name;
    const newSpecializations = specializations !== undefined ? specializations : current.specializations;
    const newRadius = service_radius_km !== undefined ? parseInt(service_radius_km) : current.service_radius_km;
    const newAddress = address !== undefined ? address : current.address;
    const newActive = is_active !== undefined ? !!is_active : current.is_active;

    let newBankDetails = current.bank_account_details;
    if (bank_account_details !== undefined) {
      newBankDetails = typeof bank_account_details === "object"
        ? JSON.stringify(bank_account_details)
        : bank_account_details;
    }

    const updateRes = await query(
      `
      UPDATE pandits
      SET 
        name = $1,
        specializations = $2,
        service_radius_km = $3,
        address = $4,
        is_active = $5,
        bank_account_details = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, name, phone, email, address, source, specializations, experience_years, service_radius_km, latitude, longitude, bank_account_details, id_proof_url, is_verified, is_active
      `,
      [newName, newSpecializations, newRadius, newAddress, newActive, newBankDetails, panditId]
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      pandit: updateRes.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listNearbyPandits,
  listPanditRequests,
  getPanditEarnings,
  updatePanditProfile,
  requestWithdrawal,
};
