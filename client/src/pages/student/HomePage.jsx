import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api';
import Header from '../../components/layout/Header';
import SearchBar from '../../components/features/search/SearchBar';
import RoomCard from '../../components/features/rooms/RoomCard';
import RoomCardSkeleton from '../../components/common/RoomCardSkeleton';
import { useAuth } from '../../context/AuthContext';
import { readTabCache, setTabCache } from '../../utils/tabDataCache';
import { formatListingTitle } from '../../utils/listingDisplay';
import { clearCachedLocation, createManualLocationSignal, getLocationLabel, getLocationSearchParams, getMobileAutoLocation, readCachedLocation, saveSearchedLocation } from '../../utils/mobileLocationAutofill';
import { trackUsageEvent } from '../../utils/usageAnalytics';
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Building2,
  CheckCircle2,
  Handshake,
  Home,
  Hotel,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import backgroundImage from '../../assets/background_img.jpg';

const FilterModal = lazy(() => import('../../components/features/rooms/FilterModal'));
const HOME_LANDING_CACHE_KEY = 'student:home:landing:v2';
const HOME_CATEGORY_CACHE_PREFIX = 'student:home:category:v2';
const HOME_RAIL_ROOM_LIMIT = '4';
const HOME_CATEGORY_ROOM_LIMIT = '12';

const categories = [
  { id: 'All', label: 'All', Icon: Home },
  { id: 'Rooms', label: 'Rooms', Icon: BedDouble },
  { id: 'PG', label: 'PG', Icon: Building2 },
  { id: 'Flats', label: 'Flats', Icon: Home },
  { id: 'Studio', label: 'Studio', Icon: Hotel },
  { id: 'Shared Room', label: 'Co-living', Icon: Users },
  { id: 'Hostel', label: 'Hostels', Icon: Handshake },
];

const formatCount = (value) => Number(value || 0).toLocaleString('en-IN');

const isRenderableRoomCard = (room = {}) => (
  Boolean(room?._id)
  && Boolean(String(room.title || '').trim())
  && Number(room.rent || 0) > 0
  && Boolean(String(room.location?.city || room.city || '').trim())
);

const realRoomList = (rooms) => (Array.isArray(rooms) ? rooms.filter(isRenderableRoomCard) : []);

const normalizeLocationTerm = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const isUsefulLocationTerm = (value = '') => {
  const term = normalizeLocationTerm(value);
  return Boolean(term && term.length >= 3 && !['india', 'current location', 'my location', 'near me', 'your location'].includes(term));
};

const getLocationTerms = (locationSignal) => {
  const props = locationSignal?.place?.properties || locationSignal?.properties || {};
  const rawTerms = [
    props.city,
    props.address_line1,
    props.locality,
    props.county,
    props.state_district,
    locationSignal?.query,
  ];

  return [...new Set(rawTerms
    .flatMap((value) => String(value || '').split(','))
    .map(normalizeLocationTerm)
    .filter(isUsefulLocationTerm))];
};

const roomMatchesLocationTerms = (room = {}, terms = []) => {
  if (!terms.length) return true;
  const locationText = [
    room.location?.city,
    room.location?.locality,
    room.location?.landmark,
    room.location?.state,
    room.location?.pincode,
    room.location?.postalCode,
    room.location?.fullAddress,
    room.city,
    room.locality,
    room.landmark,
  ].map(normalizeLocationTerm).filter(Boolean);

  return terms.some((term) => locationText.some((text) => text === term || text.includes(term)));
};

const filterRoomsForLocation = (rooms, terms) => {
  const list = realRoomList(rooms);
  if (!terms?.length) return list;
  return list.filter((room) => roomMatchesLocationTerms(room, terms));
};

const hasLocationCoordinates = (locationSignal) => {
  const props = locationSignal?.place?.properties || locationSignal?.properties || {};
  const lat = props.lat ?? props.latitude;
  const lon = props.lon ?? props.lng ?? props.longitude;
  return lat !== undefined && lat !== null && lat !== '' && lon !== undefined && lon !== null && lon !== '';
};

const excludeRoomsById = (rooms, excludedRooms = []) => {
  const excludedIds = new Set(realRoomList(excludedRooms).map((room) => String(room._id)));
  return realRoomList(rooms).filter((room) => !excludedIds.has(String(room._id)));
};

