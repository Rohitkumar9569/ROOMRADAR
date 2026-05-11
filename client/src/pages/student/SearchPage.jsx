import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import Header from '../../components/layout/Header';
import RoomCard from '../../components/features/rooms/RoomCard';
import RoomCardSkeleton from '../../components/common/RoomCardSkeleton';
import { getFiltersFromConfig } from '../../utils/roomFieldUtils';
import { readTabCache, setTabCache } from '../../utils/tabDataCache';
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
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price Low-High' },
  { value: 'price_desc', label: 'Price High-Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Rating' },
];

const RoomsMap = lazy(() => import('../../components/features/rooms/RoomsMap'));
const SEARCH_PRICE_RANGE_CACHE_KEY = 'student:search:price-range';
const SEARCH_ROOMS_CACHE_PREFIX = 'student:search:rooms';

const filterFields = getFiltersFromConfig();
const amenities = filterFields.filter((field) => field.sectionId === 'amenities');
const selectFilters = filterFields.filter((field) => field.type === 'select' && field.sectionId !== 'amenities');
const numberFilters = filterFields.filter((field) => field.type === 'number' && !['rent', 'beds'].includes(field.key));
const quickBooleanFilters = filterFields.filter((field) => field.type === 'boolean' && field.sectionId !== 'amenities');

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const createEmptyFilters = () => {
  const filters = {
    city: '',
    latitude: '',
    longitude: '',
    radius: '',
    minRent: '',
    maxRent: '',
    beds: '',
    availableFrom: '',
    amenities: [],
  };
  filterFields.forEach((field) => {
    if (!['city', 'rent', 'beds', 'availableFrom'].includes(field.key) && field.sectionId !== 'amenities') {
      filters[field.key] = '';
    }
  });
  return filters;
};

