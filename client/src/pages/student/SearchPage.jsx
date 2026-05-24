import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';
import Header from '../../components/layout/Header';
import SearchBar from '../../components/features/search/SearchBar';
import RoomCard from '../../components/features/rooms/RoomCard';
import RoomCardSkeleton from '../../components/common/RoomCardSkeleton';
import { getFiltersFromConfig } from '../../utils/roomFieldUtils';
import { readTabCache, setTabCache } from '../../utils/tabDataCache';
import { formatPreferenceLabel } from '../../utils/listingDisplay';
import { clearCachedLocation, getLocationSearchParams, getLocationSignalFromParams, getMobileAutoLocation, readCachedLocation, saveSearchedLocation } from '../../utils/mobileLocationAutofill';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Map,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price Low-High' },
  { value: 'price_desc', label: 'Price High-Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Rating' },
];

const RoomsMap = lazy(() => import('../../components/features/rooms/RoomsMap'));
const SEARCH_PRICE_RANGE_CACHE_KEY = 'student:search:price-range';
const SEARCH_ROOMS_CACHE_PREFIX = 'student:search:rooms';
const SEARCH_ALERTS_KEY = 'student:search-alerts:v1';

const filterFields = getFiltersFromConfig();
const amenities = filterFields.filter((field) => field.sectionId === 'amenities');
const selectFilters = filterFields.filter((field) => field.type === 'select' && field.sectionId !== 'amenities');
const numberFilters = filterFields.filter((field) => field.type === 'number' && !['rent', 'beds'].includes(field.key));
const quickBooleanFilters = filterFields.filter((field) => field.type === 'boolean' && field.sectionId !== 'amenities');

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
const formatCount = (value) => Number(value || 0).toLocaleString('en-IN');
const availabilityWindowOptions = [
  { value: '', label: 'Any time' },
  { value: 'now', label: 'Available now' },
  { value: '15', label: '15 days' },
  { value: '30', label: 'Next month' },
];

const occupancyTypeOptions = [
  { value: '', label: 'Any tenant', occupants: '' },
  { value: 'single', label: 'Single', occupants: '1' },
  { value: 'sharing', label: 'Sharing', occupants: '2' },
  { value: 'family', label: 'Family/Couple', occupants: '2', familyStatus: 'Family' },
  { value: 'group', label: 'Group/Flat', occupants: '3' },
];

const radiusOptions = [2, 5, 10, 20];

const formatFilterOptionLabel = (field, option) => {
  if (field.key === 'gender') return formatPreferenceLabel(option);
  if (field.key === 'pricingMode') {
    if (option === 'monthly') return 'Monthly rent';
    if (option === 'daily') return 'Daily rent';
    if (option === 'nightly') return 'Nightly rent';
  }
  if (field.key === 'stayType') {
    if (option === 'long_term') return 'Long-term stay';
    if (option === 'short_term') return 'Short-term stay';
    if (option === 'flexible') return 'Flexible stay';
  }
  return option;
};

const createEmptyFilters = () => {
  const filters = {
    city: '',
    latitude: '',
    longitude: '',
    radius: '',
    minRent: '',
    maxRent: '',
    maxDeposit: '',
    beds: '',
    availableFrom: '',
    availabilityWindow: '',
    verifiedOnly: '',
    verifiedLandlord: '',
    occupancyType: '',
    amenities: [],
  };
  filterFields.forEach((field) => {
    if (!['city', 'rent', 'beds', 'availableFrom'].includes(field.key) && field.sectionId !== 'amenities') {
      filters[field.key] = '';
    }
  });
  return filters;
};

const buildInitialFilters = (searchParams, preferredLocation = null) => {
  const filters = createEmptyFilters();
  filters.city = searchParams.get('city') || searchParams.get('search') || '';
  filters.latitude = searchParams.get('latitude') || '';
  filters.longitude = searchParams.get('longitude') || '';
  filters.radius = searchParams.get('radius') || '';
  filters.minRent = searchParams.get('minRent') || '';
  filters.maxRent = searchParams.get('maxRent') || '';
  filters.maxDeposit = searchParams.get('maxDeposit') || '';
  filters.beds = searchParams.get('beds') || '';
  filters.availableFrom = searchParams.get('availableFrom') || '';
  filters.availabilityWindow = searchParams.get('availabilityWindow') || '';
  filters.verifiedOnly = searchParams.get('verifiedOnly') || '';
  filters.verifiedLandlord = searchParams.get('verifiedLandlord') || '';
  filters.occupancyType = searchParams.get('occupancyType') || '';
  filters.amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];
  filterFields.forEach((field) => {
    if (field.key === 'roomType') filters.roomType = searchParams.get('roomType') || searchParams.get('type') || '';
    else if (field.sectionId !== 'amenities' && searchParams.get(field.key)) filters[field.key] = searchParams.get(field.key);
  });

  if (!searchParams.toString() && preferredLocation) {
    const locationParams = getLocationSearchParams(preferredLocation, { radius: 8 });
    filters.city = locationParams.get('city') || '';
    filters.latitude = locationParams.get('latitude') || '';
    filters.longitude = locationParams.get('longitude') || '';
    filters.radius = filters.latitude && filters.longitude ? (locationParams.get('radius') || '8') : '';
  }
  return filters;
};

