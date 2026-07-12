const { query } = require("../config/db");

const parsePagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "10", 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const normalizeLang = (lang) => (lang === "hi" ? "hi" : "en");

const listAdminPoojaTypes = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);

    const [countResult, poojaTypesResult] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM pooja_types", []),
      query(
        `
          SELECT
            id,
            name_en,
            name_hi,
            description_en,
            description_hi,
            base_price,
            duration_minutes,
            samagri_list,
            is_active,
            created_at
          FROM pooja_types
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      ),
    ]);

    const total = countResult.rows[0].total;

    return res.status(200).json({
      success: true,
      data: poojaTypesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const createPoojaType = async (req, res, next) => {
  try {
    const {
      name_en,
      name_hi,
      description_en = null,
      description_hi = null,
      base_price,
      duration_minutes = 60,
      samagri_list,
      is_active = true,
    } = req.body;

    const result = await query(
      `
        INSERT INTO pooja_types (
          name_en,
          name_hi,
          description_en,
          description_hi,
          base_price,
          duration_minutes,
          samagri_list,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        RETURNING
          id,
          name_en,
          name_hi,
          description_en,
          description_hi,
          base_price,
          duration_minutes,
          samagri_list,
          is_active,
          created_at
      `,
      [
        name_en,
        name_hi,
        description_en,
        description_hi,
        base_price,
        duration_minutes,
        JSON.stringify(samagri_list),
        is_active,
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Pooja type with this English name already exists" });
    }

    return next(error);
  }
};

const updatePoojaType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fieldMap = {
      name_en: "name_en",
      name_hi: "name_hi",
      description_en: "description_en",
      description_hi: "description_hi",
      base_price: "base_price",
      duration_minutes: "duration_minutes",
      is_active: "is_active",
    };

    const updates = [];
    const values = [];
    let parameterIndex = 1;

    Object.entries(fieldMap).forEach(([payloadKey, columnName]) => {
      if (Object.prototype.hasOwnProperty.call(req.body, payloadKey)) {
        updates.push(`${columnName} = $${parameterIndex}`);
        values.push(req.body[payloadKey]);
        parameterIndex += 1;
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, "samagri_list")) {
      updates.push(`samagri_list = $${parameterIndex}::jsonb`);
      values.push(JSON.stringify(req.body.samagri_list));
      parameterIndex += 1;
    }

    values.push(id);

    const result = await query(
      `
        UPDATE pooja_types
        SET ${updates.join(", ")}
        WHERE id = $${parameterIndex}
        RETURNING
          id,
          name_en,
          name_hi,
          description_en,
          description_hi,
          base_price,
          duration_minutes,
          samagri_list,
          is_active,
          created_at
      `,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pooja type not found" });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Pooja type with this English name already exists" });
    }

    return next(error);
  }
};

const deletePoojaType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
        UPDATE pooja_types
        SET is_active = FALSE
        WHERE id = $1
        RETURNING id, is_active
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Pooja type not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Pooja type deactivated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const listPublicPoojaTypes = async (req, res, next) => {
  try {
    const lang = normalizeLang(req.query.lang);
    const nameColumn = lang === "hi" ? "name_hi" : "name_en";
    const descriptionColumn = lang === "hi" ? "description_hi" : "description_en";

    const result = await query(
      `
        SELECT
          id,
          ${nameColumn} AS name,
          ${descriptionColumn} AS description,
          base_price,
          duration_minutes,
          samagri_list,
          is_active,
          created_at
        FROM pooja_types
        WHERE is_active = TRUE
        ORDER BY created_at DESC
      `,
      []
    );

    return res.status(200).json({
      success: true,
      lang,
      data: result.rows,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listAdminPoojaTypes,
  createPoojaType,
  updatePoojaType,
  deletePoojaType,
  listPublicPoojaTypes,
};
