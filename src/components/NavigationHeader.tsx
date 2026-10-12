import React from 'react';
import {
  Compass,
  Navigation,
  Lock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  BookOpen,
  MapPin,
  Menu,
  X,
  Layers,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Radio,
  Anchor,
  Satellite,
} from 'lucide-react';
import { MapLayerConfig, AlertLevel, ThemeMode, VesselState, ProximityTelemetry, HardwareState } from '../types';
import { formatDistance } from '../utils/geodesic';

interface NavigationHeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  layerConfig: MapLayerConfig;
  onToggleIMBL: () => void;
  onViewFullIMBL: () => void;
  onGoToGPS: () => void;
  onFocusSector: (sector: 'palk' | 'gulf' | 'pointT' | 'bayOfBengal') => void;
  onOpenTreatyInspector: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  alertLevel: AlertLevel;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isMapFocus: boolean;
  onToggleMapFocus: () => void;
  vessel: VesselState;
  telemetry: ProximityTelemetry;
  hardware: HardwareState;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  isBrowserGps: boolean;
  onToggleBrowserGps: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  theme,
  onToggleTheme,
  layerConfig,
  onToggleIMBL,
  onViewFullIMBL,
  onGoToGPS,
  onFocusSector,
  onOpenTreatyInspector,
  isMuted,
  onToggleMute,
  alertLevel,
  isSidebarOpen,
  onToggleSidebar,
  isMapFocus,
  onToggleMapFocus,
  vessel,
  telemetry,
  hardware,
  onConnectSerial,
  onDisconnectSerial,
  isBrowserGps,
  onToggleBrowserGps,
}) => {
  const isLight = theme === 'light';
  const imblDist = formatDistance(telemetry.distanceToImblMeters);
  const speedKmh = (vessel.speedKnots * 1.852).toFixed(1);

  const getAlertBadge = () => {
    switch (alertLevel) {
      case 'RAPID_ALARM':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold animate-pulse shadow-lg ${
            isLight
              ? 'bg-rose-500 text-white shadow-rose-300/80 border border-rose-300'
              : 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)] border border-red-400'
          }`}>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            RAPID ALARM
          </span>
        );
      case 'CRITICAL':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isLight
              ? 'bg-amber-500 text-white shadow-md shadow-amber-200 border border-amber-300'
              : 'bg-orange-600 text-white border border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.6)]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-white" />
            CRITICAL (&lt;250m)
          </span>
        );
      case 'WARNING':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isLight
              ? 'bg-yellow-400 text-amber-950 shadow-md shadow-yellow-100 border border-yellow-300'
              : 'bg-yellow-500 text-slate-950 border border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
          }`}>
            <span className="w-2 h-2 rounded-full bg-amber-900" />
            WARNING (&lt;500m)
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isLight
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm'
              : 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            SAFE
          </span>
        );
    }
  };

  return (
    <header
      id="main-navigation-header"
      className={`absolute top-0 left-0 right-0 z-[1000] px-3 sm:px-5 py-2 transition-all duration-300 flex items-center justify-between gap-2.5 sm:gap-4 shadow-xl ${
        isLight
          ? 'bg-white/90 backdrop-blur-xl border-b border-sky-200/90 text-slate-800'
          : 'bg-[#04111e]/90 backdrop-blur-xl border-b border-slate-800/80 text-slate-100'
      }`}
    >
      {/* Left: Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          id="btn-toggle-sidebar"
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle Console Sidebar"
          aria-expanded={isSidebarOpen}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isLight
              ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 shadow-sm'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
          }`}
          title="Toggle Command Sidebar"
        >
          {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shadow-md ${
            isLight
              ? 'bg-gradient-to-tr from-sky-400 via-cyan-400 to-pink-400 text-white shadow-sky-200'
              : 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
          }`}>
            ⚓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight uppercase leading-tight font-display">
                SAFESEA ASTRA
              </span>
              <span className={`px-1.5 py-0.2 text-[9.5px] font-mono font-bold tracking-wider rounded-full uppercase border ${
                isLight
                  ? 'bg-pink-100 text-pink-700 border-pink-200'
                  : 'bg-red-950/80 text-red-300 border-red-800/60'
              }`}>
                COASTAL GUARD
              </span>
            </div>
            <p className={`text-[10px] hidden md:block leading-none mt-0.5 ${
              isLight ? 'text-slate-500 font-medium' : 'text-slate-400'
            }`}>
              Coastal Guard Command • Fleet Management
            </p>
          </div>
        </div>
      </div>

      {/* Center: Live Metrics HUD */}
      <div className={`hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl border transition-all font-mono text-xs ${
        isLight
          ? 'bg-sky-50/80 border-sky-200/80 text-slate-800 shadow-inner'
          : 'bg-[#030e1b]/80 border-slate-800 text-slate-200'
      }`}>
        <div className="flex flex-col px-2 text-center border-r border-slate-700/30">
          <span className="text-[9px] text-slate-400 font-sans uppercase">LATITUDE</span>
          <b className="font-bold text-sky-600 dark:text-cyan-300">{vessel.lat.toFixed(5)}°</b>
        </div>
        <div className="flex flex-col px-2 text-center border-r border-slate-700/30">
          <span className="text-[9px] text-slate-400 font-sans uppercase">LONGITUDE</span>
          <b className="font-bold text-sky-600 dark:text-cyan-300">{vessel.lng.toFixed(5)}°</b>
        </div>
        <div className="flex flex-col px-2 text-center border-r border-slate-700/30">
          <span className="text-[9px] text-slate-400 font-sans uppercase">SPEED</span>
          <b className="font-bold text-indigo-600 dark:text-indigo-300">{speedKmh} km/h <span className="text-[10px] text-slate-400 font-normal">({vessel.speedKnots} kts)</span></b>
        </div>
        <div className="flex flex-col px-2 text-center border-r border-slate-700/30">
          <span className="text-[9px] text-slate-400 font-sans uppercase">IMBL DIST</span>
          <b className="font-bold text-rose-600 dark:text-rose-400">{imblDist.km}</b>
        </div>
        <div className="flex flex-col px-2 text-center">
          <span className="text-[9px] text-slate-400 font-sans uppercase">SOURCE</span>
          <b className="font-bold text-emerald-600 dark:text-emerald-400">{vessel.source === 'ESP32_SERIAL' ? 'ESP32' : vessel.source === 'DEVICE_GPS' ? 'BROWSER' : 'SIMULATOR'}</b>
        </div>
      </div>

      {/* Actions & Overlays Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar min-w-0">
        {/* Full IMBL button */}
        <button
          id="fitImblTop"
          type="button"
          onClick={onViewFullIMBL}
          className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isLight
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-800/70'
          }`}
          title="Zoom to fit complete India–Sri Lanka IMBL boundary"
        >
          <span>⌁<span className="hidden sm:inline"> Full IMBL</span></span>
        </button>

        {/* Connect ESP32 button */}
        <button
          id="connectBtnTop"
          type="button"
          onClick={hardware.serialConnected ? onDisconnectSerial : onConnectSerial}
          className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            hardware.serialConnected
              ? isLight
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400 shadow-emerald-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
              : isLight
              ? 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white border border-sky-300 shadow-md shadow-sky-200 hover:scale-105'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
          }`}
          title={hardware.serialConnected ? 'Disconnect ESP32 Hardware' : 'Connect ESP32 via Web Serial'}
        >
          <span className={`w-2 h-2 rounded-full ${hardware.serialConnected ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
          <span className="hidden sm:inline">{hardware.serialConnected ? 'ESP32 Connected' : 'Connect ESP32'}</span><span className="sm:hidden">ESP32</span>
        </button>

        {/* Browser GPS on/off (switches the live source between simulator and device GPS) */}
        <button
          id="btn-browser-gps"
          type="button"
          onClick={onToggleBrowserGps}
          aria-pressed={isBrowserGps}
          className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border ${
            isBrowserGps
              ? isLight
                ? 'bg-sky-500 text-white border-sky-400 shadow-sky-200'
                : 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              : isLight
              ? 'bg-white hover:bg-sky-50 text-sky-700 border-sky-200'
              : 'bg-slate-800/70 hover:bg-slate-700 text-cyan-200 border-slate-700/60'
          }`}
          title={isBrowserGps ? 'Stop browser GPS and return to simulator' : 'Use this device\'s GPS as the live position'}
        >
          <Satellite className={`w-3.5 h-3.5 ${isBrowserGps ? 'animate-pulse' : ''}`} />
          <span className="hidden md:inline">{isBrowserGps ? 'Live GPS ON' : 'Live GPS'}</span>
        </button>

        {/* Go to GPS */}
        <button
          id="btn-go-to-gps"
          type="button"
          onClick={onGoToGPS}
          className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isLight
              ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
              : 'bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-800/70'
          }`}
          title="Center on active GPS"
        >
          <span>🎯 GPS</span>
        </button>

        {/* Focus Map Mode */}
        <button
          id="focusMap"
          type="button"
          onClick={onToggleMapFocus}
          className={`flex shrink-0 items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isMapFocus
              ? isLight
                ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-200'
                : 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
              : isLight
              ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              : 'bg-slate-800/70 hover:bg-slate-700 text-slate-300 border-slate-700/60'
          }`}
          title="Toggle Fullscreen Focus Map View"
        >
          {isMapFocus ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{isMapFocus ? 'Exit Focus' : 'Focus Map'}</span>
        </button>

        {/* Treaty Inspector */}
        <button
          type="button"
          onClick={onOpenTreatyInspector}
          className={`flex shrink-0 items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isLight
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="View Treaty Coordinates"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Treaty</span>
        </button>

        {/* Audio Mute toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`p-2 shrink-0 rounded-xl border transition-all cursor-pointer ${
            isMuted
              ? isLight
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-slate-800/50 text-slate-500 border-slate-800'
              : isLight
              ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
              : 'bg-amber-950/40 text-amber-300 border-amber-700/60'
          }`}
          title={isMuted ? 'Unmute Alarms' : 'Mute Alarms'}
          aria-label={isMuted ? 'Unmute Alarms' : 'Mute Alarms'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* LIGHT / DARK MODE TOGGLE (CANDY COLORS IN LIGHT MODE) */}
        <button
          id="btn-theme-toggle"
          type="button"
          onClick={onToggleTheme}
          className={`p-2 shrink-0 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-sm ${
            isLight
              ? 'bg-gradient-to-r from-amber-400 to-pink-400 text-white border-amber-300 shadow-amber-200/60 hover:scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700/70 hover:text-white'
          }`}
          title={isLight ? 'Switch to Dark Oceanic Mode' : 'Switch to Light Candy Mode'}
          aria-label="Toggle Light/Dark Theme"
        >
          {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Alert Badge */}
        <div className="shrink-0" role="status" aria-live="polite">
          {getAlertBadge()}
        </div>
      </div>
    </header>
  );
};
