// src/pages/student/RoomDetailsPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api'; // Make sure to use the api instance
import Spinner from '../../components/common/Spinner';

// Component Imports (paths updated to new structure)
import ImageGallery from '../../components/features/rooms/ImageGallery';
import BookingPanel from '../../components/features/booking/BookingPanel';
import AmenitiesList from '../../components/features/rooms/AmenitiesList';
import ReviewsSection from '../../components/features/rooms/ReviewsSection';
import InquiryModal from '../../components/features/chat/InquiryModal';

// Icon Imports
import { StarIcon, KeyIcon, WifiIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';

const RoomDetailsPage = () => {
    const { id: roomId } = useParams();
    const [room, setRoom] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

    useEffect(() => {
        const fetchRoomAndReviews = async () => {
            if (!roomId) return;
            try {
                setLoading(true);
                // Use the api instance
                const [roomRes, reviewsRes] = await Promise.all([
                    api.get(`/rooms/${roomId}`),
                    api.get(`/reviews/${roomId}`)
                ]);
                
                // Use the same logic as HomePage to handle both response structures
                const roomData = roomRes.data.data || roomRes.data;
                const reviewsData = reviewsRes.data.data || reviewsRes.data;

                setRoom(roomData);
                setReviews(reviewsData || []);

            } catch (err) {
                console.error("Error fetching room details:", err);
                setError('Could not fetch room details. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchRoomAndReviews();
    }, [roomId]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    
    // Check for error *after* loading
    if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
    
    // Check for room *after* loading and *after* error check
    if (!room) return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-grow flex items-center justify-center text-gray-500 text-xl">
                Room not found.
            </main>
        </div>
    );

    // Component JSX 
    const images = Array.isArray(room.images) && room.images.length > 0 ? room.images : [room.imageUrl];
    const roomDetails = {
        totalTenants: room.beds || 1,
        bedrooms: room.bedrooms || 1,
        beds: room.beds || 1,
        bathrooms: room.bathrooms || (room.facilities?.attachedWashroom ? 1 : 1),
    };

    return (
        <div className="bg-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
                
                <div className="mb-4">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{room.title}</h1>
                </div>

                <div className="mb-8">
                    <ImageGallery images={images} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-x-16 relative">
                    
                    <div className="lg:col-span-2">
                        <div className="border-b border-gray-200 pb-6 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">{room.roomType} in {room.location?.city}, {room.location?.state}</h2>
                            <p className="text-gray-600 mt-1">
                                {roomDetails.totalTenants} tenant{roomDetails.totalTenants > 1 && 's'} · 
                                {roomDetails.bedrooms} bedroom{roomDetails.bedrooms > 1 && 's'} · 
                                {roomDetails.beds} bed{roomDetails.beds > 1 && 's'} · 
                                {roomDetails.bathrooms} bathroom{roomDetails.bathrooms > 1 && 's'}
                            </p>
                            <div className="flex items-center space-x-2 mt-2 text-sm font-medium">
                                <StarIcon className="h-4 w-4 text-black" />
                                <span>{room.averageRating?.toFixed(1) || 'New'}</span>
                                <span className="text-gray-600">·</span>
                                <a href="#reviews" className="underline cursor-pointer hover:text-gray-900">{room.numReviews || 0} reviews</a>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-b border-gray-200 pb-6 mb-6">
                            <div className="h-14 w-14 rounded-full bg-neutral-800 flex items-center justify-center text-white text-2xl font-semibold overflow-hidden">
                                {room.landlord?.avatarUrl ? (
                                    <img src={room.landlord.avatarUrl} alt={room.landlord.name} className="w-full h-full object-cover" />
                                ) : (
                                    room.landlord?.name?.charAt(0).toUpperCase() || 'H'
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Hosted by {room.landlord?.name || 'Host'}</h3>
                                <p className="text-sm text-gray-500">
                                    Joined in {room.landlord?.createdAt ? format(new Date(room.landlord.createdAt), 'yyyy') : '2024'}
                                </p>
                            </div>
                        </div>

                        <div className="py-6 border-b border-gray-200 space-y-4">
                             <div className="flex items-start gap-4">
                                <KeyIcon className="h-6 w-6 mt-1 text-gray-700" />
                                <div>
                                    <h3 className="font-semibold text-gray-900">Self check-in</h3>
                                    <p className="text-sm text-gray-500">Check yourself in with the lockbox.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <WifiIcon className="h-6 w-6 mt-1 text-gray-700" />
                                <div>
                                    <h3 className="font-semibold text-gray-900">Great connectivity</h3>
                                    <p className="text-sm text-gray-500">Free WiFi is included.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <UserGroupIcon className="h-6 w-6 mt-1 text-gray-700" />
                                <div>
                                    <h3 className="font-semibold text-gray-900">Ideal for Students & Professionals</h3>
                                    <p className="text-sm text-gray-500">This location is perfect for your needs.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="py-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">About this space</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{room.description}</p>
                        </div>
                        <div className="py-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">What this place offers</h3>
                            <AmenitiesList facilities={room.facilities} />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-28">
                            <BookingPanel 
                                room={room} 
                                onContactLandlord={() => setIsInquiryModalOpen(true)}
                            />
                        </div>
                    </div>
                </div>
                
                <div id="reviews" className="py-8 border-t border-gray-200 mt-8">
                    <ReviewsSection 
                        reviews={reviews}
                        averageRating={room.averageRating}
                        numReviews={room.numReviews}
                    />
                </div>

            </div>

            {isInquiryModalOpen && (
                <InquiryModal 
                    room={room}
                    onClose={() => setIsInquiryModalOpen(false)}
                />
            )}
        </div>
    );
};

export default RoomDetailsPage;