# SAFESEA Coastal Guard — alert/message integration patch

## Local test against the unified backend

1. Start the unified backend in its own folder:
   `npm install` then `npm start` (default port 3000).
2. In this dashboard folder, create `.env.local` next to `package.json` with:
   ```
   VITE_SAFESEA_BACKEND_URL=http://localhost:3000
   VITE_SAFESEA_CHAT_BACKEND_URL=http://localhost:3000
   ```
3. Run:
   ```
   npm install
   npm run dev
   ```
4. Open the Vite local URL printed in the terminal (normally `http://localhost:5173`).
5. Open `http://localhost:3000/api/health` in another tab and confirm the backend is online.

## Test an alert

Use PowerShell in a second terminal:
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/alerts" -ContentType "application/json" -Body '{"deviceId":"TEST-BOAT-01","fishermanName":"Test Fisherman","type":"IMBL_250M","title":"250 m from IMBL","message":"Test alert from local backend","severity":"HIGH","distanceMeters":250,"latitude":9.2,"longitude":79.3}'
```
The dashboard polls every five seconds. If the alert API initially had no records, the first newly-created alert should still trigger a popup.

## Test a message

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/messages" -ContentType "application/json" -Body '{"deviceId":"TEST-BOAT-01","from":"TEST-BOAT-01","to":"COASTAL_GUARD","text":"Test fisherman message","kind":"CHAT"}'
```
The dashboard's recent-message panel polls every five seconds.

## Important

- Use the same backend URL for both Vite variables while testing the unified backend.
- The dashboard cannot display a real APK alert/message unless the APK posts it to this backend.
- This patch has not been production-tested against your live Render deployment. The frontend build could not be verified in this environment because package installation did not complete.