const createEmptySearchCriteria = () => ({
  location: null,
  locationQuery: '',
  moveInDate: null,
  radius: 5,
  availabilityWindow: '',
  occupancyType: '',
  gender: 'Any',
  maxOccupants: '',
});

const parseMoveInDate = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildInitialSearchCriteria = (searchParams, preferredLocation = null) => {
  const maxOccupantsParam = searchParams.get('maxOccupants') || '';
  const maxOccupants = maxOccupantsParam ? Math.max(1, Number(maxOccupantsParam) || 1) : '';
  const preferredPlace = !searchParams.toString() ? preferredLocation?.place : null;
  const preferredQuery = !searchParams.toString() ? preferredLocation?.query : '';
  const preferredRadius = preferredLocation ? getLocationSearchParams(preferredLocation, { radius: 8 }).get('radius') : '';
  return {
    ...createEmptySearchCriteria(),
    location: preferredPlace || null,
    locationQuery: searchParams.get('city') || searchParams.get('search') || (searchParams.get('latitude') && searchParams.get('longitude') ? 'Current location' : preferredQuery || ''),
    moveInDate: parseMoveInDate(searchParams.get('availableFrom')),
    availabilityWindow: searchParams.get('availabilityWindow') || '',
    radius: Number(searchParams.get('radius') || preferredRadius || 5) || 5,
    occupancyType: searchParams.get('occupancyType') || '',
    gender: searchParams.get('gender') || 'Any',
    maxOccupants,
  };
};

