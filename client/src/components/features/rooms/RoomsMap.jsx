import React, { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatListingTitle } from '../../../utils/listingDisplay';

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const createPriceIcon = (rent) => L.divIcon({
  className: '',
  html: `<div style="background:#e84040;color:white;border-radius:999px;padding:6px 10px;font-weight:800;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);white-space:nowrap">${money(rent)}</div>`,
});

const RoomsMap = ({ rooms = [] }) => {
  const mapRooms = useMemo(
    () => rooms.filter((room) => room.location?.coordinates?.length === 2),
    [rooms],
  );
  const mapCenter = mapRooms[0]
    ? [mapRooms[0].location.coordinates[1], mapRooms[0].location.coordinates[0]]
    : [28.6139, 77.2090];

  return (
    <div className="overflow-hidden rounded-3xl border border-light-border bg-light-card p-2 shadow-sm dark:border-dark-border dark:bg-dark-card">
      <MapContainer center={mapCenter} zoom={12} className="h-[70vh] w-full rounded-[1.25rem]">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
