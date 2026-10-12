# SAFESEA ASTRA — Coastal Guard Command V2

This version keeps the SAFESEA ASTRA frontend visual language and adds Coastal Guard fleet-management functions plus maritime map visibility controls.

## Run frontend

```powershell
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:5173`.

## Backend

The frontend connects to the existing SAFESEA server by default:

`http://172.16.120.41:3000`

To change it, create `.env.local`:

```env
VITE_SAFESEA_BACKEND_URL=http://YOUR-PC-IP:3000
```

The dashboard polls `/api/devices` every 5 seconds. If the backend is unavailable, it automatically keeps the demo fleet so the UI remains usable.

## Coastal Guard functions

- Command overview: total/online/warning/critical/SOS/offline
- Live multi-vessel fleet map
- Fleet search and vessel selection
- Fisherman/device details
- Emergency/SOS monitoring
- Alert operations
- Fleet broadcast through `/api/messages`
- Operational geofence drawing
- IMBL treaty monitoring
- Vessel history/report sections in the command UI
- Cloud online/offline indicator

## Map visibility

- Satellite (default)
- Standard
- Dark Maritime
- Ocean
- IMBL Treaty Boundary
- SAFESEA vessels
- Operational geofences
- Safe Fishing Zones control
- Restricted Zones control
- Vessel Trails control
- Ports & Harbours control
- Weather/Marine Overlay control

The visibility panel is intentionally compact and floats over the existing ASTRA map so the original UI is preserved.
