import React, { useState, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';

const SearchInput = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // This ref helps us manage the API call to avoid race conditions.
    const abortControllerRef = useRef(null);

    // Debounced function for making the API call
    const fetchSuggestions = useRef(
        debounce(async (query) => {
            // Cancel any previous requests to avoid conflicts
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const newAbortController = new AbortController();
            abortControllerRef.current = newAbortController;

            if (query.length < 3) {
                setSuggestions([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Use a free and reliable API for location search
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
                const response = await fetch(url, { signal: newAbortController.signal });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                setSuggestions(data);
                setIsLoading(false);
            } catch (err) {
                if (err.name === 'AbortError') {
                    // This is expected when a new request is made
                    console.log('Fetch aborted');
                } else {
                    setError('Failed to fetch suggestions.');
                    setIsLoading(false);
                    console.error('Error fetching suggestions:', err);
                }
            } finally {
                abortControllerRef.current = null;
            }
        }, 500) // Debounce delay of 500ms
    ).current;

    useEffect(() => {
        if (searchTerm) {
            fetchSuggestions(searchTerm);
        } else {
            setSuggestions([]);
        }
    }, [searchTerm, fetchSuggestions]);

    // Handle user selecting a suggestion
    const handleSelectSuggestion = (suggestion) => {
        // You can update the form state here with the selected suggestion's data
        console.log('Selected:', suggestion);
        setSearchTerm(suggestion.display_name);
        setSuggestions([]); // Clear suggestions
        // In a real app, you would also store lat/lng in state
        // For example: setLocation({ lat: suggestion.lat, lng: suggestion.lon });
    };

    return (
        <div className="search-container relative w-full max-w-2xl mx-auto">
            <div className="relative">
                <input
                    type="text"
                    className="w-full p-4 pl-12 rounded-full border-2 border-gray-300 focus:outline-none focus:border-blue-500 shadow-lg"
                    placeholder="Search by city (e.g., Chennai, Mumbai)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {/* Replace with your search icon */}
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {isLoading && (
                <div className="absolute z-10 w-full bg-white rounded-lg shadow-xl mt-2">
                    <p className="p-4 text-center text-gray-500">Loading...</p>
                </div>
            )}
            {error && (
                <div className="absolute z-10 w-full bg-red-100 rounded-lg shadow-xl mt-2">
                    <p className="p-4 text-center text-red-600">{error}</p>
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white rounded-lg shadow-xl mt-2 max-h-60 overflow-y-auto">
                    <ul>
                        {suggestions.map((suggestion) => (
                            <li
                                key={suggestion.osm_id}
                                className="p-4 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleSelectSuggestion(suggestion)}
                            >
                                <p className="font-semibold text-gray-800">{suggestion.display_name}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchInput;