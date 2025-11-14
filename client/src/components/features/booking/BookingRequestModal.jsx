import React, { useState, useEffect } from 'react';
import api from '../../../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { FaPlus, FaMinus, FaUser, FaMobileAlt, FaUsers, FaCalendarAlt, FaVenusMars, FaEnvelope } from 'react-icons/fa';
import { HiChevronDown } from 'react-icons/hi';

// Helper components (इनमें कोई बदलाव नहीं है)
const baseInputStyles = "block w-full rounded-xl border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 placeholder:text-gray-400";
const withIconStyles = "pl-12 pr-4 py-3";

const NumberStepper = ({ label, value, onValueChange, min = 0, max = Infinity }) => {
    const handleIncrement = () => { if (value < max) onValueChange(value + 1); };
    const handleDecrement = () => { if (value > min) onValueChange(value - 1); };
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex items-center justify-between p-2 border border-gray-300 rounded-xl bg-white shadow-sm">
                <button type="button" onClick={handleDecrement} disabled={value <= min} className="p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50 transition">
                    <FaMinus />
                </button>
                <span className="text-xl font-bold text-gray-900 w-12 text-center">{value}</span>
                <button type="button" onClick={handleIncrement} disabled={value >= max} className="p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50 transition">
                    <FaPlus />
                </button>
            </div>
        </div>
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
    return parts.length > 0 ? `Total Duration: ${parts.join(', ')}` : '';
};


