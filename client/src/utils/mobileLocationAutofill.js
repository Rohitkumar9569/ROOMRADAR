import api from '../api';

const LOCATION_CACHE_KEY = 'roomradar:auto-location:v1';
const LOCATION_ATTEMPT_KEY = 'roomradar:auto-location-attempt:v1';
const LOCATION_CACHE_TTL = 12 * 60 * 60 * 1000;

const isMobileViewport = () => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(max-width: 639px)').matches
);

const readCachedLocation = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(LOCATION_CACHE_KEY) || 'null');
    if (!cached?.query || !cached?.place || Date.now() - Number(cached.savedAt || 0) > LOCATION_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
};

const saveCachedLocation = (location) => {
  if (typeof window === 'undefined' || !location?.query || !location?.place) return;
  window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ ...location, savedAt: Date.now() }));
};

const getPosition = () => new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    maximumAge: 10 * 60 * 1000,
    timeout: 9000,
  });
});

const buildPlace = (feature, coords) => {
  const props = feature?.properties || {};
  const city = props.city || props.county || props.state_district || props.state || 'Current location';
  const area = props.suburb || props.locality || props.address_line1 || city;
  const formatted = props.formatted || [area, city, props.state || 'India'].filter(Boolean).join(', ');

  return {
    properties: {
      ...props,
      place_id: props.place_id || `current-${coords.lat}-${coords.lon}`,
      address_line1: area,
      address_line2: props.state || props.country || 'India',
      city,
      formatted,
      lat: props.lat ?? coords.lat,
      lon: props.lon ?? coords.lon,
    },
  };
};

export const getMobileAutoLocation = async ({ force = false } = {}) => {
  if (
    typeof window === 'undefined'
    || typeof navigator === 'undefined'
    || !navigator.geolocation
    || !isMobileViewport()
  ) return null;

  const cached = readCachedLocation();
  if (cached && !force) return cached;

  if (!force && window.sessionStorage.getItem(LOCATION_ATTEMPT_KEY)) return null;
  window.sessionStorage.setItem(LOCATION_ATTEMPT_KEY, '1');

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') return null;
    } catch {
      // Some mobile browsers do not expose geolocation through Permissions API.
    }
  }

  const position = await getPosition();
  const coords = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
  };

  try {
    const { data } = await api.get(`/geocode/reverse?lat=${coords.lat}&lon=${coords.lon}`);
    const feature = Array.isArray(data.features) ? data.features[0] : null;
    const place = buildPlace(feature, coords);
    const location = {
      place,
      query: place.properties.city || place.properties.address_line1 || 'Current location',
    };
    saveCachedLocation(location);
    return location;
  } catch {
    const place = buildPlace(null, coords);
    const location = { place, query: 'Current location' };
    saveCachedLocation(location);
    return location;
  }
};
