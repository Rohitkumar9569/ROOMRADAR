import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { ArrowRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const RoomManagementPage = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState('All');

    const TABS = ['All', 'Published', 'Pending', 'Unpublished'];

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/rooms?status=${activeStatus}`);
            setRooms(data);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
            toast.error("Could not load room data.");
        } finally {
            setLoading(false);
        }
    }, [activeStatus]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleDelete = async (roomId) => {
        if (window.confirm('Are you sure you want to permanently delete this room? This action cannot be undone.')) {
            const toastId = toast.loading('Deleting room...');
            try {
                await api.delete(`/admin/rooms/${roomId}`);
                toast.success('Room permanently deleted.', { id: toastId });
                fetchRooms();
            } catch (error) {
                toast.error('Failed to delete room.', { id: toastId });
            }
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Published': return 'bg-green-100 text-green-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Unpublished': return 'bg-gray-200 text-gray-700';
            default: return 'bg-red-100 text-red-800';
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Room Management</h1>

                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveStatus(tab)}
                                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeStatus === tab
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64"><Spinner /></div>
                ) : (
                    <div>
                        {/* Desktop Table View (Hidden on mobile) */}
                        <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase break-all">Room Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Landlord</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Submitted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {rooms.map(room => (
                                        <tr key={room._id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900 break-all" title={room.title}>{room.title}</div></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{room.landlord?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(room.createdAt), 'dd MMM, yyyy')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(room.status)}`}>{room.status}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-4">
                                                <Link to={`/admin/rooms/${room._id}/review`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-900">View <ArrowRight className="h-4 w-4" /></Link>
                                                <button onClick={() => handleDelete(room._id)} className="text-red-600 hover:text-red-900" title="Permanently Delete"><Trash2 className="h-4 w-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View (Visible on mobile, hidden on desktop) */}
                        <div className="md:hidden space-y-4">
                            {rooms.map(room => (
                                <div key={room._id} className="bg-white rounded-lg shadow-md p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 pr-2 break-all">{room.title}</p>
                                            <p className="text-sm text-gray-500 mt-1">Landlord: {room.landlord?.name || 'N/A'}</p>
                                        </div>
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(room.status)}`}>{room.status}</span>
                                    </div>
                                    <div className="border-t my-3"></div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-500">
                                            Submitted: {format(new Date(room.createdAt), 'dd MMM, yyyy')}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <Link to={`/admin/rooms/${room._id}/review`} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-sm font-semibold">
                                                View <ArrowRight className="h-4 w-4" />
                                            </Link>
                                            <button onClick={() => handleDelete(room._id)} className="text-red-600 hover:text-red-900" title="Permanently Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomManagementPage;