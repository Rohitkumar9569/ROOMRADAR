import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_LAYERS = [
  {
    name: 'voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  {
    name: 'osm',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
];

const POI_QUERY_KEYS = [
  ['amenity', ['university', 'college', 'school', 'hospital', 'clinic', 'pharmacy', 'restaurant', 'cafe', 'bank', 'atm', 'fuel']],
  ['shop', ['supermarket', 'convenience', 'mall', 'general']],
  ['highway', ['bus_stop']],
  ['railway', ['station', 'halt']],
  ['public_transport', ['station', 'stop_position', 'platform']],
  ['tourism', ['hotel', 'guest_house']],
];

const getPoiCategory = (tags = {}) => {
  if (['university', 'college', 'school'].includes(tags.amenity)) return { label: 'College', color: '#2563eb' };
  if (['hospital', 'clinic', 'pharmacy'].includes(tags.amenity)) return { label: 'Health', color: '#dc2626' };
  if (['restaurant', 'cafe'].includes(tags.amenity)) return { label: 'Food', color: '#ea580c' };
  if (['bank', 'atm'].includes(tags.amenity)) return { label: 'Bank', color: '#0f766e' };
  if (tags.highway === 'bus_stop' || tags.railway || tags.public_transport) return { label: 'Transit', color: '#1a73e8' };
  if (tags.shop) return { label: 'Shop', color: '#1558d6' };
  if (tags.tourism) return { label: 'Stay', color: '#475569' };
  return { label: 'Nearby', color: '#334155' };
};

const buildPoiQuery = ([lat, lng], radius = 1400) => {
  const filters = POI_QUERY_KEYS.flatMap(([key, values]) => values.map((value) => (
    `node(around:${radius},${lat},${lng})["${key}"="${value}"]["name"];way(around:${radius},${lat},${lng})["${key}"="${value}"]["name"];`
  ))).join('');

  return `[out:json][timeout:9];(${filters});out center 28;`;
};

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceMeters = ([lat1, lng1], [lat2, lng2]) => {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatDistance = (meters) => (meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`);

const MapAutoCenter = ({ coordinates }) => {
  const map = useMap();

  useEffect(() => {
    if (!coordinates?.length) return undefined;

    const syncMap = () => {
      map.invalidateSize();
      map.setView(coordinates, 15, { animate: false });
    };

    syncMap();
    const timers = [120, 420, 900].map((delay) => window.setTimeout(syncMap, delay));
    return () => timers.forEach(window.clearTimeout);
  }, [coordinates, map]);

  return null;
};

const RoomLocationMap = ({ coordinates, title }) => {
  const [tileLayerIndex, setTileLayerIndex] = useState(0);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const activeTileLayer = TILE_LAYERS[tileLayerIndex] || TILE_LAYERS[0];

  const roomMarkerIcon = useMemo(() => L.divIcon({
    className: '',
    html: '<span style="display:block;width:22px;height:22px;border-radius:999px;background:#e84040;border:4px solid #ffffff;box-shadow:0 10px 24px rgba(15,23,42,.34),0 0 0 8px rgba(232,64,64,.18);"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }), []);

  useEffect(() => {
    if (!coordinates?.length) return undefined;

    const controller = new AbortController();
    const fetchNearbyPlaces = async () => {
      setNearbyLoading(true);
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: buildPoiQuery(coordinates),
          signal: controller.signal,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        });
        if (!response.ok) throw new Error('Nearby places unavailable');

        const payload = await response.json();
        const seen = new Set();
        const places = (payload.elements || [])
          .map((element) => {
            const lat = element.lat ?? element.center?.lat;
            const lng = element.lon ?? element.center?.lon;
            const name = element.tags?.name?.trim();
            if (!lat || !lng || !name) return null;

            const key = `${name.toLowerCase()}-${Number(lat).toFixed(4)}-${Number(lng).toFixed(4)}`;
            if (seen.has(key)) return null;
            seen.add(key);

            const category = getPoiCategory(element.tags);
            const distance = getDistanceMeters(coordinates, [Number(lat), Number(lng)]);
            return {
              id: `${element.type}-${element.id}`,
              name,
              position: [Number(lat), Number(lng)],
              distance,
              ...category,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);

        setNearbyPlaces(places);
      } catch (error) {
        if (error.name !== 'AbortError') setNearbyPlaces([]);
      } finally {
        if (!controller.signal.aborted) setNearbyLoading(false);
      }
    };

    fetchNearbyPlaces();
    return () => controller.abort();
  }, [coordinates]);

  const poiIcons = useMemo(() => {
    const cache = new Map();
    nearbyPlaces.forEach((place) => {
      if (cache.has(place.color)) return;
      cache.set(place.color, L.divIcon({
        className: '',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:${place.color};border:3px solid white;box-shadow:0 8px 18px rgba(15,23,42,.28);"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }));
    });
    return cache;
  }, [nearbyPlaces]);

  return (
    <div className="bg-white dark:bg-dark-card">
      <MapContainer
        center={coordinates}
        zoom={15}
        scrollWheelZoom={false}
        className="relative z-0 h-[20rem] w-full sm:h-96"
      >
        <MapAutoCenter coordinates={coordinates} />
        <TileLayer
          key={activeTileLayer.name}
          attribution={activeTileLayer.attribution}
          url={activeTileLayer.url}
          detectRetina
          eventHandlers={{
            tileerror: () => {
              if (tileLayerIndex < TILE_LAYERS.length - 1) setTileLayerIndex((index) => index + 1);
            },
          }}
        />
        {nearbyPlaces.map((place) => (
          <Marker key={place.id} position={place.position} icon={poiIcons.get(place.color)}>
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.label} - {formatDistance(place.distance)}
            </Popup>
          </Marker>
        ))}
        <Marker position={coordinates} icon={roomMarkerIcon}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>

      {(nearbyPlaces.length > 0 || nearbyLoading) && (
        <div className="grid grid-cols-2 gap-2 border-t border-light-border bg-white p-3 dark:border-dark-border dark:bg-dark-card">
          {nearbyLoading && nearbyPlaces.length === 0 ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-dark-input" />
            ))
          ) : nearbyPlaces.slice(0, 6).map((place) => (
            <div key={place.id} className="min-w-0 rounded-2xl border border-light-border bg-slate-50 p-2.5 dark:border-dark-border dark:bg-dark-input">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: place.color }} />
                <p className="truncate text-[11px] font-black text-light-text dark:text-dark-text">{place.name}</p>
              </div>
              <p className="mt-1 text-[10px] font-bold text-light-muted dark:text-dark-muted">
                {place.label} - {formatDistance(place.distance)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomLocationMap;
