import React, { useEffect, useState } from 'react';
import { X, ExternalLink, MapPin, Compass, Search, Filter } from 'lucide-react';
import { ALL_TREATY_POINTS } from '../data/imblCoordinates';
import { TreatyPoint, LatLng, ThemeMode } from '../types';
import { haversineDistanceMeters, formatDistance } from '../utils/geodesic';

interface TreatyInspectorModalProps {
  theme?: ThemeMode;
  isOpen: boolean;
  onClose: () => void;
  vesselPos: LatLng;
  onSelectPoint: (point: TreatyPoint) => void;
}

export const TreatyInspectorModal: React.FC<TreatyInspectorModalProps> = ({
  theme = 'dark',
  isOpen,
  onClose,
  vesselPos,
  onSelectPoint,
}) => {
  const [filterSection, setFilterSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isLight = theme === 'light';

  // Close on Escape (hook must run before the early return below).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPoints = ALL_TREATY_POINTS.filter((pt) => {
    if (filterSection !== 'ALL' && pt.section !== filterSection) return false;
    if (
      searchQuery &&
      !pt.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !pt.dmsLat.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !pt.dmsLng.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !pt.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div
      id="treaty-inspector-modal"
      role="dialog"
      aria-modal="true"
      className="fx-fade-in fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`fx-pop-in w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
          isLight
            ? 'bg-white text-slate-800 border-sky-200'
            : 'bg-slate-900 text-slate-100 border-slate-700/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 sm:px-6 border-b flex items-center justify-between ${
          isLight ? 'bg-sky-50/70 border-sky-100' : 'bg-slate-950 border-slate-800'
        }`}>
          <div>
            <h2 className={`text-base sm:text-lg font-extrabold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className="text-rose-500">🔒</span> INDIA–SRI LANKA MARITIME BOUNDARY (IMBL)
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Official Treaty-Defined Geographic Positions (1974 &amp; 1976 Bilateral Agreements)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className={`p-3 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-100' : 'bg-slate-900/60 border-slate-800'
        }`}>
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station (e.g., Point 4, 13m, Kachchatheevu)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                isLight
                  ? 'bg-sky-50/60 border-sky-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400'
              }`}
            />
          </div>

          {/* Section Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
            {[
              { key: 'ALL', label: 'All Sectors' },
              { key: '1974_PALK_STRAIT', label: '1974 Palk Strait' },
              { key: '1976_GULF_OF_MANNAR', label: '1976 Gulf of Mannar' },
              { key: '1976_POINT_T', label: 'Point T' },
              { key: '1976_BAY_OF_BENGAL', label: 'Bay of Bengal' },
            ].map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => setFilterSection(sec.key)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterSection === sec.key
                    ? isLight
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-red-600 text-white'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Points Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPoints.map((pt) => {
              const distFromVessel = formatDistance(
                haversineDistanceMeters(vesselPos, { lat: pt.lat, lng: pt.lng })
              );

              return (
                <div
                  key={pt.id}
                  className={`p-3 rounded-2xl border transition-all hover:scale-[1.01] ${
                    isLight
                      ? 'bg-white border-sky-100 shadow-sm hover:border-sky-300'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-rose-500">{pt.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                          isLight ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {pt.section.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{pt.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectPoint(pt);
                        onClose();
                      }}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                        isLight
                          ? 'bg-sky-50 text-sky-600 hover:bg-sky-100 border-sky-200'
                          : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border-slate-700'
                      }`}
                      title="Fly to coordinate on map"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>

                  {/* DMS & Decimal Coordinates */}
                  <div className={`mt-2.5 p-2 rounded-xl border font-mono text-[11px] grid grid-cols-2 gap-2 ${
                    isLight ? 'bg-sky-50/40 border-sky-100' : 'bg-slate-900 border-slate-800/80'
                  }`}>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">LATITUDE</span>
                      <span className="font-bold">{pt.dmsLat}</span>
                      <span className="text-[10px] text-slate-400 block">({pt.lat.toFixed(6)}°)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">LONGITUDE</span>
                      <span className="font-bold">{pt.dmsLng}</span>
                      <span className="text-[10px] text-slate-400 block">({pt.lng.toFixed(6)}°)</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Range from Active Vessel:</span>
                    <span className="font-mono font-bold text-sky-600 dark:text-cyan-400">{distFromVessel.km}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className={`p-3 sm:px-6 border-t text-[11px] flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div>Showing {filteredPoints.length} treaty-defined reference points.</div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