const FilterPanel = ({ filters, setFilters, priceRange, onApply, onClear, isSheet = false, onClose }) => {
  const toggleAmenity = (key) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((item) => item !== key)
        : [...prev.amenities, key],
    }));
  };

  return (
    <div className={`${isSheet ? 'flex h-full flex-col bg-light-bg dark:bg-dark-bg' : 'rounded-2xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card'}`}>
      <div className={`${isSheet ? 'flex flex-shrink-0 items-center justify-between gap-3 border-b border-light-border bg-light-bg px-3 py-3 dark:border-dark-border dark:bg-dark-bg' : 'mb-4 flex items-center justify-between gap-3'}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-brand">Filters</p>
          <h2 className="mt-1 text-lg font-black">Refine rooms</h2>
        </div>
        {isSheet && (
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-light-bg dark:bg-dark-input">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className={`${isSheet ? 'min-h-0 flex-1 overflow-y-auto px-3 py-4' : ''}`}>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-black">Location</span>
            <input
              value={filters.city}
              onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
              className="input-field mt-2"
              placeholder="City, area, landmark, institute..."
            />
          </label>

          {filters.latitude && filters.longitude && (
            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black">Nearby</span>
                <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-black text-white">{filters.radius || 5} km</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {radiusOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, radius: String(value) }))}
                    className={`rounded-full px-2 py-2 text-xs font-black ${
                      Number(filters.radius || 5) === value
                        ? 'bg-brand text-white'
                        : 'bg-white text-light-muted dark:bg-dark-input dark:text-dark-muted'
                    }`}
                  >
                    {value} km
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">Exact location first, nearby rooms after that.</p>
            </div>
          )}

          <div>
            <span className="text-sm font-black">Availability</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {availabilityWindowOptions.map((option) => {
                const active = String(filters.availabilityWindow || '') === String(option.value) && !filters.availableFrom;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, availabilityWindow: option.value, availableFrom: '' }))}
                    className={`min-h-10 rounded-xl border px-2 text-xs font-black transition ${
                      active
                        ? 'border-cyan-500 bg-cyan-500 text-white'
                        : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted lg:bg-light-bg lg:dark:bg-dark-input'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-black">Tenant type</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {occupancyTypeOptions.map((option) => {
                const active = String(filters.occupancyType || '') === String(option.value);
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setFilters((prev) => ({
                      ...prev,
                      occupancyType: option.value,
                      maxOccupants: option.occupants,
                      familyStatus: option.familyStatus || '',
                    }))}
                    className={`min-h-10 rounded-xl border px-2 text-xs font-black transition ${
                      active
                        ? 'border-cyan-500 bg-cyan-500 text-white'
                        : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted lg:bg-light-bg lg:dark:bg-dark-input'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-black">Price range</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                value={filters.minRent}
                min={priceRange.min || 0}
                onChange={(event) => setFilters((prev) => ({ ...prev, minRent: event.target.value }))}
                className="input-field"
                placeholder={money(priceRange.min)}
              />
              <input
                type="number"
                value={filters.maxRent}
                max={priceRange.max || undefined}
                onChange={(event) => setFilters((prev) => ({ ...prev, maxRent: event.target.value }))}
                className="input-field"
                placeholder={money(priceRange.max)}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-black">Max deposit</span>
            <input
              type="number"
              min="0"
              value={filters.maxDeposit}
              onChange={(event) => setFilters((prev) => ({ ...prev, maxDeposit: event.target.value }))}
              className="input-field mt-2"
              placeholder="₹10,000"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="text-xs font-black sm:text-sm">Beds</span>
              <input
                type="number"
                min="1"
                value={filters.beds}
                onChange={(event) => setFilters((prev) => ({ ...prev, beds: event.target.value }))}
                className="input-field mt-2"
                placeholder="Any"
              />
            </label>

            {numberFilters.map((field) => (
              <label key={field.key} className="block min-w-0">
                <span className="text-xs font-black sm:text-sm">{field.label}</span>
                <input
                  type="number"
                  min="0"
                  value={filters[field.key] || ''}
                  onChange={(event) => setFilters((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className="input-field mt-2"
                  placeholder="Any"
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {selectFilters.map((field) => (
              <label key={field.key} className="block min-w-0">
                <span className="block truncate text-xs font-black sm:text-sm">{field.label}</span>
                <select
                  value={filters[field.key]}
                  onChange={(event) => setFilters((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  className="input-field mt-2"
                >
                  <option value="">Any</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {formatFilterOptionLabel(field, option)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {quickBooleanFilters.length > 0 && (
            <div>
              <span className="text-sm font-black">Booking preferences</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {quickBooleanFilters.map((field) => {
                  const active = filters[field.key] === 'true';
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, [field.key]: active ? '' : 'true' }))}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-bold transition sm:text-sm ${
                        active
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                          : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted lg:bg-light-bg lg:dark:bg-dark-input'
                      }`}
                    >
                      <span className="min-w-0 truncate">{field.label}</span>
                      {active && <Check className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-sm font-black">Available from</span>
            <input
              type="date"
              value={filters.availableFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, availableFrom: event.target.value, availabilityWindow: '' }))}
              className="input-field mt-2"
            />
          </label>

          <div>
            <span className="text-sm font-black">Trust</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { key: 'verifiedOnly', label: 'Verified room' },
                { key: 'verifiedLandlord', label: 'Verified landlord' },
              ].map((item) => {
                const active = filters[item.key] === 'true';
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, [item.key]: active ? '' : 'true' }))}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-bold transition sm:text-sm ${
                      active
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                        : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted lg:bg-light-bg lg:dark:bg-dark-input'
                    }`}
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    {active && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-sm font-black">Amenities</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {amenities.map((field) => {
                const active = filters.amenities.includes(field.key);
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => toggleAmenity(field.key)}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-left text-xs font-bold transition sm:text-sm ${
                      active
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-light-border bg-light-card text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted lg:bg-light-bg lg:dark:bg-dark-input'
                    }`}
                  >
                    <span className="min-w-0 truncate">{field.label}</span>
                    {active && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className={`${isSheet ? 'grid flex-shrink-0 grid-cols-2 gap-3 border-t border-light-border bg-light-bg px-3 py-3 dark:border-dark-border dark:bg-dark-bg' : 'mt-6 grid grid-cols-2 gap-3'}`}>
        <button onClick={onClear} className="btn-outline min-h-12">Clear</button>
        <button onClick={onApply} className="btn-primary min-h-12">Apply</button>
      </div>
    </div>
  );
};

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreferredLocation = useMemo(() => (searchParams.toString() ? null : readCachedLocation()), []);
  const [filters, setFilters] = useState(() => buildInitialFilters(searchParams, initialPreferredLocation));
  const [searchCriteria, setSearchCriteria] = useState(() => buildInitialSearchCriteria(searchParams, initialPreferredLocation));
  const [rooms, setRooms] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [sort, setSort] = useState(searchParams.get('sort') || 'recommended');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [naturalQuery, setNaturalQuery] = useState(searchParams.get('q') || '');
  const [smartLoading, setSmartLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isMobileSearchDockOpen, setIsMobileSearchDockOpen] = useState(false);
  const [searchMeta, setSearchMeta] = useState(null);
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    const searchedLocation = getLocationSignalFromParams(searchParams);
    if (searchedLocation) saveSearchedLocation(searchedLocation);
  }, [searchParamsKey]);

  useEffect(() => {
    let cancelled = false;

    const fillMobileLocation = async () => {
      if (searchCriteria.location || searchCriteria.locationQuery || filters.city || filters.latitude) return;
      try {
        const autoLocation = await getMobileAutoLocation();
        if (!autoLocation || cancelled) return;
        const locationParams = getLocationSearchParams(autoLocation, { radius: 8 });
        setSearchCriteria((current) => (
          current.location || current.locationQuery
            ? current
            : { ...current, location: autoLocation.place, locationQuery: autoLocation.query }
        ));
        setFilters((current) => {
          if (current.city || current.latitude) return current;
          const latitudeValue = locationParams.get('latitude') || '';
          const longitudeValue = locationParams.get('longitude') || '';
          return {
            ...current,
            city: locationParams.get('city') || '',
            latitude: latitudeValue,
            longitude: longitudeValue,
            radius: latitudeValue && longitudeValue ? (locationParams.get('radius') || current.radius || '8') : current.radius,
          };
        });
      } catch {
        // Manual search remains available when location permission is dismissed.
      }
    };

    fillMobileLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeChips = useMemo(() => {
    const chips = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'amenities') {
        value.forEach((amenity) => chips.push({ key: `amenity-${amenity}`, label: amenities.find((item) => item.key === amenity)?.label || amenity, clear: () => setFilters((prev) => ({ ...prev, amenities: prev.amenities.filter((item) => item !== amenity) })) }));
        return;
      }
      if (['latitude', 'longitude'].includes(key)) return;
      if (key === 'verifiedOnly' && value) {
        chips.push({
          key,
          label: 'Verified rooms',
          clear: () => setFilters((prev) => ({ ...prev, verifiedOnly: '' })),
        });
        return;
      }
      if (key === 'verifiedLandlord' && value) {
        chips.push({
          key,
          label: 'Verified landlord',
          clear: () => setFilters((prev) => ({ ...prev, verifiedLandlord: '' })),
        });
        return;
      }
      if (key === 'availabilityWindow' && value) {
        chips.push({
          key,
          label: availabilityWindowOptions.find((option) => String(option.value) === String(value))?.label || `Within ${value} days`,
          clear: () => setFilters((prev) => ({ ...prev, availabilityWindow: '' })),
        });
        return;
      }
      if (key === 'maxDeposit' && value) {
        chips.push({
          key,
          label: `Deposit up to ${money(value)}`,
          clear: () => setFilters((prev) => ({ ...prev, maxDeposit: '' })),
        });
        return;
      }
      if (key === 'occupancyType' && value) {
        const labelMap = { single: 'Single occupancy', sharing: 'Sharing room', family: 'Family/Couple', group: 'Group/Flat' };
        chips.push({
          key,
          label: labelMap[value] || value,
          clear: () => setFilters((prev) => ({ ...prev, occupancyType: '' })),
        });
        return;
      }
      if (key === 'radius' && value) {
        chips.push({
          key,
          label: `Within ${value} km`,
          clear: () => setFilters((prev) => ({ ...prev, radius: '', latitude: '', longitude: '' })),
        });
        return;
      }
      if (key === 'maxOccupants' && value) {
        chips.push({
          key,
          label: `${value} occupant${Number(value) === 1 ? '' : 's'}`,
          clear: () => setFilters((prev) => ({ ...prev, maxOccupants: '' })),
        });
        return;
      }
      if (key === 'gender' && value) {
        chips.push({
          key,
          label: `Gender: ${formatPreferenceLabel(value)}`,
          clear: () => setFilters((prev) => ({ ...prev, gender: '' })),
        });
        return;
      }
      if (key === 'familyStatus' && value) {
        chips.push({
          key,
          label: `Stay type: ${value}`,
          clear: () => setFilters((prev) => ({ ...prev, familyStatus: '' })),
        });
        return;
      }
      if (key === 'listingCategory' && value) {
        chips.push({
          key,
          label: value,
          clear: () => setFilters((prev) => ({ ...prev, listingCategory: '' })),
        });
        return;
      }
      if ((key === 'pricingMode' || key === 'stayType') && value) {
        chips.push({
          key,
          label: formatFilterOptionLabel({ key }, value),
          clear: () => setFilters((prev) => ({ ...prev, [key]: '' })),
        });
        return;
      }
      if (key === 'instantBook' && value) {
        chips.push({
          key,
          label: 'Instant book',
          clear: () => setFilters((prev) => ({ ...prev, instantBook: '' })),
        });
        return;
      }
      if (value) chips.push({ key, label: String(value), clear: () => setFilters((prev) => ({ ...prev, [key]: '' })) });
    });
    return chips;
  }, [filters]);

  const fetchRooms = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 12);
    params.set('sort', sort);
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(','));
      } else if (value) {
        params.set(key, value);
      }
    });

    const searchedLocation = getLocationSignalFromParams(params);
    if (searchedLocation) saveSearchedLocation(searchedLocation);
    setSearchParams(params, { replace: true });
    const cacheKey = `${SEARCH_ROOMS_CACHE_PREFIX}:${params.toString()}`;
    const cached = readTabCache(cacheKey)?.value;

    if (cached) {
      setRooms(cached.rooms || []);
      setTotal(cached.total || 0);
      setTotalPages(cached.totalPages || 1);
      setSearchMeta(cached.meta || null);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await api.get(`/rooms?${params.toString()}`);
      const nextSearchData = {
        rooms: data.data || [],
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        meta: {
          fallback: data.fallback || null,
          exactTotal: data.exactTotal,
        },
      };

      setTabCache(cacheKey, nextSearchData);
      setRooms(nextSearchData.rooms);
      setTotal(nextSearchData.total);
      setTotalPages(nextSearchData.totalPages);
      setSearchMeta(nextSearchData.meta);
    } catch (error) {
      if (!cached) {
        setRooms([]);
        setTotal(0);
        setTotalPages(1);
        setSearchMeta(null);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page, setSearchParams, sort]);

  useEffect(() => {
    const cached = readTabCache(SEARCH_PRICE_RANGE_CACHE_KEY)?.value;
    if (cached) setPriceRange(cached);

    api.get('/rooms/price-range')
      .then(({ data }) => {
        const nextRange = data || { min: 0, max: 0 };
        setTabCache(SEARCH_PRICE_RANGE_CACHE_KEY, nextRange);
        setPriceRange(nextRange);
      })
      .catch(() => {
        if (!cached) setPriceRange({ min: 0, max: 0 });
      });
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (!isFilterSheetOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterSheetOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleHeaderLocationSearch = (event) => {
      if (event.detail?.inputId !== 'rooms-mobile-location-search') return;
      setIsMobileSearchDockOpen(true);
    };

    window.addEventListener('roomradar:open-location-search', handleHeaderLocationSearch);
    return () => window.removeEventListener('roomradar:open-location-search', handleHeaderLocationSearch);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleNavbarLocationSubmit = (event) => {
      const locationQuery = String(event.detail?.locationQuery || '').trim();
      if (!locationQuery) return;

      saveSearchedLocation(locationQuery);
      setSearchCriteria((prev) => ({
        ...prev,
        location: null,
        locationQuery,
      }));
      setFilters((prev) => ({
        ...prev,
        city: locationQuery,
        latitude: '',
        longitude: '',
        radius: '',
      }));
      setPage(1);
      setSearchMeta(null);
      setIsMobileSearchDockOpen(false);
    };

    window.addEventListener('roomradar:navbar-location-submit', handleNavbarLocationSubmit);
    return () => window.removeEventListener('roomradar:navbar-location-submit', handleNavbarLocationSubmit);
  }, []);

  const applyFilters = () => {
    setPage(1);
    setIsFilterSheetOpen(false);
    fetchRooms();
  };

  const clearFilters = () => {
    clearCachedLocation();
    setFilters(createEmptyFilters());
    setSearchCriteria(createEmptySearchCriteria());
    setPage(1);
    setSearchMeta(null);
  };

  const relaxFilters = () => {
    setFilters((current) => ({
      ...createEmptyFilters(),
      city: current.city,
      latitude: current.latitude,
      longitude: current.longitude,
      radius: current.radius,
    }));
    setSearchCriteria((current) => ({
      ...createEmptySearchCriteria(),
      location: current.location,
      locationQuery: current.locationQuery,
      radius: current.radius || 5,
    }));
    setPage(1);
    setSearchMeta(null);
  };

  const handleLocationCriteriaChange = (nextCriteria) => {
    setSearchCriteria((prev) => ({ ...prev, ...nextCriteria }));
  };

  const handleLocationClear = () => {
    clearCachedLocation();
    setSearchCriteria(createEmptySearchCriteria());
    setFilters((prev) => ({
      ...prev,
      city: '',
      latitude: '',
      longitude: '',
      radius: '',
      maxOccupants: '',
      gender: '',
      familyStatus: '',
      availableFrom: '',
      availabilityWindow: '',
      occupancyType: '',
    }));
    setPage(1);
    setSearchMeta(null);
  };

  const handleLocationSearch = (overrides = {}) => {
    const nextCriteria = { ...searchCriteria, ...overrides };
    const typedLocation = nextCriteria.locationQuery?.trim();
    const locationProps = nextCriteria.location?.properties;

    if (!typedLocation && !locationProps) return;

    const nextFilters = {
      ...filters,
      city: '',
      latitude: '',
      longitude: '',
      radius: nextCriteria.radius ? String(nextCriteria.radius) : '',
    };

    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'listingCategory')) nextFilters.listingCategory = nextCriteria.listingCategory || '';
    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'roomType')) nextFilters.roomType = nextCriteria.roomType || '';
    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'maxRent')) nextFilters.maxRent = nextCriteria.maxRent || '';
    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'minRent')) nextFilters.minRent = nextCriteria.minRent || '';
    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'occupancyType')) {
      nextFilters.occupancyType = nextCriteria.occupancyType || '';
      nextFilters.maxOccupants = nextCriteria.maxOccupants ? String(nextCriteria.maxOccupants) : '';
      nextFilters.familyStatus = nextCriteria.familyStatus || (nextCriteria.occupancyType === 'family' ? 'Family' : '');
    }
    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'gender')) {
      nextFilters.gender = nextCriteria.gender && nextCriteria.gender !== 'Any' ? nextCriteria.gender : '';
    }
    if (Object.prototype.hasOwnProperty.call(nextCriteria, 'moveInDate') || Object.prototype.hasOwnProperty.call(nextCriteria, 'availabilityWindow')) {
      nextFilters.availableFrom = '';
      nextFilters.availabilityWindow = nextCriteria.moveInDate ? '' : (nextCriteria.availabilityWindow || '');
    }

    if (locationProps) {
      const locationParams = getLocationSearchParams(
        { place: nextCriteria.location, query: typedLocation },
        { radius: nextCriteria.radius || 8 }
      );
      nextFilters.city = locationParams.get('city') || '';
      nextFilters.latitude = locationParams.get('latitude') || '';
      nextFilters.longitude = locationParams.get('longitude') || '';
      nextFilters.radius = nextFilters.latitude && nextFilters.longitude
        ? (locationParams.get('radius') || nextFilters.radius)
        : '';
    } else {
      nextFilters.city = typedLocation;
      nextFilters.radius = '';
    }

    const searchedLocation = getLocationSignalFromParams(new URLSearchParams({
      city: nextFilters.city,
      ...(nextFilters.latitude ? { latitude: nextFilters.latitude } : {}),
      ...(nextFilters.longitude ? { longitude: nextFilters.longitude } : {}),
    }));
    if (searchedLocation) saveSearchedLocation(searchedLocation);

    if (nextCriteria.moveInDate) {
      const moveInDate = nextCriteria.moveInDate instanceof Date
        ? nextCriteria.moveInDate
        : parseMoveInDate(String(nextCriteria.moveInDate).slice(0, 10));
      if (moveInDate) nextFilters.availableFrom = moveInDate.toISOString().slice(0, 10);
    }

    setSearchCriteria(nextCriteria);
    setFilters(nextFilters);
    setNaturalQuery('');
    setPage(1);
    setSearchMeta(null);
  };

  const handleMobileDockLocationSearch = (overrides = {}) => {
    handleLocationSearch(overrides);
    setIsMobileSearchDockOpen(false);
  };

  const saveSearchAlert = () => {
    if (typeof window === 'undefined') return;
    const alertPayload = {
      id: `${Date.now()}`,
      filters,
      sort,
      label: filters.city || searchCriteria.locationQuery || 'RoomRadar search',
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(window.localStorage.getItem(SEARCH_ALERTS_KEY) || '[]');
      window.localStorage.setItem(SEARCH_ALERTS_KEY, JSON.stringify([alertPayload, ...existing].slice(0, 20)));
      toast.success('Search alert saved for this device.');
    } catch {
      toast.error('Could not save this alert.');
    }
  };

  const handleSmartSearch = async (event) => {
    event.preventDefault();
    const query = naturalQuery.trim();
    if (!query) return;

    try {
      setSmartLoading(true);
      const { data } = await api.post('/search/smart', { query });
      const smartFilters = data.filters || {};
      const nextOccupants = smartFilters.maxOccupants ? Math.max(1, Number(smartFilters.maxOccupants) || 1) : '';
      const nextOccupancyType = nextOccupants ? (nextOccupants > 2 ? 'group' : nextOccupants > 1 ? 'sharing' : 'single') : '';
      if (smartFilters.city) saveSearchedLocation(smartFilters.city);
      setFilters((prev) => ({
        ...prev,
        city: smartFilters.city || '',
        minRent: smartFilters.minRent || '',
        maxRent: smartFilters.maxRent || '',
        roomType: smartFilters.roomType || '',
        familyStatus: smartFilters.familyStatus || '',
        gender: smartFilters.gender || '',
        maxOccupants: smartFilters.maxOccupants || '',
        occupancyType: nextOccupancyType,
      }));
      setSearchCriteria((prev) => ({
        ...prev,
        location: null,
        locationQuery: smartFilters.city || query,
        occupancyType: nextOccupancyType,
        maxOccupants: nextOccupants,
        gender: smartFilters.gender || 'Any',
      }));
      setRooms(data.rooms || []);
      setTotal(data.count || 0);
      setTotalPages(1);
      setPage(1);
      setSearchMeta({
        fallback: data.fallback || null,
        exactTotal: data.exactCount,
      });
      if (smartFilters.sort) setSort(smartFilters.sort);
      const params = new URLSearchParams();
      params.set('q', query);
      if (smartFilters.sort) params.set('sort', smartFilters.sort);
      Object.entries(smartFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      setSearchParams(params, { replace: true });
    } catch (error) {
      setRooms([]);
      setTotal(0);
      setTotalPages(1);
      setSearchMeta(null);
    } finally {
      setSmartLoading(false);
    }
  };

  const locationHeadingLabel = filters.city || (filters.latitude && filters.longitude ? 'your location' : '');

  return (
    <div className="min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      <Header />
      {isMobileSearchDockOpen && (
        <div className="rooms-mobile-search-dock fixed inset-x-0 top-[var(--rr-mobile-header-offset)] z-40 border-b border-light-border bg-light-bg/96 px-3 pb-2 pt-2 shadow-sm dark:border-dark-border dark:bg-dark-bg/96 sm:hidden">
          <div className="mx-auto flex max-w-md items-start gap-2">
            <div className="min-w-0 flex-1">
              <SearchBar
                criteria={searchCriteria}
                onCriteriaChange={handleLocationCriteriaChange}
                onSearch={handleMobileDockLocationSearch}
                onClear={handleLocationClear}
                inputId="rooms-mobile-location-search"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSearchDockOpen(false)}
              className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-light-border bg-white text-light-muted shadow-sm active:scale-95 dark:border-dark-border dark:bg-dark-card dark:text-dark-muted"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-3 pb-28 pt-2 sm:px-6 md:pt-24 lg:px-8">
        <section id="rooms-search-anchor" className="rooms-search-entry relative z-30 mb-4 sm:mb-6">
          <SearchBar
            criteria={searchCriteria}
            onCriteriaChange={handleLocationCriteriaChange}
            onSearch={handleLocationSearch}
            onClear={handleLocationClear}
            inputId="rooms-location-search"
          />
        </section>

        <div className="mb-4 rounded-2xl bg-transparent p-0 shadow-none sm:mb-6">
          <div className="mb-3 min-w-0 sm:mb-0">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-brand sm:text-xs">Search & browse</p>
            <h1 className="mt-1 text-lg font-black tracking-tight sm:text-2xl">
              {searchMeta?.fallback?.type === 'location_expanded' || searchMeta?.fallback?.type === 'location_primary'
                ? `${formatCount(total)} rooms${locationHeadingLabel ? ` near ${locationHeadingLabel}` : ''}`
                : searchMeta?.fallback
                  ? 'Showing closest rooms'
                  : `${formatCount(total)} rooms${locationHeadingLabel ? ` near ${locationHeadingLabel}` : ''}`}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
            <button onClick={() => setIsFilterSheetOpen(true)} className="btn-outline inline-flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-sm lg:hidden">
              <SlidersHorizontal className="h-4 w-4 flex-shrink-0" />
              <span>Filters</span>
            </button>
            <button onClick={() => setShowMap((prev) => !prev)} className="btn-outline inline-flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-sm">
              {showMap ? <List className="h-4 w-4 flex-shrink-0" /> : <Map className="h-4 w-4 flex-shrink-0" />}
              <span>{showMap ? 'List' : 'Map'}</span>
            </button>
            <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="input-field col-span-2 min-h-11 w-full py-2 text-sm md:col-span-1 md:w-auto">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <form onSubmit={handleSmartSearch} className="mb-4 rounded-2xl bg-transparent p-0 shadow-none sm:mb-6">
          <div className="grid grid-cols-[1fr_auto] gap-2 md:flex md:items-center md:gap-3">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand sm:left-4 sm:h-5 sm:w-5" />
              <input
                value={naturalQuery}
                onChange={(event) => setNaturalQuery(event.target.value)}
                className="input-field min-h-11 pl-9 text-sm sm:pl-12"
                placeholder="Try: 2BHK near Haridwar under 10000 for women"
              />
            </div>
            <button type="submit" disabled={smartLoading || !naturalQuery.trim()} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm disabled:opacity-60 md:px-6">
              {smartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="hidden sm:inline">Smart search</span>
            </button>
          </div>
        </form>

        {activeChips.length > 0 && (
          <div className="rooms-active-filter-chips sticky top-[calc(var(--rr-mobile-header-offset)+0.35rem)] z-20 mb-5 flex flex-wrap gap-2 rounded-2xl bg-light-bg/92 py-2 backdrop-blur-xl dark:bg-dark-bg/92 md:top-20">
            {activeChips.map((chip) => (
              <button key={chip.key} onClick={chip.clear} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand/10 px-4 text-sm font-bold text-brand">
                {chip.label}
                <X className="h-4 w-4" />
              </button>
            ))}
            <button onClick={clearFilters} className="inline-flex min-h-10 items-center rounded-full bg-light-card px-4 text-sm font-bold text-light-muted ring-1 ring-light-border dark:bg-dark-card dark:text-dark-muted dark:ring-dark-border">
              Clear all
            </button>
          </div>
        )}

        {searchMeta?.fallback && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
            {searchMeta.fallback.message || 'No exact match found. Showing closest matching rooms.'}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              priceRange={priceRange}
              onApply={applyFilters}
              onClear={clearFilters}
            />
          </aside>

          <section className="min-w-0">
            {showMap ? (
              <Suspense fallback={<div className="h-[70vh] rounded-3xl bg-light-card dark:bg-dark-card" />}>
                <RoomsMap rooms={rooms} />
              </Suspense>
            ) : loading ? (
              <div className="mobile-room-grid grid gap-3 sm:gap-5 lg:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                {Array.from({ length: 9 }).map((_, index) => <RoomCardSkeleton key={index} />)}
              </div>
            ) : rooms.length ? (
              <>
                <div className="mobile-room-grid grid gap-3 sm:gap-5 lg:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                  {rooms.map((room, index) => <RoomCard key={room._id} room={room} imagePriority={index < 4} />)}
                </div>
                <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:justify-center sm:gap-3">
                  <button disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)} className="btn-outline inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-sm sm:min-w-28 sm:gap-2 sm:px-4">
                    <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Prev</span>
                  </button>
                  <span className="inline-flex min-h-11 min-w-[104px] items-center justify-center whitespace-nowrap rounded-2xl bg-light-card px-3 py-2 text-center text-sm font-black leading-none ring-1 ring-light-border dark:bg-dark-card dark:ring-dark-border sm:min-w-36 sm:px-4">
                    Page {page} of {totalPages}
                  </span>
                  <button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)} className="btn-outline inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-sm sm:min-w-28 sm:gap-2 sm:px-4">
                    <span className="whitespace-nowrap">Next</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-light-border bg-light-card p-12 text-center dark:border-dark-border dark:bg-dark-card">
                <SlidersHorizontal className="mx-auto h-10 w-10 text-brand" />
                <h2 className="mt-5 text-2xl font-black">No rooms found</h2>
                <p className="mt-2 text-sm font-semibold text-light-muted dark:text-dark-muted">Save this demand or loosen the filters to see nearby options.</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button onClick={saveSearchAlert} className="btn-primary">Notify me</button>
                  <button onClick={relaxFilters} className="btn-outline">Relax filters</button>
                  <button onClick={clearFilters} className="btn-outline">Clear all</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {isFilterSheetOpen && (
        <div className="fixed inset-x-0 bottom-[calc(var(--rr-bottom-nav-height)+env(safe-area-inset-bottom,0px))] top-[var(--rr-mobile-header-offset)] z-40 bg-light-bg shadow-2xl dark:bg-dark-bg lg:hidden">
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            priceRange={priceRange}
            onApply={applyFilters}
            onClear={clearFilters}
            isSheet
            onClose={() => setIsFilterSheetOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default SearchPage;
