import { LatLng, TreatyPoint } from '../types';

const EARTH_RADIUS_METERS = 6371008.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Haversine formula for great circle distance in meters between two lat/lng coordinates.
 */
export function haversineDistanceMeters(p1: LatLng, p2: LatLng): number {
  const phi1 = toRadians(p1.lat);
  const phi2 = toRadians(p2.lat);
  const deltaPhi = toRadians(p2.lat - p1.lat);
  const deltaLambda = toRadians(p2.lng - p1.lng);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Converts lat/lng (degrees) to 3D Cartesian unit vector [x, y, z]
 */
function toCartesian(coord: LatLng): [number, number, number] {
  const phi = toRadians(coord.lat);
  const lambda = toRadians(coord.lng);
  return [
    Math.cos(phi) * Math.cos(lambda),
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi),
  ];
}

/**
 * Converts 3D unit vector [x, y, z] back to lat/lng (degrees)
 */
function toLatLng(v: [number, number, number]): LatLng {
  const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const x = v[0] / norm;
  const y = v[1] / norm;
  const z = v[2] / norm;

  const lat = toDegrees(Math.asin(Math.max(-1, Math.min(1, z))));
  const lng = toDegrees(Math.atan2(y, x));

  return { lat, lng };
}

/**
 * Interpolates points along a great-circle path (Spherical Slerp) between start and end.
 * Uses 50 to 200 points based on segment length as specified in instructions.
 */
export function interpolateGreatCircleSegment(
  start: LatLng,
  end: LatLng,
  forcePoints?: number
): LatLng[] {
  const v1 = toCartesian(start);
  const v2 = toCartesian(end);

  const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const omega = Math.acos(dot);

  // If points are practically identical
  if (omega < 1e-7) {
    return [{ lat: start.lat, lng: start.lng }];
  }

  // Calculate segment length in km to determine density (50 - 200 points)
  const distKm = (EARTH_RADIUS_METERS * omega) / 1000;
  const count = forcePoints ?? Math.max(50, Math.min(200, Math.round(distKm * 0.8)));

  const points: LatLng[] = [];
  const sinOmega = Math.sin(omega);

  for (let i = 0; i < count; i++) {
    const f = i / (count - 1);
    const a = Math.sin((1 - f) * omega) / sinOmega;
    const b = Math.sin(f * omega) / sinOmega;

    const interpolatedVector: [number, number, number] = [
      a * v1[0] + b * v2[0],
      a * v1[1] + b * v2[1],
      a * v1[2] + b * v2[2],
    ];

    points.push(toLatLng(interpolatedVector));
  }

  return points;
}

/**
 * Generates smoothly interpolated great-circle path for a treaty coordinate sequence.
 */
export function interpolateTreatySequence(treatyPoints: (TreatyPoint | LatLng)[]): LatLng[] {
  if (treatyPoints.length < 2) {
    return treatyPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
  }

  const completePath: LatLng[] = [];

  for (let i = 0; i < treatyPoints.length - 1; i++) {
    const p1 = treatyPoints[i];
    const p2 = treatyPoints[i + 1];

    const segmentPoints = interpolateGreatCircleSegment(p1, p2);

    // Skip the first point on subsequent segments to prevent duplicates
    if (i === 0) {
      completePath.push(...segmentPoints);
    } else {
      completePath.push(...segmentPoints.slice(1));
    }
  }

  return completePath;
}

/**
 * Finds shortest distance from a vessel position to any polyline on the sphere.
 * Returns distance in meters, closest point, and segment index.
 */
export function findShortestDistanceToPolyline(
  vessel: LatLng,
  polyline: LatLng[]
): { distanceMeters: number; closestPoint: LatLng } {
  if (polyline.length === 0) {
    return { distanceMeters: 0, closestPoint: vessel };
  }

  let minDistance = Infinity;
  let closestPoint: LatLng = polyline[0];

  // Check distances to interpolated points
  for (let i = 0; i < polyline.length; i++) {
    const d = haversineDistanceMeters(vessel, polyline[i]);
    if (d < minDistance) {
      minDistance = d;
      closestPoint = polyline[i];
    }
  }

  return {
    distanceMeters: minDistance,
    closestPoint,
  };
}

