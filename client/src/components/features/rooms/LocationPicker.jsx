import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { throttle } from 'lodash';
import 'leaflet/dist/leaflet.css';



// --- API Service Functions ---

const getAddressFromCoordinates = async (lat, lng) => {
  try {
    // Calling your backend proxy for Geoapify reverse geocoding
    const response = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();

    // Handling Geoapify's specific response structure
    const address = data.features?.[0]?.properties?.formatted || "Address not found";

    return {
      fullAddress: address,
      rawData: data.features?.[0]?.properties
    };
  } catch (error) {
    console.error("Error fetching address:", error);
    return {
      fullAddress: "Could not fetch address",
      rawData: null
    };
  }
};

const getCoordinatesFromAddress = async (query) => {
  try {
    // Calling your backend proxy for Geoapify autocomplete/search
    const response = await fetch(`/api/geocode/autocomplete?text=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();

    // Handling Geoapify's specific response structure
    const firstResult = data.features?.[0]?.properties;
    if (firstResult) {
      return { lat: firstResult.lat, lng: firstResult.lon };
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};


// --- Default Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- HELPER COMPONENTS ---

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 20 && center[1] !== 0) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 7,
      });
    }
  }, [center, zoom, map]);
  return null;
}

function MapControls({ onSearch, userInitialLocation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const map = useMap();

  const handleSearch = async () => {
    if (!searchQuery) return;
    toast.loading('Searching location...');
    const coords = await getCoordinatesFromAddress(searchQuery);
    toast.dismiss();
    if (coords) {
      onSearch(coords);
    } else {
      toast.error('Location not found.');
    }
  };

  const handleRecenter = () => {
    if (userInitialLocation) {
      map.flyTo(userInitialLocation, 17, { animate: true, duration: 1.5 });
      toast.success("Recentering to your location!");
    } else {
      toast.error("Your location is not available.");
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
      <div className="flex bg-white rounded-xl shadow-lg">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search a place..."
          className="form-input !w-56 !rounded-r-none !border-r-0 !py-3"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
        />
        <button
          type="button"
          onClick={handleSearch}
          className="px-5 font-bold text-white transition-colors bg-indigo-600 rounded-r-xl hover:bg-indigo-700"
        >
          Search
        </button>
      </div>
      {userInitialLocation && (
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Map"
          className="flex items-center justify-center w-12 h-12 transition-colors bg-white border-2 border-gray-200 rounded-full shadow-lg cursor-pointer hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
        </button>
      )}
    </div>
  );
}

function MapInteractionHandler({ onCenterChange }) {
  const map = useMap();
  const throttledMoveHandler = useMemo(() => throttle(() => {
    const center = map.getCenter();
    onCenterChange(center);
  }, 800), [map, onCenterChange]);

  useEffect(() => {
    map.on('move', throttledMoveHandler);
    map.on('moveend', throttledMoveHandler);
    return () => {
      map.off('move', throttledMoveHandler);
      map.off('moveend', throttledMoveHandler);
    };
  }, [map, throttledMoveHandler]);
  return null;
}

// --- MAIN LOCATION PICKER COMPONENT ---
function LocationPicker({ onLocationChange }) {
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [locationDetails, setLocationDetails] = useState(null);
  const [userInitialLocation, setUserInitialLocation] = useState(null);
  const effectRan = useRef(false);

  const handleCenterChange = useCallback(async (center) => {
    const details = await getAddressFromCoordinates(center.lat, center.lng);
    setLocationDetails(details);
    onLocationChange({ ...center, ...details });
  }, [onLocationChange]);

  useEffect(() => {
    if (effectRan.current === false) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userPos = [latitude, longitude];
          setUserInitialLocation(userPos);
          setMapCenter(userPos);
          handleCenterChange({ lat: latitude, lng: longitude });
          toast.success("Location detected!");
        },
        () => {
          toast.error("Could not get location. Flying to a default location.");
          const defaultIndianLocation = [20.5937, 78.9629];
          setMapCenter(defaultIndianLocation);
          handleCenterChange({ lat: defaultIndianLocation[0], lng: defaultIndianLocation[1] });
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    }

    return () => {
      effectRan.current = true;
    };
  }, [handleCenterChange]);

  const handleSearch = useCallback((coords) => {
    setMapCenter([coords.lat, coords.lng]);
    handleCenterChange(coords);
  }, [handleCenterChange]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-xl">
      <MapContainer
        center={mapCenter}
        zoom={2}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapInteractionHandler onCenterChange={handleCenterChange} />
        <MapControls onSearch={handleSearch} userInitialLocation={userInitialLocation} />
        <ChangeView center={mapCenter} zoom={17} />
      </MapContainer>

      {/* --- Overlays --- */}
      <div className="center-marker-container absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]">

        {/*  Premium SVG Marker  */}
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="premium-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8A2BE2', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="8" stroke="url(#premium-gradient)" />
          <circle className="breathing-dot" cx="12" cy="12" r="3" stroke="url(#premium-gradient)" fill="url(#premium-gradient)" fillOpacity="0.3" />
          <line x1="12" y1="2" x2="12" y2="6" stroke="url(#premium-gradient)" />
          <line x1="12" y1="18" x2="12" y2="22" stroke="url(#premium-gradient)" />
          <line x1="2" y1="12" x2="6" y2="12" stroke="url(#premium-gradient)" />
          <line x1="18" y1="12" x2="22" y2="12" stroke="url(#premium-gradient)" />
        </svg>

      </div>
      <div className="absolute z-[1000] bottom-5 left-1/2 -translate-x-1/2 max-w-[80%] rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-gray-800 shadow-2xl">
        {locationDetails ? locationDetails.fullAddress : 'Detecting your location...'}
      </div>
    </div>
  );
}

export default LocationPicker;