# SAFESEA ASTRA — Coastal Guard Command

This version keeps the existing SAFESEA ASTRA frontend, map, IMBL geometry, geofence engine, alarm logic, GPS/ESP32 support and visual theme, while adding a Coastal Guard command-management layer.

## New Coastal Guard functions
- Command overview: total, online, warning, critical, SOS and offline vessels
- Multi-vessel fleet markers on the existing maritime map
- Fleet manager with boat/fisherman/device search
- Vessel selection and map focus
- Alert operations and incident prioritisation
- Coastal Guard fleet broadcast composer
- Direct fisherman selection
- Operational geofence/zone controls
- IMBL fixed boundary access
- Command reports and device status summary

## Run
```bash
npm install --legacy-peer-deps
npm run dev
```

Open:
`http://localhost:5173`

The SAFESEA backend can continue running separately on port 3000.

## Demo fleet
The initial fleet is demo data in `src/data/coastalGuardFleet.ts`. Replace this with API/Socket.IO data when connecting the live SAFESEA backend.