/**
 * Determines whether position is on the Indian side or Sri Lankan side of the IMBL.
 * For the boundary dividing India (west/north) and Sri Lanka (east/south),
 * we check the relative azimuth or cross-product relative to the nearest segment direction.
 */
export function determineSideOfIMBL(
  vessel: LatLng,
  nearestImblPoint: LatLng,
  nextImblPoint?: LatLng
): 'INDIA_SIDE' | 'SRI_LANKA_SIDE' | 'ON_BOUNDARY' {
  // Approximate reference: If near boundary, check if vessel is to the west/north-west of nearest point
  const latDiff = vessel.lat - nearestImblPoint.lat;
  const lngDiff = vessel.lng - nearestImblPoint.lng;

  // If virtually zero distance
  if (Math.hypot(latDiff, lngDiff) < 0.0001) {
    return 'ON_BOUNDARY';
  }

  if (nextImblPoint) {
    // Vector along IMBL segment (from North to South)
    const segX = nextImblPoint.lng - nearestImblPoint.lng;
    const segY = nextImblPoint.lat - nearestImblPoint.lat;

    // Vector to vessel
    const vX = vessel.lng - nearestImblPoint.lng;
    const vY = vessel.lat - nearestImblPoint.lat;

    // 2D cross product: segX * vY - segY * vX
    // Positive means vessel is to the left of the directed line (towards India/West)
    const cross = segX * vY - segY * vX;
    if (Math.abs(cross) < 1e-6) return 'ON_BOUNDARY';
    return cross > 0 ? 'INDIA_SIDE' : 'SRI_LANKA_SIDE';
  }

  // Fallback: Longitude comparison
  return lngDiff < 0 ? 'INDIA_SIDE' : 'SRI_LANKA_SIDE';
}

/**
 * Checks if point is inside a polygon (Ray-casting algorithm)
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates distance to closest point on polygon perimeter in meters
 */
export function distanceToPolygonBoundary(point: LatLng, polygon: LatLng[]): number {
  if (polygon.length < 2) return 0;

  let minDistance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    // Sample along polygon perimeter
    const samples = interpolateGreatCircleSegment(p1, p2, 80);
    for (const sample of samples) {
      const d = haversineDistanceMeters(point, sample);
      if (d < minDistance) {
        minDistance = d;
      }
    }
  }

  return minDistance;
}

export function formatDistance(meters: number): { km: string; nm: string; meters: string } {
  const km = (meters / 1000).toFixed(2);
  const nm = (meters / 1852).toFixed(2);
  const m = Math.round(meters).toLocaleString();
  return { km: `${km} km`, nm: `${nm} NM`, meters: `${m} m` };
}

export function toDMS(lat: number, lng: number): { latDms: string; lngDms: string } {
  const latDir = lat >= 0 ? 'N' : 'S';
  const absLat = Math.abs(lat);
  const latDeg = Math.floor(absLat);
  const latMinFloat = (absLat - latDeg) * 60;
  const latMin = Math.floor(latMinFloat);
  const latSec = ((latMinFloat - latMin) * 60).toFixed(1);

  const lngDir = lng >= 0 ? 'E' : 'W';
  const absLng = Math.abs(lng);
  const lngDeg = Math.floor(absLng);
  const lngMinFloat = (absLng - lngDeg) * 60;
  const lngMin = Math.floor(lngMinFloat);
  const lngSec = ((lngMinFloat - lngMin) * 60).toFixed(1);

  return {
    latDms: `${String(latDeg).padStart(2, '0')}°${String(latMin).padStart(2, '0')}′${latSec}″ ${latDir}`,
    lngDms: `${String(lngDeg).padStart(3, '0')}°${String(lngMin).padStart(2, '0')}′${lngSec}″ ${lngDir}`,
  };
}
