import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
// The incorrect 'HomePlus' has been replaced with 'Building2'
import { Users, UserCheck, Home, FileClock, FileCheck, FileText, ArrowRight, CheckCircle, XCircle, UserPlus, Building2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ title, value, icon, color, linkTo }) => (
    <Link 
        to={linkTo} 
        className="block bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
        <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${color.bg}`}>
                {React.cloneElement(icon, { className: `h-6 w-6 ${color.text}` })}
            </div>
            <div>
                <p className="text-3xl font-bold text-slate-800">{value}</p>
                <p className="text-sm font-medium text-slate-500">{title}</p>
            </div>
        </div>
    </Link>
);

// A new component to render the recent activity feed.
const RecentActivityFeed = ({ activities }) => {
    // The ICONS object now uses the correct 'Building2' icon.
    const ICONS = {
        NEW_USER: <UserPlus className="h-5 w-5 text-blue-500" />,
        NEW_ROOM: <Building2 className="h-5 w-5 text-indigo-500" />,
    };

    return (
        <div>
             <h2 className="text-2xl font-bold text-slate-800 mb-4">Recent Activity</h2>
             <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
                {activities.length > 0 ? activities.map(activity => (
                    <div key={activity._id} className="flex items-start gap-4">
                        <div className="bg-slate-100 rounded-full p-2">
                            {ICONS[activity.type] || <FileCheck className="h-5 w-5 text-gray-500" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-700 break-all">{activity.text}</p>
                            <p className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                         <Link to={activity.link} title="View Details" className="text-indigo-600 hover:text-indigo-900">
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                )) : (
                    <p className="text-slate-500 text-center py-8">No recent activities to show.</p>
                )}
             </div>
        </div>
    );
};

// Dummy data for chart development
const dummySignupData = [
    { date: "Apr 2025", count: 5 },
    { date: "May 2025", count: 8 },
    { date: "Jun 2025", count: 15 },
    { date: "Jul 2025", count: 12 },
    { date: "Aug 2025", count: 22 },
    { date: "Sep 2025", count: 30 },
];

const AdminDashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [pendingRooms, setPendingRooms] = useState([]);
    const [signupData, setSignupData] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [statsRes, pendingRes, signupsRes, activitiesRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/pending-rooms'),
                    api.get('/admin/stats/user-signups'),
                    api.get('/admin/activities')
                ]);
                
                setStats(statsRes.data);
                setPendingRooms(pendingRes.data);
                setActivities(activitiesRes.data);

                if (signupsRes.data.length < 3) {
                    setSignupData(dummySignupData);
                } else {
                    setSignupData(signupsRes.data);
                }

                setError(null);
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
                setError("Could not load dashboard. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const handleApproveRoom = async (roomId) => {
        if (window.confirm('Are you sure you want to approve this room?')) {
            try {
                await api.patch(`/admin/rooms/${roomId}/approve`);
                toast.success('Room approved successfully.');
                setPendingRooms(currentRooms => currentRooms.filter(room => room._id !== roomId));
                setStats(currentStats => ({
                    ...currentStats,
                    pendingRoomsCount: currentStats.pendingRoomsCount - 1,
                    publishedRoomsCount: currentStats.publishedRoomsCount + 1,
                }));
            } catch (err) {
                toast.error('Failed to approve room.');
            }
        }
    };

    const handleRejectRoom = async (roomId) => {
        const reason = window.prompt('Please provide a reason for rejecting this room:');
        
        if (reason) {
            try {
                await api.patch(`/admin/rooms/${roomId}/reject`, { reason });
                toast.success('Room rejected successfully.');
                setPendingRooms(currentRooms => currentRooms.filter(room => room._id !== roomId));
                setStats(currentStats => ({
                    ...currentStats,
                    pendingRoomsCount: currentStats.pendingRoomsCount - 1,
                }));
            } catch (err)
             {
                toast.error('Failed to reject room.');
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    return (
        <div className="bg-slate-50 min-h-screen p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
                    <p className="mt-1 text-slate-500">Platform overview and management.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={<Users />} color={{ bg: 'bg-blue-100', text: 'text-blue-600' }} linkTo="/admin/users" />
                    <StatCard title="Total Landlords" value={stats?.totalLandlords ?? 0} icon={<UserCheck />} color={{ bg: 'bg-sky-100', text: 'text-sky-600' }} linkTo="/admin/users?role=Landlord" />
                    <StatCard title="Total Rooms" value={stats?.totalRooms ?? 0} icon={<Home />} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} linkTo="/admin/rooms" />
                    <StatCard title="Published Rooms" value={stats?.publishedRoomsCount ?? 0} icon={<FileCheck />} color={{ bg: 'bg-green-100', text: 'text-green-600' }} linkTo="/admin/rooms?status=Published" />
                    <StatCard title="Pending Review" value={stats?.pendingRoomsCount ?? 0} icon={<FileClock />} color={{ bg: 'bg-yellow-100', text: 'text-yellow-600' }} linkTo="/admin/rooms?status=Pending" />
                    <StatCard title="Total Applications" value={stats?.totalApplications ?? 0} icon={<FileText />} color={{ bg: 'bg-orange-100', text: 'text-orange-600' }} linkTo="/admin/applications" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
                    <div className="lg:col-span-3">
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">User Signups Over Time</h2>
                        <div className="bg-white rounded-lg shadow-md p-4 pt-8">
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={signupData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="count" name="New Users" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorUv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <RecentActivityFeed activities={activities} />
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Rooms Awaiting Review</h2>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {pendingRooms.length === 0 ? (
                            <div className="text-center p-12">
                                <FileCheck className="mx-auto h-12 w-12 text-green-400" />
                                <h3 className="mt-4 text-lg font-medium text-slate-800">All caught up!</h3>
                                <p className="mt-1 text-sm text-slate-500">There are no pending rooms to review.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Room Title</th>
                                            <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Landlord</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {pendingRooms.map((room) => (
                                            <tr key={room._id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-slate-900 break-all">{room.title}</div>
                                                    <div className="text-sm text-slate-500 md:hidden">{room.landlord.name}</div>
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4">
                                                    <div className="text-sm text-slate-900">{room.landlord.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                                                        <button onClick={() => handleApproveRoom(room._id)} title="Approve" className="text-green-600 hover:text-green-900"><CheckCircle className="h-5 w-5" /></button>
                                                        <button onClick={() => handleRejectRoom(room._id)} title="Reject" className="text-red-600 hover:text-red-900"><XCircle className="h-5 w-5" /></button>
                                                        <Link to={`/admin/rooms/${room._id}/review`} title="View Details" className="text-indigo-600 hover:text-indigo-900"><ArrowRight className="h-5 w-5" /></Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;