import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  TreatyPoint,
  LatLng,
  VesselState,
  GeofenceConfig,
  MapLayerConfig,
  AlertLevel,
  ThemeMode,
} from '../types';
import { FleetVessel } from '../data/coastalGuardFleet';
import {
  FULL_IMBL,
  IMBL_1976_BAY,
  ALL_TREATY_POINTS,
} from '../data/imblCoordinates';
import {
  interpolateTreatySequence,
} from '../utils/geodesic';

interface MaritimeMapProps {
  theme: ThemeMode;
  vessel: VesselState;
  geofence: GeofenceConfig;
  layerConfig: MapLayerConfig;
  alertLevel: AlertLevel;
  isMapFocus?: boolean;
  onUpdateVessel: (pos: LatLng) => void;
  onUpdateGeofenceVertex: (index: number, pos: LatLng) => void;
  onSetCustomGeofence: (newGeofence: GeofenceConfig) => void;
  onCreateCircleGeofenceAroundGPS: (radiusMeters: number) => void;
  onClearGeofence: () => void;
  onSelectTreatyPoint?: (point: TreatyPoint) => void;
  fleet?: FleetVessel[];
  onSelectFleetVessel?: (vessel: FleetVessel) => void;
  mapRefReceiver?: (instance: {
    fitFullIMBL: () => void;
    centerOnGPS: () => void;
    focusSector: (sector: 'palk' | 'gulf' | 'pointT' | 'bayOfBengal') => void;
    zoomToCoords: (lat: number, lng: number, zoom?: number) => void;
    invalidateSize: () => void;
    startDraw: (shape: 'polygon' | 'rectangle' | 'circle') => void;
    clearGeofence: () => void;
  }) => void;
}