const buildInitialFilters = (searchParams) => {
  const filters = createEmptyFilters();
  filters.city = searchParams.get('city') || searchParams.get('search') || '';
  filters.latitude = searchParams.get('latitude') || '';
  filters.longitude = searchParams.get('longitude') || '';
  filters.radius = searchParams.get('radius') || '';
  filters.minRent = searchParams.get('minRent') || '';
  filters.maxRent = searchParams.get('maxRent') || '';
  filters.beds = searchParams.get('beds') || '';
  filters.availableFrom = searchParams.get('availableFrom') || '';
  filters.amenities = searchParams.get('amenities')?.split(',').filter(Boolean) || [];
  filterFields.forEach((field) => {
    if (field.key === 'roomType') filters.roomType = searchParams.get('roomType') || searchParams.get('type') || '';
    else if (field.sectionId !== 'amenities' && searchParams.get(field.key)) filters[field.key] = searchParams.get(field.key);
  });
  return filters;
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
    <div className={`${isSheet ? 'h-full overflow-y-auto p-5' : 'sticky top-24 rounded-3xl border border-light-border bg-light-card p-5 dark:border-dark-border dark:bg-dark-card'}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Filters</p>
          <h2 className="mt-1 text-xl font-black">Refine rooms</h2>
        </div>
        {isSheet && (
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-light-bg dark:bg-dark-input">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-black">City</span>
          <input
            value={filters.city}
            onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
            className="input-field mt-2"
            placeholder="Haridwar, Delhi, Mumbai..."
          />
        </label>

        {filters.latitude && filters.longitude && (
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black">Nearby radius</span>
              <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-black text-white">{filters.radius || 5} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={filters.radius || 5}
              onChange={(event) => setFilters((prev) => ({ ...prev, radius: event.target.value }))}
              className="mt-3 w-full"
            />
            <p className="mt-2 text-xs font-semibold text-light-muted dark:text-dark-muted">Searching around the selected room location.</p>
          </div>
        )}

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
          <span className="text-sm font-black">Beds</span>
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
          <label key={field.key} className="block">
            <span className="text-sm font-black">{field.label}</span>
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

        {selectFilters.map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-black">{field.label}</span>
            <select
              value={filters[field.key]}
              onChange={(event) => setFilters((prev) => ({ ...prev, [field.key]: event.target.value }))}
              className="input-field mt-2"
            >
              <option value="">Any</option>
              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}

        {quickBooleanFilters.length > 0 && (
          <div>
            <span className="text-sm font-black">Booking preferences</span>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {quickBooleanFilters.map((field) => {
                const active = filters[field.key] === 'true';
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, [field.key]: active ? '' : 'true' }))}
                    className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-bold transition ${
                      active
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                        : 'border-light-border bg-light-bg text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted'
                    }`}
                  >
                    {field.label}
                    {active && <Check className="h-4 w-4" />}
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
            onChange={(event) => setFilters((prev) => ({ ...prev, availableFrom: event.target.value }))}
            className="input-field mt-2"
          />
        </label>

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
                  className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-bold transition ${
                    active
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-light-border bg-light-bg text-light-muted dark:border-dark-border dark:bg-dark-input dark:text-dark-muted'
                  }`}
                >
                  {field.label}
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={onClear} className="btn-outline">Clear</button>
        <button onClick={onApply} className="btn-primary">Apply</button>
      </div>
    </div>
  );
};

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => buildInitialFilters(searchParams));
  const [rooms, setRooms] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [naturalQuery, setNaturalQuery] = useState(searchParams.get('q') || '');
  const [smartLoading, setSmartLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const activeChips = useMemo(() => {
    const chips = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'amenities') {
        value.forEach((amenity) => chips.push({ key: `amenity-${amenity}`, label: amenities.find((item) => item.key === amenity)?.label || amenity, clear: () => setFilters((prev) => ({ ...prev, amenities: prev.amenities.filter((item) => item !== amenity) })) }));
        return;
      }
      if (['latitude', 'longitude'].includes(key)) return;
      if (key === 'radius' && value) {
        chips.push({
          key,
          label: `Within ${value} km`,
          clear: () => setFilters((prev) => ({ ...prev, radius: '', latitude: '', longitude: '' })),
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

    setSearchParams(params, { replace: true });
    const cacheKey = `${SEARCH_ROOMS_CACHE_PREFIX}:${params.toString()}`;
    const cached = readTabCache(cacheKey)?.value;

    if (cached) {
      setRooms(cached.rooms || []);
      setTotal(cached.total || 0);
      setTotalPages(cached.totalPages || 1);
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
      };

      setTabCache(cacheKey, nextSearchData);
      setRooms(nextSearchData.rooms);
      setTotal(nextSearchData.total);
      setTotalPages(nextSearchData.totalPages);
    } catch (error) {
      if (!cached) {
        setRooms([]);
        setTotal(0);
        setTotalPages(1);
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

  const applyFilters = () => {
    setPage(1);
    setIsFilterSheetOpen(false);
    fetchRooms();
  };

  const clearFilters = () => {
    setFilters(createEmptyFilters());
    setPage(1);
  };

  const handleSmartSearch = async (event) => {
    event.preventDefault();
    const query = naturalQuery.trim();
    if (!query) return;

    try {
      setSmartLoading(true);
      const { data } = await api.post('/search/smart', { query });
      const smartFilters = data.filters || {};
      setFilters((prev) => ({
        ...prev,
        city: smartFilters.city || '',
        minRent: smartFilters.minRent || '',
        maxRent: smartFilters.maxRent || '',
        roomType: smartFilters.roomType || '',
        familyStatus: smartFilters.familyStatus || '',
        gender: smartFilters.gender || '',
      }));
      setRooms(data.rooms || []);
      setTotal(data.count || 0);
      setTotalPages(1);
      setPage(1);
      const params = new URLSearchParams();
      params.set('q', query);
      Object.entries(smartFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      setSearchParams(params, { replace: true });
    } catch (error) {
      setRooms([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setSmartLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pt-24">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-card md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Search & browse</p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Showing {total} rooms{filters.city ? ` in ${filters.city}` : ''}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsFilterSheetOpen(true)} className="btn-outline inline-flex items-center gap-2 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button onClick={() => setShowMap((prev) => !prev)} className="btn-outline inline-flex items-center gap-2">
              {showMap ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
              {showMap ? 'List' : 'Map'}
            </button>
            <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="input-field min-h-12 w-auto">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <form onSubmit={handleSmartSearch} className="mb-6 rounded-3xl border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
              <input
                value={naturalQuery}
                onChange={(event) => setNaturalQuery(event.target.value)}
                className="input-field pl-12"
                placeholder="Try: 2BHK near Haridwar under 10000 for boys"
              />
            </div>
            <button type="submit" disabled={smartLoading || !naturalQuery.trim()} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {smartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Smart search
            </button>
          </div>
        </form>

        {activeChips.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
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

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
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
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)} className="btn-outline inline-flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <span className="rounded-xl bg-light-card px-4 py-3 text-sm font-black ring-1 ring-light-border dark:bg-dark-card dark:ring-dark-border">
                    Page {page} of {totalPages}
                  </span>
                  <button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)} className="btn-outline inline-flex items-center gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-light-border bg-light-card p-12 text-center dark:border-dark-border dark:bg-dark-card">
                <SlidersHorizontal className="mx-auto h-10 w-10 text-brand" />
                <h2 className="mt-5 text-2xl font-black">No rooms found</h2>
                <p className="mt-2 text-sm font-semibold text-light-muted dark:text-dark-muted">Try adjusting filters or clearing them completely.</p>
                <button onClick={clearFilters} className="btn-primary mt-6">Clear Filters</button>
              </div>
            )}
          </section>
        </div>
      </main>

      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-[10000] lg:hidden">
          <button aria-label="Close filters" className="absolute inset-0 bg-black/50" onClick={() => setIsFilterSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[88svh] overflow-hidden rounded-t-3xl bg-light-card shadow-2xl dark:bg-dark-card">
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
        </div>
      )}
    </div>
  );
}

export default SearchPage;
