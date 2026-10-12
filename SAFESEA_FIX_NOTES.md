# SAFESEA dashboard synchronization and alert popup update

## Changes
- Fleet loading now checks both `VITE_SAFESEA_BACKEND_URL` and `VITE_SAFESEA_CHAT_BACKEND_URL` at `/api/devices` and merges records by `deviceId`, preferring the newest `lastSeen`/update timestamp. This prevents a stale record from one service from masking a fresher record from the other.
- Chat continues to use the dedicated chat backend; GPS/safety APIs continue to retain the original backend URL.
- Dashboard polls `/api/alerts` on both backends every five seconds. New returned alert records show a compact popup with severity, type, message, vessel/device, timestamp, optional distance and coordinates, and View on Map/Dismiss actions. Existing alert IDs are seeded on initial load to avoid popping historical alerts immediately.
- The current theme classes and existing dashboard layout are retained.

## Important limitation
The dashboard can only show APK-generated 500 m / 250 m / 100 m, geofence-crossing and SOS alerts if the APK sends those events to a backend and that backend exposes them via `/api/alerts` (or an equivalent route, which must be adapted in `src/services/backend.ts`). The popup code does not fabricate those events. The `/api/alerts` route availability and production build could not be verified in this environment.

## Local run
Create `.env.local` next to `package.json`:

```env
VITE_SAFESEA_BACKEND_URL=https://safe-sea-backend.onrender.com
VITE_SAFESEA_CHAT_BACKEND_URL=https://safesea-chat-backend.onrender.com
```

Then run `npm install`, `npm run build`, and `npm run dev`. Check the browser Network tab for `/api/devices` and `/api/alerts` responses. If `/api/alerts` returns 404, the backend needs an alert endpoint or the frontend must be adapted to the actual route.

## Follow-up fix: message visibility and unified-backend compatibility
- Chat messages now normalize either `message` or `text` payload fields and either `id` or `messageId` identifiers.
- Dashboard polls chat messages every five seconds and displays a compact recent-message panel without changing the main theme/layout.
- Fixed first-alert handling when the alert API initially returns an empty list. The first actual alert is no longer silently treated as historical.
- Alert polling now processes each new alert in sequence instead of marking every simultaneous new alert as seen after showing only one popup.
- The chat API defaults to the same backend URL as fleet/alerts. For local testing, set both Vite variables to `http://localhost:3000`; for production, set both to the same unified Render URL.
- Messages are still displayed only if the APK/family client actually posts them to the configured backend. This frontend cannot recover messages sent only over local SMS or an unrelated server.
