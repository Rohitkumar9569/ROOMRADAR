import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatListingTitle } from '../../../utils/listingDisplay';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const createPriceIcon = (rent) => L.divIcon({
  className: '',
  html: `<div style="background:#e84040;color:white;border-radius:999px;padding:6px 10px;font-weight:800;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);white-space:nowrap">${money(rent)}</div>`,
});

const toBoundsPayload = (bounds) => ({
  minLat: bounds.getSouth(),
  maxLat: bounds.getNorth(),
  minLng: bounds.getWest(),
  maxLng: bounds.getEast(),
});

const MapBoundsReporter = ({ enabled, onBoundsChange }) => {
  const lastBoundsKeyRef = useRef('');
  const map = useMapEvents({
    moveend: () => {
      if (!enabled || !onBoundsChange) return;
      const payload = toBoundsPayload(map.getBounds());
      const boundsKey = Object.values(payload).map((value) => Number(value).toFixed(5)).join(':');
      if (boundsKey === lastBoundsKeyRef.current) return;
      lastBoundsKeyRef.current = boundsKey;
      onBoundsChange(payload);
    },
    zoomend: () => {
      if (!enabled || !onBoundsChange) return;
      const payload = toBoundsPayload(map.getBounds());
      const boundsKey = Object.values(payload).map((value) => Number(value).toFixed(5)).join(':');
      if (boundsKey === lastBoundsKeyRef.current) return;
      lastBoundsKeyRef.current = boundsKey;
      onBoundsChange(payload);
    },
  });

  useEffect(() => {
    if (!enabled || !onBoundsChange) return;
    const payload = toBoundsPayload(map.getBounds());
    const boundsKey = Object.values(payload).map((value) => Number(value).toFixed(5)).join(':');
    if (boundsKey === lastBoundsKeyRef.current) return;
    lastBoundsKeyRef.current = boundsKey;
    onBoundsChange(payload);
  }, [enabled, map, onBoundsChange]);

  return null;
};

const RoomsMap = ({ rooms = [], searchAsMove = false, onSearchAsMoveChange, onBoundsChange }) => {
  const mapRooms = useMemo(
    () => rooms.filter((room) => room.location?.coordinates?.length === 2),
    [rooms],
  );
  const mapCenter = mapRooms[0]
    ? [mapRooms[0].location.coordinates[1], mapRooms[0].location.coordinates[0]]
    : [28.6139, 77.2090];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-light-border bg-light-card p-2 shadow-sm dark:border-dark-border dark:bg-dark-card">
      <div className="absolute left-4 right-4 top-4 z-[450] flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/95 px-3 py-2 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-dark-border dark:bg-dark-card/95">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300">Map search</p>
          <p className="truncate text-xs font-bold text-slate-700 dark:text-secondary-200">Move or zoom the map to refresh rooms in this area.</p>
        </div>
        <button
          type="button"
          onClick={() => onSearchAsMoveChange?.(!searchAsMove)}
          className={`inline-flex min-h-9 items-center rounded-full px-3 text-xs font-black transition ${
            searchAsMove
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-dark-input dark:text-dark-text'
          }`}
        >
          {searchAsMove ? 'Searching map' : 'Search as I move'}
        </button>
      </div>
      <MapContainer center={mapCenter} zoom={12} className="h-[70vh] min-h-[420px] w-full rounded-[1.25rem]">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapBoundsReporter enabled={searchAsMove} onBoundsChange={onBoundsChange} />
        {mapRooms.map((room) => (
          <Marker
            key={room._id}
            position={[room.location.coordinates[1], room.location.coordinates[0]]}
            icon={createPriceIcon(room.rent)}
          >
            <Popup>
              <div className="w-48">
                <p className="font-bold">{formatListingTitle(room.title)}</p>
                <p>{money(room.rent)}/month</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default RoomsMap;
