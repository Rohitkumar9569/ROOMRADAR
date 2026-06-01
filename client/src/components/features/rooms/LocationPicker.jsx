import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { throttle } from 'lodash';
import 'leaflet/dist/leaflet.css';
import api from '../../../api';



// --- API Service Functions ---

const getAddressFromCoordinates = async (lat, lng) => {
  try {
    // Calling your backend proxy for Geoapify reverse geocoding
    const { data } = await api.get(`/geocode/reverse?lat=${lat}&lon=${lng}`);

    // Handling Geoapify's specific response structure
    const address = data.features?.[0]?.properties?.formatted || "Address not found";

    return {
      fullAddress: address,
      rawData: data.features?.[0]?.properties
    };
  } catch (error) {
    return {
      fullAddress: "Could not fetch address",
      rawData: null
    };
  }
};

const getCoordinatesFromAddress = async (query) => {
  try {
    // Calling your backend proxy for Geoapify autocomplete/search
    const { data } = await api.get(`/geocode/autocomplete?text=${encodeURIComponent(query)}`);

    // Handling Geoapify's specific response structure
    const firstResult = data.features?.[0]?.properties;
    if (firstResult) {
      return { lat: firstResult.lat, lng: firstResult.lon };
    }
    return null;
  } catch (error) {
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

const DEFAULT_INDIAN_LOCATION = [20.5937, 78.9629];
const DEFAULT_LOCATION_DETAILS = {
  fullAddress: 'Search or move the map to choose the exact location.',
  rawData: null,
};

const normalizeLocation = (location) => {
  if (!location) return null;
  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    fullAddress: location.fullAddress || location.address || '',
  };
};

const getGeolocationPermissionState = async () => {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch (error) {
    return 'unknown';
  }
};

const getGeolocationErrorMessage = (error) => {
  if (error?.code === 1) {
    return 'Location permission is blocked. Enable it in browser site settings or search manually.';
  }
  if (error?.code === 2) {
    return 'Current location is unavailable. Search or move the map manually.';
  }
  return 'Location request timed out. Search or move the map manually.';
};

// --- HELPER COMPONENTS ---

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(center) && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 0.9,
      });
    }
  }, [center, zoom, map]);
  return null;
}

