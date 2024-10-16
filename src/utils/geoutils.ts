import * as geomag from "geomag";

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;

  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (toDegrees(brng) + 360) % 360; // Normalize to 0-360 degrees
}

export function getMagneticDeclination(
  lat: number,
  lon: number,
  altitudeFeet: number = 0
): number {
  const altitudeMeters = altitudeFeet * 0.3048; // Convert feet to meters
  const mag = geomag.field(lat, lon, altitudeMeters);
  return mag.declination; // declination in degrees
}

export function calculateMagneticBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  altitudeFeet: number = 0
): number {
  const trueBearing = calculateBearing(lat1, lon1, lat2, lon2);
  const declination = getMagneticDeclination(lat1, lon1, altitudeFeet);
  const magneticBearing = (trueBearing - declination + 360) % 360;
  return magneticBearing;
}

//   NO LONGER NEEDED... KEEPING ANYWAY
// Function to calculate the bearing from point A to point B
// export function calculateBearing(
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number
// ): number {
//   const toRadians = (deg: number) => (deg * Math.PI) / 180;
//   const toDegrees = (rad: number) => (rad * 180) / Math.PI;

//   const phi1 = toRadians(lat1);
//   const phi2 = toRadians(lat2);
//   const deltaLambda = toRadians(lon2 - lon1);

//   const y = Math.sin(deltaLambda) * Math.cos(phi2);
//   const x =
//     Math.cos(phi1) * Math.sin(phi2) -
//     Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

//   const theta = Math.atan2(y, x);
//   return (toDegrees(theta) + 360) % 360; // Bearing in degrees from North
// }
