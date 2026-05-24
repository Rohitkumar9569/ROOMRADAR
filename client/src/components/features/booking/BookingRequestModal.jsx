import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { 
    Plus, Minus, User, Smartphone, Users, Calendar, 
    VenetianMask, Mail, X, Home, ArrowRight, CheckCircle,
    Sparkles, Shield
} from 'lucide-react';
import { isValidIndianMobile, phoneInputProps, sanitizePhoneInput } from '../../../utils/phoneUtils';
import { formatListingTitle } from '../../../utils/listingDisplay';
import { trackUsageEvent } from '../../../utils/usageAnalytics';

// --- Ultra-Premium Input Styles ---
const baseInputStyles = "block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30 sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-600";

// --- Compact Premium Number Stepper Component ---
const NumberStepper = ({ label, value, onValueChange, min = 0, max = Infinity }) => {
    const handleIncrement = () => { if (value < max) onValueChange(value + 1); };
    const handleDecrement = () => { if (value > min) onValueChange(value - 1); };
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
        >
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 tracking-wide uppercase">{label}</label>
            <div className="flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow duration-300">
                <motion.button 
                    type="button" 
                    onClick={handleDecrement} 
                    disabled={value <= min}
                    whileHover={value > min ? { scale: 1.1 } : {}}
                    whileTap={value > min ? { scale: 0.9 } : {}}
                    className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 hover:from-indigo-100 hover:to-indigo-200 dark:hover:from-indigo-900 dark:hover:to-indigo-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                    <Minus className="w-4 h-4" />
                </motion.button>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 w-10 text-center tracking-tight">{value}</span>
                <motion.button 
                    type="button" 
                    onClick={handleIncrement} 
                    disabled={value >= max}
                    whileHover={value < max ? { scale: 1.1 } : {}}
                    whileTap={value < max ? { scale: 0.9 } : {}}
                    className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-500/25"
                >
                    <Plus className="w-4 h-4" />
                </motion.button>
            </div>
        </motion.div>
    );
};

const calculateDuration = (start, end) => {
    if (!start || !end || end <= start) return '';
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) {
        months--;
        days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    const parts = [];
    if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);
    return parts.length > 0 ? `${parts.join(', ')}` : '';
};


