// src/components/SearchBar.jsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPinIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Mic, MicOff, Search as SearchIcon } from 'lucide-react';
import api from '../../../api';
import { indianCities } from '../../../data/indianCities';
import { saveSearchedLocation } from '../../../utils/mobileLocationAutofill';
import { triggerHaptic } from '../../../utils/haptics';

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
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="location-suggestions-popover rr-search-suggestions absolute left-0 right-0 top-[calc(100%+0.55rem)] z-[10000] w-full overflow-hidden rounded-[1.35rem] border border-light-border bg-white shadow-lg shadow-slate-950/12 dark:border-dark-border dark:bg-dark-card md:rounded-3xl"
    >
        <div className="border-b border-light-border px-4 py-3 dark:border-dark-border">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-cyan-600 dark:text-cyan-300">Choose location</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-light-muted dark:text-dark-muted">{query || 'Search city or area'}</p>
        </div>
        <ul className="max-h-[min(52vh,24rem)] overflow-y-auto">
            {loading && (
                <li className="rr-search-suggestion-loading flex items-center gap-3 border-b border-light-border px-4 py-3 text-sm font-semibold text-light-muted dark:border-dark-border dark:text-dark-muted">
                    <span className="rr-search-loading-dot" aria-hidden="true" />
                    Searching locations...
                </li>
            )}
            {suggestions.map((place) => (
                <li key={place.properties.place_id || `${getPlaceTitle(place)}-${getPlaceSubtitle(place)}`}>
                    <button
                        type="button"
                        onClick={() => onSelect(place)}
                        className="rr-search-suggestion-item flex w-full cursor-pointer items-center gap-3 border-b border-light-border px-4 py-3 text-left transition hover:bg-cyan-500/10 active:bg-cyan-500/15 dark:border-dark-border dark:hover:bg-dark-input last:border-0"
                    >
                        <span className="rr-search-suggestion-icon flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
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
                    Start typing a city, area, landmark, or campus.
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

function SearchBar({ criteria, onCriteriaChange, onSearch, onClear, inputId = 'home-location-search' }) {
    const [query, setQuery] = useState(criteria.locationQuery || '');
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [activePopover, setActivePopover] = useState(null);
    const [listening, setListening] = useState(false);
    const searchBarRef = useRef(null);
    const recognitionRef = useRef(null);
    const listeningRef = useRef(false);
    const supportsVoiceSearch = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasQuery = Boolean(query.trim() || criteria.location);
    const isSearchOpen = activePopover === 'location';

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
        saveSearchedLocation({ place, query: placeQuery, source: 'search' });
        onCriteriaChange({ location: place, locationQuery: placeQuery });
        setQuery(placeQuery);
        setSuggestions([]);
        setActivePopover(null);
    };

    const handleQueryChange = (event) => {
        const value = event.target.value;
        setQuery(value);
        onCriteriaChange({ location: null, locationQuery: value });
        setActivePopover('location');
    };

    const handleClear = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        triggerHaptic('tap');
        setQuery('');
        setSuggestions([]);
        setActivePopover(null);
        onClear();
    };

    const runSearch = (overrides = {}) => {
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
        onSearch({ locationQuery: trimmedQuery, ...overrides });
    };

    const handleSubmitSearch = (event) => {
        event.preventDefault();
        triggerHaptic('tap');
        runSearch();
    };

    const stopVoiceSearch = () => {
        const recognition = recognitionRef.current;
        listeningRef.current = false;
        recognitionRef.current = null;
        setListening(false);

        if (!recognition) return;

        try {
            recognition.stop?.();
        } catch {
            recognition.abort?.();
        }
    };

    const handleVoiceSearch = () => {
        triggerHaptic('tap');
        if (!supportsVoiceSearch) {
            toast.error('Voice search is not supported in this browser.');
            return;
        }

        if (listening || listeningRef.current || recognitionRef.current) {
            stopVoiceSearch();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            listeningRef.current = true;
            recognitionRef.current = recognition;
            setListening(true);
        };
        recognition.onresult = (event) => {
            const transcript = event.results?.[0]?.[0]?.transcript?.trim();
            if (!transcript) return;
            setQuery(transcript);
            onCriteriaChange({ location: null, locationQuery: transcript });
            setActivePopover('location');
            debouncedFetch(transcript);
            triggerHaptic('success');
        };
        recognition.onerror = () => {
            toast.error('Could not capture voice search.');
            triggerHaptic('error');
            listeningRef.current = false;
            if (recognitionRef.current === recognition) recognitionRef.current = null;
            setListening(false);
        };
        recognition.onend = () => {
            listeningRef.current = false;
            if (recognitionRef.current === recognition) recognitionRef.current = null;
            setListening(false);
        };

        try {
            recognitionRef.current = recognition;
            listeningRef.current = true;
            setListening(true);
            recognition.start();
        } catch {
            listeningRef.current = false;
            recognitionRef.current = null;
            setListening(false);
            toast.error('Could not start voice search.');
        }
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

    useEffect(() => () => {
        listeningRef.current = false;
        recognitionRef.current?.abort?.();
        recognitionRef.current = null;
    }, []);

    useEffect(() => {
        const handleOpenLocationSearch = (event) => {
            const targetInputId = event.detail?.inputId;
            if (targetInputId && targetInputId !== inputId) return;

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
        <div
            ref={searchBarRef}
            className={`rr-location-search-root relative z-[9999] w-full ${isSearchOpen ? 'is-open' : ''} ${hasQuery ? 'has-query' : ''} ${listening ? 'is-listening' : ''}`}
        >
            <motion.form
                onSubmit={handleSubmitSearch}
                role="search"
                aria-label="Search rooms by location"
                initial={false}
                animate={{ y: isSearchOpen ? -1 : 0 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="home-location-search-form relative z-[9999] flex min-h-14 w-full flex-grow items-center justify-between rounded-full border-[2px] border-slate-800 bg-white px-4 shadow-none dark:border-white/80 dark:bg-dark-sidebar sm:min-h-16 sm:px-5"
            >
                <div className="relative h-full min-w-0 flex-grow">
                    <div
                        onClick={() => setActivePopover('location')}
                        className="home-location-search-input flex min-h-12 w-full items-center text-left sm:min-h-14"
                    >
                        <span className="home-location-leading-icon mr-2 hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#1a73e8] sm:inline-flex" aria-hidden="true">
                            <MapPinIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-grow">
                            <input
                                id={inputId}
                                type="text"
                                value={query}
                                onFocus={() => setActivePopover('location')}
                                onChange={handleQueryChange}
                                placeholder="Search city, area, landmark, or institute"
                                className="w-full bg-transparent text-[18px] font-medium text-slate-900 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-300 sm:text-[22px]"
                                autoComplete="off"
                            />
                        </div>
                        {(criteria.location || query) && (
                            <button type="button" onClick={handleClear} className="mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-slate-800" aria-label="Clear location">
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                        {supportsVoiceSearch && (
                            <button
                                type="button"
                                onClick={handleVoiceSearch}
                                className={`home-location-voice-btn mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition ${
                                    listening
                                        ? 'is-listening bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                        : 'text-slate-500 hover:bg-cyan-50 hover:text-cyan-600 dark:text-slate-300 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-200'
                                }`}
                                aria-pressed={listening}
                                aria-label={listening ? 'Stop voice search' : 'Search by voice'}
                            >
                                {listening ? (
                                    <MicOff className="h-5 w-5" strokeWidth={2.55} />
                                ) : (
                                    <Mic className="h-5 w-5" strokeWidth={2.55} />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <button type="submit" className="home-location-search-submit ml-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-transparent text-slate-900 transition-all active:scale-[0.94] dark:text-white sm:h-12 sm:w-12" aria-label="Search rooms">
                    <SearchIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.65} />
                </button>
            </motion.form>

            <AnimatePresence>
                {activePopover === 'location' && (
                    <SuggestionsBox suggestions={suggestions} onSelect={handleSelectSuggestion} query={query} loading={suggestionsLoading} />
                )}
            </AnimatePresence>
        </div>
    );
}

export default SearchBar;
