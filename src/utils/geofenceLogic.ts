import { AlertLevel, GeofenceConfig, LatLng } from '../types';
import { distanceToPolygonBoundary, haversineDistanceMeters, isPointInPolygon } from './geodesic';

export type GeofenceEvaluation = {
  inside: boolean;
  safe: boolean;
  distanceToBoundaryMeters: number;
  level: AlertLevel;
};

/**
 * One geofence decision pipeline for polygon, rectangle and circle.
 * Distance is always the shortest distance from the live GPS position to the
 * geofence outline, never distance to a polygon centroid/shape center.
 */
export function evaluateGeofence(position: LatLng, geofence: GeofenceConfig): GeofenceEvaluation {
  if (!geofence.enabled) {
    return { inside: true, safe: true, distanceToBoundaryMeters: Infinity, level: 'SAFE' };
  }

  let inside = false;
  let distanceToBoundaryMeters = Infinity;

  if (geofence.shapeType === 'circle' && geofence.circleCenter && geofence.circleRadiusMeters != null) {
    const centerDistance = haversineDistanceMeters(position, geofence.circleCenter);
    inside = centerDistance <= geofence.circleRadiusMeters;
    distanceToBoundaryMeters = Math.abs(centerDistance - geofence.circleRadiusMeters);
  } else if (geofence.points.length >= 3) {
    inside = isPointInPolygon(position, geofence.points);
    distanceToBoundaryMeters = distanceToPolygonBoundary(position, geofence.points);
  }

  const safe = geofence.safeMode === 'INSIDE_SAFE' ? inside : !inside;

  // The unsafe side is ALWAYS a rapid alarm, even if it is far from the border.
  if (!safe) {
    return { inside, safe, distanceToBoundaryMeters, level: 'RAPID_ALARM' };
  }

  if (distanceToBoundaryMeters <= geofence.rapidAlarmThresholdMeters) {
    return { inside, safe, distanceToBoundaryMeters, level: 'RAPID_ALARM' };
  }
  if (distanceToBoundaryMeters <= geofence.criticalThresholdMeters) {
    return { inside, safe, distanceToBoundaryMeters, level: 'CRITICAL' };
  }
  if (distanceToBoundaryMeters <= geofence.warningThresholdMeters) {
    return { inside, safe, distanceToBoundaryMeters, level: 'WARNING' };
  }

  return { inside, safe, distanceToBoundaryMeters, level: 'SAFE' };
}

export function alertCommand(level: AlertLevel): string {
  switch (level) {
    case 'SAFE': return 'ALERT,SAFE';
    case 'WARNING': return 'ALERT,WARNING';
    case 'CRITICAL': return 'ALERT,CRITICAL';
    case 'RAPID_ALARM': return 'ALERT,REACHED';
  }
}
