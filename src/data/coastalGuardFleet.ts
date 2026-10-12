export type FleetStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'SOS' | 'OFFLINE';

export interface FleetVessel {
  id: string;
  boat: string;
  fisherman: string;
  deviceId: string;
  phone: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: FleetStatus;
  lastSeen: string;
  zone: string;
  battery: number;
}

export const DEMO_FLEET: FleetVessel[] = [
  { id: 'SS-024', boat: 'TN-FISH-024', fisherman: 'Kumar', deviceId: 'SS-024', phone: '+91 90000 24024', lat: 9.38, lng: 79.35, speed: 6.5, heading: 68, status: 'SAFE', lastSeen: '12 sec ago', zone: 'Indian Jurisdiction', battery: 86 },
  { id: 'SS-025', boat: 'TN-FISH-025', fisherman: 'Ravi', deviceId: 'SS-025', phone: '+91 90000 25025', lat: 9.46, lng: 79.48, speed: 7.1, heading: 82, status: 'WARNING', lastSeen: '18 sec ago', zone: 'IMBL Warning', battery: 71 },
  { id: 'SS-026', boat: 'TN-FISH-026', fisherman: 'Mani', deviceId: 'SS-026', phone: '+91 90000 26026', lat: 9.30, lng: 79.58, speed: 4.2, heading: 121, status: 'SOS', lastSeen: '4 sec ago', zone: 'Emergency', battery: 64 },
  { id: 'SS-027', boat: 'TN-FISH-027', fisherman: 'Selvam', deviceId: 'SS-027', phone: '+91 90000 27027', lat: 9.16, lng: 79.39, speed: 5.4, heading: 145, status: 'SAFE', lastSeen: '22 sec ago', zone: 'Fishing Zone A', battery: 92 },
  { id: 'SS-031', boat: 'TN-FISH-031', fisherman: 'Arun', deviceId: 'SS-031', phone: '+91 90000 31031', lat: 9.52, lng: 79.64, speed: 8.3, heading: 102, status: 'CRITICAL', lastSeen: '7 sec ago', zone: 'IMBL Critical', battery: 57 },
  { id: 'SS-033', boat: 'TN-FISH-033', fisherman: 'Suresh', deviceId: 'SS-033', phone: '+91 90000 33033', lat: 9.06, lng: 79.19, speed: 3.8, heading: 210, status: 'OFFLINE', lastSeen: '18 min ago', zone: 'Last known: Safe', battery: 43 },
];