const TILE_SERVERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  light_candy: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  ocean: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, GEBCO, NOAA, National Geographic',
    maxZoom: 16,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export const MaritimeMap: React.FC<MaritimeMapProps> = ({
  theme,
  vessel,
  geofence,
  layerConfig,
  alertLevel,
  isMapFocus,
  onUpdateVessel,
  onUpdateGeofenceVertex,
  onSetCustomGeofence,
  onCreateCircleGeofenceAroundGPS,
  onClearGeofence,
  onSelectTreatyPoint,
  fleet = [],
  onSelectFleetVessel,
  mapRefReceiver,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  // Layers and markers
  const imblFeatureGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const geofenceLayerRef = useRef<L.Polygon | L.Circle | null>(null);
  const geofenceMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const vesselMarkerRef = useRef<L.Marker | null>(null);
  const fleetLayerRef = useRef<L.LayerGroup | null>(null);
  const treatyMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const activeDrawHandlerRef = useRef<any>(null);
  const nativeDrawStateRef = useRef<any>(null);
  const drawPreviewRef = useRef<L.LayerGroup | null>(null);
  const gpsAccuracyCircleRef = useRef<L.Circle | null>(null);
  const gpsPulseRef = useRef<L.CircleMarker | null>(null);
  const gpsDotRef = useRef<L.CircleMarker | null>(null);
  const liveCenteredRef = useRef(false);
  const lastLiveSourceRef = useRef<VesselState['source'] | null>(null);
  const vesselSourceRef = useRef<VesselState['source']>(vessel.source);
  vesselSourceRef.current = vessel.source;

  const [activeDrawingShape, setActiveDrawingShape] = useState<'polygon' | 'rectangle' | 'circle' | null>(null);

  const isLight = theme === 'light';

  // Precompute densely interpolated great-circle paths for the entire boundary
  const fullImblPath = useRef<LatLng[]>(interpolateTreatySequence(FULL_IMBL));
  const bayOfBengalPath = useRef<LatLng[]>(interpolateTreatySequence(IMBL_1976_BAY));

  // Invalidate size when focus mode changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
  return () => clearTimeout(timer);
    }
  }, [isMapFocus]);

  // Coastal Guard fleet markers. The existing live vessel marker remains unchanged.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || fleet.length === 0) return;

    if (fleetLayerRef.current) map.removeLayer(fleetLayerRef.current);
    const group = L.layerGroup();
    fleetLayerRef.current = group;
    if (layerConfig.showFleet) group.addTo(map);
    const statusColor: Record<string, string> = {
      SAFE: '#22c55e', WARNING: '#facc15', CRITICAL: '#f97316', SOS: '#ef4444', OFFLINE: '#64748b'
    };

    fleet.forEach((item) => {
      const color = statusColor[item.status] || '#22c55e';
      const pulse = item.status === 'SOS' || item.status === 'CRITICAL';
      const icon = L.divIcon({
        className: 'safesea-fleet-marker',
        html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 5px ${color}33,0 0 18px ${color}aa;display:flex;align-items:center;justify-content:center;font-size:14px;${pulse ? 'animation:safeseaPulse 1.1s infinite;' : ''}">🚤</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker([item.lat, item.lng], { icon, title: `${item.boat} • ${item.status}` });
      marker.bindTooltip(`${item.boat} • ${item.fisherman}<br>${item.status}`, { direction: 'top', offset: [0, -12], opacity: 0.95 });
      marker.on('click', () => onSelectFleetVessel?.(item));
      marker.addTo(group);
    });

    return () => { map.removeLayer(group); };
  }, [fleet, onSelectFleetVessel, layerConfig.showFleet]);

  // Coastal Guard layer visibility controls.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = fleetLayerRef.current;
    if (!map || !group) return;
    if (layerConfig.showFleet) { if (!map.hasLayer(group)) group.addTo(map); }
    else if (map.hasLayer(group)) map.removeLayer(group);
  }, [layerConfig.showFleet]);

  // Trigger drawing of custom shape with a native Leaflet interaction.
  // This avoids Leaflet.Draw/global-L conflicts and keeps drawing reliable in Vite builds.
  const startDraw = useCallback((shape: 'polygon' | 'rectangle' | 'circle') => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const finish = nativeDrawStateRef.current?.finish;
    if (finish) finish(false);

    if (!drawPreviewRef.current) {
      drawPreviewRef.current = L.layerGroup().addTo(map);
    } else {
      drawPreviewRef.current.clearLayers();
    }

    setActiveDrawingShape(shape);
    map.doubleClickZoom.disable();
    map.dragging.disable();
    map.getContainer().style.cursor = 'crosshair';

    const strokeColor = isLight ? '#0284c7' : '#4f8cff';
    const shapeOptions = {
      color: strokeColor,
      weight: 3,
      opacity: 0.95,
      fillColor: strokeColor,
      fillOpacity: 0.16,
      dashArray: '7, 6',
    };

    const state: any = { shape, points: [], start: null, preview: null, finish: null };
    activeDrawHandlerRef.current = state;

    const cleanup = () => {
      map.off('click', state.onClick);
      map.off('dblclick', state.onDblClick);
      map.off('mousedown', state.onMouseDown);
      map.off('mousemove', state.onMouseMove);
      map.off('mouseup', state.onMouseUp);
      map.doubleClickZoom.enable();
      map.dragging.enable();
      map.getContainer().style.cursor = '';
      drawPreviewRef.current?.clearLayers();
      nativeDrawStateRef.current = null;
      activeDrawHandlerRef.current = null;
      setActiveDrawingShape(null);
    };

    const commitPolygon = (points: L.LatLng[]) => {
      if (points.length < 3) return;
      const clean = points.map((p) => ({ lat: p.lat, lng: p.lng }));
      onSetCustomGeofence({
        id: `geo-polygon-${Date.now()}`,
        name: 'Custom Safety Polygon',
        enabled: true,
        safeMode: 'INSIDE_SAFE',
        shapeType: 'polygon',
        points: clean,
        warningThresholdMeters: 500,
        criticalThresholdMeters: 250,
        rapidAlarmThresholdMeters: 100,
      });
      cleanup();
    };

    const commitRectangle = (bounds: L.LatLngBounds) => {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const nw = L.latLng(ne.lat, sw.lng);
      const se = L.latLng(sw.lat, ne.lng);
      onSetCustomGeofence({
        id: `geo-rectangle-${Date.now()}`,
        name: 'Custom Safety Rectangle',
        enabled: true,
        safeMode: 'INSIDE_SAFE',
        shapeType: 'rectangle',
        points: [
          { lat: nw.lat, lng: nw.lng },
          { lat: ne.lat, lng: ne.lng },
          { lat: se.lat, lng: se.lng },
          { lat: sw.lat, lng: sw.lng },
        ],
        warningThresholdMeters: 500,
        criticalThresholdMeters: 250,
        rapidAlarmThresholdMeters: 100,
      });
      cleanup();
    };

    const commitCircle = (center: L.LatLng, radius: number) => {
      if (radius < 5) return;
      const points: LatLng[] = [];
      const steps = 72;
      for (let i = 0; i < steps; i++) {
        const a = (2 * Math.PI * i) / steps;
        const dLat = (radius / 111320) * Math.cos(a);
        const dLng =
          ((radius / 111320) * Math.sin(a)) /
          Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
        points.push({ lat: center.lat + dLat, lng: center.lng + dLng });
      }
      onSetCustomGeofence({
        id: `geo-circle-${Date.now()}`,
        name: `Custom Circle (${Math.round(radius)}m)`,
        enabled: true,
        safeMode: 'INSIDE_SAFE',
        shapeType: 'circle',
        circleCenter: { lat: center.lat, lng: center.lng },
        circleRadiusMeters: radius,
        points,
        warningThresholdMeters: 500,
        criticalThresholdMeters: 250,
        rapidAlarmThresholdMeters: 100,
      });
      cleanup();
    };

    state.finish = (commit = true) => {
      if (commit) {
        if (shape === 'polygon') {
          commitPolygon(state.points);
        } else if (shape === 'rectangle' && state.preview instanceof L.Rectangle) {
          commitRectangle(state.preview.getBounds());
        } else if (shape === 'circle' && state.preview instanceof L.Circle && state.start) {
          commitCircle(state.start, state.preview.getRadius());
        }
      } else {
        cleanup();
      }
    };

    if (shape === 'polygon') {
      state.onClick = (e: L.LeafletMouseEvent) => {
        const point = e.latlng;
        const last = state.points[state.points.length - 1];
        if (last && map.distance(last, point) < 2) return;
        state.points.push(point);
        if (state.preview) drawPreviewRef.current?.removeLayer(state.preview);
        state.preview = L.polygon(state.points, shapeOptions);
        drawPreviewRef.current?.addLayer(state.preview);
      };
      state.onDblClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stop(e);
        if (state.points.length >= 3) state.finish(true);
      };
      map.on('click', state.onClick);
      map.on('dblclick', state.onDblClick);
    } else if (shape === 'rectangle') {
      state.onMouseDown = (e: L.LeafletMouseEvent) => {
        state.start = e.latlng;
        state.preview = L.rectangle(L.latLngBounds(state.start, state.start), shapeOptions);
        drawPreviewRef.current?.addLayer(state.preview);
        map.on('mousemove', state.onMouseMove);
        map.on('mouseup', state.onMouseUp);
      };
      state.onMouseMove = (e: L.LeafletMouseEvent) => {
        if (!state.start || !state.preview) return;
        state.preview.setBounds(L.latLngBounds(state.start, e.latlng));
      };
      state.onMouseUp = () => {
        map.off('mousemove', state.onMouseMove);
        map.off('mouseup', state.onMouseUp);
        if (state.preview?.getBounds().getNorthEast().equals(state.preview.getBounds().getSouthWest())) {
          state.finish(false);
        } else {
          state.finish(true);
        }
      };
      map.on('mousedown', state.onMouseDown);
    } else {
      state.onMouseDown = (e: L.LeafletMouseEvent) => {
        state.start = e.latlng;
        state.preview = L.circle(state.start, { ...shapeOptions, dashArray: '6, 5' });
        drawPreviewRef.current?.addLayer(state.preview);
        map.on('mousemove', state.onMouseMove);
        map.on('mouseup', state.onMouseUp);
      };
      state.onMouseMove = (e: L.LeafletMouseEvent) => {
        if (!state.start || !state.preview) return;
        state.preview.setRadius(map.distance(state.start, e.latlng));
      };
      state.onMouseUp = () => {
        map.off('mousemove', state.onMouseMove);
        map.off('mouseup', state.onMouseUp);
        if (state.preview?.getRadius() < 5) state.finish(false);
        else state.finish(true);
      };
      map.on('mousedown', state.onMouseDown);
    }

    nativeDrawStateRef.current = state;
  }, [isLight, onSetCustomGeofence]);

  // Esc cancels an in-progress drawing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nativeDrawStateRef.current?.finish?.(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    // Create Leaflet map
    const map = L.map(containerRef.current, {
      center: [8.5, 79.5],
      zoom: 7,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true,
    });

    // Add zoom control at bottom left
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Add scale bar in nautical miles & metric
    L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);

    // Initial Base Tile Layer
    const activeTileKey =
      layerConfig.tileProvider === 'dark' && isLight
        ? 'light_candy'
        : layerConfig.tileProvider;
    const tileConfig = TILE_SERVERS[activeTileKey] || TILE_SERVERS.dark;
    const baseTile = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);
    baseTileLayerRef.current = baseTile;

    // Layer groups
    const imblGroup = L.featureGroup().addTo(map);
    imblFeatureGroupRef.current = imblGroup;

    const treatyGroup = L.layerGroup().addTo(map);
    treatyMarkersGroupRef.current = treatyGroup;

    const geofenceMarkersGroup = L.layerGroup().addTo(map);
    geofenceMarkersGroupRef.current = geofenceMarkersGroup;

    const drawnItems = new L.FeatureGroup().addTo(map);
    drawnItemsRef.current = drawnItems;

    // Custom native drawing is used instead of Leaflet.Draw to avoid CDN/global-L conflicts.

    // Render IMBL treaty boundary
    renderIMBLLayers(imblGroup, treatyGroup);

    // Initial View: Automatically fit complete IMBL boundary
    if (imblGroup.getLayers().length > 0) {
      map.fitBounds(imblGroup.getBounds(), { padding: [40, 40] });
    }

    // Map click in Simulator mode allows positioning vessel
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Manual map positioning is only allowed in Simulator mode.
      // Browser/ESP32 GPS owns the vessel position completely.
      if (activeDrawHandlerRef.current) return;
      if (vesselSourceRef.current !== 'SIMULATOR') return;
      onUpdateVessel({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      nativeDrawStateRef.current?.finish?.(false);
      drawPreviewRef.current?.clearLayers();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Expose map operations to parent
  useEffect(() => {
    if (mapRefReceiver && mapInstanceRef.current && imblFeatureGroupRef.current) {
      mapRefReceiver({
        fitFullIMBL: () => {
          if (mapInstanceRef.current && imblFeatureGroupRef.current) {
            mapInstanceRef.current.fitBounds(imblFeatureGroupRef.current.getBounds(), {
              padding: [40, 40],
              maxZoom: 9,
            });
          }
        },
        centerOnGPS: () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([vessel.lat, vessel.lng], 12, { animate: true });
          }
        },
        focusSector: (sector: 'palk' | 'gulf' | 'pointT' | 'bayOfBengal') => {
          if (!mapInstanceRef.current) return;
          switch (sector) {
            case 'palk':
              mapInstanceRef.current.setView([9.5, 79.5], 9, { animate: true });
              break;
            case 'gulf':
              mapInstanceRef.current.setView([7.8, 78.8], 8, { animate: true });
              break;
            case 'pointT':
              mapInstanceRef.current.setView([4.784, 77.023], 10, { animate: true });
              break;
            case 'bayOfBengal':
              mapInstanceRef.current.setView([10.8, 81.5], 8, { animate: true });
              break;
          }
        },
        zoomToCoords: (lat: number, lng: number, zoom = 12) => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], zoom, { animate: true });
          }
        },
        invalidateSize: () => {
          mapInstanceRef.current?.invalidateSize();
        },
        startDraw: (shape: 'polygon' | 'rectangle' | 'circle') => {
          startDraw(shape);
        },
        clearGeofence: () => {
          drawnItemsRef.current?.clearLayers();
          onClearGeofence();
        },
      });
    }
  }, [mapRefReceiver, vessel.lat, vessel.lng, startDraw, onClearGeofence]);

  // Update Base Tile Layer when provider or theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const activeTileKey =
      layerConfig.tileProvider === 'dark' && isLight
        ? 'light_candy'
        : layerConfig.tileProvider;
    const tileConfig = TILE_SERVERS[activeTileKey] || TILE_SERVERS.dark;

    if (baseTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    }

    const newTile = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: 'abcd',
    }).addTo(mapInstanceRef.current);

    newTile.bringToBack();
    baseTileLayerRef.current = newTile;
  }, [layerConfig.tileProvider, isLight]);

  // Handle IMBL visibility toggle
  useEffect(() => {
    if (!mapInstanceRef.current || !imblFeatureGroupRef.current) return;
    if (layerConfig.showIMBL) {
      if (!mapInstanceRef.current.hasLayer(imblFeatureGroupRef.current)) {
        mapInstanceRef.current.addLayer(imblFeatureGroupRef.current);
      }
      if (treatyMarkersGroupRef.current && !mapInstanceRef.current.hasLayer(treatyMarkersGroupRef.current)) {
        mapInstanceRef.current.addLayer(treatyMarkersGroupRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(imblFeatureGroupRef.current)) {
        mapInstanceRef.current.removeLayer(imblFeatureGroupRef.current);
      }
      if (treatyMarkersGroupRef.current && mapInstanceRef.current.hasLayer(treatyMarkersGroupRef.current)) {
        mapInstanceRef.current.removeLayer(treatyMarkersGroupRef.current);
      }
    }
  }, [layerConfig.showIMBL]);

  // Re-render IMBL layers when theme changes
  useEffect(() => {
    if (imblFeatureGroupRef.current && treatyMarkersGroupRef.current) {
      renderIMBLLayers(imblFeatureGroupRef.current, treatyMarkersGroupRef.current);
    }
  }, [isLight]);

  // Build the complete IMBL lines and Treaty markers
  const renderIMBLLayers = (group: L.FeatureGroup, markersGroup: L.LayerGroup) => {
    group.clearLayers();
    markersGroup.clearLayers();

    const imblPopupHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 240px; color: #0f172a; padding: 2px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="font-size: 14px;">🔒</span>
          <strong style="font-size: 12px; color: #e11d48; letter-spacing: 0.5px;">
            INDIA–SRI LANKA MARITIME BOUNDARY
          </strong>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
          (IMBL REFERENCE — FIXED &amp; NON-EDITABLE)
        </div>
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 6px 8px; font-size: 10.5px; line-height: 1.4; color: #9f1239; margin-bottom: 6px;">
          <strong>Source:</strong> 1974 and 1976 India–Sri Lanka maritime boundary agreements.
        </div>
        <div style="font-size: 10px; color: #64748b; line-height: 1.3;">
          Arcs of great circles interpolated on WGS-84 geodesic sphere across Palk Strait, Gulf of Mannar, Point T, and Bay of Bengal.
        </div>
      </div>
    `;

    const glowColor = isLight ? '#ff3366' : '#ff4661';
    const coreColor = isLight ? '#f43f5e' : '#ff4661';

    // 1. MAIN TRUNK: Palk Strait -> Gulf of Mannar -> Point T
    const mainLatLngs = fullImblPath.current.map((p) => [p.lat, p.lng] as [number, number]);

    const mainGlow = L.polyline(mainLatLngs, {
      color: glowColor,
      weight: 12,
      opacity: isLight ? 0.35 : 0.3,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    });

    const mainDashed = L.polyline(mainLatLngs, {
      color: coreColor,
      weight: 5,
      opacity: 0.95,
      dashArray: '12, 9',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'imbl-line',
    });

    mainDashed.bindPopup(imblPopupHtml, { maxWidth: 300 });
    mainDashed.bindTooltip('🔒 FIXED IMBL (1974/1976 Reference)', {
      sticky: true,
      direction: 'top',
      className: 'imbl-tooltip',
    });

    group.addLayer(mainGlow);
    group.addLayer(mainDashed);

    // 2. BAY OF BENGAL BRANCH (Article II)
    const bayLatLngs = bayOfBengalPath.current.map((p) => [p.lat, p.lng] as [number, number]);

    const bayGlow = L.polyline(bayLatLngs, {
      color: glowColor,
      weight: 12,
      opacity: isLight ? 0.35 : 0.3,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    });

    const bayDashed = L.polyline(bayLatLngs, {
      color: coreColor,
      weight: 5,
      opacity: 0.95,
      dashArray: '12, 9',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'imbl-line',
    });

    bayDashed.bindPopup(imblPopupHtml, { maxWidth: 300 });
    bayDashed.bindTooltip('🔒 FIXED IMBL (Bay of Bengal Branch)', {
      sticky: true,
      direction: 'top',
      className: 'imbl-tooltip',
    });

    group.addLayer(bayGlow);
    group.addLayer(bayDashed);

    // 3. TREATY POINT MARKERS
    ALL_TREATY_POINTS.forEach((pt) => {
      const isKey =
        pt.name === 'Point 1' ||
        pt.name === 'Point 6' ||
        pt.name === 'Point 1m' ||
        pt.name === 'Point 13m' ||
        pt.name.includes('Point T') ||
        pt.name === 'Point 6b';

      const dotBg = isLight
        ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.9)]'
        : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]';

      const markerHtml = `
        <div class="group relative flex items-center justify-center">
          <div class="w-3.5 h-3.5 rounded-full ${dotBg} border-2 border-white cursor-pointer transition-transform hover:scale-125"></div>
          ${
            isKey
              ? `<span class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded ${
                  isLight
                    ? 'bg-white text-pink-700 border border-pink-200 shadow-sm'
                    : 'bg-slate-900/90 text-red-300 border border-red-800 shadow'
                } text-[9px] font-bold pointer-events-none">${pt.name}</span>`
              : ''
          }
        </div>
      `;

      const treatyIcon = L.divIcon({
        html: markerHtml,
        className: 'treaty-point-icon',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: treatyIcon });

      const pointPopup = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; color: #0f172a; padding: 2px;">
          <div style="font-size: 13px; font-weight: 700; color: #e11d48; display: flex; align-items: center; justify-content: space-between;">
            <span>${pt.name}</span>
            <span style="font-size: 10px; background: #ffe4e6; color: #be123c; padding: 1px 6px; border-radius: 4px; font-weight: 700;">Treaty Station</span>
          </div>
          <div style="margin-top: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; font-family: monospace; font-size: 11px;">
            <div><strong>Lat:</strong> ${pt.dmsLat} <span style="color:#64748b;">(${pt.lat.toFixed(6)}°)</span></div>
            <div><strong>Lng:</strong> ${pt.dmsLng} <span style="color:#64748b;">(${pt.lng.toFixed(6)}°)</span></div>
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #334155; line-height: 1.35;">
            ${pt.description}
          </div>
          <div style="margin-top: 6px; font-size: 9.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 4px;">
            Section: ${pt.section.replace(/_/g, ' ')}
          </div>
        </div>
      `;

      marker.bindPopup(pointPopup, { maxWidth: 280 });
      marker.on('click', () => {
        if (onSelectTreatyPoint) onSelectTreatyPoint(pt);
      });

      markersGroup.addLayer(marker);
    });
  };

  // Render or Update Custom User Geofence (Polygon, Rectangle, or Circle)
  useEffect(() => {
    if (!mapInstanceRef.current || !geofenceMarkersGroupRef.current) return;
    const map = mapInstanceRef.current;
    const markersGroup = geofenceMarkersGroupRef.current;

    // Clean up previous geofence layer
    if (geofenceLayerRef.current) {
      map.removeLayer(geofenceLayerRef.current);
      geofenceLayerRef.current = null;
    }
    markersGroup.clearLayers();

    if (!geofence.enabled || !layerConfig.showGeofence) return;

    // Determine colors
    let strokeColor = isLight ? '#0284c7' : '#4f8cff';
    let fillColor = isLight ? '#38bdf8' : '#4f8cff';

    if (alertLevel === 'RAPID_ALARM') {
      strokeColor = isLight ? '#f43f5e' : '#ff4d67';
      fillColor = strokeColor;
    } else if (alertLevel === 'CRITICAL') {
      strokeColor = isLight ? '#ea580c' : '#f97316';
      fillColor = strokeColor;
    } else if (alertLevel === 'WARNING') {
      strokeColor = isLight ? '#d97706' : '#ffd166';
      fillColor = strokeColor;
    }

    // 1. Circle Geofence Mode
    if (geofence.shapeType === 'circle' && geofence.circleCenter) {
      const radius = geofence.circleRadiusMeters || 300;
      const circle = L.circle([geofence.circleCenter.lat, geofence.circleCenter.lng], {
        radius: radius,
        color: strokeColor,
        weight: 3,
        opacity: 0.9,
        fillColor: fillColor,
        fillOpacity: 0.16,
      }).addTo(map);

      circle.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <strong style="color: #0284c7; font-size: 13px;">⭕ CUSTOM CIRCLE SAFETY GEOFENCE</strong>
          <p style="font-size: 11px; margin: 4px 0 0; color: #475569;">
            Radius: <strong>${Math.round(radius)} m</strong><br/>
            Mode: <strong>${geofence.safeMode === 'INSIDE_SAFE' ? 'Safe INSIDE' : 'Safe OUTSIDE'}</strong><br/>
            Alert Tiers: 500m (Warn) / 250m (Crit) / 100m (Rapid)
          </p>
        </div>
      `);

      geofenceLayerRef.current = circle;
      return;
    }

    // 2. Polygon or Rectangle Geofence Mode
    if (geofence.points.length < 3) return;

    const latLngs = geofence.points.map((p) => [p.lat, p.lng] as [number, number]);

    const polygon = L.polygon(latLngs, {
      color: strokeColor,
      weight: 3,
      opacity: 0.9,
      fillColor: fillColor,
      fillOpacity: 0.16,
      dashArray: '6, 6',
    }).addTo(map);

    polygon.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 2px;">
        <strong style="color: #0284c7; font-size: 13px;">${
          geofence.shapeType === 'rectangle' ? '▭ CUSTOM RECTANGLE ZONE' : '⬡ CUSTOM POLYGON ZONE'
        }</strong>
        <p style="font-size: 11px; margin: 4px 0 0; color: #475569;">
          Mode: <strong>${geofence.safeMode === 'INSIDE_SAFE' ? 'Safe INSIDE' : 'Safe OUTSIDE'}</strong><br/>
          Alert Tiers: 500m (Warn) / 250m (Crit) / 100m (Rapid)<br/>
          <em>Drag handles to edit shape vertices.</em>
        </p>
      </div>
    `);

    geofenceLayerRef.current = polygon;

    // Add draggable vertex handle markers
    geofence.points.forEach((p, idx) => {
      const handleColor = isLight
        ? 'bg-sky-500 shadow-sky-300'
        : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]';
      const handleHtml = `
        <div class="w-3.5 h-3.5 rounded-full ${handleColor} border-2 border-white cursor-move hover:scale-125 transition-transform flex items-center justify-center text-[9px] text-white font-bold">
        </div>
      `;

      const handleIcon = L.divIcon({
        html: handleHtml,
        className: 'geofence-handle-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const handleMarker = L.marker([p.lat, p.lng], {
        icon: handleIcon,
        draggable: true,
      });

      handleMarker.on('drag', (e: L.LeafletEvent) => {
        const target = e.target as L.Marker;
        const newPos = target.getLatLng();
        onUpdateGeofenceVertex(idx, { lat: newPos.lat, lng: newPos.lng });
      });

      handleMarker.bindTooltip(`Vertex #${idx + 1} (Drag to adjust)`, {
        direction: 'top',
        offset: [0, -8],
      });

      markersGroup.addLayer(handleMarker);
    });
  }, [geofence, alertLevel, isLight, onUpdateGeofenceVertex, layerConfig.showGeofence]);

  // Google-Maps-style live GPS indicator: translucent accuracy circle + pulsing blue dot.
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const isBrowserGPS = vessel.source === 'DEVICE_GPS';
    const isLive = isBrowserGPS || vessel.source === 'ESP32_SERIAL';
    const hasBrowserFix = isBrowserGPS && Number.isFinite(vessel.accuracyMeters);
    const position: L.LatLngExpression = [vessel.lat, vessel.lng];

    if (lastLiveSourceRef.current !== vessel.source) {
      liveCenteredRef.current = false;
      lastLiveSourceRef.current = vessel.source;
    }

    // Never display or center the old simulator coordinate while Browser GPS
    // is waiting for its first real location fix.
    if (isBrowserGPS && !hasBrowserFix) {
      if (gpsAccuracyCircleRef.current) map.removeLayer(gpsAccuracyCircleRef.current);
      if (gpsPulseRef.current) map.removeLayer(gpsPulseRef.current);
      if (gpsDotRef.current) map.removeLayer(gpsDotRef.current);
      gpsAccuracyCircleRef.current = null;
      gpsPulseRef.current = null;
      gpsDotRef.current = null;
      return;
    }

    if (!isLive) {
      if (gpsAccuracyCircleRef.current) map.removeLayer(gpsAccuracyCircleRef.current);
      if (gpsPulseRef.current) map.removeLayer(gpsPulseRef.current);
      if (gpsDotRef.current) map.removeLayer(gpsDotRef.current);
      gpsAccuracyCircleRef.current = null;
      gpsPulseRef.current = null;
      gpsDotRef.current = null;
      return;
    }

    const accuracy = Math.max(12, Math.min(vessel.accuracyMeters || 35, 500));

    if (!gpsAccuracyCircleRef.current) {
      gpsAccuracyCircleRef.current = L.circle(position, {
        radius: accuracy,
        color: '#38bdf8',
        weight: 1.5,
        opacity: 0.65,
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        interactive: false,
        className: 'gps-accuracy-circle',
      }).addTo(map);
    } else {
      gpsAccuracyCircleRef.current.setLatLng(position);
      gpsAccuracyCircleRef.current.setRadius(accuracy);
    }

    if (!gpsPulseRef.current) {
      gpsPulseRef.current = L.circleMarker(position, {
        radius: 16,
        color: '#38bdf8',
        weight: 2,
        opacity: 0.35,
        fillColor: '#38bdf8',
        fillOpacity: 0.08,
        interactive: false,
        className: 'gps-pulse-ring',
      }).addTo(map);
    } else {
      gpsPulseRef.current.setLatLng(position);
    }

    if (!gpsDotRef.current) {
      gpsDotRef.current = L.circleMarker(position, {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillColor: '#1683ff',
        fillOpacity: 1,
        interactive: true,
        className: 'gps-live-dot',
      }).addTo(map);
      gpsDotRef.current.bindTooltip(
        `LIVE GPS • ${vessel.lat.toFixed(6)}°, ${vessel.lng.toFixed(6)}°`,
        { direction: 'top', offset: [0, -10], className: 'gps-live-tooltip' }
      );
    } else {
      gpsDotRef.current.setLatLng(position);
      gpsDotRef.current.setTooltipContent(
        `LIVE GPS • ${vessel.lat.toFixed(6)}°, ${vessel.lng.toFixed(6)}°`
      );
    }

    // Browser GPS: center on the first real fix, then follow actual movement.
    // Do not let map clicks overwrite the GPS position.
    if (isBrowserGPS && Number.isFinite(vessel.lat) && Number.isFinite(vessel.lng)) {
      if (!liveCenteredRef.current) {
        map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
        liveCenteredRef.current = true;
      } else if (!activeDrawHandlerRef.current) {
        map.panTo(position, { animate: true, duration: 0.35, noMoveStart: true });
      }
    } else if (!liveCenteredRef.current && Number.isFinite(vessel.lat) && Number.isFinite(vessel.lng)) {
      map.setView(position, Math.max(map.getZoom(), 13), { animate: true });
      liveCenteredRef.current = true;
    }
  }, [vessel.lat, vessel.lng, vessel.accuracyMeters, vessel.source]);

  // Render and Animate Active GPS Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Real GPS positions are rendered by the Google-Maps-style accuracy circle/dot above.
    // Hide the simulator arrow marker for live sources so there is only one unambiguous location.
    if (vessel.source === 'DEVICE_GPS' || vessel.source === 'ESP32_SERIAL') {
      if (vesselMarkerRef.current) {
        map.removeLayer(vesselMarkerRef.current);
        vesselMarkerRef.current = null;
      }
      return;
    }

    const headingDeg = vessel.heading || 0;
    const pulseBg = isLight
      ? 'bg-cyan-500/35 ring-cyan-400'
      : 'bg-cyan-500/25 ring-cyan-400/50';
    const arrowColor = isLight ? 'text-cyan-600' : 'text-cyan-300';
    const vesselBoxBg = isLight
      ? 'bg-white border-cyan-400 shadow-md shadow-cyan-200'
      : 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.9)]';

    const vesselHtml = `
      <div class="relative flex items-center justify-center pointer-events-auto cursor-pointer group">
        <!-- Outer Glowing Pulse Ring -->
        <div class="absolute w-11 h-11 -top-5.5 -left-5.5 rounded-full ${pulseBg} animate-ping pointer-events-none"></div>
        <div class="absolute w-7 h-7 -top-3.5 -left-3.5 rounded-full ${pulseBg} ring-2 pointer-events-none"></div>
        
        <!-- Rotating Vessel Icon with Direction Heading Arrow -->
        <div style="transform: rotate(${headingDeg}deg);" class="w-7 h-7 rounded-full ${vesselBoxBg} border-2 flex items-center justify-center transition-transform duration-200">
          <svg viewBox="0 0 24 24" class="w-4 h-4 ${arrowColor}" fill="currentColor">
            <polygon points="12,2 20,20 12,16 4,20" />
          </svg>
        </div>

        <!-- Tooltip Label -->
        <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded ${
          isLight
            ? 'bg-white text-sky-700 border border-sky-200 shadow-sm'
            : 'bg-slate-950/90 text-cyan-300 border border-cyan-700/80 shadow'
        } text-[9.5px] font-mono font-bold pointer-events-none">
          🚢 SIM VESSEL (${(vessel.speedKnots * 1.852).toFixed(1)} km/h)
        </div>
      </div>
    `;

    const vesselIcon = L.divIcon({
      html: vesselHtml,
      className: 'vessel-gps-icon',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    if (!vesselMarkerRef.current) {
      const marker = L.marker([vessel.lat, vessel.lng], {
        icon: vesselIcon,
        draggable: vessel.source === 'SIMULATOR',
      }).addTo(map);

      marker.on('dragend', (e: L.LeafletEvent) => {
        const target = e.target as L.Marker;
        const newPos = target.getLatLng();
        onUpdateVessel({ lat: newPos.lat, lng: newPos.lng });
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <strong style="color: #0284c7; font-size: 13px;">🔵 ACTIVE GPS POSITION</strong>
          <div style="margin-top: 4px; font-size: 11px; font-family: monospace;">
            Source: ${vessel.source}<br/>
            Speed: ${(vessel.speedKnots * 1.852).toFixed(1)} km/h (${vessel.speedKnots} kts)<br/>
            Course: ${Math.round(vessel.heading)}°<br/>
            Lat: ${vessel.lat.toFixed(6)}° | Lng: ${vessel.lng.toFixed(6)}°
          </div>
        </div>
      `);

      vesselMarkerRef.current = marker;
    } else {
      vesselMarkerRef.current.setLatLng([vessel.lat, vessel.lng]);
      vesselMarkerRef.current.setIcon(vesselIcon);
      if (vessel.source === 'SIMULATOR') {
        vesselMarkerRef.current.dragging?.enable();
      } else {
        vesselMarkerRef.current.dragging?.disable();
      }
    }
  }, [
    vessel.lat,
    vessel.lng,
    vessel.heading,
    vessel.speedKnots,
    vessel.source,
    isLight,
    onUpdateVessel,
  ]);

  return (
    <div className="relative w-full h-full">
      {/* On-Map Floating Custom Shapes Toolbar */}
      <div
        id="map-custom-shapes-toolbar"
        className={`absolute top-4 right-4 z-[950] flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${
          isLight
            ? 'bg-white/95 border-sky-200 shadow-sky-200/50 text-slate-800'
            : 'bg-[#04111e]/90 border-slate-800 text-slate-200 shadow-2xl'
        }`}
      >
        <div className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-r border-slate-700/30 flex items-center gap-1">
          <span>📐 Shapes</span>
        </div>

        {/* Draw Polygon */}
        <button
          id="btn-draw-polygon"
          type="button"
          onClick={() => startDraw('polygon')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeDrawingShape === 'polygon'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-300 animate-pulse'
              : isLight
              ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
              : 'bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-800/80'
          }`}
          title="Click points on map to draw a custom polygon geofence"
        >
          <span>⬡ Polygon</span>
        </button>

        {/* Draw Rectangle */}
        <button
          id="btn-draw-rectangle"
          type="button"
          onClick={() => startDraw('rectangle')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeDrawingShape === 'rectangle'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-300 animate-pulse'
              : isLight
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/80'
          }`}
          title="Click and drag to draw a safety rectangle or corridor"
        >
          <span>▭ Rectangle</span>
        </button>

        {/* Draw Circle */}
        <button
          id="btn-draw-circle"
          type="button"
          onClick={() => startDraw('circle')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeDrawingShape === 'circle'
              ? 'bg-pink-500 text-white shadow-md shadow-pink-300 animate-pulse'
              : isLight
              ? 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'
              : 'bg-pink-950/60 hover:bg-pink-900/80 text-pink-300 border border-pink-800/80'
          }`}
          title="Click center and drag radius to draw a circular geofence"
        >
          <span>⭕ Circle</span>
        </button>

        {/* 300m at GPS */}
        <button
          id="btn-draw-300m"
          type="button"
          onClick={() => onCreateCircleGeofenceAroundGPS(300)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isLight
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80'
          }`}
          title="Create instant 300 m radius circular buffer centered on active GPS vessel"
        >
          <span>🎯 300m GPS</span>
        </button>

        {/* Finish polygon (touch friendly alternative to double-click) */}
        {activeDrawingShape === 'polygon' && (
          <button
            id="btn-finish-polygon"
            type="button"
            onClick={() => nativeDrawStateRef.current?.finish?.(true)}
            className="fx-pop-in flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white border border-emerald-300 shadow-md shadow-emerald-300/40"
            title="Finish polygon (needs at least 3 points)"
          >
            <span>✓ Finish</span>
          </button>
        )}

        {/* Cancel drawing */}
        {activeDrawingShape && (
          <button
            id="btn-cancel-draw"
            type="button"
            onClick={() => nativeDrawStateRef.current?.finish?.(false)}
            className={`fx-pop-in flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
            }`}
            title="Cancel drawing (Esc)"
          >
            <span>⎋ Cancel</span>
          </button>
        )}

        {/* Clear */}
        {geofence.enabled && (
          <button
            id="btn-clear-geofence-map"
            type="button"
            onClick={() => {
              drawnItemsRef.current?.clearLayers();
              onClearGeofence();
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80'
            }`}
            title="Clear current custom geofence"
          >
            <span>✕ Clear</span>
          </button>
        )}
      </div>

      {activeDrawingShape && (
        <div
          className={`fx-slide-down absolute top-[4.75rem] left-1/2 -translate-x-1/2 z-[960] px-3 py-1.5 rounded-full border backdrop-blur-xl text-[10px] font-bold shadow-lg pointer-events-none ${
            isLight ? 'bg-white/95 border-sky-300 text-sky-700' : 'bg-[#04111e]/95 border-cyan-500/40 text-cyan-300'
          }`}
        >
          {activeDrawingShape === 'polygon' && 'Click to add points • double-click or ✓ Finish to complete • Esc to cancel'}
          {activeDrawingShape === 'rectangle' && 'Click and drag to draw the rectangle • Esc to cancel'}
          {activeDrawingShape === 'circle' && 'Click the centre and drag to set the radius • Esc to cancel'}
        </div>
      )}

      <div
        id="maritime-leaflet-map"
        ref={containerRef}
        className={`w-full h-full z-0 transition-colors duration-300 ${
          isLight ? 'bg-sky-100' : 'bg-slate-950'
        }`}
      />
    </div>
  );
};
