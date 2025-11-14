// src/components/features/rooms/RoomCard.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Heart, Star, ChevronLeft, ChevronRight, 
    User, // for Single Room
    Users, // for Shared Room
    Home, // for BHK/Flat
    PersonStanding, // for Gender
    Award, // for Guest Favourite
    Users2 // for Family
} from 'lucide-react'; 
import PropTypes from 'prop-types';
import { useAuth } from '../../../context/AuthContext';

function RoomCard({ room }) {
    const { user, addToWishlist, removeFromWishlist } = useAuth();
    
    // --- (Image Carousel & Wishlist logic - No changes) ---
    const imageUrls = Array.isArray(room.imageUrls) && room.imageUrls.length > 0 
        ? room.imageUrls 
        : [room.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'];
    
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const isWishlisted = user?.wishlist?.includes(room._id);

    const handleWishlistClick = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return; 
        if (isWishlisted) removeFromWishlist(room._id);
        else addToWishlist(room._id);
    };
    const handleNextImage = (e) => {
        e.preventDefault(); e.stopPropagation();
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
    };
    const handlePrevImage = (e) => {
        e.preventDefault(); e.stopPropagation();
        setCurrentImageIndex((prevIndex) => (prevIndex - 1 + imageUrls.length) % imageUrls.length);
    };
    const goToSlide = (slideIndex) => {
        setCurrentImageIndex(slideIndex);
    };



    // Room Type Tag (This is correct)
    const getRoomTypeTag = () => {
        const type = room.roomType || '';
        let icon = <User size={14} />;
        let text = 'Private Room';

        if (type.includes('Single')) {
            icon = <User size={14} />;
            text = 'Single Room';
        } else if (type.includes('2 beds')) {
            icon = <Users size={14} />;
            text = '2-Bed Sharing';
        } else if (type.includes('3+ beds')) {
            icon = <Users size={14} />;
            text = '3+ Bed Sharing';
        } else if (type.includes('BHK')) {
            icon = <Home size={14} />;
            text = type; // e.g., "1 BHK"
        } else {
            return null;
        }

        return (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md font-medium">
                {icon} {text}
            </span>
        );
    };

    //  Tenant Type Tag (This is the new smart logic)
    const getTenantTag = () => {
        if (!room) return null; 
        const prefs = room.tenantPreferences || {}; 
        
        // Default to 'Any' if data is missing
        const familyStatus = prefs.familyStatus || 'Any'; 
        const allowedGender = prefs.allowedGender || 'Any';

        

        // Rule 1: Family Only
        if (familyStatus === 'Family') {
            return (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-green-100 text-green-800 rounded-md font-medium">
                    <Users2 size={14} /> Family Only
                </span>
            );
        }
        
        // Rule 2: Bachelors Only
        if (familyStatus === 'Bachelors') {
            if (allowedGender === 'Male') {
                return (
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
                        <PersonStanding size={14} /> Bachelors (Men)
                    </span>
                );
            }
            if (allowedGender === 'Female') {
                return (
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-pink-100 text-pink-800 rounded-md font-medium">
                        <PersonStanding size={14} /> Bachelors (Women)
                    </span>
                );
            }
            if (allowedGender === 'Any') {
                return (
                     <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md font-medium">
                        <Users size={14} /> Bachelors (Male/Female)
                    </span>
                );
            }
        }

        //  Family Status is 'Any' (Bachelors OR Family)
        // This is the combination from your screenshot
        if (familyStatus === 'Any') {
            if (allowedGender === 'Male') {
                return (
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
                        <PersonStanding size={14} /> Men or Family
                    </span>
                );
            }
            if (allowedGender === 'Female') {
                return (
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-pink-100 text-pink-800 rounded-md font-medium">
                        <PersonStanding size={14} /> Women or Family
                    </span>
                );
            }
            // This is for 'Any' Gender AND 'Any' Family Status
            if (allowedGender === 'Any') {
                return (
                     <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md font-medium">
                        <Users2 size={14} /> Bachelors / Family
                    </span>
                );
            }
        }
        
        return null; // Default: show no tag
    };


    if (!room || !room._id) {
        return null;
    }

    const isGuestFavourite = (room.rating || 0) >= 4.8;

    return (
        <motion.div
            className="font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Link to={`/room/${room._id}`}>
                {/* --- Image Carousel --- */}
                <div 
                    className="relative"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isGuestFavourite && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-md">
                            <Award size={16} className="text-yellow-500" fill="currentColor" />
                            <span className="font-semibold text-sm text-gray-900">Guest favourite</span>
                        </div>
                    )}
                    <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-200">
                        <img
                            src={imageUrls[currentImageIndex]}
                            alt={room.title}
                            className="w-full h-full object-cover transition-transform duration-300 ease-in-out hover:scale-105"
                            loading="lazy"
                        />
                    </div>
                    {user && (
                        <button
                            onClick={handleWishlistClick}
                            className="absolute top-3 right-3 p-2 z-10"
                            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                            {isWishlisted ? (
                                <Heart className="w-6 h-6 text-red-500 fill-current drop-shadow-lg" />
                            ) : (
                                <Heart className="w-6 h-6 text-white drop-shadow-lg" />
                            )}
                        </button>
                    )}
                    {isHovered && imageUrls.length > 1 && (
                        <>
                            <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1.2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform z-10" aria-label="Previous image">
                                <ChevronLeft className="h-4 w-4 text-black" />
                            </button>
                            <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1.2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform z-10" aria-label="Next image">
                                <ChevronRight className="h-4 w-4 text-black" />
                            </button>
                        </>
                    )}
                    {imageUrls.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex space-x-1.5">
                            {imageUrls.map((_, slideIndex) => (
                                <div
                                    key={slideIndex}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        goToSlide(slideIndex);
                                    }}
                                    className={`h-1.5 w-1.5 cursor-pointer rounded-full ${
                                        currentImageIndex === slideIndex ? 'bg-white scale-125' : 'bg-white/60'
                                    } transition-all`}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- Card Text Content --- */}
                <div className="pt-3 space-y-1.5">
                    {/*  Location & Rating */}
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-base text-neutral-800 truncate pr-2">
                            {room.location?.city || room.city}, {room.location?.state || 'India'}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                            <Star className="h-4 w-4" fill="black" /> 
                            <span className="text-sm font-medium">{room.rating || 'New'}</span>
                        </div>
                    </div>

                    {/*  Tags (Room Type & Tenant Type) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {getRoomTypeTag()}
                        {getTenantTag()}
                    </div>

                    {/*  Price */}
                    <p className="pt-1">
                        <span className="font-semibold text-base">₹{new Intl.NumberFormat('en-IN').format(room.rent || 0)}</span>
                        <span className="text-neutral-600"> / month</span>
                    </p>
                </div>

            </Link>
        </motion.div>
    );
}

// --- PropTypes ---
RoomCard.propTypes = {
    room: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        imageUrl: PropTypes.string,
        imageUrls: PropTypes.arrayOf(PropTypes.string),
        title: PropTypes.string,
        city: PropTypes.string,
        location: PropTypes.shape({
            city: PropTypes.string,
            state: PropTypes.string,
        }),
        rent: PropTypes.number,
        rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        
        // Ensure these are passed in the 'room' prop from your API
        roomType: PropTypes.string,
        tenantPreferences: PropTypes.shape({
            familyStatus: PropTypes.string,
            allowedGender: PropTypes.string,
        }),
    }).isRequired,
};

export default RoomCard;