function BookingRequestModal({ mode = 'create', applicationData = null, room, onClose, onSuccess }) {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '', mobileNumber: '', profileType: 'Student',
        adults: 1, children: 0, gender: '', males: 0, females: 0,
        occupantComposition: '', checkInDate: new Date(), checkOutDate: null, message: '',
    });

    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (mode === 'edit' && applicationData) {
            setFormData({
                fullName: applicationData.fullName || '',
                mobileNumber: applicationData.mobileNumber || '',
                profileType: applicationData.profileType || 'Student',
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
                error = `Total males and females must be ${adults}.`;
            }
            else {
                if (preferences.allowedGender === 'Male' && females > 0) {
                    error = "Sorry, no females allowed.";
                } else if (preferences.allowedGender === 'Female' && males > 0) {
                    error = "Sorry, no males allowed.";
                }
            }
        }

        setValidationError(error);
    }, [formData, room.tenantPreferences]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    const handleDateChange = (field, date) => setFormData(prevState => ({ ...prevState, [field]: date }));
    const handleStepperChange = (name, newValue) => setFormData(prevState => ({ ...prevState, [name]: newValue }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validationError) return toast.error(validationError);
        if (!formData.fullName || !formData.mobileNumber || !formData.checkInDate || !formData.checkOutDate) {
            return toast.error('Please fill all required fields, including check-in and check-out dates.');
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
                toast.success("Request sent! Redirecting to chat...");
                if (conversationId) {
                    navigate(`/profile/inbox/${conversationId}`);
                }
            }
            onSuccess();
        } catch (error) {
            console.log("Error response from server:", error.response);

            const errorMessage = error.response?.data?.message || 'An error occurred.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const durationString = calculateDuration(formData.checkInDate, formData.checkOutDate);

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-[999] p-4" onClick={onClose}>
            <div className="bg-gray-50 rounded-xl shadow-2xl p-8 w-full max-w-3xl z-[1000] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">
                    {mode === 'edit' ? 'Edit Your Request' : 'Request to Book'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <legend className="sr-only">Personal Information</legend>
                        <div className="md:col-span-2">
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                            <div className="relative">
                                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="fullName" name="fullName" type="text" value={formData.fullName} onChange={handleChange} className={`${baseInputStyles} ${withIconStyles}`} placeholder="e.g., Anjali Sharma" required />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                            <div className="relative">
                                <FaMobileAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input id="mobileNumber" name="mobileNumber" type="tel" value={formData.mobileNumber} onChange={handleChange} className={`${baseInputStyles} ${withIconStyles}`} placeholder="e.g., 9876543210" required />
                            </div>
                        </div>
                    </fieldset>
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 border-t border-gray-200 pt-8">
                        <legend className="text-xl font-semibold text-gray-700 mb-2 md:col-span-2">Booking Details</legend>
                        <div>
                            <label htmlFor="profileType" className="block text-sm font-medium text-gray-700 mb-2">Your Profile *</label>
                            <div className="relative">
                                <FaUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select id="profileType" name="profileType" value={formData.profileType} onChange={handleChange} className={`${baseInputStyles} ${withIconStyles} appearance-none`} required>
                                    <option>Student</option>
                                    <option>Working Professional</option>
                                    <option>Family</option>
                                </select>
                                <HiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                    </fieldset>
                    <fieldset className="border-t border-gray-200 pt-8">
                        <legend className="text-xl font-semibold text-gray-700 mb-4">Occupant Details</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <NumberStepper label="Adults *" value={formData.adults} onValueChange={(val) => handleStepperChange('adults', val)} min={1} />
                            <NumberStepper label="Children" value={formData.children} onValueChange={(val) => handleStepperChange('children', val)} />
                        </div>
                        {formData.adults > 0 && formData.profileType !== 'Family' && (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 animate-fade-in-fast">
                                <NumberStepper label="Number of Males *" value={formData.males} onValueChange={(val) => handleStepperChange('males', val)} max={formData.adults - formData.females} />
                                <NumberStepper label="Number of Females *" value={formData.females} onValueChange={(val) => handleStepperChange('females', val)} max={formData.adults - formData.males} />
                            </div>
                        )}
                    </fieldset>
                    <fieldset className="border-t border-gray-200 pt-8">
                        <legend className="text-xl font-semibold text-gray-700 mb-4">Select Your Stay Dates</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label htmlFor="checkInDate" className="block text-sm font-medium text-gray-700 mb-2">Check-in Date *</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                                    <DatePicker id="checkInDate" selected={formData.checkInDate} onChange={(date) => handleDateChange('checkInDate', date)} selectsStart startDate={formData.checkInDate} endDate={formData.checkOutDate} minDate={new Date()} className={`${baseInputStyles} ${withIconStyles}`} dateFormat="dd/MM/yyyy" required />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="checkOutDate" className="block text-sm font-medium text-gray-700 mb-2">Check-out Date *</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                                    <DatePicker id="checkOutDate" selected={formData.checkOutDate} onChange={(date) => handleDateChange('checkOutDate', date)} selectsEnd startDate={formData.checkInDate} endDate={formData.checkOutDate} minDate={formData.checkInDate || new Date()} placeholderText="Select end date" className={`${baseInputStyles} ${withIconStyles}`} dateFormat="dd/MM/yyyy" required />
                                </div>
                            </div>
                        </div>
                        {durationString && <div className="mt-4 text-center font-semibold text-indigo-600 bg-indigo-100 p-3 rounded-xl">{durationString}</div>}
                    </fieldset>
                    <fieldset className="border-t border-gray-200 pt-8 space-y-6">
                        <legend className="sr-only">Additional Information</legend>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message to Landlord (Optional)</label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-4 text-gray-400" />
                                <textarea id="message" name="message" rows="4" value={formData.message} onChange={handleChange} className={`${baseInputStyles} ${withIconStyles} pt-4`} placeholder="Introduce yourself..."></textarea>
                            </div>
                        </div>
                    </fieldset>
                    <div className="pt-2">
                        {validationError && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert"><p className="font-bold">Heads up!</p><p>{validationError}</p></div>}
                        <button type="submit" disabled={loading || !!validationError} className="w-full text-white text-lg font-bold py-4 px-4 rounded-lg transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 shadow-lg hover:shadow-xl hover:-translate-y-1">
                            {loading ? 'Submitting...' : (mode === 'edit' ? 'Update Request' : 'Submit Request')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BookingRequestModal;