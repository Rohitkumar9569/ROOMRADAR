// src/components/ListingGrid.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import RoomCard from './RoomCard'; 
import Spinner from './Spinner';   

const ListingGrid = ({ rooms, loading, error }) => {
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 py-10">{error}</div>;
    }

    if (!rooms || rooms.length === 0) {
        return <div className="text-center text-gray-500 py-10">No rooms found. Try adjusting your search or filters.</div>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
            {rooms.map((room) => (
                <Link to={`/room/${room._id}`} key={room._id}>
                    <RoomCard 
                        images={room.imageUrls || [room.imageUrl]} 
                        location={`${room.address}, ${room.city}`}
                        landmark={room.distanceCollege?.value ? `${room.distanceCollege.value}km from college` : 'Prime location'}
                        availability={`Available from ${new Date(room.createdAt).toLocaleDateString()}`}
                        price={room.rent}
                        rating={room.averageRating || 4.5} 
                    />
                </Link>
            ))}
        </div>
    );
};

export default ListingGrid;