import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaPaperPlane, FaCheckCircle, FaSearch, FaTasks, FaList, FaEnvelope } from 'react-icons/fa';
import Spinner from '../../components/common/Spinner';
import { getStudentDashboardSummary } from '../../api'; 
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ icon, title, count, linkTo, bgColor, textColor = 'white', borderColor }) => (
    <Link 
        to={linkTo} 
        className="block p-6 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1.5 transition-all duration-300" 
        style={{ 
            backgroundColor: bgColor, 
            color: textColor,
            borderBottom: `4px solid ${borderColor}`
        }}
    >
        <div className="flex items-center justify-between">
            <div className="text-4xl opacity-80">{icon}</div>
            <div className="text-right">
                <p className="text-5xl font-bold">{count}</p>
                <p className="text-lg font-semibold">{title}</p>
            </div>
        </div>
    </Link>
);

const recentApplications = [
    { id: 1, roomName: 'Modern 2BHK, Model Town', status: 'Approved' },
    { id: 2, roomName: 'Cozy Studio near Metro', status: 'Pending' },
    { id: 3, roomName: 'Single Room with Balcony', status: 'Rejected' },
];

function OverviewPage() {
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    //  GREETING LOGIC IS NOW HERE
    const getGreetingAndStyle = () => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) {
            return {
                greeting: "Good morning",
                styleClasses: "bg-blue-50 border-blue-200 text-blue-800"
            };
        } else if (currentHour < 17) {
            return {
                greeting: "Good afternoon",
                styleClasses: "bg-teal-50 border-teal-200 text-teal-800"
            };
        } else {
            return {
                greeting: "Good evening",
                styleClasses: "bg-purple-100 border-purple-200 text-purple-800"
            };
        }
    };
    const { greeting, styleClasses } = getGreetingAndStyle();
    
    useEffect(() => {
        if (!user) {
            setLoading(false);
            setError("Please log in to see your dashboard.");
            return;
        }
        const fetchSummaryData = async () => {
            try {
                setLoading(true);
                const data = await getStudentDashboardSummary();
                setSummaryData(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch your data.');
            } finally {
                setLoading(false);
            }
        };
        fetchSummaryData();
    }, [user]);

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    if (error) return <div className="text-center p-6 bg-red-100 text-red-700 rounded-lg">{error}</div>;

    const getStatusClass = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-4 md:p-8 overflow-y-auto h-full">
            
            {/* GREETING BANNER IS NOW DISPLAYED HERE */}
            <div className="flex justify-end mb-6">
                <div className={`p-4 rounded-lg shadow-sm text-right border-b-4 transition-colors duration-500 ${styleClasses}`}>
                    <p className="text-lg font-medium">
                        {greeting}, <span className="font-bold">{user?.name || 'Student'}</span>!
                    </p>
                    <p className="text-sm">Ready to find your perfect room?</p>
                </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<FaHeart />} title="In Your Wishlist" count={summaryData?.wishlistCount ?? 0} linkTo="wishlist" bgColor="#ef4444" borderColor="#dc2626" />
                <StatCard icon={<FaPaperPlane />} title="Pending Applications" count={summaryData?.pendingCount ?? 0} linkTo="my-applications" bgColor="#f97316" borderColor="#ea580c" />
                <StatCard icon={<FaCheckCircle />} title="Confirmed Rooms" count={summaryData?.confirmedCount ?? 0} linkTo="my-applications" bgColor="#22c55e" borderColor="#16a34a" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border-b-4 border-gray-200 hover:shadow-2xl transition-shadow duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">My Application Status</h2>
                        <Link to="my-applications" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                            View All
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentApplications.map((app) => (
                                    <tr key={app.id}>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.roomName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <Link to={`/my-applications/${app.id}`} className="text-indigo-600 hover:text-indigo-900">View Details</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg border-b-4 border-gray-200 hover:shadow-2xl transition-shadow duration-300 flex flex-col gap-4">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Quick Actions</h2>
                    <Link to="/" className="w-full flex items-center justify-center gap-3 px-4 py-3 text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-300">
                        <FaSearch /> Find a New Room
                    </Link>
                    <Link to="my-applications" className="w-full flex items-center justify-center gap-3 px-4 py-3 text-base font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 transition-colors duration-300">
                        <FaTasks /> My Applications
                    </Link>
                    <Link to="wishlist" className="w-full flex items-center justify-center gap-3 px-4 py-3 text-base font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 transition-colors duration-300">
                        <FaList /> My Wishlist
                    </Link>
                    <Link to="inbox" className="w-full flex items-center justify-center gap-3 px-4 py-3 text-base font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 transition-colors duration-300">
                        <FaEnvelope /> Check Inbox
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default OverviewPage;