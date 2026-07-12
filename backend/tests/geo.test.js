const { haversineDistanceKm } = require("../src/utils/geo");

describe("haversineDistanceKm", () => {
  test("returns zero for identical coordinates", () => {
    expect(haversineDistanceKm(28.6139, 77.209, 28.6139, 77.209)).toBeCloseTo(0, 6);
  });

  test("calculates a known distance between Delhi and Mumbai", () => {
    const distance = haversineDistanceKm(28.6139, 77.209, 19.076, 72.8777);

    expect(distance).toBeCloseTo(1148, 0);
  });

  test("is symmetric regardless of coordinate order", () => {
    const forward = haversineDistanceKm(12.9716, 77.5946, 13.0827, 80.2707);
    const reverse = haversineDistanceKm(13.0827, 80.2707, 12.9716, 77.5946);

    expect(forward).toBeCloseTo(reverse, 10);
  });

  test("throws for invalid numeric input", () => {
    expect(() => haversineDistanceKm("abc", 77.209, 19.076, 72.8777)).toThrow(
      "Latitude and longitude must be valid numbers"
    );
  });
});
