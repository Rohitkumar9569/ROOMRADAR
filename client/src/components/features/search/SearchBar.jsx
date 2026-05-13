// src/components/SearchBar.jsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDaysIcon, MagnifyingGlassIcon, MapPinIcon, MinusIcon, PlusIcon, UsersIcon, XCircleIcon } from '@heroicons/react/24/solid';
import api from '../../../api';
import { indianCities } from '../../../data/indianCities';

const toDateInputValue = (date) => {
    if (!date) return '';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const getPlaceTitle = (place) => (
    place?.properties?.address_line1 ||
    place?.properties?.city ||
    place?.properties?.formatted ||
    'Selected location'
);

const getPlaceSubtitle = (place) => (
    place?.properties?.address_line2 ||
    place?.properties?.state ||
    place?.properties?.country ||
    'India'
);

const getPlaceQuery = (place) => (
    place?.properties?.formatted ||
    place?.properties?.address_line1 ||
    place?.properties?.city ||
    ''
);

const makeCitySuggestion = (city) => ({
    properties: {
        place_id: `city-${city.value}`,
        address_line1: city.label,
        address_line2: 'India',
        city: city.label,
        formatted: `${city.label}, India`,
    },
});

const getLocalCitySuggestions = (searchText) => {
    const normalized = searchText.trim().toUpperCase();
    if (normalized.length < 2) return [];
    return indianCities
        .filter((city) => city.value.includes(normalized) || city.label.toUpperCase().includes(normalized))
        .slice(0, 8)
        .map(makeCitySuggestion);
};

const SuggestionsBox = ({ suggestions, onSelect, query, loading }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="location-suggestions-popover absolute left-0 right-0 top-[calc(100%+0.55rem)] z-[10000] w-full overflow-hidden rounded-[1.35rem] border border-light-border bg-white shadow-lg shadow-slate-950/12 dark:border-dark-border dark:bg-dark-card md:rounded-3xl"
    >
        <div className="border-b border-light-border px-4 py-3 dark:border-dark-border">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-cyan-600 dark:text-cyan-300">Choose location</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-light-muted dark:text-dark-muted">{query || 'Search city or area'}</p>
        </div>
        <ul className="max-h-[min(52vh,24rem)] overflow-y-auto">
            {suggestions.map((place) => (
                <li key={place.properties.place_id || `${getPlaceTitle(place)}-${getPlaceSubtitle(place)}`}>
                    <button
                        type="button"
                        onClick={() => onSelect(place)}
                        className="flex w-full cursor-pointer items-center gap-3 border-b border-light-border px-4 py-3 text-left transition hover:bg-cyan-500/10 active:bg-cyan-500/15 dark:border-dark-border dark:hover:bg-dark-input last:border-0"
                    >
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                            <MapPinIcon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-light-text dark:text-dark-text">{getPlaceTitle(place)}</span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-light-muted dark:text-dark-muted">{getPlaceSubtitle(place)}</span>
                        </span>
                    </button>
                </li>
            ))}
            {!loading && query?.trim().length < 2 && suggestions.length === 0 && (
                <li className="px-4 py-5 text-sm font-semibold text-light-muted dark:text-dark-muted">
                    Start typing a city, area, or campus.
                </li>
            )}
            {!loading && query?.trim().length >= 2 && suggestions.length === 0 && (
                <li className="px-4 py-5 text-sm font-semibold text-light-muted dark:text-dark-muted">
                    Press search to look for "{query.trim()}".
                </li>
            )}
        </ul>
    </motion.div>
);

const OccupantStepper = ({ title, subtitle, value, min = 0, max = 10, onChange }) => (
    <div className="flex min-h-[3.65rem] items-center justify-between gap-3 border-b border-light-border px-3 py-2.5 last:border-b-0 dark:border-dark-border sm:min-h-[3.35rem] sm:py-2">
        <div className="min-w-0">
            <p className="text-sm font-black text-light-text dark:text-dark-text">{title}</p>
            <p className="mt-0.5 text-xs font-semibold text-light-muted dark:text-dark-muted">{subtitle}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
            <button
                type="button"
                onClick={() => onChange(value - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-light-text shadow-sm disabled:opacity-40 dark:bg-dark-card dark:text-dark-text"
                disabled={value <= min}
                aria-label={`Decrease ${title.toLowerCase()}`}
            >
                <MinusIcon className="h-4 w-4" />
            </button>
            <span className="w-5 text-center text-sm font-black text-light-text dark:text-dark-text">{value}</span>
            <button
                type="button"
                onClick={() => onChange(value + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-light-text shadow-sm disabled:opacity-40 dark:bg-dark-card dark:text-dark-text"
                disabled={value >= max}
                aria-label={`Increase ${title.toLowerCase()}`}
            >
                <PlusIcon className="h-4 w-4" />
            </button>
        </div>
    </div>
);

function SearchBar({ criteria, onCriteriaChange, onSearch, onClear, inputId = 'home-location-search' }) {
    const [query, setQuery] = useState(criteria.locationQuery || '');
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [activePopover, setActivePopover] = useState(null);
    const [activeStep, setActiveStep] = useState(null);
    const searchBarRef = useRef(null);
    const adultsCount = Math.max(1, Number(criteria.adults ?? criteria.maxOccupants ?? 1) || 1);
    const childrenCount = Math.max(0, Number(criteria.children || 0) || 0);
    const infantsCount = Math.max(0, Number(criteria.infants || 0) || 0);
    const genderPreference = criteria.gender || 'Any';
    const roomOccupants = Math.max(1, adultsCount + childrenCount);
    const setupSteps = ['move-in', 'people', 'radius'];
    const setupStepIndex = Math.max(0, setupSteps.indexOf(activeStep));

    useEffect(() => {
        if (criteria.location) {
            setQuery(getPlaceQuery(criteria.location));
        } else if (criteria.locationQuery !== undefined) {
            setQuery(criteria.locationQuery || '');
        }
    }, [criteria.location, criteria.locationQuery]);

    const fetchSuggestions = async (searchText) => {
        const localSuggestions = getLocalCitySuggestions(searchText);
        if (!searchText || searchText.length < 2) {
            setSuggestions([]);
            return;
        }

        setSuggestions(localSuggestions);
        setSuggestionsLoading(true);
        try {
            const { data } = await api.get(`/search/autocomplete?text=${encodeURIComponent(searchText)}`);
            const remoteSuggestions = Array.isArray(data.features) ? data.features : [];
            setSuggestions(remoteSuggestions.length ? remoteSuggestions : localSuggestions);
        } catch (error) {
            setSuggestions(localSuggestions);
        } finally {
            setSuggestionsLoading(false);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchSuggestions, 300), []);

    useEffect(() => {
        if (query && !criteria.location && activePopover === 'location') {
            debouncedFetch(query.trim());
        } else if (!query || criteria.location) {
            setSuggestions([]);
        }
    }, [query, criteria.location, activePopover, debouncedFetch]);

    const handleSelectSuggestion = (place) => {
        const placeQuery = getPlaceQuery(place);
        onCriteriaChange({ location: place, locationQuery: placeQuery });
        setQuery(placeQuery);
        setSuggestions([]);
        setActivePopover(null);
        setActiveStep('move-in');
    };

    const handleQueryChange = (event) => {
        const value = event.target.value;
        setQuery(value);
        onCriteriaChange({ location: null, locationQuery: value });
        setActivePopover('location');
    };

    const handleClear = (event) => {
        event.stopPropagation();
        setQuery('');
        setSuggestions([]);
        setActivePopover(null);
        setActiveStep(null);
        onClear();
    };

    const beginGuidedSearch = () => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery && !criteria.location?.properties) {
            toast.error('Please enter a location first.');
            setActivePopover('location');
            return;
        }
        if (trimmedQuery && !criteria.location) {
            onCriteriaChange({ location: null, locationQuery: trimmedQuery });
        }
        setActivePopover(null);
        setActiveStep('move-in');
    };

    const runSearch = (overrides = {}) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery && !criteria.location?.properties) {
            toast.error('Please enter a location first.');
            setActivePopover('location');
            return;
        }
        setActivePopover(null);
        setActiveStep(null);
        onSearch({ locationQuery: trimmedQuery, ...overrides });
    };

    const handleSubmitSearch = (event) => {
        event.preventDefault();
        beginGuidedSearch();
    };

    const setOccupantCount = (key, nextValue) => {
        const minimum = key === 'adults' ? 1 : 0;
        const value = Math.min(Math.max(Number(nextValue) || minimum, minimum), 10);
        const nextOccupants = {
            adults: adultsCount,
            children: childrenCount,
            infants: infantsCount,
            [key]: value,
        };

        onCriteriaChange({
            ...nextOccupants,
            maxOccupants: Math.max(1, nextOccupants.adults + nextOccupants.children),
        });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setActivePopover(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleOpenLocationSearch = (event) => {
            const targetInputId = event.detail?.inputId;
            if (targetInputId && targetInputId !== inputId) return;

            setActiveStep(null);
            setActivePopover('location');

            if (event.detail?.scrollIntoView) {
                searchBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            window.setTimeout(() => {
                document.getElementById(inputId)?.focus();
            }, 80);
        };

        window.addEventListener('roomradar:open-location-search', handleOpenLocationSearch);
        return () => window.removeEventListener('roomradar:open-location-search', handleOpenLocationSearch);
    }, [inputId]);

    return (
        <div ref={searchBarRef} className="rr-location-search-root relative z-[9999] w-full">
            <form
                onSubmit={handleSubmitSearch}
                className="home-location-search-form relative z-[9999] flex min-h-14 w-full flex-grow items-center justify-between rounded-full border-[2px] border-slate-800 bg-white px-4 shadow-none dark:border-white/80 dark:bg-dark-sidebar sm:min-h-16 sm:px-5"
            >
                <div className="relative h-full min-w-0 flex-grow">
                    <div
                        onClick={() => setActivePopover('location')}
                        className="home-location-search-input flex min-h-12 w-full items-center text-left sm:min-h-14"
                    >
                        <div className="min-w-0 flex-grow">
                            <input
                                id={inputId}
                                type="text"
                                value={query}
                                onFocus={() => setActivePopover('location')}
                                onChange={handleQueryChange}
                                placeholder="Search city, area, or campus"
                                className="w-full bg-transparent text-[18px] font-medium text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-300 sm:text-[22px]"
                                autoComplete="off"
                            />
                        </div>
                        {(criteria.location || query) && (
                            <button type="button" onClick={handleClear} className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800" aria-label="Clear location">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>

                <button type="submit" className="home-location-search-submit ml-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-transparent text-slate-900 transition-all active:scale-[0.94] dark:text-white sm:h-12 sm:w-12" aria-label="Search rooms">
                    <MagnifyingGlassIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                </button>
            </form>

            <AnimatePresence>
                {activePopover === 'location' && (
                    <SuggestionsBox suggestions={suggestions} onSelect={handleSelectSuggestion} query={query} loading={suggestionsLoading} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeStep && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="search-setup-popover absolute right-0 top-[calc(100%+0.55rem)] z-[10000] flex max-h-[min(62svh,30rem)] w-full flex-col overflow-hidden rounded-[1.45rem] border border-light-border bg-white shadow-xl shadow-slate-950/12 dark:border-dark-border dark:bg-dark-card sm:max-w-[25rem] md:max-w-[24rem]"
                    >
                        <div className="search-setup-header flex items-start justify-between gap-3 px-3.5 py-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-black uppercase leading-none text-cyan-700 dark:bg-cyan-300/12 dark:text-cyan-200">Search setup</p>
                                    <span className="text-[11px] font-black text-light-muted dark:text-dark-muted">Step {setupStepIndex + 1}/3</span>
                                </div>
                                <p className="mt-2 truncate text-[15px] font-black leading-tight text-light-text dark:text-dark-text">{criteria.location ? getPlaceTitle(criteria.location) : query.trim()}</p>
                                <div className="mt-2 flex gap-1.5" aria-hidden="true">
                                    {setupSteps.map((step, index) => (
                                        <span
                                            key={step}
                                            className={`h-1.5 flex-1 rounded-full ${index <= setupStepIndex ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveStep(null)}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                                aria-label="Close search setup"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                            {activeStep === 'move-in' && (
                                <div className="search-setup-card">
                                    <div className="mb-3 flex items-center gap-3">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-600 dark:bg-cyan-300/12 dark:text-cyan-200">
                                            <CalendarDaysIcon className="h-[18px] w-[18px]" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-black leading-tight text-light-text dark:text-dark-text">Move-in?</h3>
                                            <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">Date is optional for monthly stays.</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <input
                                            type="date"
                                            min={new Date().toISOString().slice(0, 10)}
                                            value={toDateInputValue(criteria.moveInDate)}
                                            onChange={(event) => {
                                                onCriteriaChange({ moveInDate: event.target.value ? new Date(`${event.target.value}T00:00:00`) : null });
                                                setActiveStep('people');
                                            }}
                                            className="input-field min-h-11 rounded-2xl"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onCriteriaChange({ moveInDate: null });
                                                setActiveStep('people');
                                            }}
                                            className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-black text-light-text transition active:scale-[0.98] dark:bg-dark-input dark:text-dark-text"
                                        >
                                            Any time
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeStep === 'people' && (
                                <div className="search-setup-card">
                                    <div className="mb-3 flex items-center gap-3">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-600 dark:bg-cyan-300/12 dark:text-cyan-200">
                                            <UsersIcon className="h-[18px] w-[18px]" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-black leading-tight text-light-text dark:text-dark-text">Who?</h3>
                                            <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">Rooms will match the selected capacity and tenant preference.</p>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-2xl border border-light-border bg-white dark:border-dark-border dark:bg-dark-sidebar">
                                        <OccupantStepper
                                            title="Adults"
                                            subtitle="Ages 13 or above"
                                            value={adultsCount}
                                            min={1}
                                            onChange={(value) => setOccupantCount('adults', value)}
                                        />
                                        <OccupantStepper
                                            title="Children"
                                            subtitle="Ages 2-12"
                                            value={childrenCount}
                                            min={0}
                                            onChange={(value) => setOccupantCount('children', value)}
                                        />
                                        <OccupantStepper
                                            title="Infants"
                                            subtitle="Under 2"
                                            value={infantsCount}
                                            min={0}
                                            onChange={(value) => setOccupantCount('infants', value)}
                                        />
                                    </div>

                                    <div className="mt-2.5 rounded-2xl border border-light-border bg-white p-2.5 dark:border-dark-border dark:bg-dark-sidebar">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-light-text dark:text-dark-text">Gender preference</p>
                                                <p className="mt-0.5 text-xs font-semibold text-light-muted dark:text-dark-muted">Match rooms allowed for the selected occupant.</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-light-muted shadow-sm dark:bg-dark-card dark:text-dark-muted">
                                                {roomOccupants} occupant{roomOccupants === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <div className="mt-2.5 grid grid-cols-3 gap-2">
                                            {[
                                                { value: 'Any', label: 'Any' },
                                                { value: 'Male', label: 'Men' },
                                                { value: 'Female', label: 'Women' },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => onCriteriaChange({ gender: option.value })}
                                                    className={`min-h-9 rounded-full border px-3 text-xs font-black transition ${
                                                        genderPreference === option.value
                                                            ? 'border-cyan-600 bg-cyan-600 text-white'
                                                            : 'border-light-border bg-slate-50 text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStep === 'radius' && (
                                <div className="search-setup-card">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-black leading-tight text-light-text dark:text-dark-text">Search radius</h3>
                                            <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">Nearby rooms within selected area.</p>
                                        </div>
                                        <span className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-black text-white">{criteria.radius || 5} km</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={criteria.radius || 5}
                                        onChange={(event) => onCriteriaChange({ radius: Number(event.target.value) })}
                                        className="w-full accent-cyan-500"
                                    />
                                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                                        {[2, 5, 10, 20].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => onCriteriaChange({ radius: value })}
                                                className={`rounded-full px-2 py-2 text-xs font-black ${Number(criteria.radius || 5) === value ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-light-muted dark:bg-dark-input dark:text-dark-muted'}`}
                                            >
                                                {value} km
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="search-setup-footer flex items-center justify-between gap-3 border-t border-light-border bg-white px-3 py-3 dark:border-dark-border dark:bg-dark-card">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="min-h-11 rounded-full px-3 text-sm font-black text-light-muted transition hover:text-light-text active:scale-[0.98] dark:text-dark-muted dark:hover:text-dark-text"
                            >
                                Clear all
                            </button>
                            {activeStep === 'move-in' && (
                                <button type="button" onClick={() => setActiveStep('people')} className="btn-primary min-h-11 rounded-full px-6 py-2">
                                    Next
                                </button>
                            )}
                            {activeStep === 'people' && (
                                <button type="button" onClick={() => setActiveStep('radius')} className="btn-primary min-h-11 rounded-full px-6 py-2">
                                    Next
                                </button>
                            )}
                            {activeStep === 'radius' && (
                                <button type="button" onClick={() => runSearch()} className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-2">
                                    <MagnifyingGlassIcon className="h-4 w-4" />
                                    Search
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SearchBar;
