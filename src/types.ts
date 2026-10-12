export interface TreatyPoint {
  id: string;
  name: string;
  dmsLat: string;
  dmsLng: string;
  lat: number;
  lng: number;
  section: '1974_PALK_STRAIT' | '1976_GULF_OF_MANNAR' | '1976_POINT_T' | '1976_BAY_OF_BENGAL';
  description: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type GpsSourceType = 'SIMULATOR' | 'DEVICE_GPS' | 'ESP32_SERIAL';

export interface VesselState {
  lat: number;
  lng: number;
  heading: number; // degrees 0-360
  speedKnots: number;
  source: GpsSourceType;
  accuracyMeters?: number;
  lastUpdated: number;
}

export type AlertLevel = 'SAFE' | 'WARNING' | 'CRITICAL' | 'RAPID_ALARM';

export type ThemeMode = 'dark' | 'light';

export interface GeofenceConfig {
  id: string;
  name: string;
  enabled: boolean;
  safeMode: 'INSIDE_SAFE' | 'OUTSIDE_SAFE';
  points: LatLng[];
  shapeType?: 'polygon' | 'rectangle' | 'circle';
  circleCenter?: LatLng;
  circleRadiusMeters?: number;
  warningThresholdMeters: number; // 500m
  criticalThresholdMeters: number; // 250m
  rapidAlarmThresholdMeters: number; // 100m
}

export interface MapLayerConfig {
  showIMBL: boolean;
  showTreatyPoints: boolean;
  showGeofence: boolean;
  showBathymetry: boolean;
  showFleet: boolean;
  showRestrictedZones: boolean;
  showSafeZones: boolean;
  showTrails: boolean;
  showPorts: boolean;
  showWeather: boolean;
  tileProvider: 'dark' | 'satellite' | 'ocean' | 'osm' | 'light_candy';
}

export interface ProximityTelemetry {
  distanceToImblMeters: number;
  distanceToGeofenceMeters: number | null;
  geofenceAlertLevel: AlertLevel;
  nearestImblPoint: LatLng;
  nearestTreatyPointName: string;
  closestSide: 'INDIA_SIDE' | 'SRI_LANKA_SIDE' | 'ON_BOUNDARY';
}

export interface HardwareState {
  serialConnected: boolean;
  emergencyActive: boolean;
  ledTestActive: boolean;
  buzzerTestActive: boolean;
  alarmTestActive: boolean;
  lastCommandSent: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type?: 'info' | 'warn' | 'error' | 'success';
}