function MapControls({ locating, onSearch, onUseCurrentLocation, userInitialLocation }) {
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
      map.flyTo(userInitialLocation, 17, { animate: true, duration: 0.9 });
      toast.success("Recentering to your location!");
    } else {
      onUseCurrentLocation?.();
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
      <div className="flex rounded-2xl border border-light-border bg-light-card shadow-xl dark:border-dark-border dark:bg-dark-card">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search a place..."
          className="form-input !w-56 !rounded-r-none !border-r-0 !border-light-border !bg-transparent !py-3 !text-light-text placeholder:!text-light-muted dark:!border-dark-border dark:!text-dark-text dark:placeholder:!text-dark-muted"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-r-2xl bg-cyan-500 px-5 font-bold text-white transition-colors hover:bg-cyan-600"
        >
          Search
        </button>
      </div>
      <button
        type="button"
        onClick={handleRecenter}
        disabled={locating}
        title={userInitialLocation ? 'Recenter map' : 'Use current location'}
        className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 border-light-border bg-light-card shadow-lg transition-colors hover:bg-light-bg disabled:cursor-wait disabled:opacity-70 dark:border-dark-border dark:bg-dark-card dark:hover:bg-dark-input"
      >
        <svg className={`text-light-text dark:text-dark-text ${locating ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
      </button>
    </div>
  );
}

function MapInteractionHandler({ onCenterChange }) {
  const map = useMap();
  const throttledMoveHandler = useMemo(() => throttle(() => {
    try {
      const container = map.getContainer?.();
      if (!container?.isConnected) return;

      const center = map.getCenter();
      if (Number.isFinite(center?.lat) && Number.isFinite(center?.lng)) {
        onCenterChange(center);
      }
    } catch (error) {
      // Leaflet can fire a trailing move callback after the map unmounts.
    }
  }, 800), [map, onCenterChange]);

  useEffect(() => {
    map.on('dragend', throttledMoveHandler);
    return () => {
      map.off('dragend', throttledMoveHandler);
      throttledMoveHandler.cancel?.();
    };
  }, [map, throttledMoveHandler]);
  return null;
}

// --- MAIN LOCATION PICKER COMPONENT ---
function LocationPicker({ onLocationChange, selectedLocation }) {
  const normalizedSelectedLocation = useMemo(() => normalizeLocation(selectedLocation), [selectedLocation]);
  const [mapCenter, setMapCenter] = useState(() => (
    normalizedSelectedLocation
      ? [normalizedSelectedLocation.lat, normalizedSelectedLocation.lng]
      : DEFAULT_INDIAN_LOCATION
  ));
  const [mapZoom, setMapZoom] = useState(() => (normalizedSelectedLocation ? 17 : 5));
  const [locationDetails, setLocationDetails] = useState(() => (
    normalizedSelectedLocation
      ? { fullAddress: normalizedSelectedLocation.fullAddress || 'Saved map location', rawData: null }
      : DEFAULT_LOCATION_DETAILS
  ));
  const [userInitialLocation, setUserInitialLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const mountedRef = useRef(true);

  const handleCenterChange = useCallback(async (center) => {
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)) return;
    const details = await getAddressFromCoordinates(center.lat, center.lng);
    if (!mountedRef.current) return;
    setLocationDetails(details);
    onLocationChange({ ...center, ...details });
  }, [onLocationChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!normalizedSelectedLocation) return;
    setMapCenter([normalizedSelectedLocation.lat, normalizedSelectedLocation.lng]);
    setMapZoom(17);
    setLocationDetails({
      fullAddress: normalizedSelectedLocation.fullAddress || 'Saved map location',
      rawData: null,
    });
  }, [normalizedSelectedLocation]);

  const requestCurrentLocation = useCallback(({ silent = false } = {}) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (!silent) toast.error('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const { latitude, longitude } = position.coords;
        const userPos = [latitude, longitude];
        setUserInitialLocation(userPos);
        setMapCenter(userPos);
        setMapZoom(17);
        handleCenterChange({ lat: latitude, lng: longitude });
        if (!silent) toast.success('Location detected.');
        setLocating(false);
      },
      (error) => {
        if (!mountedRef.current) return;
        setLocationDetails((current) => current || DEFAULT_LOCATION_DETAILS);
        if (!silent) toast.error(getGeolocationErrorMessage(error), { id: 'room-location-permission' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  }, [handleCenterChange]);

  useEffect(() => {
    let cancelled = false;

    const maybeUseGrantedLocation = async () => {
      if (normalizedSelectedLocation || typeof navigator === 'undefined' || !navigator.geolocation) return;
      const permissionState = await getGeolocationPermissionState();
      if (cancelled || !mountedRef.current) return;
      if (permissionState === 'granted') {
        requestCurrentLocation({ silent: true });
      } else {
        setMapCenter(DEFAULT_INDIAN_LOCATION);
        setMapZoom(5);
        setLocationDetails(DEFAULT_LOCATION_DETAILS);
      }
    };

    maybeUseGrantedLocation();
    return () => {
      cancelled = true;
    };
  }, [normalizedSelectedLocation, requestCurrentLocation]);

  const handleSearch = useCallback((coords) => {
    setMapCenter([coords.lat, coords.lng]);
    setMapZoom(17);
    handleCenterChange(coords);
  }, [handleCenterChange]);

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-xl">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <MapInteractionHandler onCenterChange={handleCenterChange} />
        <MapControls
          locating={locating}
          onSearch={handleSearch}
          onUseCurrentLocation={requestCurrentLocation}
          userInitialLocation={userInitialLocation}
        />
        <ChangeView center={mapCenter} zoom={mapZoom} />
      </MapContainer>

      {/* --- Overlays --- */}
      <div className="center-marker-container absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]">

        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <circle className="breathing-dot" cx="12" cy="12" r="3" fill="#0ea5e9" fillOpacity="0.18" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>

      </div>
      <div className="absolute bottom-5 left-1/2 z-[1000] max-w-[80%] -translate-x-1/2 rounded-full border border-light-border bg-light-card px-5 py-3 text-center text-sm font-semibold text-light-text shadow-2xl dark:border-dark-border dark:bg-dark-card dark:text-dark-text">
        {locationDetails ? locationDetails.fullAddress : DEFAULT_LOCATION_DETAILS.fullAddress}
      </div>
    </div>
  );
}

export default LocationPicker;
