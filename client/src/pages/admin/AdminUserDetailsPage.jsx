import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { Mail, Calendar, ShieldCheck, UserX, Home, FileText, ArrowLeft, X, BadgeCheck, MoreVertical, XCircle } from 'lucide-react';
import { format } from 'date-fns';

// Reusable modal for editing user roles, consistent with other management pages.
const EditRoleModal = ({ user, onClose, onSave }) => {
    const allRoles = ['Student', 'Landlord', 'Admin'];
    const [selectedRoles, setSelectedRoles] = useState([...user.roles]);

    const handleRoleToggle = (role) => {
        setSelectedRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleSave = () => {
        onSave(user._id, selectedRoles);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Edit Roles for {user.name}</h2>
                    <button onClick={onClose}><X className="h-6 w-6 text-gray-500 hover:text-gray-800"/></button>
                </div>
                <div className="space-y-2">
                    {allRoles.map(role => (
                        <label key={role} className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={selectedRoles.includes(role)}
                                onChange={() => handleRoleToggle(role)}
                            />
                            <span>{role}</span>
                        </label>
                    ))}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// The ActionsDropdown now dynamically toggles the verification button.
const ActionsDropdown = ({ user, onBan, onEditRoles, onVerificationToggle }) => {
    const isBanned = user.status === 'Banned';

    return (
        <Menu as="div" className="relative inline-block text-left z-10">
            <div>
                <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Actions
                    <MoreVertical className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="p-2 space-y-2">
                        <Menu.Item>
                            <button onClick={onEditRoles} className="w-full flex items-center justify-center gap-2 rounded-lg font-semibold px-4 py-2.5 transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                                <ShieldCheck size={18} /> Edit Roles
                            </button>
                        </Menu.Item>
                        
                        {/* Conditional rendering for the verification toggle button */}
                        {user.isVerified ? (
                            <Menu.Item>
                                <button 
                                    onClick={onVerificationToggle}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg font-semibold px-4 py-2.5 transition-colors bg-white text-orange-600 border border-orange-600 hover:bg-orange-50"
                                >
                                    <XCircle size={18} /> Revoke Verification
                                </button>
                            </Menu.Item>
                        ) : (
                            <Menu.Item>
                                <button 
                                    onClick={onVerificationToggle} 
                                    className="w-full flex items-center justify-center gap-2 rounded-lg font-semibold px-4 py-2.5 transition-colors bg-white text-sky-600 border border-sky-600 hover:bg-sky-50"
                                >
                                    <BadgeCheck size={18} /> Mark as Verified
                                </button>
                            </Menu.Item>
                        )}

                        <Menu.Item>
                            <button onClick={onBan} className={`w-full flex items-center justify-center gap-2 rounded-lg font-semibold px-4 py-2.5 transition-colors ${isBanned ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                                <UserX size={18} /> {isBanned ? 'Unban User' : 'Ban User'}
                            </button>
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
};


const StatBox = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
);

const UserSummary = ({ user, onBan, onEditRoles, onVerificationToggle }) => {
    const getRoleClass = (role) => {
        switch (role) {
            case 'Admin': return 'bg-red-100 text-red-800';
            case 'Landlord': return 'bg-sky-100 text-sky-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getStatusClass = (status) => {
        return status === 'Banned' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center text-white text-4xl font-semibold overflow-hidden flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-center sm:text-left flex-grow w-full">
                    <div className="flex justify-between items-start">
                         <div>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900 break-all">{user.name}</h1>
                                {user.isVerified && (
                                    <div title="Verified User">
                                        <BadgeCheck className="h-6 w-6 text-sky-500" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                                {user.roles.map(role => (
                                    <span key={role} className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(role)}`}>{role}</span>
                                ))}
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                           <ActionsDropdown user={user} onBan={onBan} onEditRoles={onEditRoles} onVerificationToggle={onVerificationToggle} />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4 text-sm text-slate-500 mt-2 sm:mt-0">
                        <span className="flex items-center gap-1.5 break-all"><Mail size={16} />{user.email}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={16} />Joined {format(new Date(user.createdAt), 'dd MMM, yyyy')}</span>
                    </div>
                </div>
            </div>
            <div className="border-t mt-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <StatBox label="Applications" value={user.applications?.length ?? 0} />
                <StatBox label="Listings" value={user.roles.includes('Landlord') ? (user.listings?.length ?? 0) : 'N/A'} />
                <StatBox label="Reviews Given" value={0} /> 
                <StatBox label="Verified" value={user.isVerified ? 'Yes' : 'No'} />
            </div>
        </div>
    );
};

