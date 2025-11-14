import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaCalendarAlt, FaUsers, FaTag } from 'react-icons/fa';

// Helper function to format dates
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const calculateTotalRent = (checkIn, checkOut, monthlyRent) => {
    if (!checkIn || !checkOut || !monthlyRent) return 'N/A';
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const dailyRent = monthlyRent / 30;
    const total = days * dailyRent;
    return Math.round(total);
};

const BookingActionPanel = ({ conversation, application }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!application || application.type !== 'request') {
        return null; 
    }

    const { checkInDate, checkOutDate, occupants } = application;
    const { room, otherParticipant } = conversation;

    const totalRent = calculateTotalRent(checkInDate, checkOutDate, room?.rent);

    const handleAccept = () => {
        console.log("Accept button clicked");
    };

    const handleDecline = () => {
        console.log("Decline button clicked");
    };

    const toggleExpansion = () => {
        setIsExpanded(!isExpanded);
    };

    // --- Expanded View ---
    if (isExpanded) {
        return (
            <div className="bg-white border-b border-gray-200 p-4 shadow-sm flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-gray-800">Booking Request Details</h3>
                    <button onClick={toggleExpansion} className="text-gray-500 hover:text-gray-800 p-2">
                        <FaChevronUp size={16} />
                        <span className="sr-only">Hide Details</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="flex items-start">
                        <FaCalendarAlt className="mr-2 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Check-in: {formatDate(checkInDate)}</p>
                            <p className="font-semibold">Check-out: {formatDate(checkOutDate)}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <FaUsers className="mr-2 text-gray-500" />
                        <p className="font-semibold">{occupants.adults} Adult{occupants.adults > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center">
                        <FaTag className="mr-2 text-gray-500" />
                        <p className="font-semibold text-lg text-green-600">₹{totalRent || 'N/A'}</p>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={handleDecline}
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                    >
                        Decline
                    </button>
                    <button 
                        onClick={handleAccept}
                        className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                        Accept
                    </button>
                </div>
            </div>
        );
    }

    // --- Collapsed View ---
    return (
        <div className="bg-white border-b border-gray-200 p-3 shadow-sm flex justify-between items-center flex-shrink-0">
            <p className="text-sm font-semibold text-gray-700">
                <span className="text-gray-900">{otherParticipant?.name}</span> - ₹{totalRent || 'N/A'}
            </p>
            <button onClick={toggleExpansion} className="text-gray-500 hover:text-gray-800 p-1">
                <FaChevronDown size={16} />
                <span className="sr-only">Show Details</span>
            </button>
        </div>
    );
};

export default BookingActionPanel;