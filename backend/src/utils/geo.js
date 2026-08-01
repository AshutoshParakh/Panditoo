const { query } = require("../config/db");

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const coordinates = [lat1, lng1, lat2, lng2].map(Number);

  if (coordinates.some((value) => Number.isNaN(value))) {
    throw new Error("Latitude and longitude must be valid numbers");
  }

  const [startLat, startLng, endLat, endLng] = coordinates;
  const latitudeDelta = toRadians(endLat - startLat);
  const longitudeDelta = toRadians(endLng - startLng);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

const buildDistanceSql = () => `
  (
    ${EARTH_RADIUS_KM} * 2 * ASIN(
      SQRT(
        POWER(SIN(RADIANS(latitude - $1) / 2), 2) +
        COS(RADIANS($1)) * COS(RADIANS(latitude)) *
        POWER(SIN(RADIANS(longitude - $2) / 2), 2)
      )
    )
  )
`;

const rankPandits = async ({ userLat, userLng, radiusKm, poojaTypeId = null, bookingDate = null, bookingTime = null, excludePanditIds = [], limit = 100 }) => {
  const latitude = Number(userLat);
  const longitude = Number(userLng);
  const radius = Number(radiusKm);
  const size = Math.max(1, Math.min(100, Number(limit) || 100));

  if ([latitude, longitude, radius].some((value) => Number.isNaN(value))) {
    throw new Error("Latitude, longitude, and radius must be valid numbers");
  }

  const distanceSql = buildDistanceSql();
  const result = await query(
    `
      WITH platform AS (
        SELECT COALESCE(AVG(NULLIF(rating, 0)), 4.0)::float AS average_rating FROM pandits WHERE is_verified = TRUE
      ), pooja AS (
        SELECT name_en, name_hi FROM pooja_types WHERE id = $4::uuid
      ), stats AS (
        SELECT p.id,
          COUNT(DISTINCT br.id)::int AS opportunities,
          COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'won')::int AS accepted,
          COALESCE(AVG(EXTRACT(EPOCH FROM (br.responded_at - br.created_at))) FILTER (WHERE br.responded_at IS NOT NULL), 7200)::float AS response_seconds,
          COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed')::int AS completed,
          COUNT(DISTINCT br.id) FILTER (WHERE br.created_at >= NOW() - INTERVAL '30 days')::int AS recent_opportunities
        FROM pandits p
        LEFT JOIN booking_requests br ON br.pandit_id = p.id
        LEFT JOIN bookings b ON b.confirmed_pandit_id = p.id
        GROUP BY p.id
      ), candidates AS (
        SELECT p.*, ${distanceSql} AS distance_km,
          s.opportunities, s.accepted, s.response_seconds, s.completed, s.recent_opportunities,
          ((p.total_ratings_count::float / (p.total_ratings_count + 10)) * p.rating::float
            + (10.0 / (p.total_ratings_count + 10)) * platform.average_rating) AS adjusted_rating,
          CASE WHEN $4::uuid IS NULL THEN 0.5 WHEN EXISTS (
            SELECT 1 FROM pooja po WHERE EXISTS (
              SELECT 1 FROM unnest(COALESCE(p.specializations, '{}')) spec
              WHERE lower(spec) IN (lower(po.name_en), lower(po.name_hi))
                OR lower(po.name_en) LIKE '%' || lower(spec) || '%'
            )
          ) THEN 1 ELSE 0.35 END AS specialization_match
        FROM pandits p CROSS JOIN platform LEFT JOIN stats s ON s.id = p.id
        WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          AND p.is_active = TRUE AND p.is_verified = TRUE
          AND ${distanceSql} <= $3 AND ${distanceSql} <= p.service_radius_km
          AND NOT (p.id = ANY($7::uuid[]))
          AND ($5::date IS NULL OR NOT EXISTS (SELECT 1 FROM pandit_unavailable_dates unavailable WHERE unavailable.pandit_id=p.id AND unavailable.unavailable_date=$5::date))
          AND ($5::date IS NULL OR $6::time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings busy WHERE busy.confirmed_pandit_id = p.id
              AND busy.booking_date = $5::date AND busy.booking_time = $6::time
              AND busy.status = 'confirmed'
          ))
      ), scored AS (
        SELECT candidates.*,
          ROUND((
            specialization_match * 25
            + (adjusted_rating / 5.0) * 20
            + (CASE WHEN opportunities = 0 THEN 0.65 ELSE LEAST(1, accepted::float / opportunities) END) * 15
            + GREATEST(0, 1 - distance_km / GREATEST(1, LEAST($3, service_radius_km))) * 15
            + LEAST(1, (completed + COALESCE(experience_years, 0) * 2)::float / 50) * 10
            + GREATEST(0, 1 - response_seconds / 7200) * 5
            + GREATEST(0, 1 - recent_opportunities::float / 20) * 10
          )::numeric, 2)::float AS ranking_score
        FROM candidates
      )
      SELECT id, name, email, rating, total_ratings_count, experience_years, specializations,
        service_radius_km, latitude, longitude, address, is_verified, is_active, distance_km,
        adjusted_rating, specialization_match, opportunities, accepted, completed,
        response_seconds, recent_opportunities, ranking_score
      FROM scored
      ORDER BY ranking_score DESC, adjusted_rating DESC, distance_km ASC, recent_opportunities ASC, id ASC
      LIMIT $8
    `,
    [latitude, longitude, radius, poojaTypeId || null, bookingDate || null, bookingTime || null, excludePanditIds, size]
  );

  return result.rows;
};

const findPanditsWithinRadius = (userLat, userLng, radiusKm, options = {}) => rankPandits({ userLat, userLng, radiusKm, ...options });

const getNextBatch = async (userLat, userLng, radiusKm, excludePanditIds = [], batchSize = 10, options = {}) => {
  const latitude = Number(userLat);
  const longitude = Number(userLng);
  const radius = Number(radiusKm);
  const size = Number(batchSize);

  if ([latitude, longitude, radius, size].some((value) => Number.isNaN(value))) {
    throw new Error("Latitude, longitude, radius, and batch size must be valid numbers");
  }

  const excludedIds = Array.isArray(excludePanditIds) ? excludePanditIds : [];
  return rankPandits({ userLat: latitude, userLng: longitude, radiusKm: radius, excludePanditIds: excludedIds, limit: size, ...options });
};

module.exports = {
  haversineDistanceKm,
  findPanditsWithinRadius,
  getNextBatch,
  rankPandits,
};