const UserDetailTabs = ({ user }) => {
    const [activeTab, setActiveTab] = useState('applications');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'applications':
                return (
                    <div className="space-y-3">
                        {user.applications?.length > 0 ? user.applications.map(app => (
                            <div key={app._id} className="bg-white p-4 rounded-md border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div>
                                    <p className="font-semibold text-slate-700 break-all">{app.room?.title || 'Deleted Room'}</p>
                                    <p className="text-sm text-slate-500">Applied: {format(new Date(app.createdAt), 'dd MMM, yyyy')}</p>
                                </div>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize self-start sm:self-center">{app.status}</span>
                            </div>
                        )) : <p className="text-slate-500 text-center py-8">No applications found.</p>}
                    </div>
                );
            case 'listings':
                return (
                    <div className="space-y-3">
                        {user.listings?.length > 0 ? user.listings.map(room => (
                            <div key={room._id} className="bg-white p-4 rounded-md border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div>
                                    <p className="font-semibold text-slate-700 break-all">{room.title}</p>
                                    <p className="text-sm text-slate-500">Created: {format(new Date(room.createdAt), 'dd MMM, yyyy')}</p>
                                </div>
                                <Link to={`/admin/rooms/${room._id}/review`} className="text-sm font-semibold text-indigo-600 hover:underline self-start sm:self-center">View Room</Link>
                            </div>
                        )) : <p className="text-slate-500 text-center py-8">No listings found.</p>}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="mt-8">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('applications')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'applications' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <FileText className="inline-block mr-2 h-5 w-5" /> Applications
                    </button>
                    {user.roles.includes('Landlord') && (
                        <button onClick={() => setActiveTab('listings')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'listings' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                           <Home className="inline-block mr-2 h-5 w-5" /> Listings
                        </button>
                    )}
                </nav>
            </div>
            <div className="mt-6">
                {renderTabContent()}
            </div>
        </div>
    );
};

const AdminUserDetailsPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUserDetails = useCallback(async () => {
        setLoading(true);
        try {
            const cacheBust = `?t=${new Date().getTime()}`;
            const { data } = await api.get(`/admin/users/${userId}/details${cacheBust}`);
            setUser(data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch user details.');
            setError('Could not load user data.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserDetails();
    }, [fetchUserDetails]);

    const handleBanUser = async () => {
        const isBanned = user.status === 'Banned';
        const action = isBanned ? "unban" : "ban";
        const newStatus = isBanned ? "Active" : "Banned";
        
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                await api.patch(`/admin/users/${user._id}/status`, { status: newStatus });
                toast.success(`User successfully ${action}ned.`);
                setUser(currentUser => ({ ...currentUser, status: newStatus }));
            } catch (error) {
                toast.error(error.response?.data?.message || `Failed to ${action} user.`);
            }
        }
    };

    const handleUpdateRoles = async (userId, newRoles) => {
        try {
            await api.patch(`/admin/users/${userId}/roles`, { roles: newRoles });
            toast.success("User roles updated successfully.");
            setUser(currentUser => ({ ...currentUser, roles: newRoles }));
            setIsModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update roles.');
        }
    };
    
    // This single function now handles both verifying and revoking.
    const handleVerificationToggle = async () => {
        const isCurrentlyVerified = user.isVerified;
        const actionText = isCurrentlyVerified ? 'revoke verification for' : 'verify';
        const newVerifiedStatus = !isCurrentlyVerified;

        if (window.confirm(`Are you sure you want to ${actionText} this user?`)) {
            try {
                const endpoint = isCurrentlyVerified 
                    ? `/admin/users/${user._id}/revoke-verification` 
                    : `/admin/users/${user._id}/verify`;
                
                await api.patch(endpoint);
                toast.success(`User verification has been ${isCurrentlyVerified ? 'revoked' : 'confirmed'}.`);
                
                // Optimistic UI Update for immediate feedback
                setUser(currentUser => ({ ...currentUser, isVerified: newVerifiedStatus }));
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to update verification status.');
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
        <>
            <div className="p-4 sm:p-8 bg-slate-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <button onClick={() => navigate('/admin/users')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                            <ArrowLeft size={16} /> Back to User List
                        </button>
                    </div>
                    {user && (
                        <div className="space-y-8">
                           <UserSummary 
                                user={user}
                                onBan={handleBanUser}
                                onEditRoles={() => setIsModalOpen(true)}
                                onVerificationToggle={handleVerificationToggle}
                           />
                           <UserDetailTabs user={user} />
                        </div>
                    )}
                </div>
            </div>
            {isModalOpen && user && (
                <EditRoleModal 
                    user={user} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleUpdateRoles} 
                />
            )}
        </>
    );
};

export default AdminUserDetailsPage;