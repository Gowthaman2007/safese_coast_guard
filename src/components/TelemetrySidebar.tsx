import React, { useState } from 'react';
import {
  Compass,
  Navigation,
  Shield,
  ShieldAlert,
  Radio,
  Play,
  Pause,
  RotateCcw,
  Anchor,
  Sliders,
  AlertTriangle,
  Info,
  MapPin,
  Cpu,
  Bell,
  Volume2,
  Trash2,
  Copy,
  Check,
  Power,
  Zap,
} from 'lucide-react';
import {
  VesselState,
  ProximityTelemetry,
  GeofenceConfig,
  MapLayerConfig,
  ThemeMode,
  HardwareState,
  LogEntry,
  GpsSourceType,
} from '../types';
import { formatDistance, toDMS } from '../utils/geodesic';

interface TelemetrySidebarProps {
  theme: ThemeMode;
  vessel: VesselState;
  telemetry: ProximityTelemetry;
  geofence: GeofenceConfig;
  onUpdateGeofence: (updated: Partial<GeofenceConfig>) => void;
  onUpdateVessel: (updated: Partial<VesselState>) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetVesselPosition: (presetKey: string) => void;
  layerConfig: MapLayerConfig;
  onUpdateLayerConfig: (updated: Partial<MapLayerConfig>) => void;
  onViewFullIMBL: () => void;
  onGoToGPS: () => void;
  isOpen: boolean;
  onClose: () => void;

