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
                setError("Could not load insights data.");
            } finally {
                setLoading(false);
            }
        };

        fetchInsightsData();
    }, []);

    if (loading) return <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-light-bg dark:bg-dark-bg"><Spinner /></div>;
    if (error) return <div className="bg-light-bg p-8 text-center text-red-500 dark:bg-dark-bg">{error}</div>;

    return (
        <div className="min-h-full bg-light-bg p-4 font-sans text-light-text dark:bg-dark-bg dark:text-dark-text sm:p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="mb-6 text-3xl font-bold text-light-text dark:text-dark-text">Performance Insights</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performing Listings Chart */}
                    <div className="rounded-2xl border border-light-border bg-light-card p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-light-text dark:text-dark-text">
                            <FaStar className="text-brand" />
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
                            <p className="py-24 text-center text-light-muted dark:text-dark-muted">No view data available.</p>
                        )}
                    </div>
                    
                    {/* Room Status Chart */}
                    <div className="rounded-2xl border border-light-border bg-light-card p-6 shadow-sm dark:border-dark-border dark:bg-dark-card">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-light-text dark:text-dark-text">
                            <FaChartPie className="text-brand" />
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
                            <p className="py-24 text-center text-light-muted dark:text-dark-muted">No room status data available.</p>
                        )}
                    </div>

                    {/* Monthly Earnings Chart */}
                    <div className="rounded-2xl border border-light-border bg-light-card p-6 shadow-sm dark:border-dark-border dark:bg-dark-card lg:col-span-2">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-light-text dark:text-dark-text">
                            <FaChartBar className="text-brand" />
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
                            <p className="py-24 text-center text-light-muted dark:text-dark-muted">No earnings data available for the last 6 months.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandlordInsightsPage;
