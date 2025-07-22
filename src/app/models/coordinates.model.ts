/**
 * Represents geographical coordinates with latitude and longitude
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Validates if coordinates are within valid ranges
 * @param coordinates - The coordinates to validate
 * @returns true if coordinates are valid, false otherwise
 */
export function validateCoordinates(coordinates: Coordinates): boolean {
  if (!coordinates || typeof coordinates !== 'object') {
    return false;
  }

  const { latitude, longitude } = coordinates;

  // Check if values are numbers
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }

  // Check if values are finite (not NaN, Infinity, or -Infinity)
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return false;
  }

  // Validate latitude range (-90 to 90)
  if (latitude < -90 || latitude > 90) {
    return false;
  }

  // Validate longitude range (-180 to 180)
  if (longitude < -180 || longitude > 180) {
    return false;
  }

  return true;
}