  // New hardware & reference capabilities
  hardware: HardwareState;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  onSendHardwareTest: (type: 'LED' | 'BUZZER' | 'ALARM' | 'RESET' | 'EMERGENCY') => void;
  onStartBrowserGPS: () => void;
  onCreateCircleGeofenceAroundGPS: (radiusMeters: number) => void;
  onClearGeofence: () => void;
  onStartDraw?: (shape: 'polygon' | 'rectangle' | 'circle') => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const TelemetrySidebar: React.FC<TelemetrySidebarProps> = ({
  theme,
  vessel,
  telemetry,
  geofence,
  onUpdateGeofence,
  onUpdateVessel,
  isSimulating,
  onToggleSimulation,
  onResetVesselPosition,
  layerConfig,
  onUpdateLayerConfig,
  onViewFullIMBL,
  onGoToGPS,
  isOpen,
  onClose,
  hardware,
  onConnectSerial,
  onDisconnectSerial,
  onSendHardwareTest,
  onStartBrowserGPS,
  onCreateCircleGeofenceAroundGPS,
  onClearGeofence,
  onStartDraw,
  logs,
  onClearLogs,
}) => {
  const isLight = theme === 'light';
  const dms = toDMS(vessel.lat, vessel.lng);
  const imblDist = formatDistance(telemetry.distanceToImblMeters);
  const geofenceDist =
    telemetry.distanceToGeofenceMeters !== null
      ? formatDistance(telemetry.distanceToGeofenceMeters)
      : null;

  const [copiedLog, setCopiedLog] = useState(false);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const isSafeSide =
    geofence.safeMode === 'INSIDE_SAFE'
      ? telemetry.geofenceAlertLevel === 'SAFE'
      : telemetry.geofenceAlertLevel === 'SAFE';

  const sideLabel =
    telemetry.closestSide === 'INDIA_SIDE'
      ? { text: 'INDIAN JURISDICTION SIDE', color: isLight ? 'text-emerald-700 bg-emerald-100 border-emerald-300' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800' }
      : telemetry.closestSide === 'SRI_LANKA_SIDE'
      ? { text: 'SRI LANKAN JURISDICTION SIDE', color: isLight ? 'text-rose-700 bg-rose-100 border-rose-300' : 'text-rose-400 bg-rose-950/60 border-rose-800' }
      : { text: 'ON BOUNDARY LINE', color: isLight ? 'text-amber-800 bg-amber-100 border-amber-300' : 'text-yellow-400 bg-yellow-950/60 border-yellow-800' };

  // Theme-aware container classes
  const panelBg = isLight
    ? 'bg-white/92 backdrop-blur-2xl border-r border-sky-200 shadow-2xl text-slate-800'
    : 'bg-[#030e1b]/92 backdrop-blur-2xl border-r border-slate-800 shadow-2xl text-slate-100';

  const cardBg = isLight
    ? 'bg-white/85 border border-sky-100 shadow-sm text-slate-800 rounded-2xl p-3.5'
    : 'bg-[#061526]/80 border border-slate-800/90 shadow-md text-slate-100 rounded-2xl p-3.5';

  const headerText = isLight ? 'text-sky-900 font-extrabold' : 'text-sky-300 font-bold';
  const subText = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <aside
      id="telemetry-sidebar"
      className={`fixed top-14 bottom-0 left-0 z-[995] w-80 sm:w-96 ${panelBg} transition-transform duration-300 flex flex-col font-sans text-xs select-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Scrollable Console Body */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-600">

        {/* 1. CONNECTION SECTION (ESP32 WEB SERIAL & GPS SOURCE) */}
        <section className={cardBg}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-[11px] uppercase tracking-wider ${headerText} flex items-center gap-1.5`}>
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              <span>Connection &amp; Telemetry</span>
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
              hardware.serialConnected
                ? 'bg-emerald-500/20 text-emerald-600 border-emerald-400'
                : isLight
                ? 'bg-slate-100 text-slate-500 border-slate-300'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${hardware.serialConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              {hardware.serialConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between mb-2.5 ${
            isLight ? 'bg-sky-50/60 border-sky-100' : 'bg-[#020b14]/70 border-slate-800'
          }`}>
            <span className="font-semibold text-[11px] flex items-center gap-1.5">
              <span>🔌</span> ESP32 Web Serial (115200)
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {hardware.serialConnected ? 'Port Active' : 'Off-line'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              id="connectBtn"
              type="button"
              onClick={onConnectSerial}
              className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white shadow-sky-200'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              }`}
            >
              <span>Connect ESP32</span>
            </button>
            <button
              id="disconnectBtn"
              type="button"
              onClick={onDisconnectSerial}
              disabled={!hardware.serialConnected}
              className={`py-2 px-2.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                hardware.serialConnected
                  ? isLight
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-red-950/60 hover:bg-red-900/70 text-red-200 border-red-800'
                  : isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              <span>Disconnect</span>
            </button>
          </div>

          {/* GPS Source Selector */}
          <div className="space-y-1.5">
            <label className={`text-[10.5px] font-semibold uppercase tracking-wider block ${subText}`}>
              Active GPS Source
            </label>
            <select
              id="gpsSource"
              value={vessel.source}
              onChange={(e) => onUpdateVessel({ source: e.target.value as GpsSourceType })}
              className={`w-full p-2 rounded-xl text-xs font-semibold border transition-colors outline-none cursor-pointer ${
                isLight
                  ? 'bg-sky-50/70 border-sky-200 text-slate-800 focus:border-sky-400'
                  : 'bg-[#030e1b] border-slate-700 text-slate-200 focus:border-cyan-400'
              }`}
            >
              <option value="DEVICE_GPS">🌐 Browser GPS (Device Geolocation)</option>
              <option value="ESP32_SERIAL">📡 ESP32 / Neo-6M GPS Stream</option>
              <option value="SIMULATOR">🚢 Virtual Nautical Simulator</option>
            </select>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="browserGpsBtn"
                type="button"
                onClick={onStartBrowserGPS}
                className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                Start Browser GPS
              </button>
              <button
                id="locateBtn"
                type="button"
                onClick={onGoToGPS}
                className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                Go to GPS
              </button>
            </div>
          </div>
        </section>

        {/* 2. IMBL TREATY REFERENCE SECTION */}
        <section className={`${cardBg} ${isLight ? 'border-rose-100' : 'border-red-950/80'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-rose-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-500" />
              <span>IMBL Reference (Treaty)</span>
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              isLight ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-red-950 text-red-300 border-red-800'
            }`}>
              🔒 LOCKED
            </span>
          </div>

          <p className={`text-[10.5px] leading-relaxed mb-2.5 ${subText}`}>
            Fixed layer includes the 1974 Palk Strait line, 1976 Gulf of Mannar line, 1976 extension to Point T, and 1976 Bay of Bengal branch.
          </p>

          <div className={`p-3 rounded-xl border mb-2.5 ${
            isLight
              ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200'
              : 'bg-gradient-to-br from-[#061220] to-[#1e070c] border-red-900/50'
          }`}>
            <div className="flex justify-between items-baseline">
              <span className={`text-[11px] font-bold uppercase ${isLight ? 'text-rose-800' : 'text-red-400'}`}>
                Distance to IMBL:
              </span>
              <span className="font-mono text-2xl font-extrabold text-rose-500">
                {imblDist.km}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10.5px] mt-1 pt-1 border-t border-rose-200/40 dark:border-red-900/40">
              <span className={subText}>Sector Status:</span>
              <span className={`px-1.5 py-0.5 rounded font-semibold text-[9.5px] border ${sideLabel.color}`}>
                {sideLabel.text}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="imblBtn"
              type="button"
              onClick={() => onUpdateLayerConfig({ showIMBL: !layerConfig.showIMBL })}
              className={`py-1.5 px-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                layerConfig.showIMBL
                  ? isLight
                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-400 shadow-sm'
                    : 'bg-red-600 hover:bg-red-500 text-white border-red-500'
                  : isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {layerConfig.showIMBL ? 'Hide IMBL' : 'Show IMBL'}
            </button>
            <button
              id="fitImbl"
              type="button"
              onClick={onViewFullIMBL}
              className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              View Full IMBL
            </button>
          </div>
        </section>

        {/* 3. CUSTOM SAFETY GEOFENCE SECTION */}
        <section className={cardBg}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-[11px] uppercase tracking-wider ${headerText} flex items-center gap-1.5`}>
              <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
              <span>Custom Safety Geofence</span>
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={geofence.enabled}
                onChange={(e) => onUpdateGeofence({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-2">
            <div>
              <label className={`text-[10.5px] font-semibold uppercase tracking-wider block mb-1 ${subText}`}>
                Safe Operation Side
              </label>
              <select
                id="safeMode"
                value={geofence.safeMode === 'INSIDE_SAFE' ? 'inside' : 'outside'}
                onChange={(e) =>
                  onUpdateGeofence({
                    safeMode: e.target.value === 'inside' ? 'INSIDE_SAFE' : 'OUTSIDE_SAFE',
                  })
                }
                className={`w-full p-2 rounded-xl text-xs font-semibold border outline-none cursor-pointer ${
                  isLight
                    ? 'bg-sky-50/70 border-sky-200 text-slate-800'
                    : 'bg-[#030e1b] border-slate-700 text-slate-200'
                }`}
              >
                <option value="inside">🛡️ INSIDE SAFE (Alarm if exiting)</option>
                <option value="outside">⛔ OUTSIDE SAFE (Alarm if entering)</option>
              </select>
            </div>

            <p className={`text-[10px] leading-snug ${subText}`}>
              Create custom shaped safety zones by drawing directly on the map, dragging vertex handles, or generating instant calibrated circular zones.
            </p>

            {/* Custom Shape Drawing Tools */}
            <div className="space-y-1.5 pt-1">
              <span className={`text-[9.5px] font-bold uppercase tracking-wider block ${subText}`}>
                Draw Custom Shape
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  id="drawPolygonSidebar"
                  type="button"
                  onClick={() => onStartDraw?.('polygon')}
                  className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-1 ${
                    isLight
                      ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-sm'
                      : 'bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border-sky-800'
                  }`}
                  title="Draw Custom Polygon by clicking vertices"
                >
                  <span>⬡ Polygon</span>
                </button>

                <button
                  id="drawRectSidebar"
                  type="button"
                  onClick={() => onStartDraw?.('rectangle')}
                  className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-1 ${
                    isLight
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm'
                      : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-800'
                  }`}
                  title="Draw Safety Rectangle or Box corridor"
                >
                  <span>▭ Rect</span>
                </button>

                <button
                  id="drawCircleSidebar"
                  type="button"
                  onClick={() => onStartDraw?.('circle')}
                  className={`py-1.5 px-2 rounded-xl font-bold text-[11px] border transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-1 ${
                    isLight
                      ? 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200 shadow-sm'
                      : 'bg-pink-950/60 hover:bg-pink-900/80 text-pink-300 border-pink-800'
                  }`}
                  title="Draw Circle by center & radius"
                >
                  <span>⭕ Circle</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  id="circleGps"
                  type="button"
                  onClick={() => onCreateCircleGeofenceAroundGPS(300)}
                  className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-all hover:scale-102 cursor-pointer ${
                    isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border-emerald-700'
                  }`}
                  title="Generate instant 300 m radius circular safety buffer centered on vessel"
                >
                  🎯 300 m around GPS
                </button>
                <button
                  id="clearGeo"
                  type="button"
                  onClick={onClearGeofence}
                  className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-all hover:scale-102 cursor-pointer ${
                    isLight
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-red-950/60 hover:bg-red-900/70 text-red-300 border-red-800'
                  }`}
                >
                  Clear Geofence
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HARDWARE TEST PANEL (ESP32 BUZZER, LED, ALARM, EMERGENCY) */}
        <section className={cardBg}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-[11px] uppercase tracking-wider ${headerText} flex items-center gap-1.5`}>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Hardware Test &amp; Actuators</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">ESP32 CMD</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <button
              id="testLed"
              type="button"
              onClick={() => onSendHardwareTest('LED')}
              className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                hardware.ledTestActive
                  ? 'bg-cyan-500 text-white animate-pulse shadow-md shadow-cyan-300'
                  : isLight
                  ? 'bg-slate-100 hover:bg-cyan-50 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              💡 LED
            </button>
            <button
              id="testBuzzer"
              type="button"
              onClick={() => onSendHardwareTest('BUZZER')}
              className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                hardware.buzzerTestActive
                  ? 'bg-amber-500 text-white animate-pulse shadow-md shadow-amber-300'
                  : isLight
                  ? 'bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              🔊 Buzzer
            </button>
            <button
              id="testAlarm"
              type="button"
              onClick={() => onSendHardwareTest('ALARM')}
              className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                hardware.alarmTestActive
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-300'
                  : isLight
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-red-950/70 hover:bg-red-900 text-red-200 border-red-800'
              }`}
            >
              🚨 Alarm
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="resetAlarm"
              type="button"
              onClick={() => onSendHardwareTest('RESET')}
              className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border-emerald-800'
              }`}
            >
              Reset Alarm
            </button>
            <button
              id="emergency"
              type="button"
              onClick={() => onSendHardwareTest('EMERGENCY')}
              className={`py-1.5 px-2 rounded-xl font-extrabold text-xs border transition-all cursor-pointer ${
                hardware.emergencyActive
                  ? 'bg-rose-600 text-white animate-bounce shadow-lg shadow-rose-400 border-rose-400'
                  : isLight
                  ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-red-950 text-slate-300 border-slate-700'
              }`}
            >
              {hardware.emergencyActive ? 'Emergency OFF' : 'Emergency ON'}
            </button>
          </div>
        </section>

        {/* 5. THRESHOLDS & MONITOR STATE */}
        <section className={cardBg}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-[11px] uppercase tracking-wider ${headerText}`}>
              Thresholds &amp; Safety Monitor
            </h3>
            <span className="text-[10px] font-mono text-slate-400">STATUS</span>
          </div>

          {/* Threshold Pills */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              SAFE &gt; 500 m
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-yellow-950 text-yellow-300 border-yellow-800'
            }`}>
              WARNING ≤ 500 m
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isLight ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-orange-950 text-orange-300 border-orange-800'
            }`}>
              CRITICAL ≤ 250 m
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-red-950 text-red-300 border-red-800'
            }`}>
              RAPID ≤ 100 m
            </span>
          </div>

          <div className={`p-3 rounded-xl border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#020b14]/70 border-slate-800'
          }`}>
            <div className="flex justify-between items-center text-xs">
              <span className={subText}>Emergency switch:</span>
              <b id="emergencyState" className={`font-mono font-bold ${hardware.emergencyActive ? 'text-rose-500' : 'text-emerald-500'}`}>
                {hardware.emergencyActive ? 'ON' : 'OFF'}
              </b>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={subText}>Alarm state:</span>
              <b id="sideState" className={`font-mono font-bold ${
                telemetry.geofenceAlertLevel === 'SAFE' ? 'text-emerald-500' : 'text-rose-500 animate-pulse'
              }`}>
                {telemetry.geofenceAlertLevel.replace(/_/g, ' ')}
              </b>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={subText}>Geofence distance:</span>
              <span id="distance" className="font-mono font-bold text-blue-500">
                {geofenceDist ? `${geofenceDist.meters} (${geofence.safeMode === 'INSIDE_SAFE' ? 'Inside' : 'Outside'})` : 'No geofence'}
              </span>
            </div>
            <div className="pt-1 flex gap-1.5 border-t border-slate-700/20">
              <span id="sidePill" className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isSafeSide
                  ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-red-950 text-red-300 border-red-800'
              }`}>
                {isSafeSide ? 'SAFE SIDE' : 'UNSAFE SIDE'}
              </span>
              <span id="fixPill" className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}>
                GPS FIX
              </span>
            </div>
          </div>
        </section>

        {/* 6. LIVE EVENT ACTIVITY LOG WINDOW */}
        <section className={cardBg}>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className={`text-[11px] uppercase tracking-wider ${headerText}`}>
              Live Event Console
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyLogs}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
                title="Copy log text"
              >
                {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClearLogs}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
                title="Clear logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            id="log"
            className={`font-mono text-[10px] p-2.5 rounded-xl border max-h-32 overflow-y-auto space-y-1 ${
              isLight
                ? 'bg-slate-900 text-sky-300 border-slate-700'
                : 'bg-[#020b14] text-cyan-300 border-slate-800'
            }`}
          >
            {logs.length === 0 ? (
              <span className="text-slate-500 italic">No events logged yet.</span>
            ) : (
              logs.map((item) => (
                <div key={item.id} className="leading-tight">
                  <span className="text-slate-400">[{item.timestamp}]</span> {item.message}
                </div>
              ))
            )}
          </div>
        </section>

        {/* 7. SIMULATOR NAVIGATION CONTROLS */}
        {vessel.source === 'SIMULATOR' && (
          <section className={cardBg}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-[11px] uppercase tracking-wider ${headerText} flex items-center gap-1.5`}>
                <Navigation className="w-3.5 h-3.5 text-cyan-500" />
                <span>Vessel Simulation Engine</span>
              </h3>
              <button
                type="button"
                onClick={onToggleSimulation}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  isSimulating
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isSimulating ? 'Stop Engine' : 'Start Engine'}
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className={subText}>Speed:</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-cyan-300">
                    {vessel.speedKnots} Knots ({(vessel.speedKnots * 1.852).toFixed(1)} km/h)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={vessel.speedKnots}
                  onChange={(e) => onUpdateVessel({ speedKnots: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 bg-slate-300 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className={subText}>Heading:</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-cyan-300">
                    {Math.round(vessel.heading)}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="1"
                  value={vessel.heading}
                  onChange={(e) => onUpdateVessel({ heading: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 bg-slate-300 dark:bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="pt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${subText}`}>
                  Quick Sector Placement:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onResetVesselPosition('palk_approach')}
                    className={`p-1.5 text-left rounded-lg text-[10.5px] border transition-colors ${
                      isLight ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    📍 Palk Approach (Pt 4)
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetVesselPosition('adams_bridge')}
                    className={`p-1.5 text-left rounded-lg text-[10.5px] border transition-colors ${
                      isLight ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    📍 Adam's Bridge (Pt 6)
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetVesselPosition('gulf_mannar')}
                    className={`p-1.5 text-left rounded-lg text-[10.5px] border transition-colors ${
                      isLight ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    📍 Gulf of Mannar (Pt 4m)
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetVesselPosition('point_t')}
                    className={`p-1.5 text-left rounded-lg text-[10.5px] border transition-colors ${
                      isLight ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    📍 Point T Trijunction
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 8. MAP BASE TILES */}
        <section className={cardBg}>
          <span className={`text-[10.5px] font-bold uppercase tracking-wider block mb-1.5 ${headerText}`}>
            Chart Tiles
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {[
              { key: 'dark', label: 'Dark Matter' },
              { key: 'light_candy', label: 'Light Candy' },
              { key: 'satellite', label: 'Satellite' },
              { key: 'ocean', label: 'Ocean Bathymetry' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onUpdateLayerConfig({ tileProvider: t.key as any })}
                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition-colors cursor-pointer ${
                  layerConfig.tileProvider === t.key
                    ? isLight
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-cyan-600/40 text-cyan-200 border-cyan-400'
                    : isLight
                    ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-sky-50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* 9. STATUTORY SAFETY NOTICE */}
        <div className={`rounded-2xl p-3 border text-[10.5px] leading-relaxed flex gap-2.5 ${
          isLight
            ? 'bg-amber-50/80 border-amber-200 text-amber-800'
            : 'bg-amber-950/30 border-amber-800/50 text-amber-300/90'
        }`}>
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            &quot;IMBL shown from treaty-defined geographic positions for project visualization.
            It is not a substitute for official nautical charts or navigational systems.&quot;
          </p>
        </div>
      </div>
    </aside>
  );
};
