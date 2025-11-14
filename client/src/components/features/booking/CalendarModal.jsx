// src/components/CalendarModal.jsx

import React, { useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // Main CSS
import { format, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const CalendarModal = ({ isOpen, onClose, dateRange, setDateRange }) => {
    const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' or 'flexible'

    const handleClearDates = () => {
        setDateRange([{ ...dateRange[0], startDate: new Date(), endDate: null }]);
    };

    // Function to set flexible end date
    const handleFlexibleDateSelect = (months) => {
        const startDate = dateRange[0].startDate || new Date();
        const endDate = addMonths(startDate, months);
        setDateRange([{ ...dateRange[0], startDate, endDate }]);
        onClose(); // Close modal after selection
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-2xl shadow-xl w-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* --- HEADER --- */}
                        <div className="p-6 border-b">
                            <div className="flex justify-center items-center gap-4 mb-4">
                                <button 
                                    onClick={() => setActiveTab('calendar')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold ${activeTab === 'calendar' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}
                                >
                                    Calendar
                                </button>
                                <button 
                                    onClick={() => setActiveTab('flexible')}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold ${activeTab === 'flexible' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}
                                >
                                    I'm flexible
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Select Dates</h2>
                                    <p className="text-sm text-neutral-500">Add your travel dates for accurate pricing</p>
                                </div>
                                <div className="grid grid-cols-2 border rounded-lg">
                                    <div className="p-2 border-r">
                                        <label className="text-xs font-bold">MOVE-IN</label>
                                        <p>{format(dateRange[0].startDate, 'MM/dd/yyyy')}</p>
                                    </div>
                                    <div className="p-2">
                                        <label className="text-xs font-bold">MOVE-OUT</label>
                                        <p>{dateRange[0].endDate ? format(dateRange[0].endDate, 'MM/dd/yyyy') : 'Add date'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- CONTENT (Switches between Calendar and Flexible) --- */}
                        <div className="p-6">
                            {activeTab === 'calendar' ? (
                                <DateRange
                                    onChange={item => setDateRange([item.selection])}
                                    ranges={dateRange}
                                    months={2}
                                    direction="horizontal"
                                    minDate={new Date()}
                                    showDateDisplay={false}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-80">
                                    <h3 className="text-lg font-semibold mb-4">Stay for how long?</h3>
                                    <div className="flex gap-4">
                                        <button onClick={() => handleFlexibleDateSelect(1)} className="px-6 py-3 border rounded-full hover:border-black">1 month</button>
                                        <button onClick={() => handleFlexibleDateSelect(3)} className="px-6 py-3 border rounded-full hover:border-black">3 months</button>
                                        <button onClick={() => handleFlexibleDateSelect(6)} className="px-6 py-3 border rounded-full hover:border-black">6 months</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- FOOTER --- */}
                        <div className="flex justify-end items-center gap-4 p-6 border-t">
                            <button onClick={handleClearDates} className="text-sm font-semibold underline">Clear dates</button>
                            <button onClick={onClose} className="bg-neutral-900 text-white font-semibold py-2 px-6 rounded-lg">Done</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CalendarModal;