import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RoomLocationMap = ({ coordinates, title }) => (
  <MapContainer center={coordinates} zoom={14} className="h-80 w-full">
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Marker position={coordinates}>
      <Popup>{title}</Popup>
    </Marker>
  </MapContainer>
);

export default RoomLocationMap;
