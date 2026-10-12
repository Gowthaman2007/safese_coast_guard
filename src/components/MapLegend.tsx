import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeMode } from '../types';

interface MapLegendProps {
  theme?: ThemeMode;
}

export const MapLegend: React.FC<MapLegendProps> = ({ theme = 'dark' }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isLight = theme === 'light';

  return (
    <div
      id="map-legend-container"
      className={`absolute bottom-6 right-4 z-[990] w-72 sm:w-80 rounded-2xl backdrop-blur-xl border shadow-2xl text-xs overflow-hidden transition-all duration-300 ${
        isLight
          ? 'bg-white/92 border-sky-200 text-slate-800 shadow-sky-200/50'
          : 'bg-[#04111e]/90 border-slate-800 text-slate-200 shadow-2xl'
      }`}
    >
      <div
        id="map-legend-header"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen((v) => !v); } }}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b cursor-pointer transition-colors select-none ${
          isLight
            ? 'bg-sky-50/80 border-sky-100 hover:bg-sky-100 text-slate-800'
            : 'bg-[#061628]/80 border-slate-800 hover:bg-[#081d33] text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 font-bold tracking-wide uppercase text-[11px]">
          <Layers className="w-3.5 h-3.5 text-rose-500" />
          <span>Maritime Boundary Legend</span>
        </div>
        <motion.span animate={{ rotate: isOpen ? 0 : 180 }} transition={{ duration: 0.25 }} className={`inline-flex ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div id="map-legend-content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeInOut' }} className="overflow-hidden"><div className="p-3.5 space-y-3 font-sans">
          {/* Boundary Reference */}
          <div className={`space-y-1.5 border-b pb-2.5 ${isLight ? 'border-sky-100' : 'border-slate-800'}`}>
            <div className={`text-[10px] font-bold tracking-wider uppercase ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
              Treaty Layers
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-0 border-t-2 border-dashed border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <div>
                <div className="font-bold text-rose-500 text-[11px] leading-tight">
                  🔴 Red dashed line
                </div>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  INDIA–SRI LANKA MARITIME BOUNDARY (FIXED)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <div className="w-6 h-0 border-t-2 border-sky-500" />
              <div>
                <div className="font-bold text-sky-500 text-[11px] leading-tight">
                  🔵 Blue line
                </div>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  CUSTOM GEOFENCE (EDITABLE)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <div className="w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-cyan-500/30 animate-pulse ml-1.5" />
              <div className="ml-1.5">
                <div className="font-bold text-cyan-600 dark:text-cyan-400 text-[11px] leading-tight">
                  🔵 Glowing marker
                </div>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  ACTIVE GPS LOCATION
                </div>
              </div>
            </div>
          </div>

          {/* Alarm Proximity Tiers */}
          <div className="space-y-1.5">
            <div className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              <span>Geofence Alert Tiers</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold">🟢 SAFE</span>
              </div>

              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-yellow-950/40 border-yellow-800/40 text-yellow-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="font-bold">🟡 500m WARN</span>
              </div>

              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
                isLight ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-orange-950/40 border-orange-800/40 text-orange-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="font-bold">🟠 250m CRIT</span>
              </div>

              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
                isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-red-950/40 border-red-800/40 text-red-300'
              }`}>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold">🔴 100m ALARM</span>
              </div>
            </div>
          </div>

          {/* Quick Notice */}
          <div className={`text-[9.5px] leading-tight p-2 rounded-xl border ${
            isLight ? 'bg-sky-50/60 border-sky-100 text-slate-600' : 'bg-[#020b14]/80 border-slate-800 text-slate-400'
          }`}>
            🔒 IMBL line geometry is fixed and treaty-enforced. Custom geofences and alarms operate independently.
          </div>
        </div></motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
