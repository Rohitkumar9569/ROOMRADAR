import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LandlordRoomCard from '../../components/features/rooms/LandlordRoomCard';

const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
);

function MyRoomsPage() {
    const { user } = useAuth();
    // searchTerm ab 'useOutletContext' se aayega
    const { searchTerm } = useOutletContext();
    
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
        if (window.confirm('Are you sure you want to delete this room listing?')) {
            try {
                await api.delete(`/rooms/${id}`);
                setAllRooms(prevRooms => prevRooms.filter(room => room._id !== id));
                toast.success('Room deleted successfully!');
            } catch (err) {
                toast.error('Failed to delete room.');
            }
        }
    };

    const handleStatusToggle = async (roomId, currentStatus) => {
        const newStatus = currentStatus === 'Published' ? 'Unpublished' : 'Published';
        const loadingToast = toast.loading('Updating status...');
        try {
            const { data: updatedRoom } = await api.patch(`/rooms/${roomId}/status`, { status: newStatus });
            setAllRooms(prevRooms => prevRooms.map(r => (r._id === roomId ? updatedRoom : r)));
            toast.success(`Room successfully ${newStatus.toLowerCase()}!`);
        } catch (err) {
            toast.error('Failed to update status.');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const filteredRooms = useMemo(() => {
        return allRooms
            .filter(room => activeTab === 'All' || room.status === activeTab)
            .filter(room => room.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allRooms, activeTab, searchTerm]);

    const summaryStats = useMemo(() => ({
        All: allRooms.length,
        Published: allRooms.filter(r => r.status === 'Published').length,
        Pending: allRooms.filter(r => r.status === 'Pending').length,
        Unpublished: allRooms.filter(r => r.status === 'Unpublished').length,
    }), [allRooms]);

    const TABS = ['All', 'Published', 'Pending', 'Unpublished'];

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="text-center"><p className="text-red-500">{error}</p></div>;

    return (
        <div className="flex flex-col h-full">
<nav className="border-b border-slate-200 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">                <div className="max-w-7xl mx-auto flex items-center justify-between px-4">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            {tab} <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                {summaryStats[tab]}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="flex-grow pt-6">
                {filteredRooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    <div className="text-center mt-12 p-12 bg-white rounded-xl">
                        <h2 className="text-xl font-bold text-slate-700">No rooms found</h2>
                        <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default MyRoomsPage;