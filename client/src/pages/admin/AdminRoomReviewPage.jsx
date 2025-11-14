import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';

// We now import the same components as the public details page
import ImageGallery from '../../components/features/rooms/ImageGallery';
import AmenitiesList from '../../components/features/rooms/AmenitiesList';
import ReviewsSection from '../../components/features/rooms/ReviewsSection';

// We also import icons for a consistent look
import { Star, Key, Wifi, Users, Check, X } from 'lucide-react';
import { format } from 'date-fns';

//This is the new "Decision Panel" that replaces the "Booking Panel" for admins
const AdminDecisionPanel = ({ onApprove, onReject }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionBox, setShowRejectionBox] = useState(false);

    const handleApproveClick = async () => {
        setIsSubmitting(true);
        await onApprove();
    };

    const handleRejectClick = async () => {
        if (showRejectionBox && !rejectionReason) {
            return toast.error('Please provide a reason for rejection.');
        }
        setIsSubmitting(true);
        await onReject(rejectionReason);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 border sticky top-28">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-4">Decision Panel</h2>
            {showRejectionBox && (
                <div className="mb-4">
                    <label htmlFor="rejectionReason" className="block text-sm font-medium text-slate-700 mb-1">Reason for Rejection*</label>
                    <textarea
                        id="rejectionReason"
                        rows="3"
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g., Photos are unclear..."
                    />
                </div>
            )}
            <div className="flex flex-col gap-3">
                <button onClick={handleApproveClick} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                    <Check /> Approve & Publish
                </button>
                
                {showRejectionBox ? (
                    <button onClick={handleRejectClick} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-red-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-800 disabled:opacity-50 transition-colors">
                        Confirm Rejection
                    </button>
                ) : (
                    <button onClick={() => setShowRejectionBox(true)} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-600 font-semibold px-6 py-3 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                        <X /> Reject
                    </button>
                )}
            </div>
        </div>
    );
};


const AdminRoomReviewPage = () => {
    const { id: roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use the same data fetching logic as the public page
    useEffect(() => {
        const fetchRoomAndReviews = async () => {
            if (!roomId) return;
            try {
                setLoading(true);
                const [roomRes, reviewsRes] = await Promise.all([
                    api.get(`/rooms/${roomId}`), // Use the standard api instance
                    api.get(`/reviews/${roomId}`)
                ]);
                
                // Important: Match the data structure from your working page
                setRoom(roomRes.data); 
                setReviews(reviewsRes.data || []);
            } catch (err) {
                setError('Could not fetch room details. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchRoomAndReviews();
    }, [roomId]);

    const handleApprove = async () => {
        const toastId = toast.loading('Approving room...');
        try {
            await api.patch(`/admin/rooms/${roomId}/approve`);
            toast.success('Room Published.', { id: toastId });
            navigate('/admin/dashboard');
        } catch (err) {
            toast.error('Could not approve the room.', { id: toastId });
        }
    };

    const handleReject = async (reason) => {
        const toastId = toast.loading('Rejecting room...');
        try {
            await api.patch(`/admin/rooms/${roomId}/reject`, { reason });
            toast.success('Room Rejected.', { id: toastId });
            navigate('/admin/dashboard');
        } catch (err) {
            toast.error('Could not reject the room.', { id: toastId });
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
    if (!room) return <div className="text-center text-gray-500 py-20">Room not found.</div>;

    const images = Array.isArray(room.images) && room.images.length > 0 ? room.images : [room.imageUrl];

    return (
        // The JSX is now a near-identical copy of your public RoomDetailsPage
        <div className="bg-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-4">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 break-all">{room.title}</h1>
                </div>
                <div className="mb-8">
                    <ImageGallery images={images} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-x-16 relative">
                    <div className="lg:col-span-2">
                        <div className="border-b border-gray-200 pb-6 mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">{room.roomType} in {room.location?.city}</h2>
                            <p className="text-gray-600 mt-1">{room.beds} tenants · {room.beds} bed(s)</p>
                            <div className="flex items-center space-x-2 mt-2 text-sm font-medium">
                                <Star className="h-4 w-4 text-black" />
                                <span>{room.averageRating?.toFixed(1) || 'New'}</span>
                                <span className="text-gray-600">·</span>
                                <a href="#reviews" className="underline cursor-pointer hover:text-gray-900">{room.numReviews || 0} reviews</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 border-b border-gray-200 pb-6 mb-6">
                            <div className="h-14 w-14 rounded-full bg-neutral-800 flex items-center justify-center text-white text-2xl font-semibold overflow-hidden">
                                {room.landlord?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Hosted by {room.landlord?.name}</h3>
                                <p className="text-sm text-gray-500">Joined in {room.landlord?.createdAt ? format(new Date(room.landlord.createdAt), 'yyyy') : '2024'}</p>
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
                         {/* The AdminDecisionPanel is used here instead of the BookingPanel */}
                        <AdminDecisionPanel onApprove={handleApprove} onReject={handleReject} />
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
        </div>
    );
};

export default AdminRoomReviewPage;