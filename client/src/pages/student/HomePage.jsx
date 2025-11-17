// src/pages/student/HomePage.jsx

import React, { useState, useEffect } from 'react';
import api from '../../api'; 
import { format } from 'date-fns';
import Header from '../../components/layout/Header';
import SearchBar from '../../components/features/search/SearchBar';
import RoomCard from '../../components/features/rooms/RoomCard';
import RoomCardSkeleton from '../../components/common/RoomCardSkeleton';
import FilterModal from '../../components/features/rooms/FilterModal';
import { FaMap } from 'react-icons/fa';
import toast from 'react-hot-toast';

function HomePage() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    
    const [searchCriteria, setSearchCriteria] = useState({
        location: null,
        moveInDate: null,
        radius: 5,
    });
    
    const fetchRooms = async (criteria) => {
        setLoading(true);
        setError(null);
        
        if (!criteria.location) {
            toast.error("Please select a location first.");
            setLoading(false);
            return;
        }

        const params = {
            latitude: criteria.location.properties.lat,
            longitude: criteria.location.properties.lon,
            radius: criteria.radius,
            moveInDate: criteria.moveInDate ? format(criteria.moveInDate, 'yyyy-MM-dd') : null,
        };

        try {
            const response = await api.post('/rooms/search', params);
            toast.success(`${response.data.count} rooms found!`);
            setListings(response.data.data || response.data);
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
            setError('Could not fetch rooms. Please try again later.');
            toast.error('Could not fetch rooms.');
        } finally {
            setLoading(false);
        }
    };
    
    const fetchAllRooms = async () => {
        setLoading(true);
        try {
            const response = await api.get('/rooms');
            setListings(response.data.data || response.data);
        } catch (err) {
           console.error("Failed to fetch all rooms:", err);
           toast.error('Could not fetch rooms.');
        } finally {
            setLoading(false);
        }
    };

    const handleCriteriaChange = (newCriteria) => {
        setSearchCriteria(prev => ({ ...prev, ...newCriteria }));
    };

    const handleSearch = () => {
        fetchRooms(searchCriteria);
    };

    const handleClearSearch = () => {
        setSearchCriteria({
            location: null,
            moveInDate: null,
            radius: 5,
        });
        fetchAllRooms();
        toast.success("Filters cleared!");
    };
    
    useEffect(() => {
        fetchAllRooms();
    }, []);

    return (
        <div className="font-sans bg-white">
            <div className="hidden lg:block">
                <Header />
            </div>

            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md py-4 border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SearchBar 
                        criteria={searchCriteria}
                        onCriteriaChange={handleCriteriaChange}
                        onSearch={handleSearch} 
                        onFilterClick={() => setIsFilterModalOpen(true)}
                        onClear={handleClearSearch}
                    />
                </div>
            </div>

            <main className="px-4 sm:px-6 md:px-10 lg:px-16 pb-8 pt-8">
                 <h2 className="text-2xl font-bold mb-6">Popular Homes</h2>
                {error ? (
                    <div className="text-center text-red-500 mt-16">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, index) => (
                                <RoomCardSkeleton key={index} />
                            ))
                        ) : (
                            listings.length > 0 ? (
                                listings.map(room => (
                                    <RoomCard key={room._id} room={room} />
                                ))
                            ) : (
                                <div className="col-span-full text-center text-gray-500 mt-16">
                                    <p>No rooms found for your search criteria.</p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </main>

            
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
        </div>
    );
}

export default HomePage;