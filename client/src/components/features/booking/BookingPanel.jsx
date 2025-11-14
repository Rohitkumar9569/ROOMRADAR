import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import CalendarModal from './CalendarModal';
import BookingRequestModal from './BookingRequestModal';

const GuestsPopover = ({ guests, setGuests, maxGuests, petsAllowed, onClose }) => {
};


// --- Main Booking Panel Component ---
// Accept the new 'onContactLandlord' function as a prop 
const BookingPanel = ({ room, onContactLandlord }) => {
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isGuestsOpen, setIsGuestsOpen] = useState(false);
    const [dateRange, setDateRange] = useState([{ startDate: new Date(), endDate: null, key: 'selection' }]);
    const [guests, setGuests] = useState({ adults: 1, children: 0, infants: 0, pets: 0, male: 1, female: 0 });
    const totalTenants = guests.adults + guests.children;
    const rentPerMonth = room.rent || 0;

    const handleBookingRequest = () => {
        setIsBookingModalOpen(true);
    };

    const handleModalSuccess = () => {
        setIsBookingModalOpen(false);
    };

    return (
        <>
            <CalendarModal 
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                dateRange={dateRange}
                setDateRange={setDateRange}
            />

            <AnimatePresence>
                {isBookingModalOpen && (
                    <BookingRequestModal
                        room={room}
                        onClose={() => setIsBookingModalOpen(false)}
                        onSuccess={handleModalSuccess}
                    />
                )}
            </AnimatePresence>

            <div className="border border-gray-200 rounded-xl shadow-lg p-6">
                <div className="flex items-baseline mb-4">
                    <span className="text-2xl font-bold">₹{rentPerMonth.toLocaleString('en-IN')}</span>
                    <span className="text-gray-600 ml-1">/ Month</span>
                </div>

                <div className="border border-gray-400 rounded-lg relative">
                </div>
                
                <button onClick={handleBookingRequest} className="w-full bg-red-500 text-white font-bold py-3 rounded-lg mt-4 hover:bg-red-600 transition">
                    Request to Book
                </button>
                
                {/*  Add the new "Contact Landlord" button */}
                <div className="flex items-center my-3">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button
                    onClick={onContactLandlord} // Use the new function passed via props
                    type="button"
                    className="w-full text-center text-teal-600 font-semibold py-3 px-4 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition"
                >
                    Contact Landlord
                </button>
                {/* ▲▲▲ End of new button ▲▲▲ */}

                <p className="text-center text-xs text-gray-500 mt-2">You won't be charged yet</p>
            </div>
        </>
    );
};

export default BookingPanel;