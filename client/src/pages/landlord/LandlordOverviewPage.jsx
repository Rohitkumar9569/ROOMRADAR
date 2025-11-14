// src/pages/LandlordOverviewPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import Spinner from '../../components/common/Spinner';

// Icons
import {
    HomeIcon,
    BellAlertIcon,
    CheckCircleIcon,
    CurrencyRupeeIcon,
    PlusIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { FaChartPie } from 'react-icons/fa';

// Recharts for Pie Chart
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

//  Redesigned StatCard Component 
const StatCard = ({ icon, title, count, color, linkTo }) => (
    <Link to={linkTo || '#'} className="block">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${color.bg}`}>
                    {React.cloneElement(icon, { className: `h-6 w-6 ${color.text}` })}
                </div>
                <div>
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-slate-800">{count}</p>
                </div>
            </div>
        </div>
    </Link>
);

//  ActionItem Component (Slightly restyled)
const ActionItem = ({ icon, text, count, linkTo }) => (
    <Link to={linkTo} className="flex items-center justify-between p-4 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
        <div className="flex items-center gap-4">
            <div className="text-slate-500">{icon}</div>
            <span className="text-slate-800 font-semibold">{text}</span>
        </div>
        {count > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">{count}</span>
        )}
    </Link>
);


function LandlordOverviewPage() {
    const { user } = useAuth();
    const [summaryData, setSummaryData] = useState(null);
    const [statusData, setStatusData] = useState([]); // State for pie chart data
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const unreadMessagesCount = 0; // This can be made dynamic later

    // Colors for Pie Chart
    const COLORS = ['#16A34A', '#F97316', '#DC2626', '#64748B'];

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch summary and insights data at the same time
                const [summaryRes, statusRes] = await Promise.all([
                    api.get('/users/dashboard-summary/landlord'),
                    api.get('/insights/room-status')
                ]);

                setSummaryData(summaryRes.data);

                // Sort status data to match color order for consistency
                const statusOrder = ['Published', 'Pending', 'Unpublished', 'Booked'];
                const sortedStatusData = statusRes.data.sort((a, b) => statusOrder.indexOf(a.name) - statusOrder.indexOf(b.name));
                setStatusData(sortedStatusData);

            } catch (err) {
                setError('Failed to load dashboard data. Please try again later.');
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-[calc(100vh-4rem)]"><Spinner /></div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-700 bg-red-100 rounded-lg">{error}</div>;
    }

    return (
        <div className="bg-slate-50 min-h-full p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                        <p className="text-slate-500 mt-1">Welcome back, {user?.name || 'Landlord'}.</p>
                    </div>
                    <Link to="/landlord/add-room" className="w-full sm:w-auto flex items-center justify-center py-3 px-5 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 transition-all">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add a New Room
                    </Link>
                </div>

                {/* --- [NEW] 2x2 Grid for Stats --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<HomeIcon />}
                        title="Listed Rooms"
                        count={summaryData?.roomCount ?? 0}
                        color={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
                        linkTo="/landlord/my-rooms"
                    />
                    <StatCard
                        icon={<BellAlertIcon />}
                        title="New Requests"
                        count={summaryData?.pendingCount ?? 0}
                        color={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
                        linkTo="/landlord/inbox"
                    />
                    <StatCard
                        icon={<CheckCircleIcon />}
                        title="Confirmed Bookings"
                        count={summaryData?.confirmedCount ?? 0}
                        color={{ bg: 'bg-green-100', text: 'text-green-600' }}
                        linkTo="/landlord/inbox"
                    />
                    <StatCard
                        icon={<CurrencyRupeeIcon />}
                        title="This Month's Earnings"
                        count={`₹0`}
                        color={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
                        linkTo="#"
                    />
                </div>

                {/*  Integrated Insights & Actions Grid  */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Pie Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <FaChartPie className="text-indigo-500" />
                            Room Status Overview
                        </h2>
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-24">No room status data available.</p>
                        )}
                    </div>

                    {/* Action Center */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-700">Action Center</h2>
                        <div className="space-y-4">
                            <ActionItem
                                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                                text="Review new applications"
                                count={summaryData?.pendingCount ?? 0}
                                linkTo="/landlord/inbox"
                            />
                            <ActionItem
                                icon={<EnvelopeIcon className="h-6 w-6" />}
                                text="Unread messages"
                                count={unreadMessagesCount}
                                linkTo="/landlord/inbox"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LandlordOverviewPage;