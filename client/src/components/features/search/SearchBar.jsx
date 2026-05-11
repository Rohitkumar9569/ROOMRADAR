// src/components/SearchBar.jsx

import React, { lazy, Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, MapPinIcon, AdjustmentsHorizontalIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { FaLocationArrow } from 'react-icons/fa';
import api from '../../../api';

const DateRangePicker = lazy(() => import('./DateRangePicker'));
const dateLabelFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', day: '2-digit', year: 'numeric' });
const formatDateLabel = (date) => (date ? dateLabelFormatter.format(date) : 'Add date');

const SuggestionsBox = ({ suggestions, onSelect }) => (
    <motion.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-0 top-full z-[99999] mt-3 max-h-72 w-full overflow-y-auto rounded-3xl border border-light-border bg-white shadow-2xl shadow-slate-900/25 dark:border-dark-border dark:bg-dark-card">
        {suggestions.map((place) => (
            <li key={place.properties.place_id} onClick={() => onSelect(place)} className="flex cursor-pointer items-center gap-3 border-b border-light-border px-4 py-3 hover:bg-cyan-500/10 dark:border-dark-border dark:hover:bg-dark-input last:border-0">
                <MapPinIcon className="h-5 w-5 text-cyan-500" />
                <div>
                    <p className="text-sm font-black text-light-text dark:text-dark-text">{place.properties.address_line1}</p>
                    <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{place.properties.address_line2}</p>
                </div>
            </li>
        ))}
    </motion.ul>
);

function SearchBar({ criteria, onCriteriaChange, onSearch, onClear, onFilterClick }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    //  RE-ADD STATE TO CONTROL WHICH POPOVER IS OPEN 
    const [activePopover, setActivePopover] = useState(null);
    const searchBarRef = useRef(null);

    useEffect(() => {
        if (criteria.location) {
            setQuery(criteria.location.properties.formatted);
        } else {
            setQuery('');
        }
    }, [criteria.location]);

    const fetchSuggestions = async (searchText) => {
        if (!searchText || searchText.length < 2) {
            setSuggestions([]); return;
        }
        try {
            const { data } = await api.get(`/search/autocomplete?text=${encodeURIComponent(searchText)}`);
            setSuggestions(data.features || []);
        } catch (error) {
            setSuggestions([]);
        }
    };

    const debouncedFetch = useCallback(debounce(fetchSuggestions, 300), []);

    useEffect(() => {
        if (query && !criteria.location) {
            debouncedFetch(query);
        } else {
            setSuggestions([]);
        }
    }, [query, criteria.location, debouncedFetch]);

    const handleSelectSuggestion = (place) => {
        onCriteriaChange({ location: place });
        setSuggestions([]);
        setActivePopover('move-in'); // Automatically open next popover
    };

    const handleCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`);
                    const data = await response.json();
                    if(data.features?.length > 0){
                        handleSelectSuggestion(data.features[0]);
                    }
                } catch (error) {
                    toast.error("Could not find address for your location.");
                }
            }
        );
    };
    
    const handleClear = (e) => {
        e.stopPropagation();
        onClear();
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setActivePopover(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative z-[9999] flex w-full items-center gap-2">
            <div ref={searchBarRef} className="relative z-[9999] flex min-h-14 flex-grow items-center justify-between rounded-[1.35rem] border border-white/70 bg-white p-1 pr-1.5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-dark-border dark:bg-dark-sidebar sm:min-h-16 sm:rounded-2xl sm:pr-2">
                <div className="relative flex-grow h-full">
                    <button type="button" onClick={() => setActivePopover('location')} className="flex min-h-12 w-full items-center gap-2 rounded-[1rem] px-3 text-left hover:bg-light-bg dark:hover:bg-dark-input sm:min-h-14 md:px-5">
                        <FaLocationArrow className="h-4 w-4 flex-shrink-0 cursor-pointer text-cyan-500 hover:text-cyan-600 sm:h-auto sm:w-auto" onClick={(e) => { e.stopPropagation(); handleCurrentLocation(); }}/>
                        <div className="flex-grow">
                            <label className="text-[11px] font-black text-light-text dark:text-dark-text sm:text-xs">Location</label>
                            <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); onCriteriaChange({ location: null }); }} placeholder="Search destination" className="w-full bg-transparent text-[13px] font-semibold text-light-text outline-none placeholder:text-light-muted dark:text-dark-text dark:placeholder:text-dark-muted sm:text-sm" />
                        </div>
                        {criteria.location && (
                            <button type="button" onClick={handleClear} className="pr-2">
                                <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                            </button>
                        )}
                    </button>
                    <AnimatePresence>{activePopover === 'location' && <SuggestionsBox suggestions={suggestions} onSelect={handleSelectSuggestion} />}</AnimatePresence>
                </div>
                
                <div className="hidden h-8 w-px bg-light-border dark:bg-dark-border md:block"></div>

                {/* REVERT TO CLICKABLE BUTTONS & ADD POPOVERS FOR DESKTOP */}
                <div className="relative hidden md:block">
                    <button type="button" onClick={() => setActivePopover('move-in')} className="min-h-14 w-44 rounded-xl px-5 text-left hover:bg-light-bg dark:hover:bg-dark-input">
                        <label className="text-xs font-black text-light-text dark:text-dark-text">Move-in Date</label>
                        <p className="text-sm font-semibold text-light-muted dark:text-dark-muted">{formatDateLabel(criteria.moveInDate)}</p>
                    </button>
                    <AnimatePresence>{activePopover === 'move-in' && (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute left-1/2 top-full z-[9999] mt-2 -translate-x-1/2">
                            <Suspense fallback={<div className="h-[23rem] w-[21rem] rounded-3xl bg-white shadow-2xl dark:bg-dark-card" />}>
                                <DateRangePicker
                                    ranges={[{ startDate: criteria.moveInDate || new Date(), endDate: criteria.moveInDate || new Date(), key: 'selection' }]}
                                    onChange={item => { onCriteriaChange({ moveInDate: item.selection.startDate }); setActivePopover('radius'); }}
                                    minDate={new Date()}
                                />
                            </Suspense>
                        </motion.div>
                    )}</AnimatePresence>
                </div>

                <div className="hidden h-8 w-px bg-light-border dark:bg-dark-border md:block"></div>

                <div className="relative hidden md:block">
                    <button type="button" onClick={() => setActivePopover('radius')} className="min-h-14 w-36 rounded-xl px-5 text-left hover:bg-light-bg dark:hover:bg-dark-input">
                        <label className="text-xs font-black text-light-text dark:text-dark-text">Radius</label>
                        <p className="text-sm font-semibold text-light-muted dark:text-dark-muted">{criteria.radius} km</p>
                    </button>
                    <AnimatePresence>{activePopover === 'radius' && (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute right-0 top-full z-[9999] mt-2 w-64 rounded-2xl border border-light-border bg-white p-4 shadow-2xl dark:border-dark-border dark:bg-dark-card">
                            <label className="text-sm font-semibold text-light-text dark:text-dark-text">Search Radius: {criteria.radius} km</label>
                            <input
                                type="range"
                                min="1" max="20"
                                value={criteria.radius}
                                onChange={(e) => onCriteriaChange({ radius: Number(e.target.value) })}
                                className="w-full mt-2"
                            />
                        </motion.div>
                    )}</AnimatePresence>
                </div>

                <button type="button" onClick={onSearch} className="ml-1.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[1rem] bg-brand font-bold text-white transition-all hover:bg-red-600 active:scale-[0.97] sm:ml-2 sm:h-12 sm:w-12 sm:rounded-2xl">
                    <MagnifyingGlassIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </button>
            </div>

            <button type="button" onClick={onFilterClick} className="rounded-[1.15rem] border border-white/70 bg-white/95 p-2.5 shadow-xl shadow-slate-950/15 md:hidden dark:border-dark-border dark:bg-dark-sidebar">
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </button>
        </div>
    );
}

export default SearchBar;