const buildLocationAwareRoomUrl = (baseEntries, locationQuery, { strictLocation = false } = {}) => {
  const params = new URLSearchParams(baseEntries);
  if (locationQuery) {
    new URLSearchParams(locationQuery).forEach((value, key) => params.set(key, value));
    params.set('page', '1');
    if (strictLocation) params.set('strictLocation', 'true');
  }
  return `/rooms?${params.toString()}`;
};

const createCityLocationSignal = (city, source = 'profile') => {
  const cleanCity = String(city || '').trim();
  if (!cleanCity) return null;
  return {
    source,
    query: cleanCity,
    place: {
      properties: {
        place_id: `${source}-city-${cleanCity.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        address_line1: cleanCity,
        address_line2: 'India',
        city: cleanCity,
        formatted: `${cleanCity}, India`,
      },
    },
  };
};

const getUserCitySignal = (user) => createCityLocationSignal(
  user?.roleProfiles?.student?.city
  || user?.city
  || user?.roleProfiles?.landlord?.city
  || '',
  'profile'
);

const createDefaultSearchCriteria = (locationSignal = null) => ({
  location: locationSignal?.place || null,
  locationQuery: locationSignal?.query || '',
  moveInDate: null,
  availabilityWindow: '',
  occupancyType: '',
  gender: 'Any',
  maxOccupants: '',
  radius: 8,
});

const SectionHeader = ({ eyebrow, title, action }) => (
  <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5">
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-cyan-600 dark:text-neutral-400">{eyebrow}</p>
      <h2 className="mt-1 text-[16px] font-semibold leading-tight tracking-normal text-light-text dark:text-dark-text sm:text-xl">{title}</h2>
    </div>
    {action}
  </div>
);

const RoomsGrid = React.memo(function RoomsGrid({ rooms, loading, priorityCount = 0, trackingContext = 'home' }) {
  const visibleRooms = realRoomList(rooms);

  if (loading) {
    return (
      <div className="mobile-room-grid grid gap-3 sm:gap-5 lg:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {Array.from({ length: 8 }).map((_, index) => <RoomCardSkeleton key={index} />)}
      </div>
    );
  }

  if (!visibleRooms.length) {
    return (
      <div className="rounded-3xl border border-dashed border-light-border bg-light-card p-10 text-center dark:border-dark-border dark:bg-dark-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
          <MapPin className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-xl font-black">No rooms available yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
          As landlords publish verified rooms, real listings will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mobile-room-grid grid gap-3 sm:gap-5 lg:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
      {visibleRooms.map((room, index) => (
        <RoomCard
          key={room._id}
          room={room}
          imagePriority={index < priorityCount}
          position={index + 1}
          trackingContext={trackingContext}
        />
      ))}
    </div>
  );
});

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cachedLocationSignal = useMemo(() => readCachedLocation(), []);
  const initialLocationQuery = useMemo(
    () => (cachedLocationSignal ? getLocationSearchParams(cachedLocationSignal, { radius: 12 }).toString() : ''),
    [cachedLocationSignal]
  );
  const cachedLandingData = readTabCache(initialLocationQuery ? `${HOME_LANDING_CACHE_KEY}:${initialLocationQuery}` : HOME_LANDING_CACHE_KEY)?.value
    || readTabCache(HOME_LANDING_CACHE_KEY)?.value;
  const [stats, setStats] = useState(() => cachedLandingData?.stats || { totalRooms: 0, totalCities: 0, totalUsers: 0, verifiedRooms: 0 });
  const [cities, setCities] = useState(() => cachedLandingData?.cities || []);
  const [popularRooms, setPopularRooms] = useState(() => realRoomList(cachedLandingData?.popularRooms || []));
  const [recommendedRooms, setRecommendedRooms] = useState(() => realRoomList(cachedLandingData?.recommendedRooms || []));
  const [categoryRooms, setCategoryRooms] = useState(() => realRoomList(readTabCache(`${HOME_CATEGORY_CACHE_PREFIX}:All:published`)?.value?.rooms || []));
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(() => !cachedLandingData);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileSearchCollapsed, setIsMobileSearchCollapsed] = useState(false);
  const [isMobileSearchPinned, setIsMobileSearchPinned] = useState(false);
  const [personalizedLocation, setPersonalizedLocation] = useState(() => cachedLocationSignal);
  const [locationClearedByUser, setLocationClearedByUser] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState(() => createDefaultSearchCriteria());

  const trustStats = useMemo(() => [
    { key: 'verified', label: 'Verified rooms', value: formatCount(stats.verifiedRooms || stats.totalRooms), Icon: ShieldCheck },
    { key: 'published', label: 'Published listings', value: formatCount(stats.totalRooms), Icon: Building2 },
    { key: 'cities', label: 'Active cities', value: formatCount(stats.totalCities), Icon: MapPin },
  ], [stats]);
  const personalizedLocationQuery = useMemo(
    () => (personalizedLocation ? getLocationSearchParams(personalizedLocation, { radius: 12 }).toString() : ''),
    [personalizedLocation]
  );
  const personalizedLocationTerms = useMemo(() => getLocationTerms(personalizedLocation), [personalizedLocation]);
  const personalizedLocationHasCoordinates = useMemo(() => hasLocationCoordinates(personalizedLocation), [personalizedLocation]);
  const userCitySignal = useMemo(() => getUserCitySignal(user), [user]);
  const visibleCategoryRooms = useMemo(
    () => realRoomList(categoryRooms),
    [categoryRooms]
  );
  const popularRoomDisplay = useMemo(() => {
    const rooms = realRoomList(popularRooms);
    if (!personalizedLocation || personalizedLocationHasCoordinates || !personalizedLocationTerms.length) {
      return { rooms, usedFallback: false };
    }

    const matchedRooms = filterRoomsForLocation(rooms, personalizedLocationTerms);
    return {
      rooms: matchedRooms.length ? matchedRooms : rooms,
      usedFallback: matchedRooms.length === 0 && rooms.length > 0,
    };
  }, [personalizedLocation, personalizedLocationHasCoordinates, personalizedLocationTerms, popularRooms]);
  const visiblePopularRooms = popularRoomDisplay.rooms;
  const visibleRecommendedRooms = useMemo(() => {
    const locationTerms = personalizedLocationHasCoordinates ? [] : personalizedLocationTerms;
    const exactRecommendations = filterRoomsForLocation(recommendedRooms, locationTerms);
    const recommendationBase = exactRecommendations.length || !locationTerms.length
      ? exactRecommendations
      : visiblePopularRooms.slice(0, Number(HOME_RAIL_ROOM_LIMIT));
    return excludeRoomsById(recommendationBase, visiblePopularRooms);
  }, [personalizedLocationHasCoordinates, personalizedLocationTerms, recommendedRooms, visiblePopularRooms]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mobileQuery = window.matchMedia('(max-width: 639px)');
    let frameId = null;

    const syncSearchDock = () => {
      frameId = null;
      setIsMobileSearchCollapsed(mobileQuery.matches && window.scrollY > 96 && !isMobileSearchPinned);
    };

    const scheduleSync = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(syncSearchDock);
    };

    scheduleSync();
    window.addEventListener('scroll', scheduleSync, { passive: true });

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', scheduleSync);
    } else {
      mobileQuery.addListener(scheduleSync);
    }

    return () => {
      window.removeEventListener('scroll', scheduleSync);
      if (mobileQuery.removeEventListener) {
        mobileQuery.removeEventListener('change', scheduleSync);
      } else {
        mobileQuery.removeListener(scheduleSync);
      }
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [isMobileSearchPinned]);

  useEffect(() => {
    if (locationClearedByUser) return undefined;
    let cancelled = false;

    const fillMobileLocation = async () => {
      try {
        const autoLocation = await getMobileAutoLocation({ mobileOnly: false });
        if (!autoLocation || cancelled || locationClearedByUser) return;
        setPersonalizedLocation(autoLocation);
      } catch {
        // Manual search remains available when location permission is dismissed.
      }
    };

    fillMobileLocation();
    return () => {
      cancelled = true;
    };
  }, [locationClearedByUser]);

  useEffect(() => {
    if (personalizedLocation || !userCitySignal || locationClearedByUser) return;
    saveSearchedLocation(userCitySignal);
    setPersonalizedLocation(userCitySignal);
  }, [locationClearedByUser, personalizedLocation, userCitySignal]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleHeaderLocationSearch = (event) => {
      if (event.detail?.inputId !== 'home-mobile-location-search') return;
      setIsMobileSearchPinned(true);
      setIsMobileSearchCollapsed(false);
    };

    window.addEventListener('roomradar:open-location-search', handleHeaderLocationSearch);
    return () => window.removeEventListener('roomradar:open-location-search', handleHeaderLocationSearch);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchLandingData = async () => {
      const landingCacheKey = personalizedLocationQuery
        ? `${HOME_LANDING_CACHE_KEY}:${personalizedLocationQuery}`
        : HOME_LANDING_CACHE_KEY;
      const cached = readTabCache(landingCacheKey)?.value;
      if (cached) {
        setStats(cached.stats || {});
        setCities(cached.cities || []);
        setPopularRooms(realRoomList(cached.popularRooms || []));
        setRecommendedRooms(realRoomList(cached.recommendedRooms || []));
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const [statsRes, citiesRes, popularRes, recommendedRes] = await Promise.all([
          api.get('/stats'),
          api.get('/stats/cities'),
          api.get(buildLocationAwareRoomUrl({ sort: 'views', limit: HOME_RAIL_ROOM_LIMIT }, personalizedLocationQuery)),
          api.get(`/rooms/recommended?${new URLSearchParams({
            limit: HOME_RAIL_ROOM_LIMIT,
            ...(personalizedLocationQuery ? Object.fromEntries(new URLSearchParams(personalizedLocationQuery)) : {}),
          }).toString()}`),
        ]);

        const nextLandingData = {
          stats: statsRes.data || {},
          cities: Array.isArray(citiesRes.data) ? citiesRes.data : [],
          popularRooms: realRoomList(popularRes.data.data || popularRes.data || []),
          recommendedRooms: realRoomList(recommendedRes.data.data || recommendedRes.data || []),
        };

        setTabCache(landingCacheKey, nextLandingData);
        if (!active) return;

        setStats(nextLandingData.stats);
        setCities(nextLandingData.cities);
        setPopularRooms(nextLandingData.popularRooms);
        setRecommendedRooms(nextLandingData.recommendedRooms);
      } catch (error) {
        if (!cached && active) {
          setPopularRooms([]);
          setRecommendedRooms([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLandingData();
    return () => {
      active = false;
    };
  }, [personalizedLocationQuery]);

  useEffect(() => {
    let active = true;

    const fetchCategoryRooms = async () => {
      const cacheKey = `${HOME_CATEGORY_CACHE_PREFIX}:${activeCategory}:published:${personalizedLocationQuery || 'all'}`;
      const cached = readTabCache(cacheKey)?.value;
      if (cached) {
        setCategoryRooms(realRoomList(cached.rooms || []));
        setCategoryLoading(false);
      } else {
        setCategoryLoading(true);
      }

      try {
        const baseParams = { sort: 'views', limit: HOME_CATEGORY_ROOM_LIMIT };
        if (activeCategory !== 'All') baseParams.type = activeCategory;
        const { data } = await api.get(buildLocationAwareRoomUrl(baseParams, personalizedLocationQuery));
        const rooms = realRoomList(data.data || data || []);
        setTabCache(cacheKey, { rooms });
        if (active) setCategoryRooms(rooms);
      } catch (error) {
        if (!cached && active) setCategoryRooms([]);
      } finally {
        if (active) setCategoryLoading(false);
      }
    };

    fetchCategoryRooms();
    return () => {
      active = false;
    };
  }, [activeCategory, personalizedLocationQuery]);

  const handleCriteriaChange = (newCriteria) => {
    if (newCriteria.location) {
      setLocationClearedByUser(false);
      setPersonalizedLocation({
        place: newCriteria.location,
        query: newCriteria.locationQuery || getLocationLabel(newCriteria.location),
      });
    }
    setSearchCriteria((prev) => ({ ...prev, ...newCriteria }));
  };

  const handleSearch = (overrides = {}) => {
    const nextCriteria = { ...searchCriteria, ...overrides };
    const params = new URLSearchParams();
    const typedLocation = nextCriteria.locationQuery?.trim();
    let searchedLocation = null;
    if (nextCriteria.location?.properties) {
      searchedLocation = {
        place: nextCriteria.location,
        query: typedLocation || getLocationLabel(nextCriteria.location),
        source: 'search',
      };
      const locationParams = getLocationSearchParams(searchedLocation, { radius: 8 });
      locationParams.forEach((value, key) => params.set(key, value));
    } else if (typedLocation) {
      searchedLocation = createManualLocationSignal(typedLocation);
      params.set('city', typedLocation);
    } else {
      toast.error('Please enter a location first.');
      return;
    }
    if (searchedLocation) {
      saveSearchedLocation(searchedLocation);
      setLocationClearedByUser(false);
      setPersonalizedLocation(searchedLocation);
    }
    trackUsageEvent('search_run', {
      metadata: {
        source: 'home_search',
        city: params.get('city') || typedLocation,
        hasGeo: params.has('latitude') && params.has('longitude'),
      },
    });
    params.set('sort', 'recommended');
    if (nextCriteria.type) params.set('type', nextCriteria.type);
    if (nextCriteria.roomType) params.set('roomType', nextCriteria.roomType);
    if (nextCriteria.listingCategory) params.set('listingCategory', nextCriteria.listingCategory);
    if (nextCriteria.maxRent) params.set('maxRent', nextCriteria.maxRent);
    if (nextCriteria.minRent) params.set('minRent', nextCriteria.minRent);
    if (nextCriteria.occupancyType) params.set('occupancyType', nextCriteria.occupancyType);
    if (nextCriteria.maxOccupants) params.set('maxOccupants', nextCriteria.maxOccupants);
    if (nextCriteria.gender && nextCriteria.gender !== 'Any') params.set('gender', nextCriteria.gender);
    if (nextCriteria.familyStatus || nextCriteria.occupancyType === 'family') params.set('familyStatus', nextCriteria.familyStatus || 'Family');
    if (nextCriteria.moveInDate) params.set('availableFrom', nextCriteria.moveInDate.toISOString().slice(0, 10));
    else if (nextCriteria.availabilityWindow) params.set('availabilityWindow', nextCriteria.availabilityWindow);
    navigate(`/rooms?${params.toString()}`);
  };

  const handleClearSearch = () => {
    clearCachedLocation();
    setLocationClearedByUser(true);
    setPersonalizedLocation(null);
    setSearchCriteria(createDefaultSearchCriteria());
  };

  const handleCityClick = (cityName) => {
    const cityLocation = saveSearchedLocation(cityName);
    if (cityLocation) {
      setLocationClearedByUser(false);
      setPersonalizedLocation(cityLocation);
    }
    trackUsageEvent('search_run', {
      metadata: {
        source: 'home_city_chip',
        city: cityName,
      },
    });
    navigate(`/rooms?city=${encodeURIComponent(cityName)}`);
  };

  const buildRoomsPath = (entries = {}) => {
    const params = new URLSearchParams();
    if (personalizedLocationQuery) {
      new URLSearchParams(personalizedLocationQuery).forEach((value, key) => params.set(key, value));
    }
    Object.entries(entries).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
    const queryString = params.toString();
    return queryString ? `/rooms?${queryString}` : '/rooms';
  };

  const handleTrustStatClick = (key) => {
    if (key === 'verified') {
      navigate(buildRoomsPath({ verifiedOnly: 'true', sort: 'popular' }));
      return;
    }

    if (key === 'published') {
      navigate(buildRoomsPath({ sort: 'newest' }));
      return;
    }

    const citiesSection = document.getElementById('home-live-cities');
    if (citiesSection) {
      citiesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigate('/rooms');
  };

  const heroRoom = visiblePopularRooms[0] || visibleCategoryRooms[0] || visibleRecommendedRooms[0] || popularRooms[0] || categoryRooms[0] || recommendedRooms[0];
  const heroImage = backgroundImage;
  const heroRoomCity = heroRoom?.location?.city || heroRoom?.city || '';
  const heroRoomTitle = heroRoom ? formatListingTitle(heroRoom.title, '') : '';
  const heroRoomRent = heroRoom ? Number(heroRoom.rent || 0) : 0;
  const heroRoomBeds = Number(heroRoom?.beds || 1);
  const heroRoomType = heroRoom?.roomType || heroRoom?.type || `${heroRoomBeds} bed${heroRoomBeds > 1 ? 's' : ''}`;
  const activeCategoryLabel = categories.find((category) => category.id === activeCategory)?.label || activeCategory;

  return (
    <div className="min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
      <Header />
      <div
        id="home-mobile-search-dock"
        data-home-search-dock
        className={`home-mobile-search-dock fixed inset-x-0 top-[var(--rr-mobile-header-offset)] z-40 px-3 pb-2 pt-2 sm:hidden ${isMobileSearchCollapsed ? 'is-collapsed' : ''} ${isMobileSearchPinned ? 'is-forced-open' : ''}`}
      >
        <div className="mx-auto max-w-md">
          <SearchBar
            criteria={searchCriteria}
            onCriteriaChange={handleCriteriaChange}
            onSearch={handleSearch}
            onFilterClick={() => setIsFilterModalOpen(true)}
            onClear={handleClearSearch}
            inputId="home-mobile-location-search"
          />
        </div>
      </div>

      <section className="relative flex min-h-[250px] flex-col overflow-visible bg-light-bg pt-[calc(var(--rr-mobile-header-offset)+5rem)] dark:bg-dark-bg sm:min-h-[100svh] sm:overflow-visible sm:pt-0">
        <img
          src={heroImage}
          alt="Premium RoomRadar stay"
          className="absolute inset-0 hidden h-full w-full object-cover object-[center_58%] sm:block"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <div className="home-hero-overlay absolute inset-0 hidden bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.74)_0%,rgba(2,6,23,0.52)_36%,rgba(2,6,23,0.24)_58%,rgba(2,6,23,0.10)_78%),linear-gradient(180deg,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.36)_38%,rgba(0,0,0,0.76)_100%)] sm:block" />
        <div className="home-hero-top-fade pointer-events-none absolute inset-x-0 top-0 hidden h-40 bg-gradient-to-b from-black/56 via-black/18 to-transparent sm:block" />
        <div className="home-hero-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 hidden h-72 bg-gradient-to-b from-transparent via-slate-950/26 to-light-bg dark:via-dark-bg/58 dark:to-dark-bg sm:block" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-start px-4 pb-4 pt-0 text-center sm:min-h-[100svh] sm:items-center sm:justify-center sm:px-6 sm:pb-8 sm:pt-24 lg:px-8">
          <div className="mx-auto flex w-full max-w-md flex-col items-center sm:max-w-4xl">
            <div className="mb-3 hidden max-w-full items-center justify-center gap-2 rounded-full border border-cyan-200/22 bg-cyan-300/10 px-2.5 py-1.5 text-white shadow-lg shadow-cyan-950/20 backdrop-blur-xl sm:mb-5 sm:inline-flex sm:px-4 sm:py-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/18 text-cyan-200">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-[10px] font-black uppercase tracking-[0.09em] text-white/92 sm:text-xs">Verified room discovery</span>
            </div>

            <h1 className="hidden max-w-[14ch] text-center text-[clamp(31px,9.4vw,60px)] font-black leading-[0.96] tracking-[-0.045em] text-white drop-shadow-[0_16px_32px_rgba(0,0,0,0.42)] sm:block sm:max-w-[18ch] sm:leading-[1.02]">
              <span className="block sm:inline">Find Your Perfect</span>
              <span className="block sm:inline sm:ml-3">Room</span>
            </h1>
            <p
              className="mt-3 hidden max-w-[30ch] text-center text-[clamp(13px,3.7vw,17px)] font-bold leading-[1.45] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.82)] sm:mt-5 sm:block sm:max-w-[38ch]"
              style={{ color: '#ffffff' }}
            >
              Search verified listings, compare real prices, and request safely from one clean view.
            </p>

            <div className="home-hero-search-shell relative z-50 mt-0 hidden w-full max-w-3xl rounded-[1.65rem] bg-transparent p-0 shadow-none ring-0 sm:mx-auto sm:mt-8 sm:block">
              <SearchBar
                criteria={searchCriteria}
                onCriteriaChange={handleCriteriaChange}
                onSearch={handleSearch}
                onFilterClick={() => setIsFilterModalOpen(true)}
                onClear={handleClearSearch}
                inputId="home-desktop-location-search"
              />
            </div>

            <div className="relative z-10 mt-3 grid w-full max-w-md grid-cols-3 gap-2 overflow-visible border-0 bg-transparent shadow-none sm:mx-auto sm:mt-8 sm:max-w-2xl sm:gap-6">
              {trustStats.map(({ key, label, value, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleTrustStatClick(key)}
                  className="group min-w-0 rounded-2xl px-1 py-2 text-center transition active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:hover:bg-white/10"
                  aria-label={`Open ${label.toLowerCase()}`}
                >
                  <Icon className="mx-auto h-4 w-4 text-cyan-600 dark:text-cyan-300 sm:h-5 sm:w-5" />
                  <p className="mt-1 text-lg font-black text-light-text dark:text-dark-text sm:mt-2 sm:text-3xl sm:text-white dark:sm:text-dark-text">{value}</p>
                  <p className="mx-auto mt-0.5 max-w-[9ch] text-[9px] font-bold leading-tight text-light-muted transition group-hover:text-cyan-700 dark:text-dark-muted dark:group-hover:text-cyan-200 sm:mt-1 sm:max-w-none sm:text-sm sm:text-white/78 sm:group-hover:text-white dark:sm:text-dark-muted">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {heroRoom && (
          <div className="hidden mt-5 w-full max-w-md sm:hidden">
            <div className="rounded-[1.45rem] border border-white/16 bg-slate-950/30 p-3 text-white shadow-2xl shadow-black/24 backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => navigate(`/room/${heroRoom._id}`)}
                className="flex w-full items-center justify-between gap-3 text-left transition active:scale-[0.985]"
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/90">Featured now</p>
                  <h2 className="mt-1 truncate text-sm font-black tracking-[-0.02em]">{heroRoomTitle}</h2>
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-white/68">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-cyan-200" />
                    {heroRoomCity}
                    <span className="mx-1 h-1 w-1 rounded-full bg-white/35" />
                    {heroRoomType}
                  </p>
                </div>
                <span className="flex flex-shrink-0 flex-col items-end rounded-2xl bg-white/16 px-3 py-2 text-right ring-1 ring-white/12">
                  <span className="text-sm font-black">{heroRoomRent ? `₹${formatCount(heroRoomRent)}` : 'Explore'}</span>
                  <span className="text-[9px] font-black uppercase text-white/58">{heroRoomRent ? '/month' : 'rooms'}</span>
                </span>
              </button>
            </div>
          </div>
          )}
        </div>
      </section>

      <main className="home-content-surface mx-auto max-w-7xl px-3 pb-28 sm:px-6 lg:px-8">
        <section className="mt-6">
          <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex min-h-9 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-all sm:min-h-10 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm ${
                  activeCategory === category.id
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'border border-light-border bg-light-card text-light-muted hover:border-cyan-400 hover:text-cyan-700 dark:border-dark-border dark:bg-dark-card dark:text-dark-muted dark:hover:text-cyan-300'
                }`}
              >
                <category.Icon className="h-4 w-4" />
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            eyebrow="Explore rooms"
            title={activeCategory === 'All' ? 'All verified rooms on RoomRadar' : `${activeCategoryLabel} on RoomRadar`}
            action={(
              <button onClick={() => navigate(buildRoomsPath(activeCategory === 'All' ? {} : { type: activeCategory }))} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-light-border bg-light-card px-3 text-xs font-semibold text-light-text transition hover:border-cyan-400 hover:text-cyan-600 dark:border-dark-border dark:bg-dark-card dark:text-dark-text">
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          />
          <RoomsGrid rooms={visibleCategoryRooms} loading={categoryLoading || loading} priorityCount={4} trackingContext={`home_${activeCategory.toLowerCase().replace(/\s+/g, '_')}`} />
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow={popularRoomDisplay.usedFallback ? 'Popular rooms' : 'Popular near you'}
            title={popularRoomDisplay.usedFallback
              ? 'No exact nearby match yet, showing trusted popular rooms'
              : personalizedLocation ? 'Nearby verified rooms matched from current demand' : 'Most viewed verified rooms'}
          />
          <RoomsGrid rooms={visiblePopularRooms} loading={loading} trackingContext={popularRoomDisplay.usedFallback ? 'home_popular_fallback' : 'home_nearby'} />
        </section>

        {user && visibleRecommendedRooms.length > 0 && (
          <section className="mt-10 sm:mt-12">
            <SectionHeader
              eyebrow="Recommended for you"
              title={personalizedLocation ? 'Matched by location, trust, and room demand' : 'Rooms matched from current demand'}
            />
            <RoomsGrid rooms={visibleRecommendedRooms} loading={loading} trackingContext="home_recommended" />
          </section>
        )}

        {cities.length > 0 && (
          <section id="home-live-cities" className="scroll-mt-24 mt-12">
            <SectionHeader eyebrow="Live cities" title="Popular cities from real listings" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {cities.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleCityClick(city.name)}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-light-border bg-light-card/95 p-3 text-left shadow-sm transition hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-xl dark:border-dark-border dark:bg-dark-card/95 sm:rounded-3xl sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 sm:h-12 sm:w-12 sm:rounded-2xl">
                      <MapPin className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    {city.avgRent > 0 && (
                      <span className="rounded-full bg-brand/10 px-2 py-1 text-[8px] font-black text-brand sm:text-xs">
                        ₹{formatCount(city.avgRent)}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 truncate text-[12px] font-black uppercase tracking-[-0.01em] text-light-text dark:text-dark-text sm:mt-5 sm:text-lg">
                    {city.name}
                  </h3>
                  <p className="mt-1 text-[10px] font-bold leading-tight text-light-muted dark:text-dark-muted sm:text-sm">
                    {formatCount(city.count)} rooms
                  </p>
                  {city.avgRent > 0 && (
                    <p className="mt-1 text-[9px] font-black uppercase text-cyan-600 dark:text-cyan-300 sm:mt-3 sm:text-xs">Avg /month</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-2.5 sm:mt-12 sm:gap-4 md:grid-cols-3">
          {[
            { title: 'Search', text: 'Start with location, then refine by budget, tenant fit, move-in, and trust.', Icon: Search },
            { title: 'Request', text: 'Send a booking request with profile and stay details.', Icon: MessageCircle },
            { title: 'Move In', text: 'Confirm after host approval and keep the record in your dashboard.', Icon: CheckCircle2 },
          ].map(({ title, text, Icon }) => (
            <div key={title} className="card flex items-start gap-3 p-3.5 sm:block sm:p-6">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 sm:h-auto sm:w-auto sm:bg-transparent">
                <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-light-text dark:text-dark-text sm:mt-5 sm:text-lg">{title}</h3>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:mt-2 sm:text-sm sm:leading-6">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-light-border bg-light-card/95 p-3 text-light-text shadow-sm dark:border-dark-border dark:bg-dark-card/95 dark:text-dark-text sm:mt-12 sm:p-6 md:p-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="min-w-0 rounded-2xl bg-light-bg p-2.5 text-center dark:bg-dark-input sm:flex sm:items-center sm:gap-3 sm:bg-transparent sm:p-0 sm:text-left dark:sm:bg-transparent">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 sm:mx-0 sm:h-11 sm:w-11 sm:rounded-2xl">
                <BadgeCheck className="h-4 w-4 sm:h-6 sm:w-6" />
              </span>
              <span className="mt-1 block text-[10px] font-black leading-tight sm:mt-0 sm:text-lg">{formatCount(stats.verifiedRooms || stats.totalRooms)} Verified</span>
            </div>
            <div className="min-w-0 rounded-2xl bg-light-bg p-2.5 text-center dark:bg-dark-input sm:flex sm:items-center sm:gap-3 sm:bg-transparent sm:p-0 sm:text-left dark:sm:bg-transparent">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 sm:mx-0 sm:h-11 sm:w-11 sm:rounded-2xl">
                <ShieldCheck className="h-4 w-4 sm:h-6 sm:w-6" />
              </span>
              <span className="mt-1 block text-[10px] font-black leading-tight sm:mt-0 sm:text-lg">Safe Booking</span>
            </div>
            <div className="min-w-0 rounded-2xl bg-light-bg p-2.5 text-center dark:bg-dark-input sm:flex sm:items-center sm:gap-3 sm:bg-transparent sm:p-0 sm:text-left dark:sm:bg-transparent">
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 sm:mx-0 sm:h-11 sm:w-11 sm:rounded-2xl">
                <Home className="h-4 w-4 sm:h-6 sm:w-6" />
              </span>
              <span className="mt-1 block text-[10px] font-black leading-tight sm:mt-0 sm:text-lg">{formatCount(stats.totalCities)} Cities</span>
            </div>
          </div>
        </section>
      </main>

      {isFilterModalOpen && (
        <Suspense fallback={null}>
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            criteria={searchCriteria}
            onCriteriaChange={handleCriteriaChange}
            onApplyFilters={() => {
              setIsFilterModalOpen(false);
              handleSearch();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default HomePage;