function BookingRequestModal({ mode = 'create', applicationData = null, room, onClose, onSuccess }) {
    const navigate = useNavigate();
    const displayTitle = formatListingTitle(room?.title, 'Room listing');

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
        
        // Calculate scrollbar width
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
        
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, []);

    const [formData, setFormData] = useState({
        fullName: '', mobileNumber: '', profileType: 'Travelling',
        adults: 1, children: 0, gender: '', males: 0, females: 0,
        occupantComposition: '', checkInDate: new Date(), checkOutDate: null, message: '',
    });

    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (mode === 'edit' && applicationData) {
            setFormData({
                fullName: applicationData.fullName || '',
                mobileNumber: sanitizePhoneInput(applicationData.mobileNumber || ''),
                profileType: applicationData.profileType || 'Travelling',
                adults: applicationData.occupants?.adults || 1,
                children: applicationData.occupants?.children || 0,
                gender: applicationData.gender || '',
                males: applicationData.occupants?.males || 0,
                females: applicationData.occupants?.females || 0,
                occupantComposition: applicationData.occupantComposition || '',
                checkInDate: applicationData.checkInDate ? new Date(applicationData.checkInDate) : new Date(),
                checkOutDate: applicationData.checkOutDate ? new Date(applicationData.checkOutDate) : null,
                message: applicationData.message || '',
            });
        }
    }, [mode, applicationData]);


    // Validation useEffect 
    useEffect(() => {
        const preferences = room.tenantPreferences;
        if (!preferences) return;
        const { profileType, adults, males, females } = formData;
        let error = '';

        if (preferences.familyStatus === 'Family' && profileType !== 'Family') {
            error = "Sorry, this property is available for families only.";
        } else if (preferences.familyStatus === 'Bachelors' && profileType === 'Family') {
            error = "Sorry, this property is available for bachelors only.";
        }

        if (!error && profileType !== 'Family') {
            if (males + females !== adults) {
                error = `Total men and women must be ${adults}.`;
            }
            else {
                if (preferences.allowedGender === 'Male' && females > 0) {
                    error = "Sorry, this listing is for men only.";
                } else if (preferences.allowedGender === 'Female' && males > 0) {
                    error = "Sorry, this listing is for women only.";
                }
            }
        }

        setValidationError(error);
    }, [formData, room.tenantPreferences]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: name === 'mobileNumber' ? sanitizePhoneInput(value) : value
        }));
    };
    const handleDateChange = (field, date) => setFormData(prevState => ({ ...prevState, [field]: date }));
    const handleStepperChange = (name, newValue) => setFormData(prevState => ({ ...prevState, [name]: newValue }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validationError) return toast.error(validationError);
        if (!formData.fullName || !formData.mobileNumber || !formData.checkInDate || !formData.checkOutDate) {
            return toast.error('Please fill all required fields, including check-in and check-out dates.');
        }
        if (!isValidIndianMobile(formData.mobileNumber)) {
            return toast.error('Please enter a valid 10-digit mobile number.');
        }
        if (formData.checkOutDate <= formData.checkInDate) {
            return toast.error('Check-out date must be after the check-in date.');
        }

        setLoading(true);
        try {
            const { adults, children, males, females, ...restOfFormData } = formData;
            const payload = {
                ...restOfFormData,
                roomId: room._id,
                landlordId: room.landlord._id || room.landlord,
                occupants: { adults, children, males, females }
            };

            if (mode === 'edit') {
                await api.patch(`/applications/${applicationData._id}`, payload);
                toast.success("Application updated successfully!");
            } else {
                const response = await api.post('/applications', payload);
                const conversationId = response.data.conversationId;
                trackUsageEvent('booking_request', {
                    metadata: {
                        source: 'booking_request_modal',
                        roomId: room._id,
                        city: room.location?.city,
                        rent: room.rent,
                        occupants: adults,
                    },
                });
                toast.success("Request sent! Redirecting to chat...");
                if (conversationId) {
                    navigate(`/profile/inbox/${conversationId}`);
                }
            }
            onSuccess();
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An error occurred.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const durationString = calculateDuration(formData.checkInDate, formData.checkOutDate);

    const modalContent = (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-[calc(var(--rr-bottom-nav-height)+env(safe-area-inset-bottom,0px))] left-0 right-0 top-[var(--rr-mobile-header-offset)] z-[45] flex items-stretch justify-center bg-slate-50 dark:bg-slate-900 md:inset-0 md:z-[9999] md:items-center md:bg-transparent"
            onClick={onClose}
        >
            {/* Premium Blur Backdrop */}
            <div className="absolute inset-0 hidden bg-slate-900/70 backdrop-blur-xl dark:bg-black/80 md:block" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 48 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 48 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="relative flex h-full max-h-full w-full flex-col overflow-hidden border-0 bg-slate-50 shadow-none dark:bg-slate-900 md:h-[95vh] md:max-w-[1400px] md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Premium Indigo/Violet */}
                <div className="relative flex-shrink-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-3 shadow-lg dark:from-indigo-700 dark:via-violet-700 dark:to-purple-800 md:px-6 md:py-4">
                    <div className="absolute top-2 right-2 md:top-3 md:right-4 z-10">
                        <motion.button
                            onClick={onClose}
                            aria-label="Close booking request"
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shadow-md"
                        >
                            <X className="w-5 h-5" />
                        </motion.button>
                    </div>
                    
                    <div className="flex items-center gap-3 pr-12">
                        <div className="p-2 bg-white/20 rounded-xl shadow-md">
                            <Home className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-white md:text-xl">
                                {mode === 'edit' ? 'Edit Your Request' : 'Request to Book'}
                            </h2>
                            <p className="text-indigo-100 text-sm mt-0.5 truncate max-w-md">{displayTitle}</p>
                        </div>
                    </div>
                </div>

                {/* Content - Full height scrollable area with bottom padding for visibility */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50 to-slate-100 p-3 dark:from-slate-900 dark:to-slate-800 md:p-6 md:pb-4">
                <form onSubmit={handleSubmit} className="min-h-full">
                    {/* Multi-Column Grid Layout - No Scrolling on Desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                        
                        {/* Column 1: Personal & Profile */}
                        <div className="space-y-4">
                            {/* Personal Info */}
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wide">
                                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    Personal Info
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                                            <input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleChange} className={`${baseInputStyles} pl-10 pr-3 py-2.5 text-sm`} placeholder="e.g., Anjali Sharma" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="mobileNumber" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mobile *</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                                            <input id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className={`${baseInputStyles} pl-10 pr-3 py-2.5 text-sm`} placeholder="9876543210" required {...phoneInputProps} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Type */}
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wide">
                                    <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                        <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    Profile
                                </h3>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Your Profile *</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                                        <select name="profileType" value={formData.profileType} onChange={handleChange} className={`${baseInputStyles} pl-10 pr-3 py-2.5 text-sm appearance-none cursor-pointer`} required>
                                            <option>Travelling</option>
                                            <option>Working Professional</option>
                                            <option>Family</option>
                                        </select>
                                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                            <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Column 2: Occupants */}
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wide">
                                    <div className="p-1.5 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg">
                                        <VenetianMask className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                    </div>
                                    Occupants
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <NumberStepper label="Adults" value={formData.adults} onValueChange={(val) => handleStepperChange('adults', val)} min={1} />
                                    <NumberStepper label="Children" value={formData.children} onValueChange={(val) => handleStepperChange('children', val)} />
                                </div>
                                {formData.adults > 0 && formData.profileType !== 'Family' && (
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <NumberStepper label="Men" value={formData.males} onValueChange={(val) => handleStepperChange('males', val)} max={formData.adults - formData.females} />
                                        <NumberStepper label="Women" value={formData.females} onValueChange={(val) => handleStepperChange('females', val)} max={formData.adults - formData.males} />
                                    </div>
                                )}
                            </div>

                            {/* Duration Display */}
                            {durationString && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 p-3 rounded-xl border border-indigo-200/50 dark:border-indigo-700/30 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{durationString}</span>
                                </motion.div>
                            )}
                        </div>
                        {/* Column 3: Dates */}
                        <div className="space-y-4">
                            {/* Dates - Airbnb Style */}
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 p-4 pb-2 uppercase tracking-wide">
                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    Stay Dates
                                </h3>
                                {/* Airbnb-style Date Grid */}
                                <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700/50">
                                    <div className="p-4 pt-2">
                                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Check-in</label>
                                        <div className="relative">
                                            <DatePicker 
                                                selected={formData.checkInDate} 
                                                onChange={(date) => handleDateChange('checkInDate', date)} 
                                                selectsStart 
                                                startDate={formData.checkInDate} 
                                                endDate={formData.checkOutDate} 
                                                minDate={new Date()} 
                                                className="block w-full bg-transparent text-slate-900 dark:text-slate-100 font-semibold text-base placeholder:text-slate-400 focus:outline-none cursor-pointer" 
                                                dateFormat="dd/MM/yyyy" 
                                                required 
                                                popperPlacement="bottom"
                                                popperContainer={({ children }) => <div className="z-[99999]">{children}</div>}
                                                calendarClassName="shadow-2xl border-0 !z-[99999]"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formData.checkInDate ? formData.checkInDate.toLocaleDateString('en-US', { weekday: 'short' }) : 'Add date'}</p>
                                    </div>
                                    <div className="p-4 pt-2">
                                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Check-out</label>
                                        <div className="relative">
                                            <DatePicker 
                                                selected={formData.checkOutDate} 
                                                onChange={(date) => handleDateChange('checkOutDate', date)} 
                                                selectsEnd 
                                                startDate={formData.checkInDate} 
                                                endDate={formData.checkOutDate} 
                                                minDate={formData.checkInDate || new Date()} 
                                                placeholderText="Add date"
                                                className="block w-full bg-transparent text-slate-900 dark:text-slate-100 font-semibold text-base placeholder:text-slate-400 focus:outline-none cursor-pointer" 
                                                dateFormat="dd/MM/yyyy" 
                                                required 
                                                popperPlacement="bottom"
                                                popperContainer={({ children }) => <div className="z-[99999]">{children}</div>}
                                                calendarClassName="shadow-2xl border-0 !z-[99999]"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formData.checkOutDate ? formData.checkOutDate.toLocaleDateString('en-US', { weekday: 'short' }) : 'Add date'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Message - Premium Style */}
                            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20 flex-1">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100 p-4 pb-2 uppercase tracking-wide">
                                    <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                                        <Mail className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                    </div>
                                    Message to Host
                                </h3>
                                <div className="px-4 pb-4">
                                    <textarea 
                                        name="message" 
                                        rows="5" 
                                        value={formData.message} 
                                        onChange={handleChange} 
                                        className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:focus:border-rose-400 dark:focus:ring-rose-400/30 resize-none transition-all duration-300 hover:border-slate-300" 
                                        placeholder="Tell the host about yourself and why you're staying..." 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Bottom: Validation & Submit - Part of form, scrolls with content */}
                    <div className="sticky bottom-0 z-20 -mx-3 mt-4 border-t border-slate-200/80 bg-slate-50/95 px-3 py-3 shadow-[0_-14px_32px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0 lg:mt-6">
                        {/* Validation Error */}
                        <AnimatePresence>
                            {validationError && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 8, height: 0 }}
                                    className="mb-2 overflow-hidden"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <div className="inline-flex w-full items-center gap-2 rounded-full bg-slate-950/92 px-3.5 py-2.5 text-left text-[12px] font-black leading-5 text-white shadow-[0_10px_26px_-20px_rgba(15,23,42,0.85)] dark:bg-white dark:text-slate-950 md:w-auto md:max-w-full">
                                        <Shield className="h-4 w-4 flex-shrink-0 text-amber-300 dark:text-amber-500" />
                                        <span className="min-w-0">{validationError}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button 
                            type="submit" 
                            disabled={loading || !!validationError}
                            whileHover={!loading && !validationError ? { scale: 1.01 } : {}}
                            whileTap={!loading && !validationError ? { scale: 0.99 } : {}}
                            className="group relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {/* Shine Effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                                animate={{ x: loading ? 200 : [-200, 200] }}
                                transition={{ duration: 1.5, repeat: loading ? 0 : Infinity, repeatDelay: 3 }}
                            />
                            
                            {loading ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-base">{mode === 'edit' ? 'Update Request' : 'Submit Request'}</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </motion.button>
                        
                        {/* Trust Indicators */}
                        <div className="mt-4 hidden flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 md:flex md:gap-6">
                            <span className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-semibold">Platform protection</span>
                            </span>
                            <span className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full">
                                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="font-semibold">Verified landlord</span>
                            </span>
                        </div>
                    </div>
                </form>
                </div>
                {/* End Content */}
            </motion.div>
        </motion.div>
    );

    // Render modal at body level using Portal to ensure it's on top of everything
    return createPortal(modalContent, document.body);
}

export default BookingRequestModal;
