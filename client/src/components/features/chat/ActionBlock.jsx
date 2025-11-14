import React, { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../context/AuthContext';
import { FaUserFriends, FaCalendarCheck, FaUser, FaMobileAlt, FaVenusMars } from 'react-icons/fa';
import api from '../../../api';
import toast from 'react-hot-toast';

const calculateDuration = (start, end) => {
    if (!start || !end || new Date(end) <= new Date(start)) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    if (days < 0) {
        months--;
        days += new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    }
    if (months < 0) { years--; months += 12; }
    const parts = [];
    if (years > 0) parts.push(`${years} Year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} Month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? 's' : ''}`);
    return parts.join(', ');
};

const ActionBlock = ({ message, onUpdateRequest }) => {
    if (!message || !message.bookingRequest) return null;

    //  Get 'activeRole' from the Auth Context instead of the entire user object for this check.
    const { activeRole } = useAuth();
    const [loading, setLoading] = useState(false);

    const {
        applicationId,
        status,
        roomTitle,
        checkInDate,
        checkOutDate,
        occupants,
        fullName,
        mobileNumber,
        message: userMessage
    } = message.bookingRequest;

    const getStatusUI = (currentStatus) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            approved: 'bg-green-100 text-green-800 border-green-300',
            rejected: 'bg-red-100 text-red-800 border-red-300',
            confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
            cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
        };
        const statusKey = currentStatus?.toLowerCase() || 'pending';
        return (
            <div className={`p-3 rounded-b-xl border-t ${styles[statusKey] || styles.pending}`}>
                <p className="font-bold text-center capitalize text-sm">Status: {currentStatus}</p>
            </div>
        );
    };

    const handleAction = async (action) => {
        setLoading(true);
        const toastId = toast.loading(`Processing request...`);
        try {
            await api.patch(`/applications/${applicationId}/${action}`);
            toast.success(`Request ${action}d successfully!`, { id: toastId });
            if (onUpdateRequest) onUpdateRequest();
        } catch (error) {
            const errorMessage = error.response?.data?.message || `Failed to ${action} request.`;
            toast.error(errorMessage, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    //  Check 'activeRole' to determine if the user is a landlord. This is the main fix.
    const isLandlord = activeRole === 'landlord';
    let compositionString = '';
    if (occupants) {
        if (occupants.adults === 1 && occupants.gender) compositionString = occupants.gender;
        else if (occupants.adults === 2 && occupants.occupantComposition) compositionString = occupants.occupantComposition;
        else if (occupants.adults > 2 && (occupants.males > 0 || occupants.females > 0)) {
            const maleString = `${occupants.males} Male${occupants.males !== 1 ? 's' : ''}`;
            const femaleString = `${occupants.females} Female${occupants.females !== 1 ? 's' : ''}`;
            if (occupants.males > 0 && occupants.females > 0) compositionString = `${maleString}, ${femaleString}`;
            else if (occupants.males > 0) compositionString = maleString;
            else compositionString = femaleString;
        }
    }

    const durationString = calculateDuration(checkInDate, checkOutDate);

    if (!checkInDate || !checkOutDate || !occupants) return null;

    return (
        <div className="my-4 max-w-sm mx-auto clear-both">
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800">Booking Request</h3>
                    {roomTitle && (
                        <p className="text-sm text-teal-600 font-semibold break-words">{roomTitle}</p>
                    )}
                    <p className="text-xs text-gray-500 mb-4">Sent on {format(new Date(message.createdAt), 'dd MMM, yyyy')}</p>
                    <div className="space-y-3 border-t border-b py-4">
                        <div className="flex items-center text-gray-700"><FaUser className="mr-3 text-teal-500 flex-shrink-0" /><span className="text-sm font-medium">{fullName}</span></div>
                        <div className="flex items-center text-gray-700"><FaMobileAlt className="mr-3 text-teal-500 flex-shrink-0" /><span className="text-sm font-medium">{mobileNumber}</span></div>
                        <div className="flex items-center text-gray-700"><FaCalendarCheck className="mr-3 text-teal-500 flex-shrink-0" /><span className="text-sm font-medium">{format(new Date(checkInDate), 'dd MMM')} - {format(new Date(checkOutDate), 'dd MMM, yyyy')}{durationString && <span className="text-gray-500 ml-2">({durationString})</span>}</span></div>
                        <div className="flex items-center text-gray-700"><FaUserFriends className="mr-3 text-teal-500 flex-shrink-0" /><span className="text-sm font-medium">{occupants.adults} Adult{occupants.adults > 1 ? 's' : ''}{occupants.children > 0 ? `, ${occupants.children} Child` : ''}</span></div>
                        {compositionString && (<div className="flex items-center text-gray-700"><FaVenusMars className="mr-3 text-teal-500 flex-shrink-0" /><span className="text-sm font-medium">{compositionString}</span></div>)}
                    </div>
                    {userMessage && (<div className="mt-4"><p className="text-sm font-semibold text-gray-600 mb-1">Message from applicant:</p><p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg break-words">{userMessage}</p></div>)}
                </div>

                {isLandlord && status?.toLowerCase() === 'pending' && (
                    <div className="p-3 border-t bg-gray-50 grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={loading}
                            className="w-full text-white bg-red-600 hover:bg-red-700 font-semibold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-red-300"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => handleAction('approve')}
                            disabled={loading}
                            className="w-full text-white bg-teal-600 hover:bg-teal-700 font-semibold py-2 px-4 rounded-md transition-colors duration-300 disabled:bg-teal-300"
                        >
                            Accept
                        </button>
                    </div>
                )}
                {(!isLandlord || status?.toLowerCase() !== 'pending') && getStatusUI(status)}
            </div>
        </div>
    );
};

export default ActionBlock;