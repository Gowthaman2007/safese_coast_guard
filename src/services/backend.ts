import { FleetVessel, FleetStatus } from '../data/coastalGuardFleet';

export const BACKEND_URL = (import.meta as any).env?.VITE_SAFESEA_BACKEND_URL || 'https://safe-sea-backend.onrender.com';
// Chat is deliberately separate so GPS, fleet status, geofence and emergency APIs stay on the existing backend.
// Set both environment variables to the same URL when using the unified backend.
export const CHAT_BACKEND_URL = (import.meta as any).env?.VITE_SAFESEA_CHAT_BACKEND_URL || BACKEND_URL;

export interface ChatMessage {
  id: string; senderId: string; senderName?: string; senderType?: string; receiverId?: string;
  deviceId?: string; fishermanName?: string; boatName?: string; message: string; timestamp: string;
  latitude?: number | null; longitude?: number | null;
}

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  const r = await fetch(`${CHAT_BACKEND_URL}/api/messages`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Chat API ${r.status}`);
  const data = await r.json();
  const rows = Array.isArray(data) ? data : (data.messages || data.data || []);
  return rows.filter((m: any) => m && (m.message || m.text || m.body)).map((m: any, i: number) => ({
    id: String(m.id || m.messageId || `msg-${m.timestamp || m.createdAt || i}`),
    senderId: String(m.senderId || m.from || m.sender || m.deviceId || 'unknown'),
    senderName: String(m.senderName || m.fishermanName || m.sender || m.from || 'Unknown sender'),
    senderType: String(m.senderType || m.kind || m.type || ''),
    receiverId: String(m.receiverId || m.to || m.recipient || ''),
    deviceId: String(m.deviceId || m.device_id || ''),
    fishermanName: String(m.fishermanName || m.fisherman_name || ''),
    boatName: String(m.boatName || m.boat_name || ''),
    message: String(m.message || m.text || m.body || ''),
    timestamp: String(m.timestamp || m.createdAt || m.time || new Date().toISOString()),
    latitude: Number.isFinite(Number(m.latitude ?? m.lat)) ? Number(m.latitude ?? m.lat) : null,
    longitude: Number.isFinite(Number(m.longitude ?? m.lng ?? m.lon)) ? Number(m.longitude ?? m.lng ?? m.lon) : null,
  }));
}

const statusOf = (d:any): FleetStatus => {
  if (d.emergencyActive === true || d.status === 'SOS' || d.alertLevel === 'SOS' || d.alert === 'SOS') return 'SOS';
  // The server reports presence in `status` (ONLINE/OFFLINE) and the alarm tier in `alertStatus`.
  const raw = String(d.status || d.state || d.alertLevel || '').toUpperCase();
  if (raw.includes('OFFLINE')) return 'OFFLINE';
  const alarm = String(d.alertStatus || d.alertLevel || d.alert || '').toUpperCase();
  if (alarm.includes('SOS') || alarm.includes('EMERGENCY')) return 'SOS';
  if (alarm.includes('CRITICAL') || alarm.includes('CROSSED') || raw.includes('CRITICAL') || raw.includes('CROSSED')) return 'CRITICAL';
  if (alarm.includes('WARNING') || alarm.includes('REACHED') || raw.includes('WARNING') || raw.includes('REACHED')) return 'WARNING';
  const last = d.lastSeen || d.updatedAt || d.timestamp;
  if (last && Date.now() - new Date(last).getTime() > 2*60*1000) return 'OFFLINE';
  return 'SAFE';
};

export function normalizeDevices(list:any[]): FleetVessel[] {
  return (Array.isArray(list)?list:[]).map((d:any,i:number) => {
    const lat = Number(d.latitude ?? d.lat ?? d.location?.lat);
    const lng = Number(d.longitude ?? d.lng ?? d.location?.lng);
    return {
      id: String(d.id || d.device_id || d.deviceId || `SS-${i+1}`),
      boat: String(d.boat_name || d.boatName || d.boat || `SAFESEA-${i+1}`),
      fisherman: String(d.fisherman_name || d.fishermanName || d.fisherman || d.name || 'Unassigned'),
      deviceId: String(d.device_id || d.deviceId || d.id || `SS-${i+1}`),
      phone: String(d.phone || d.fishermanPhone || ''),
      lat: Number.isFinite(lat) ? lat : 9.38,
      lng: Number.isFinite(lng) ? lng : 79.35,
      speed: Number(d.speed ?? d.speedKnots ?? 0),
      heading: Number(d.heading ?? 0),
      status: statusOf(d),
      lastSeen: d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'unknown',
      zone: String(d.zone || d.currentZone || 'Unknown'),
      battery: Number(d.battery ?? 0),
    };
  });
}

export async function fetchFleet(): Promise<FleetVessel[]> {
  // Both services may know about the same vessel. Prefer the freshest record per device,
  // while preserving safety fields from the original backend if the chat service lacks them.
  const urls = [BACKEND_URL, CHAT_BACKEND_URL];
  const results = await Promise.allSettled(urls.map(async (base) => {
    const r = await fetch(`${base}/api/devices`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Fleet API ${r.status} from ${base}`);
    const data = await r.json();
    const rows = data.devices || data.data || data;
    return Array.isArray(rows) ? rows : [];
  }));
  const available = results.filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled');
  if (!available.length) throw new Error('Both SAFESEA device APIs are unavailable');

  const byDevice = new Map<string, any>();
  for (const result of available) {
    for (const d of result.value) {
      const key = String(d.deviceId || d.device_id || d.id || '').trim();
      if (!key) continue;
      const prior = byDevice.get(key);
      if (!prior) { byDevice.set(key, d); continue; }
      const timeOf = (x:any) => {
        const t = Date.parse(x?.lastSeen || x?.updatedAt || x?.timestamp || x?.createdAt || '');
        return Number.isFinite(t) ? t : 0;
      };
      const newest = timeOf(d) >= timeOf(prior) ? d : prior;
      const older = newest === d ? prior : d;
      // Keep newest position/presence but fill missing fields from the other service.
      byDevice.set(key, { ...older, ...newest,
        alertStatus: newest.alertStatus ?? older.alertStatus,
        emergencyActive: newest.emergencyActive ?? older.emergencyActive,
        latitude: newest.latitude ?? older.latitude,
        longitude: newest.longitude ?? older.longitude,
      });
    }
  }
  return normalizeDevices([...byDevice.values()]);
}


