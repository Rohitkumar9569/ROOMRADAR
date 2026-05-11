import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LandlordRoomCard from '../../components/features/rooms/LandlordRoomCard';

const LoadingSpinner = () => (
    <div className="flex items-center justify-center bg-light-bg py-20 dark:bg-dark-bg">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-brand"></div>
    </div>
);

function MyRoomsPage() {
    const { user } = useAuth();
    // searchTerm ab 'useOutletContext' se aayega
    const { searchTerm = '', setSearchTerm } = useOutletContext();
    
    const [allRooms, setAllRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('All');

    const fetchMyRooms = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data } = await api.get('/rooms/my-rooms');
            setAllRooms(data);
        } catch (err) {
            setError('Could not fetch your rooms. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchMyRooms();
    }, [fetchMyRooms]);

    const handleDelete = async (id) => {
        toast((t) => (
            <div className="space-y-3">
                <p className="text-sm font-semibold text-light-text">Delete this room listing?</p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={async () => {
                            toast.dismiss(t.id);
                            try {
                                await api.delete(`/rooms/${id}`);
                                setAllRooms(prevRooms => prevRooms.filter(room => room._id !== id));
                                toast.success('Room deleted successfully!');
                            } catch (err) {
                                toast.error('Failed to delete room.');
                            }
                        }}
                        className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white"
                    >
                        Delete
                    </button>
                    <button type="button" onClick={() => toast.dismiss(t.id)} className="rounded-lg border border-light-border px-3 py-2 text-xs font-bold text-light-muted">
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: 8000 });
    };

    const handleStatusToggle = async (roomId, currentStatus) => {
        if (['Booked', 'Confirmed'].includes(currentStatus)) {
            toast.error('Booked listings cannot be unpublished.');
            return;
        }
        if (['Pending', 'Pending_Review'].includes(currentStatus)) {
            toast('This listing is already waiting for admin review.');
            return;
        }
        const newStatus = currentStatus === 'Published' ? 'Unpublished' : 'Published';
        const loadingToast = toast.loading(currentStatus === 'Published' ? 'Unpublishing room...' : 'Sending for admin review...');
        try {
            const { data: updatedRoom } = await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
            setAllRooms(prevRooms => prevRooms.map(r => (r._id === roomId ? updatedRoom : r)));
            toast.success(
                updatedRoom.status === 'Pending'
                    ? 'Room sent for admin approval.'
                    : `Room successfully ${updatedRoom.status.toLowerCase()}!`
            );
        } catch (err) {
            const apiMessage = err.response?.data?.message || err.response?.data?.error;
            toast.error(apiMessage || 'Failed to update status.');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const filteredRooms = useMemo(() => {
        return allRooms
            .filter(room => activeTab === 'All'
                || (activeTab === 'Booked' ? ['Booked', 'Confirmed'].includes(room.status) : false)
                || (activeTab === 'Pending' ? ['Pending', 'Pending_Review'].includes(room.status) : room.status === activeTab))
            .filter(room => room.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allRooms, activeTab, searchTerm]);

    const summaryStats = useMemo(() => ({
        All: allRooms.length,
        Published: allRooms.filter(r => r.status === 'Published').length,
        Pending: allRooms.filter(r => ['Pending', 'Pending_Review'].includes(r.status)).length,
        Unpublished: allRooms.filter(r => r.status === 'Unpublished').length,
        Booked: allRooms.filter(r => ['Booked', 'Confirmed'].includes(r.status)).length,
    }), [allRooms]);

    const TABS = ['All', 'Published', 'Pending', 'Unpublished', 'Booked'];

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="min-h-full bg-light-bg p-6 text-center dark:bg-dark-bg"><p className="text-red-500">{error}</p></div>;

    return (
        <div className="flex min-h-full flex-col bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            {setSearchTerm && (
                <div className="mb-4 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search listings..."
                            className="h-11 w-full rounded-full border border-light-border bg-light-card pl-10 pr-4 text-sm font-semibold text-light-text shadow-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-dark-border dark:bg-dark-input dark:text-dark-text"
                        />
                    </div>
                </div>
            )}
            <nav
                className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain border-b border-light-border px-4 dark:border-dark-border sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
                aria-label="Listing status filters"
            >
                <div className="flex w-max min-w-full items-center gap-2 pb-0.5">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex flex-shrink-0 flex-col items-center justify-center gap-0.5 border-b-2 px-3 py-3 text-xs font-black transition-colors sm:min-w-[6.25rem] sm:text-sm ${activeTab === tab
                                    ? 'border-brand text-brand'
                                    : 'border-transparent text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text'
                                }`}
                        >
                            <span className="whitespace-nowrap">{tab}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] leading-none ${activeTab === tab ? 'bg-brand/10 text-brand' : 'bg-light-card text-light-muted dark:bg-dark-input dark:text-dark-muted'}`}>
                                {summaryStats[tab]}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="flex-grow pt-6">
                {filteredRooms.length > 0 ? (
                    <div className="mobile-room-grid grid gap-3 scroll-smooth overscroll-none md:gap-5 xl:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                        {filteredRooms.map((room) => (
                            <LandlordRoomCard
                                key={room._id}
                                room={room}
                                onDelete={handleDelete}
                                onStatusToggle={handleStatusToggle}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="mt-12 rounded-2xl border border-light-border bg-light-card p-12 text-center dark:border-dark-border dark:bg-dark-card">
                        <h2 className="text-xl font-bold text-light-text dark:text-dark-text">No rooms found</h2>
                        <p className="mt-2 text-light-muted dark:text-dark-muted">Try adjusting your search or filters.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default MyRoomsPage;
