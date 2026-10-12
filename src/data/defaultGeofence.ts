import { GeofenceConfig } from '../types';

export const DEFAULT_GEOFENCES: GeofenceConfig[] = [
  {
    id: 'palk-bay-safe-box',
    name: 'Palk Bay Artisanal Fishing Zone',
    enabled: true,
    safeMode: 'INSIDE_SAFE',
    warningThresholdMeters: 500,
    criticalThresholdMeters: 250,
    rapidAlarmThresholdMeters: 100,
    points: [
      { lat: 9.36, lng: 79.28 },
      { lat: 9.48, lng: 79.32 },
      { lat: 9.42, lng: 79.46 },
      { lat: 9.28, lng: 79.44 },
      { lat: 9.24, lng: 79.34 },
    ],
  },
  {
    id: 'rameshwaram-corridor',
    name: 'Rameswaram Coastal Safety Sector',
    enabled: false,
    safeMode: 'INSIDE_SAFE',
    warningThresholdMeters: 500,
    criticalThresholdMeters: 250,
    rapidAlarmThresholdMeters: 100,
    points: [
      { lat: 9.22, lng: 79.18 },
      { lat: 9.35, lng: 79.22 },
      { lat: 9.30, lng: 79.35 },
      { lat: 9.16, lng: 79.30 },
    ],
  },
  {
    id: 'kachchatheevu-buffer',
    name: 'Kachchatheevu Security Buffer',
    enabled: false,
    safeMode: 'OUTSIDE_SAFE',
    warningThresholdMeters: 500,
    criticalThresholdMeters: 250,
    rapidAlarmThresholdMeters: 100,
    points: [
      { lat: 9.38, lng: 79.49 },
      { lat: 9.40, lng: 79.54 },
      { lat: 9.34, lng: 79.56 },
      { lat: 9.33, lng: 79.50 },
    ],
  },
];