export interface SafetyAlert {
  id: string; deviceId: string; type: string; severity: string; message: string;
  timestamp: string; latitude?: number; longitude?: number; distanceMeters?: number;
  fishermanName?: string; boatName?: string; acknowledged?: boolean;
}

/** Best-effort read of persisted alerts from either backend; unsupported routes are ignored. */
export async function fetchSafetyAlerts(): Promise<SafetyAlert[]> {
  const bases = [BACKEND_URL, CHAT_BACKEND_URL];
  const settled = await Promise.allSettled(bases.map(async (base) => {
    const r = await fetch(`${base}/api/alerts`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Alerts API ${r.status}`);
    const data = await r.json();
    const rows = data.alerts || data.data || data;
    if (!Array.isArray(rows)) return [];
    return rows.map((a:any, i:number): SafetyAlert => ({
      id: String(a.id || a.alertId || `${a.deviceId || a.device_id || 'alert'}-${a.timestamp || a.createdAt || i}`),
      deviceId: String(a.deviceId || a.device_id || a.senderId || ''),
      type: String(a.type || a.alertType || a.event || a.alertStatus || 'SAFETY ALERT'),
      severity: String(a.severity || a.level || a.alertLevel || a.alertStatus || 'WARNING').toUpperCase(),
      message: String(a.message || a.description || a.details || a.type || a.alertType || 'Safety event received'),
      timestamp: String(a.timestamp || a.createdAt || a.time || new Date().toISOString()),
      latitude: Number.isFinite(Number(a.latitude ?? a.lat)) ? Number(a.latitude ?? a.lat) : undefined,
      longitude: Number.isFinite(Number(a.longitude ?? a.lng ?? a.lon)) ? Number(a.longitude ?? a.lng ?? a.lon) : undefined,
      distanceMeters: Number.isFinite(Number(a.distanceMeters ?? a.distance ?? a.distance_m)) ? Number(a.distanceMeters ?? a.distance ?? a.distance_m) : undefined,
      fishermanName: a.fishermanName || a.fisherman_name,
      boatName: a.boatName || a.boat_name,
      acknowledged: Boolean(a.acknowledged),
    }));
  }));
  const alerts = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const unique = new Map<string, SafetyAlert>();
  for (const a of alerts) unique.set(a.id, a);
  return [...unique.values()].sort((a,b) => Date.parse(b.timestamp)-Date.parse(a.timestamp));
}

/** Sends a message to the whole fleet (receiverId 'ALL') or to one device. */
export async function sendFleetBroadcast(message:string, receiverId:string = 'ALL') {
  // The server requires `senderId` + `message`; it routes by `receiverId`.
  const r = await fetch(`${CHAT_BACKEND_URL}/api/messages`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ from:'COASTAL_GUARD', senderId:'COASTAL_GUARD', senderName:'Coastal Guard', senderType:'COASTAL_GUARD', to:receiverId, receiverId, message }) });
  if (!r.ok) throw new Error(`Message API ${r.status}`);
  return r.json().catch(()=>({ok:true}));
}
