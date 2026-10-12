import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MaritimeMap } from './components/MaritimeMap';
import { NavigationHeader } from './components/NavigationHeader';
import { CoastalGuardSidebar } from './components/CoastalGuardSidebar';
import { DEMO_FLEET, FleetVessel } from './data/coastalGuardFleet';
import { MapLegend } from './components/MapLegend';
import { TreatyInspectorModal } from './components/TreatyInspectorModal';
import { MapVisibilityPanel } from './components/MapVisibilityPanel';
import { fetchFleet, fetchSafetyAlerts, fetchChatMessages, sendFleetBroadcast, SafetyAlert, ChatMessage } from './services/backend';
import {
  VesselState,
  GeofenceConfig,
  MapLayerConfig,
  ProximityTelemetry,
  AlertLevel,
  LatLng,
  TreatyPoint,
  ThemeMode,
  HardwareState,
  LogEntry,
  GpsSourceType,
} from './types';
import {
  FULL_IMBL,
  IMBL_1976_BAY,
  ALL_TREATY_POINTS,
} from './data/imblCoordinates';
import { DEFAULT_GEOFENCES } from './data/defaultGeofence';
import {
  interpolateTreatySequence,
  findShortestDistanceToPolyline,
  isPointInPolygon,
  distanceToPolygonBoundary,
  haversineDistanceMeters,
  determineSideOfIMBL,
} from './utils/geodesic';
import { nauticalAudio } from './utils/audioAlarm';
import { alertCommand, evaluateGeofence } from './utils/geofenceLogic';
import { webSerial } from './utils/webSerial';

