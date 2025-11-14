// client/src/pages/LandlordInsightsPage.jsx 

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaChartBar, FaChartPie, FaStar } from 'react-icons/fa';
import api from '../../api';
import Spinner from '../../components/common/Spinner';

//  The order of colors should match the expected order of data
// Green for Published, Orange for Pending, Red for Booked/Unpublished etc.
const COLORS = ['#16A34A', '#F97316', '#DC2626', '#64748B']; 

const LandlordInsightsPage = () => {
    const [earningsData, setEarningsData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [topListingsData, setTopListingsData] = useState([]); //  New state for top listings
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInsightsData = async () => {
            try {
                setLoading(true);
                // Fetch all data points concurrently
                const [statusRes, earningsRes, topListingsRes] = await Promise.all([
                    api.get('/insights/room-status'),
                    api.get('/insights/earnings'),
                    api.get('/insights/top-listings') //  Fetch new data
                ]);
                
                //  Sort status data to match color order for consistency >>>
                const statusOrder = ['Published', 'Pending', 'Unpublished', 'Booked'];
                const sortedStatusData = statusRes.data.sort((a, b) => statusOrder.indexOf(a.name) - statusOrder.indexOf(b.name));

                setStatusData(sortedStatusData);
                setEarningsData(earningsRes.data);
                setTopListingsData(topListingsRes.data); //Set new data
                setError(null);

            } catch (err) {
                console.error("Failed to fetch insights:", err);
                setError("Could not load insights data.");
            } finally {
                setLoading(false);
            }
        };

        fetchInsightsData();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-[calc(100vh-80px)]"><Spinner /></div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

    return (
        <div className="bg-slate-50 min-h-full p-4 sm:p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-6">Performance Insights</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performing Listings Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <FaStar className="text-indigo-500" />
                            Top 5 Most Viewed Listings
                        </h2>
                        {topListingsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topListingsData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="views" fill="#8884d8" name="Total Views" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-24">No view data available.</p>
                        )}
                    </div>
                    
                    {/* Room Status Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <FaChartPie className="text-indigo-500" />
                            Room Status
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

                    {/* Monthly Earnings Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <FaChartBar className="text-indigo-500" />
                            Monthly Earnings (₹)
                        </h2>
                        {earningsData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={earningsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                                    <Legend />
                                    <Bar dataKey="earnings" fill="#4338CA" name="Earnings" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-slate-500 py-24">No earnings data available for the last 6 months.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandlordInsightsPage;