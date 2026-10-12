# SafeSea Astra — Geofence + ESP32 Final

This build keeps the Browser GPS Fixed dashboard and changes the alarm engine to use the **shortest distance from the live GPS position to the custom geofence border** for polygon, rectangle and circle shapes.

## Alarm rules

### INSIDE SAFE
- Inside custom geofence: safe side.
- Outside custom geofence: immediate RAPID ALARM, regardless of border distance.
- Safe side > 500 m from border: SAFE, LED OFF, buzzer OFF.
- Safe side <= 500 m: WARNING, LED pulse once every 5 s, buzzer OFF.
- Safe side <= 250 m: CRITICAL, LED event + one short beep every 2 s.
- Safe side <= 100 m: RAPID ALARM, rapid LED + rapid buzzer.
- Crossing outside: immediate RAPID ALARM.

### OUTSIDE SAFE
- Outside custom geofence: safe side.
- Inside custom geofence: immediate RAPID ALARM, regardless of border distance.
- Safe side > 500 m from border: SAFE, LED OFF, buzzer OFF.
- Safe side <= 500 m: WARNING, LED pulse once every 5 s, buzzer OFF.
- Safe side <= 250 m: CRITICAL, LED event + one short beep every 2 s.
- Safe side <= 100 m: RAPID ALARM, rapid LED + rapid buzzer.
- Crossing inside: immediate RAPID ALARM.

The same decision pipeline is used for polygon, rectangle and circle. Circle distance is `abs(distance_to_center - radius)`. Polygon/rectangle distance is measured against the perimeter, not the center.

## GPS

Browser GPS uses continuous `navigator.geolocation.watchPosition()` with high accuracy, `maximumAge: 0`, and a 20-second timeout. The live GPS marker is independent of map clicks while Browser GPS or ESP32 GPS is active.

## ESP32 wiring

| Device | ESP32 |
|---|---:|
| Neo-6M TX | GPIO 18 |
| Neo-6M RX | GPIO 19 |
| LED | GPIO 23 |
| Buzzer | GPIO 21 |
| Emergency switch | GPIO 22 to GND |
| USB serial | 115200 baud |
| Neo-6M UART | 9600 baud |

Install **TinyGPSPlus** in Arduino IDE before compiling the firmware.

## Web Serial

Use Chrome/Edge on a secure origin such as Vercel HTTPS or localhost. Connect the ESP32 and select its USB serial port. The dashboard synchronizes the current alarm state immediately after connecting.

## Vercel

Build command: `npm run build`
Output directory: `dist`

This package is based on `SafeSea_Astra_BROWSER_GPS_FIXED.zip` and includes the integrated geofence logic plus the final ESP32 firmware.
