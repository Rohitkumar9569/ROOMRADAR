// src/components/SearchBar.jsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, MapPinIcon, AdjustmentsHorizontalIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { FaLocationArrow } from 'react-icons/fa';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format } from 'date-fns';
import api from '../../../api';

const SuggestionsBox = ({ suggestions, onSelect }) => (
    <motion.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto z-50">
        {suggestions.map((place) => (
            <li key={place.properties.place_id} onClick={() => onSelect(place)} className="px-4 py-3 cursor-pointer hover:bg-gray-100 flex items-center gap-3 border-b last:border-0">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <div>
                    <p className="font-semibold text-sm">{place.properties.address_line1}</p>
                    <p className="text-xs text-gray-500">{place.properties.address_line2}</p>
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
            console.error('Error fetching suggestions:', error);
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
        <div className="flex items-center gap-2 w-full">
            <div ref={searchBarRef} className="relative flex-grow bg-white border rounded-full h-16 flex items-center shadow-md justify-between pr-2">
                <div className="relative flex-grow h-full">
                    <button onClick={() => setActivePopover('location')} className="w-full h-full px-4 md:px-6 text-left rounded-full hover:bg-gray-100 flex items-center gap-2">
                        <FaLocationArrow className="text-gray-500 flex-shrink-0 cursor-pointer hover:text-red-500" onClick={(e) => { e.stopPropagation(); handleCurrentLocation(); }}/>
                        <div className="flex-grow">
                            <label className="text-xs font-bold">Location</label>
                            <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); onCriteriaChange({ location: null }); }} placeholder="Search destinations" className="w-full bg-transparent outline-none text-sm placeholder-gray-400" />
                        </div>
                        {criteria.location && (
                            <button onClick={handleClear} className="pr-2">
                                <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                            </button>
                        )}
                    </button>
                    <AnimatePresence>{activePopover === 'location' && <SuggestionsBox suggestions={suggestions} onSelect={handleSelectSuggestion} />}</AnimatePresence>
                </div>
                
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                {/* REVERT TO CLICKABLE BUTTONS & ADD POPOVERS FOR DESKTOP */}
                <div className="relative hidden md:block">
                    <button onClick={() => setActivePopover('move-in')} className="w-48 h-full px-6 text-left rounded-full hover:bg-gray-100">
                        <label className="text-xs font-bold">Move-in Date</label>
                        <p className="text-sm text-gray-500">{criteria.moveInDate ? format(criteria.moveInDate, 'MMM dd, yyyy') : 'Add date'}</p>
                    </button>
                    <AnimatePresence>{activePopover === 'move-in' && (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50">
                            <DateRange
                                ranges={[{ startDate: criteria.moveInDate || new Date(), endDate: criteria.moveInDate || new Date(), key: 'selection' }]}
                                onChange={item => { onCriteriaChange({ moveInDate: item.selection.startDate }); setActivePopover('radius'); }}
                                minDate={new Date()}
                            />
                        </motion.div>
                    )}</AnimatePresence>
                </div>

                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                
                <div className="relative hidden md:block">
                    <button onClick={() => setActivePopover('radius')} className="w-48 h-full px-6 text-left rounded-full hover:bg-gray-100">
                        <label className="text-xs font-bold">Radius</label>
                        <p className="text-sm text-gray-500">{criteria.radius} km</p>
                    </button>
                    <AnimatePresence>{activePopover === 'radius' && (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="absolute top-full mt-2 right-0 bg-white p-4 rounded-lg shadow-lg border z-50 w-64">
                            <label className="text-sm font-semibold">Search Radius: {criteria.radius} km</label>
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

                <button onClick={onSearch} className="bg-red-500 text-white font-bold h-12 w-12 rounded-full flex items-center justify-center hover:bg-red-600 transition-all flex-shrink-0 ml-2">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
            </div>

            <button onClick={onFilterClick} className="p-3 border rounded-full shadow-md md:hidden">
                <AdjustmentsHorizontalIcon className="h-6 w-6" />
            </button>
        </div>
    );
}

export default SearchBar;