export default function App() {
  // Theme state: dark (default oceanic) or light (candy colours)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('safesea_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Dense geodesic paths
  const fullImblPathRef = useRef<LatLng[]>(interpolateTreatySequence(FULL_IMBL));
  const bayBranchPathRef = useRef<LatLng[]>(interpolateTreatySequence(IMBL_1976_BAY));

  // Map action controller handles
  const mapActionsRef = useRef<{
    fitFullIMBL: () => void;
    centerOnGPS: () => void;
    focusSector: (sector: 'palk' | 'gulf' | 'pointT' | 'bayOfBengal') => void;
    zoomToCoords: (lat: number, lng: number, zoom?: number) => void;
    invalidateSize: () => void;
    startDraw: (shape: 'polygon' | 'rectangle' | 'circle') => void;
    clearGeofence: () => void;
  } | null>(null);

  // Vessel state (Initial position near Palk Strait corridor)
  const [vessel, setVessel] = useState<VesselState>({
    lat: 9.38,
    lng: 79.35,
    heading: 68,
    speedKnots: 6.5,
    source: 'SIMULATOR',
    lastUpdated: Date.now(),
  });

  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Geofence configuration
  const [geofence, setGeofence] = useState<GeofenceConfig>(DEFAULT_GEOFENCES[0]);

  // Layer settings
  const [layerConfig, setLayerConfig] = useState<MapLayerConfig>({
    showIMBL: true,
    showTreatyPoints: true,
    showGeofence: true,
    showBathymetry: false,
    tileProvider: 'satellite',
    showFleet: true,
    showRestrictedZones: true,
    showSafeZones: true,
    showTrails: false,
    showPorts: false,
    showWeather: false,
  });

  // UI Panels state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMapFocus, setIsMapFocus] = useState<boolean>(false);
  const [isTreatyModalOpen, setIsTreatyModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [fleet, setFleet] = useState<FleetVessel[]>(DEMO_FLEET);
  const [backendOnline, setBackendOnline] = useState(false);
  const [selectedFleetVessel, setSelectedFleetVessel] = useState<FleetVessel | null>(null);
  const [alertPopup, setAlertPopup] = useState<SafetyAlert | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showMessagesPanel, setShowMessagesPanel] = useState(true);
  const seenMessageIdsRef = useRef<Set<string> | null>(null);
  const seenAlertIdsRef = useRef<Set<string> | null>(null);

  // Coastal Guard live fleet synchronization. Demo fleet remains available when the backend is offline.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const devices = await fetchFleet();
        if (!cancelled && devices.length) { setFleet(devices); setBackendOnline(true); }
      } catch { if (!cancelled) setBackendOnline(false); }
    };
    sync();
    const timer = window.setInterval(sync, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);


  // Hardware state
  const [hardware, setHardware] = useState<HardwareState>({
    serialConnected: false,
    emergencyActive: false,
    ledTestActive: false,
    buzzerTestActive: false,
    alarmTestActive: false,
    lastCommandSent: '',
  });

  // Event activity log
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      message: 'SafeSea Astra initialized',
      type: 'info',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString(),
      message: 'Full IMBL reference loaded: 1974 + 1976 Gulf + Point T + Bay of Bengal',
      type: 'info',
    },
    {
      id: 'log-3',
      timestamp: new Date().toLocaleTimeString(),
      message: 'Spherical Slerp geodesic interpolation active',
      type: 'info',
    },
  ]);

  // Toast notifications (replace blocking window.alert)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'info' | 'warn' | 'error' | 'success' }[]>([]);
  const notify = useCallback((message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const addLog = useCallback((message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs((prev) => [entry, ...prev.slice(0, 150)]);
  }, []);

  // Poll persisted safety incidents. The first poll seeds known IDs so old incidents
  // do not unexpectedly popup on page load; subsequent new events open a compact alert.
  useEffect(() => {
    let cancelled = false;
    const syncAlerts = async () => {
      try {
        const alerts = await fetchSafetyAlerts();
        if (cancelled) return;
        if (seenAlertIdsRef.current === null) {
          seenAlertIdsRef.current = new Set(alerts.map(a => a.id));
          return;
        }
        if (!alerts.length) return;
        const seen = seenAlertIdsRef.current;
        const fresh = alerts.find(a => !seen.has(a.id));
        if (fresh) {
          seen.add(fresh.id);
          setAlertPopup(fresh);
          const sev = fresh.severity.toUpperCase();
          addLog(`SAFETY ALERT • ${fresh.type} • ${fresh.deviceId || 'Unknown vessel'}`, /SOS|EMERGENCY|CRITICAL|CROSSED/.test(sev) ? 'error' : 'warn');
          if (/SOS|EMERGENCY|CRITICAL|CROSSED/.test(sev)) nauticalAudio.syncLevel('CRITICAL');
          notify(`Safety alert received: ${fresh.type}`, /SOS|EMERGENCY|CRITICAL|CROSSED/.test(sev) ? 'error' : 'warn');
        }
      } catch { /* Alerts endpoint may not be enabled on a backend; fleet sync continues. */ }
    };
    void syncAlerts();
    const timer = window.setInterval(() => void syncAlerts(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [addLog, notify]);


  // Poll chat messages independently from vessel status. Normalize message/text schemas
  // in backend.ts so both the existing chat service and unified backend can be read.
  useEffect(() => {
    let cancelled = false;
    const syncMessages = async () => {
      try {
        const rows = await fetchChatMessages();
        if (cancelled) return;
        const newestFirst = [...rows].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
        setChatMessages(newestFirst.slice(0, 100));
        if (seenMessageIdsRef.current === null) {
          seenMessageIdsRef.current = new Set(rows.map(m => m.id));
          return;
        }
        const seen = seenMessageIdsRef.current;
        const fresh = rows.find(m => !seen.has(m.id));
        rows.forEach(m => seen.add(m.id));
        if (fresh) {
          setShowMessagesPanel(true);
          addLog(`MESSAGE RECEIVED • ${fresh.senderName || fresh.senderId}: ${fresh.message}`, 'info');
          notify(`New message from ${fresh.senderName || fresh.senderId}`, 'info');
        }
      } catch {
        // Chat service may be temporarily unavailable; fleet and safety polling continue.
      }
    };
    void syncMessages();
    const timer = window.setInterval(() => void syncMessages(), 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [addLog, notify]);

  // Calculated Telemetry
  const [telemetry, setTelemetry] = useState<ProximityTelemetry>({
    distanceToImblMeters: 2840,
    distanceToGeofenceMeters: 450,
    geofenceAlertLevel: 'SAFE',
    nearestImblPoint: { lat: 9.363333, lng: 79.511667 },
    nearestTreatyPointName: 'Point 4 (Kachchatheevu)',
    closestSide: 'INDIA_SIDE',
  });

  // Keep theme in sync with body classes and localStorage
  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    localStorage.setItem('safesea_theme', theme);

    // Preserve the Guard-selected maritime base map when changing UI theme.
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    addLog(`Theme changed to ${next === 'light' ? 'Light Candy' : 'Dark Oceanic'} mode`, 'info');
  }, [theme, addLog]);

  // Audio mute toggle
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    nauticalAudio.setMuted(next);
    addLog(`Audio alerts ${next ? 'Muted' : 'Unmuted'}`, 'info');
  }, [isMuted, addLog]);

  // Map focus mode toggle
  const handleToggleMapFocus = useCallback(() => {
    const next = !isMapFocus;
    setIsMapFocus(next);
    setIsSidebarOpen(!next);
    setTimeout(() => mapActionsRef.current?.invalidateSize(), 350);
  }, [isMapFocus]);

  // Web Serial Message Handler
  useEffect(() => {
    webSerial.setOnMessage((line: string) => {
      addLog(`ESP32: ${line}`, 'info');

      // GPS,<lat>,<lng>,<speed>
      if (line.startsWith('GPS,')) {
        const parts = line.split(',');
        if (parts[1] !== 'NO_FIX') {
          const lat = parseFloat(parts[1]);
          const lng = parseFloat(parts[2]);
          const speed = parseFloat(parts[3] || '0');
          if (!isNaN(lat) && !isNaN(lng)) {
            setVessel((v) => ({
              ...v,
              lat,
              lng,
              speedKnots: speed,
              source: 'ESP32_SERIAL',
              lastUpdated: Date.now(),
            }));
          }
        }
      } else if (line.startsWith('EMERGENCY,')) {
        const isEm = line.includes('ON');
        setHardware((h) => ({ ...h, emergencyActive: isEm }));
        if (isEm) {
          addLog('Emergency switch triggered by hardware!', 'error');
        } else {
          addLog('Emergency cleared by hardware.', 'success');
        }
      }
    });
  }, [addLog]);

  // Web Serial Connect / Disconnect handlers
  const handleConnectSerial = useCallback(async () => {
    addLog('Requesting Web Serial port for ESP32...', 'info');
    const res = await webSerial.connect();
    if (res.success) {
      setHardware((h) => ({ ...h, serialConnected: true }));
      // Synchronize the newly connected ESP32 with the dashboard's current alarm state.
      webSerial.sendCommand(alertCommand(telemetry.geofenceAlertLevel));
      if (hardware.emergencyActive) webSerial.sendCommand('EMERGENCY,ON');
      addLog(`${res.message} Current alarm state synchronized: ${telemetry.geofenceAlertLevel}.`, 'success');
    } else {
      setHardware((h) => ({ ...h, serialConnected: false }));
      addLog(`Serial error: ${res.message}`, 'warn');
    }
  }, [addLog, hardware.emergencyActive, telemetry.geofenceAlertLevel]);

  const handleDisconnectSerial = useCallback(async () => {
    await webSerial.disconnect();
    setHardware((h) => ({ ...h, serialConnected: false }));
    addLog('ESP32 disconnected.', 'info');
  }, [addLog]);

  // Hardware actuator test buttons
  const handleSendHardwareTest = useCallback(
    async (type: 'LED' | 'BUZZER' | 'ALARM' | 'RESET' | 'EMERGENCY') => {
      switch (type) {
        case 'LED':
          setHardware((h) => ({ ...h, ledTestActive: true }));
          webSerial.sendCommand('TEST,LED');
          addLog('LED test command sent (TEST,LED)', 'info');
          setTimeout(() => setHardware((h) => ({ ...h, ledTestActive: false })), 1500);
          break;

        case 'BUZZER':
          setHardware((h) => ({ ...h, buzzerTestActive: true }));
          webSerial.sendCommand('TEST,BUZZER');
          nauticalAudio.syncLevel('WARNING');
          addLog('Buzzer test command sent (TEST,BUZZER)', 'info');
          setTimeout(() => {
            setHardware((h) => ({ ...h, buzzerTestActive: false }));
            nauticalAudio.syncLevel(telemetry.geofenceAlertLevel);
          }, 1500);
          break;

        case 'ALARM':
          setHardware((h) => ({ ...h, alarmTestActive: true }));
          webSerial.sendCommand('TEST,ALARM');
          nauticalAudio.syncLevel('RAPID_ALARM');
          addLog('Alarm test command sent (TEST,ALARM)', 'warn');
          setTimeout(() => {
            setHardware((h) => ({ ...h, alarmTestActive: false }));
            nauticalAudio.syncLevel(telemetry.geofenceAlertLevel);
          }, 2500);
          break;

        case 'RESET':
          webSerial.sendCommand('RESET_ALARM');
          setHardware((h) => ({
            ...h,
            emergencyActive: false,
            alarmTestActive: false,
            buzzerTestActive: false,
            ledTestActive: false,
          }));
          nauticalAudio.syncLevel('SAFE');
          addLog('Hardware alarm state reset (RESET_ALARM)', 'success');
          break;

        case 'EMERGENCY':
          {
            const next = !hardware.emergencyActive;
            webSerial.sendCommand(next ? 'EMERGENCY,ON' : 'EMERGENCY,OFF');
            if (next) {
              webSerial.sendCommand('ALERT,REACHED');
              nauticalAudio.syncLevel('RAPID_ALARM');
              addLog('EMERGENCY COMMAND ACTIVE — Alerting all systems!', 'error');
              notify('Emergency activated', 'error');
            } else {
              webSerial.sendCommand('RESET_ALARM');
              nauticalAudio.syncLevel('SAFE');
              addLog('Emergency command cleared.', 'success');
              notify('Emergency cleared', 'success');
            }
            setHardware((h) => ({ ...h, emergencyActive: next }));
          }
          break;
      }
    },
    [addLog, notify, hardware.emergencyActive, telemetry.geofenceAlertLevel]
  );

  // Instant 300m circle geofence around current GPS position
  const handleCreateCircleGeofenceAroundGPS = useCallback(
    (radiusMeters: number) => {
      const center: LatLng = { lat: vessel.lat, lng: vessel.lng };

      // Also compute 48-point polygon boundary for geodesic geometry distance checks
      const points: LatLng[] = [];
      const steps = 48;
      for (let i = 0; i < steps; i++) {
        const a = (2 * Math.PI * i) / steps;
        const dLat = (radiusMeters / 111320) * Math.cos(a);
        const dLng =
          ((radiusMeters / 111320) * Math.sin(a)) /
          Math.cos((center.lat * Math.PI) / 180);
        points.push({ lat: center.lat + dLat, lng: center.lng + dLng });
      }

      setGeofence({
        id: `geo-circle-${Date.now()}`,
        name: `${radiusMeters}m Circular Safety Zone`,
        enabled: true,
        safeMode: 'INSIDE_SAFE',
        shapeType: 'circle',
        circleCenter: center,
        circleRadiusMeters: radiusMeters,
        points,
        warningThresholdMeters: 500,
        criticalThresholdMeters: 250,
        rapidAlarmThresholdMeters: 100,
      });

      addLog(`Created ${radiusMeters} m circular test geofence around GPS`, 'success');
      mapActionsRef.current?.zoomToCoords(center.lat, center.lng, 14);
    },
    [vessel.lat, vessel.lng, addLog]
  );

  // Clear geofence
  const handleClearGeofence = useCallback(() => {
    setGeofence((prev) => ({
      ...prev,
      enabled: false,
      points: [],
      shapeType: undefined,
      circleCenter: undefined,
    }));
    addLog('Custom geofence cleared.', 'info');
  }, [addLog]);

  // Start continuous browser GPS tracking. Browser GPS is the sole authority
  // for the live vessel position while this source is active.
  const handleStartBrowserGPS = useCallback(() => {
    if (!navigator.geolocation) {
      addLog('Browser geolocation is not available.', 'error');
      return;
    }

    addLog('Starting continuous high-accuracy Browser GPS...', 'info');
    notify('Requesting browser GPS…', 'info');
    setIsSimulating(false);
    setVessel((v) => ({
      ...v,
      source: 'DEVICE_GPS',
      accuracyMeters: undefined,
      lastUpdated: Date.now(),
    }));
  }, [addLog, notify]);

  const handleStopBrowserGPS = useCallback(() => {
    setVessel((v) => ({ ...v, source: 'SIMULATOR', accuracyMeters: undefined, lastUpdated: Date.now() }));
    setIsSimulating(true);
    addLog('Browser GPS stopped — back to simulator.', 'info');
  }, [addLog]);

  // Telemetry Calculation Effect
  useEffect(() => {
    const vesselPos: LatLng = { lat: vessel.lat, lng: vessel.lng };

    // 1. Distance to IMBL
    const dMain = findShortestDistanceToPolyline(vesselPos, fullImblPathRef.current);
    const dBay = findShortestDistanceToPolyline(vesselPos, bayBranchPathRef.current);
    const nearestImblResult = dMain.distanceMeters <= dBay.distanceMeters ? dMain : dBay;

    // Nearest treaty point
    let minTreatyDist = Infinity;
    let closestTreaty = ALL_TREATY_POINTS[0];
    for (const pt of ALL_TREATY_POINTS) {
      const d = haversineDistanceMeters(vesselPos, pt);
      if (d < minTreatyDist) {
        minTreatyDist = d;
        closestTreaty = pt;
      }
    }

    const side = determineSideOfIMBL(vesselPos, nearestImblResult.closestPoint);

    // 2. Unified custom-geofence decision for polygon, rectangle and circle.
    // No centroid logic is used: distance is always to the outline.
    let distanceToGeofence: number | null = null;
    let alertLevel: AlertLevel = 'SAFE';
    let geofenceSafe = true;

    if (geofence.enabled) {
      const result = evaluateGeofence(vesselPos, geofence);
      distanceToGeofence = Number.isFinite(result.distanceToBoundaryMeters)
        ? result.distanceToBoundaryMeters
        : null;
      alertLevel = result.level;
      geofenceSafe = result.safe;
    }

    // Hardware emergency has absolute priority over geofence state.
    if (hardware.emergencyActive) {
      alertLevel = 'RAPID_ALARM';
    }

    setTelemetry((prev) => ({
      distanceToImblMeters: nearestImblResult.distanceMeters,
      distanceToGeofenceMeters: distanceToGeofence,
      geofenceAlertLevel: alertLevel,
      nearestImblPoint: nearestImblResult.closestPoint,
      nearestTreatyPointName: `${closestTreaty.name} (${closestTreaty.section.replace(/_/g, ' ')})`,
      closestSide: side,
    }));

    // Send a hardware command only when the effective alarm level changes.
    // The firmware applies the same timing/priority rules locally.
    if (telemetry.geofenceAlertLevel !== alertLevel) {
      webSerial.sendCommand(alertCommand(alertLevel));
      addLog(
        `Alarm command: ${alertLevel.replace(/_/g, ' ')}${geofence.enabled ? ` • ${geofenceSafe ? 'safe side' : 'unsafe side'}${geofence.enabled ? ` • ${Math.round(distanceToGeofence ?? 0)} m to border` : ''}` : ''}`,
        alertLevel === 'SAFE' ? 'info' : 'warn'
      );
    }

    // Keep browser audio behavior identical to the hardware alarm levels.
    nauticalAudio.syncLevel(alertLevel);
  }, [
    vessel.lat,
    vessel.lng,
    geofence,
    hardware.emergencyActive,
    telemetry.geofenceAlertLevel,
    addLog,
  ]);

  // Simulator loop: move vessel according to speed and heading
  useEffect(() => {
    if (!isSimulating || vessel.source !== 'SIMULATOR' || vessel.speedKnots <= 0) {
      return;
    }

    const intervalMs = 1000;
    const timer = setInterval(() => {
      setVessel((curr) => {
        const distMeters = (curr.speedKnots * 1852 * (intervalMs / 1000)) / 3600;
        const radHdg = (curr.heading * Math.PI) / 180;
        const dLat = (distMeters * Math.cos(radHdg)) / 111320;
        const dLng =
          (distMeters * Math.sin(radHdg)) /
          (111320 * Math.cos((curr.lat * Math.PI) / 180));

        let newLat = curr.lat + dLat;
        let newLng = curr.lng + dLng;

        if (newLat < 4.0 || newLat > 12.5) {
          return { ...curr, heading: (curr.heading + 180) % 360 };
        }
        if (newLng < 76.5 || newLng > 84.5) {
          return { ...curr, heading: (curr.heading + 180) % 360 };
        }

        return {
          ...curr,
          lat: newLat,
          lng: newLng,
          lastUpdated: Date.now(),
        };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, vessel.source, vessel.speedKnots]);

  // Device GPS Continuous Watcher
  useEffect(() => {
    if (vessel.source !== 'DEVICE_GPS') return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
        if (!Number.isFinite(accuracy) || accuracy <= 0) return;

        setVessel((curr) => ({
          ...curr,
          lat: latitude,
          lng: longitude,
          heading: Number.isFinite(heading) && heading !== null ? heading : curr.heading,
          speedKnots: Number.isFinite(speed) && speed !== null ? speed * 1.94384 : 0,
          accuracyMeters: accuracy,
          source: 'DEVICE_GPS',
          lastUpdated: pos.timestamp || Date.now(),
        }));
      },
      (err) => {
        console.warn('GPS position error:', err.message);
        addLog(`Browser GPS error: ${err.message}`, 'warn');
        notify(`GPS unavailable: ${err.message}`, 'error');
        setVessel((v) => ({ ...v, source: 'SIMULATOR' }));
        setIsSimulating(true);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [vessel.source, addLog, notify]);

  // Handlers
  const handleUpdateVesselCoords = useCallback((pos: LatLng) => {
    setVessel((curr) => ({
      ...curr,
      lat: pos.lat,
      lng: pos.lng,
      lastUpdated: Date.now(),
    }));
  }, []);

  const handleUpdateGeofenceVertex = useCallback((index: number, pos: LatLng) => {
    setGeofence((prev) => {
      const updatedPoints = [...prev.points];
      updatedPoints[index] = pos;
      return { ...prev, points: updatedPoints };
    });
  }, []);

  const handleResetVesselPreset = useCallback((presetKey: string) => {
    switch (presetKey) {
      case 'palk_approach':
        setVessel((v) => ({
          ...v,
          lat: 9.363,
          lng: 79.46,
          heading: 65,
          speedKnots: 7.5,
        }));
        mapActionsRef.current?.zoomToCoords(9.363, 79.46, 11);
        addLog("Vessel set to Palk Approach (Pt 4 Kachchatheevu)", 'info');
        break;
      case 'adams_bridge':
        setVessel((v) => ({
          ...v,
          lat: 9.08,
          lng: 79.42,
          heading: 110,
          speedKnots: 8.0,
        }));
        mapActionsRef.current?.zoomToCoords(9.08, 79.42, 11);
        addLog("Vessel set to Adam's Bridge (Pt 6)", 'info');
        break;
      case 'gulf_mannar':
        setVessel((v) => ({
          ...v,
          lat: 8.64,
          lng: 79.18,
          heading: 190,
          speedKnots: 11.0,
        }));
        mapActionsRef.current?.zoomToCoords(8.64, 79.18, 10);
        addLog("Vessel set to Gulf of Mannar (Pt 4m)", 'info');
        break;
      case 'point_t':
        setVessel((v) => ({
          ...v,
          lat: 4.85,
          lng: 77.10,
          heading: 220,
          speedKnots: 12.0,
        }));
        mapActionsRef.current?.zoomToCoords(4.85, 77.10, 10);
        addLog("Vessel set to Point T Trijunction", 'info');
        break;
    }
  }, [addLog]);

  const handleSelectTreatyPoint = useCallback((point: TreatyPoint) => {
    mapActionsRef.current?.zoomToCoords(point.lat, point.lng, 12);
  }, []);
  const handleSelectFleetVessel = useCallback((item: FleetVessel) => {
    setSelectedFleetVessel(item);
    mapActionsRef.current?.zoomToCoords(item.lat, item.lng, 13);
    addLog(`Coastal Guard selected ${item.boat} • ${item.fisherman}`, 'info');
  }, [addLog]);

  const handleBroadcast = useCallback(async (message: string, target?: FleetVessel | null) => {
    const label = target ? `${target.boat}` : 'ALL FLEET';
    addLog(`BROADCAST → ${label}: ${message}`, 'warn');
    try {
      await sendFleetBroadcast(message, target ? target.deviceId : 'ALL');
      addLog(`Message delivered to ${label}`, 'success');
      notify(`Message sent to ${label}`, 'success');
    } catch {
      notify('Backend offline — message not delivered (demo only)', 'warn');
    }
  }, [addLog, notify]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#f0f7ff]' : 'bg-[#06111f]'
    }`}>
      {/* Top Glass Navigation Bar */}
      <NavigationHeader
        theme={theme}
        onToggleTheme={handleToggleTheme}
        layerConfig={layerConfig}
        onToggleIMBL={() =>
          setLayerConfig((prev) => ({ ...prev, showIMBL: !prev.showIMBL }))
        }
        onViewFullIMBL={() => mapActionsRef.current?.fitFullIMBL()}
        onGoToGPS={() => mapActionsRef.current?.centerOnGPS()}
        onFocusSector={(sec) => mapActionsRef.current?.focusSector(sec)}
        onOpenTreatyInspector={() => setIsTreatyModalOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        alertLevel={telemetry.geofenceAlertLevel}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isMapFocus={isMapFocus}
        onToggleMapFocus={handleToggleMapFocus}
        vessel={vessel}
        telemetry={telemetry}
        hardware={hardware}
        onConnectSerial={handleConnectSerial}
        onDisconnectSerial={handleDisconnectSerial}
        isBrowserGps={vessel.source === 'DEVICE_GPS'}
        onToggleBrowserGps={vessel.source === 'DEVICE_GPS' ? handleStopBrowserGPS : handleStartBrowserGPS}
      />

      <div className={`absolute top-[4.6rem] left-1/2 -translate-x-1/2 z-[850] px-2.5 py-1 rounded-full border backdrop-blur-xl text-[8px] font-black tracking-wider ${backendOnline ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>● {backendOnline ? 'SAFESEA CLOUD ONLINE' : 'DEMO FLEET / CLOUD OFFLINE'}</div>

      <MapVisibilityPanel theme={theme} config={layerConfig} onChange={(patch) => setLayerConfig(prev => ({ ...prev, ...patch }))} />

      {/* Main Leaflet Map Engine */}
      <main className="absolute inset-0 pt-14">
        <MaritimeMap
          theme={theme}
          vessel={vessel}
          geofence={geofence}
          layerConfig={layerConfig}
          alertLevel={telemetry.geofenceAlertLevel}
          isMapFocus={isMapFocus}
          onUpdateVessel={handleUpdateVesselCoords}
          onUpdateGeofenceVertex={handleUpdateGeofenceVertex}
          onSetCustomGeofence={(newG) => {
            setGeofence(newG);
            addLog(`Custom geofence created: ${newG.name}`, 'success');
          }}
          onCreateCircleGeofenceAroundGPS={handleCreateCircleGeofenceAroundGPS}
          onClearGeofence={handleClearGeofence}
          onSelectTreatyPoint={handleSelectTreatyPoint}
          fleet={fleet}
          onSelectFleetVessel={handleSelectFleetVessel}
          mapRefReceiver={(actions) => {
            mapActionsRef.current = actions;
          }}
        />
      </main>

      {/* Coastal Guard Command Sidebar — same SAFESEA ASTRA visual language */}
      <CoastalGuardSidebar
        theme={theme}
        fleet={fleet}
        isOpen={isSidebarOpen}
        hardware={hardware}
        onHardwareTest={handleSendHardwareTest}
        onNotify={notify}
        onClose={() => setIsSidebarOpen(false)}
        onSelectVessel={handleSelectFleetVessel}
        onFocusVessel={handleSelectFleetVessel}
        onBroadcast={handleBroadcast}
        onViewIMBL={() => mapActionsRef.current?.fitFullIMBL()}
        onStartDraw={(shape) => mapActionsRef.current?.startDraw(shape)}
        onClearGeofence={handleClearGeofence}
      />

      <AnimatePresence>
      {alertPopup && (
        <motion.div role="alertdialog" aria-live="assertive" initial={{ opacity: 0, y: -12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} className={`fixed top-[5.25rem] right-4 z-[1300] w-[min(340px,calc(100vw-2rem))] rounded-2xl border shadow-2xl backdrop-blur-xl p-3 ${/SOS|EMERGENCY|CRITICAL|CROSSED/i.test(alertPopup.severity) ? 'border-rose-500/50 bg-rose-950/95 text-white' : 'border-amber-400/40 bg-amber-950/95 text-white'}`}>
          <div className="flex items-start gap-2"><div className={`mt-0.5 rounded-xl p-2 ${/SOS|EMERGENCY|CRITICAL|CROSSED/i.test(alertPopup.severity) ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}><span aria-hidden="true">{ /SOS|EMERGENCY/i.test(alertPopup.severity) ? '🆘' : /CROSSED/i.test(alertPopup.severity) ? '🚨' : '⚠️'}</span></div><div className="min-w-0 flex-1"><div className="text-[9px] font-black tracking-[.16em] opacity-80">SAFESEA SAFETY ALERT · {alertPopup.severity}</div><div className="mt-1 text-sm font-extrabold leading-tight">{alertPopup.type}</div><div className="mt-1 text-[11px] leading-snug text-white/85">{alertPopup.message}</div></div><button type="button" aria-label="Dismiss alert popup" onClick={() => setAlertPopup(null)} className="rounded-lg p-1 text-white/70 hover:bg-white/10">✕</button></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-black/15 p-2"><div className="text-white/60">Vessel / device</div><b className="break-all">{alertPopup.boatName || alertPopup.deviceId || 'Unknown vessel'}</b></div><div className="rounded-lg bg-black/15 p-2"><div className="text-white/60">Received</div><b>{new Date(alertPopup.timestamp).toLocaleTimeString()}</b></div></div>
          {alertPopup.distanceMeters !== undefined && <div className="mt-2 text-[10px]">Distance: <b>{Math.round(alertPopup.distanceMeters)} m</b></div>}
          {alertPopup.latitude !== undefined && alertPopup.longitude !== undefined && <div className="mt-1 text-[10px] text-white/75">GPS: {alertPopup.latitude.toFixed(5)}, {alertPopup.longitude.toFixed(5)}</div>}
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => { if (alertPopup.latitude !== undefined && alertPopup.longitude !== undefined) mapActionsRef.current?.zoomToCoords(alertPopup.latitude, alertPopup.longitude, 13); else { const v = fleet.find(x => x.deviceId === alertPopup.deviceId || x.id === alertPopup.deviceId); if (v) handleSelectFleetVessel(v); } setAlertPopup(null); }} className="flex-1 rounded-xl bg-cyan-500 px-3 py-2 text-[10px] font-extrabold text-slate-950">VIEW ON MAP</button><button type="button" onClick={() => setAlertPopup(null)} className="rounded-xl border border-white/20 px-3 py-2 text-[10px] font-bold text-white/90">DISMISS</button></div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showMessagesPanel && chatMessages.length > 0 && (
        <motion.aside initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          aria-label="Recent messages" className={`fixed bottom-4 right-4 z-[1100] w-[min(320px,calc(100vw-2rem))] rounded-2xl border shadow-xl backdrop-blur-xl ${theme === 'light' ? 'border-sky-200 bg-white/95 text-slate-800' : 'border-slate-700 bg-[#071625]/95 text-slate-100'}`}>
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="text-[10px] font-black tracking-widest">RECENT MESSAGES</div>
            <button type="button" aria-label="Hide recent messages" onClick={() => setShowMessagesPanel(false)} className="rounded-md px-2 py-1 text-xs opacity-70 hover:bg-white/10">✕</button>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto p-3">
            {chatMessages.slice(0, 4).map((m) => (
              <div key={m.id} className="rounded-xl bg-black/5 p-2 text-xs dark:bg-white/5">
                <div className="flex items-center justify-between gap-2">
                  <b className="truncate">{m.senderName || m.senderId || 'Unknown sender'}</b>
                  <span className="shrink-0 text-[9px] opacity-60">{Number.isNaN(Date.parse(m.timestamp)) ? '' : new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 break-words opacity-90">{m.message}</p>
                {m.deviceId && <div className="mt-1 truncate text-[9px] opacity-60">Device: {m.deviceId}</div>}
              </div>
            ))}
          </div>
        </motion.aside>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {selectedFleetVessel && (
        <motion.div initial={{ opacity: 0, y: 24, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: .25 }} className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-[990] w-72 max-w-[92vw] rounded-2xl border backdrop-blur-xl shadow-2xl p-3 ${theme === 'light' ? 'bg-white/95 border-sky-200 text-slate-800' : 'bg-[#030e1b]/95 border-slate-800 text-slate-100'}`}>
          <div className="flex items-center justify-between">
            <div><div className="text-[9px] text-cyan-400 font-black tracking-widest">SELECTED VESSEL</div><div className="font-extrabold text-sm">{selectedFleetVessel.boat}</div></div>
            <button type="button" aria-label="Close" onClick={() => setSelectedFleetVessel(null)} className="p-1.5 rounded-lg hover:bg-white/10">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[9px]">
            <div className="rounded-xl bg-white/5 border border-slate-700/30 p-2">Fisherman<br/><b>{selectedFleetVessel.fisherman}</b></div>
            <div className="rounded-xl bg-white/5 border border-slate-700/30 p-2">Device<br/><b>{selectedFleetVessel.deviceId}</b></div>
            <div className="rounded-xl bg-white/5 border border-slate-700/30 p-2">Speed<br/><b>{selectedFleetVessel.speed} kts</b></div>
            <div className="rounded-xl bg-white/5 border border-slate-700/30 p-2">Battery<br/><b>{selectedFleetVessel.battery}%</b></div>
          </div>
          <div className="mt-2 text-[9px] text-slate-400">{selectedFleetVessel.lat.toFixed(5)}°, {selectedFleetVessel.lng.toFixed(5)}° · {selectedFleetVessel.zone}</div>
          <div className="grid grid-cols-2 gap-2 mt-3"><button type="button" onClick={() => handleSelectFleetVessel(selectedFleetVessel)} className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300 text-[9px] font-bold">TRACK</button><button type="button" onClick={() => setSelectedFleetVessel(null)} className="p-2 rounded-xl bg-red-500/10 text-red-300 text-[9px] font-bold">CLOSE</button></div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed top-[6.5rem] left-1/2 -translate-x-1/2 z-[1200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: -16, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: .95 }}
              className={`px-3.5 py-2 rounded-xl border backdrop-blur-xl shadow-xl text-[11px] font-bold ${
                t.type === 'error' ? 'bg-red-600/90 border-red-400 text-white'
                : t.type === 'warn' ? 'bg-amber-500/90 border-amber-300 text-slate-950'
                : t.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white'
                : theme === 'light' ? 'bg-white/95 border-sky-200 text-slate-800' : 'bg-[#04111e]/95 border-slate-700 text-slate-100'}`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Permanent Maritime Map Legend */}
      <MapLegend theme={theme} />

      {/* Treaty Coordinates Database Modal */}
      <TreatyInspectorModal
        theme={theme}
        isOpen={isTreatyModalOpen}
        onClose={() => setIsTreatyModalOpen(false)}
        vesselPos={{ lat: vessel.lat, lng: vessel.lng }}
        onSelectPoint={handleSelectTreatyPoint}
      />
    </div>
  );
}
