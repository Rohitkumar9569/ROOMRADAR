import api from '../api';

const PREFERRED_LOCATION_KEY = 'roomradar:preferred-location:v2';
const LEGACY_LOCATION_CACHE_KEY = 'roomradar:auto-location:v1';
const LOCATION_ATTEMPT_KEY = 'roomradar:auto-location-attempt:v1';

const isMobileViewport = () => (
  typeof window !== 'undefined'
  && window.matchMedia?.('(max-width: 639px)').matches
);

const normalizeStoredLocation = (location) => {
  if (!location?.query || !location?.place) return null;
  const props = location.place?.properties || {};
  const isAutoLocation = ['auto', 'auto-city'].includes(location.source) || String(location.query || '').toLowerCase() === 'current location';
  const city = [props.city, props.address_line1, location.query]
    .find((value) => isUsefulLocationText(value)) || location.query;

  if (!isAutoLocation) {
    return { ...location, savedAt: location.savedAt || Date.now() };
  }

  return createManualLocationSignal(city, {
    city,
    address_line1: city,
    address_line2: props.state || props.country || 'India',
    formatted: props.formatted && props.formatted !== 'Current location' ? props.formatted : `${city}, India`,
    state: props.state,
    country: props.country,
    lat: props.lat ?? props.latitude,
    lon: props.lon ?? props.lng ?? props.longitude,
  }, 'auto-city');
};

export const readCachedLocation = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(PREFERRED_LOCATION_KEY) || 'null');
    const normalized = normalizeStoredLocation(cached);
    if (normalized) return normalized;

    const legacyCached = JSON.parse(window.localStorage.getItem(LEGACY_LOCATION_CACHE_KEY) || 'null');
    const normalizedLegacy = normalizeStoredLocation(legacyCached);
    if (normalizedLegacy) {
      saveCachedLocation(normalizedLegacy);
      window.localStorage.removeItem(LEGACY_LOCATION_CACHE_KEY);
      return normalizedLegacy;
    }
    return null;
  } catch {
    return null;
  }
};

export const saveCachedLocation = (location) => {
  if (typeof window === 'undefined' || !location?.query || !location?.place) return;
  const normalized = normalizeStoredLocation(location);
  if (!normalized) return;
  window.localStorage.setItem(PREFERRED_LOCATION_KEY, JSON.stringify({ ...normalized, savedAt: Date.now() }));
};

export const clearCachedLocation = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PREFERRED_LOCATION_KEY);
  window.localStorage.removeItem(LEGACY_LOCATION_CACHE_KEY);
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

export const getMobileAutoLocation = async ({ force = false, mobileOnly = true } = {}) => {
  if (
    typeof window === 'undefined'
    || typeof navigator === 'undefined'
    || !navigator.geolocation
    || (mobileOnly && !isMobileViewport())
  ) return null;

  const cached = readCachedLocation();
  if (cached && !force) return cached;

  if (!force && window.sessionStorage.getItem(LOCATION_ATTEMPT_KEY)) return null;
  window.sessionStorage.setItem(LOCATION_ATTEMPT_KEY, '1');

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') return null;
      if (!force && permission.state !== 'granted') return null;
    } catch {
      // Some mobile browsers do not expose geolocation through Permissions API.
      if (!force) return null;
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
