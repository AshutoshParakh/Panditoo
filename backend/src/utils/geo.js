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

const findPanditsWithinRadius = async (userLat, userLng, radiusKm) => {
  const latitude = Number(userLat);
  const longitude = Number(userLng);
  const radius = Number(radiusKm);

  if ([latitude, longitude, radius].some((value) => Number.isNaN(value))) {
    throw new Error("Latitude, longitude, and radius must be valid numbers");
  }

  const distanceSql = buildDistanceSql();
  const result = await query(
    `
      SELECT
        id,
        name,
        phone,
        email,
        rating,
        total_ratings_count,
        experience_years,
        specializations,
        service_radius_km,
        latitude,
        longitude,
        address,
        is_verified,
        is_active,
        ${distanceSql} AS distance_km
      FROM pandits
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND is_active = TRUE
        AND ${distanceSql} <= $3
      ORDER BY rating DESC, distance_km ASC
    `,
    [latitude, longitude, radius]
  );

  return result.rows;
};

const getNextBatch = async (userLat, userLng, radiusKm, excludePanditIds = [], batchSize = 10) => {
  const latitude = Number(userLat);
  const longitude = Number(userLng);
  const radius = Number(radiusKm);
  const size = Number(batchSize);

  if ([latitude, longitude, radius, size].some((value) => Number.isNaN(value))) {
    throw new Error("Latitude, longitude, radius, and batch size must be valid numbers");
  }

  const excludedIds = Array.isArray(excludePanditIds) ? excludePanditIds : [];
  const distanceSql = buildDistanceSql();
  const result = await query(
    `
      SELECT
        id,
        name,
        phone,
        email,
        rating,
        total_ratings_count,
        experience_years,
        specializations,
        service_radius_km,
        latitude,
        longitude,
        address,
        is_verified,
        is_active,
        ${distanceSql} AS distance_km
      FROM pandits
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND is_active = TRUE
        AND ${distanceSql} <= $3
        AND NOT (id = ANY($4::uuid[]))
      ORDER BY rating DESC, distance_km ASC
      LIMIT $5
    `,
    [latitude, longitude, radius, excludedIds, size]
  );

  return result.rows;
};

module.exports = {
  haversineDistanceKm,
  findPanditsWithinRadius,
  getNextBatch,
};
