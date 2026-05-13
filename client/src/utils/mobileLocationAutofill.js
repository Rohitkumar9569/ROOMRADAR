import api from '../api';

const LOCATION_CACHE_KEY = 'roomradar:auto-location:v1';
const LOCATION_ATTEMPT_KEY = 'roomradar:auto-location-attempt:v1';
const LOCATION_CACHE_TTL = 12 * 60 * 60 * 1000;

const isMobileViewport = () => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(max-width: 639px)').matches
);

export const readCachedLocation = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(LOCATION_CACHE_KEY) || 'null');
    if (!cached?.query || !cached?.place || Date.now() - Number(cached.savedAt || 0) > LOCATION_CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
};

export const saveCachedLocation = (location) => {
  if (typeof window === 'undefined' || !location?.query || !location?.place) return;
  window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ ...location, savedAt: Date.now() }));
};

export const clearCachedLocation = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCATION_CACHE_KEY);
};

const isUsefulLocationText = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized && !['current location', 'my location', 'near me'].includes(normalized));
};

export const createManualLocationSignal = (query, extraProperties = {}, source = 'search') => {
  const cleanQuery = String(query || '').trim();
  const hasCoordinates = extraProperties.lat !== undefined || extraProperties.latitude !== undefined;
  if (!cleanQuery || (!isUsefulLocationText(cleanQuery) && !hasCoordinates)) return null;
  const city = extraProperties.city || cleanQuery.split(',')[0]?.trim() || cleanQuery;

  return {
    source,
    query: cleanQuery,
    place: {
      properties: {
        place_id: extraProperties.place_id || `${source}-${cleanQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        address_line1: extraProperties.address_line1 || city,
        address_line2: extraProperties.address_line2 || extraProperties.state || 'India',
        city,
        formatted: extraProperties.formatted || `${city}, India`,
        ...extraProperties,
      },
    },
  };
};

export const saveSearchedLocation = (locationOrQuery, extraProperties = {}) => {
  const location = typeof locationOrQuery === 'string'
    ? createManualLocationSignal(locationOrQuery, extraProperties)
    : locationOrQuery;

  if (!location?.query || !location?.place) return null;
  saveCachedLocation(location);
  return location;
};

export const getLocationSignalFromParams = (paramsLike) => {
  const params = paramsLike instanceof URLSearchParams ? paramsLike : new URLSearchParams(paramsLike || '');
  const city = params.get('city') || params.get('search') || params.get('location') || '';
  const latitude = params.get('latitude') || '';
  const longitude = params.get('longitude') || '';

  if (isUsefulLocationText(city)) {
    return createManualLocationSignal(city, {
      city: city.split(',')[0]?.trim() || city,
      formatted: `${city}, India`,
      ...(latitude ? { lat: latitude } : {}),
      ...(longitude ? { lon: longitude } : {}),
    });
  }

  if (latitude && longitude) {
    return createManualLocationSignal('Current location', {
      city: 'Current location',
      address_line1: 'Current location',
      formatted: 'Current location',
      lat: latitude,
      lon: longitude,
    });
  }

  return null;
};

export const getLocationLabel = (location) => {
  const props = location?.place?.properties || location?.properties || {};
  return [props.city, props.address_line1, location?.query]
    .find(isUsefulLocationText) || 'your location';
};

export const getLocationSearchParams = (location, { radius = 8, includeCity = true } = {}) => {
  const props = location?.place?.properties || location?.properties || {};
  const params = new URLSearchParams();
  const city = [props.city, props.address_line1, location?.query].find(isUsefulLocationText);
  const lat = props.lat ?? props.latitude;
  const lon = props.lon ?? props.lng ?? props.longitude;

  if (includeCity && city) params.set('city', city);
  if (lat !== undefined && lat !== null && lat !== '') params.set('latitude', String(lat));
  if (lon !== undefined && lon !== null && lon !== '') params.set('longitude', String(lon));
  if (params.has('latitude') && params.has('longitude')) params.set('radius', String(radius));

  return params;
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
      source: 'auto',
    };
    saveCachedLocation(location);
    return location;
  } catch {
    const place = buildPlace(null, coords);
    const location = { place, query: 'Current location', source: 'auto' };
    saveCachedLocation(location);
    return location;
  }
};
