import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import useNavigate to handle programmatic navigation
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { UserX, ShieldCheck, Search, Eye, X } from 'lucide-react';
import { format } from 'date-fns';


 //Modal for editing user roles.

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
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
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


const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    // Initialize the navigate function from the hook
    const navigate = useNavigate();
    
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data);
        } catch (error) {
            toast.error("Failed to fetch users.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handler to navigate to the detailed user view
    const handleViewDetails = (userId) => {
        navigate(`/admin/users/${userId}`);
    };

    const handleBanUser = async (userId, userStatus) => {
        const isBanned = userStatus === 'Banned';
        const action = isBanned ? "unban" : "ban";
        const newStatus = isBanned ? "Active" : "Banned";
        
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
                toast.success(`User successfully ${action}ned.`);
                fetchUsers();
            } catch (error) {
                toast.error(error.response?.data?.message || `Failed to ${action} user.`);
            }
        }
    };

    const handleUpdateRoles = async (userId, newRoles) => {
        try {
            await api.patch(`/admin/users/${userId}/roles`, { roles: newRoles });
            toast.success("User roles updated successfully.");
            fetchUsers();
            setIsEditModalOpen(false);
            setSelectedUser(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update roles.');
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };
    
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            (roleFilter === 'All' || user.roles.includes(roleFilter)) &&
            (user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, roleFilter, searchTerm]);

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
        <>
            <div className="p-4 sm:p-8 bg-slate-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-slate-800 mb-6">User Management</h1>
                    
                    <div className="mb-6 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-lg"/>
                        </div>
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="p-2 border border-gray-300 rounded-lg">
                            <option value="All">All Roles</option>
                            <option value="Student">Student</option>
                            <option value="Landlord">Landlord</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    {loading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Joined</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredUsers.map(user => (
                                            <tr key={user._id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{user.roles.map(role => (<span key={role} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-1 ${getRoleClass(role)}`}>{role}</span>))}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(user.createdAt), 'dd MMM, yyyy')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(user.status || 'Active')}`}>{user.status || 'Active'}</span></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-4">
                                                    {/* Add onClick event to the button */}
                                                    <button onClick={() => handleViewDetails(user._id)} title="View Details" className="text-gray-500 hover:text-indigo-600"><Eye className="h-5 w-5"/></button>
                                                    <button onClick={() => handleBanUser(user._id, user.status)} title="Ban/Unban User" className="text-red-600 hover:text-red-900"><UserX className="h-5 w-5"/></button>
                                                    <button onClick={() => openEditModal(user)} title="Edit Role" className="text-indigo-600 hover:text-indigo-900"><ShieldCheck className="h-5 w-5"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {filteredUsers.map(user => (
                                    <div key={user._id} className="bg-white rounded-lg shadow-md p-4 space-y-3">
                                        <div>
                                            <p className="font-bold text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        <div className="flex justify-between items-center border-t pt-3">
                                            <div>
                                                <p className="text-xs text-gray-500">Roles</p>
                                                {user.roles.map(role => (<span key={role} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-1 ${getRoleClass(role)}`}>{role}</span>))}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Status</p>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(user.status || 'Active')}`}>{user.status || 'Active'}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end items-center gap-4 border-t pt-3">
                                            {/* Add onClick event to the button */}
                                            <button onClick={() => handleViewDetails(user._id)} title="View Details" className="text-gray-500 hover:text-indigo-600"><Eye className="h-5 w-5"/></button>
                                            <button onClick={() => handleBanUser(user._id, user.status)} title="Ban/Unban User" className="text-red-600 hover:text-red-900"><UserX className="h-5 w-5"/></button>
                                            <button onClick={() => openEditModal(user)} title="Edit Role" className="text-indigo-600 hover:text-indigo-900"><ShieldCheck className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {isEditModalOpen && selectedUser && (
                <EditRoleModal user={selectedUser} onClose={() => setIsEditModalOpen(false)} onSave={handleUpdateRoles} />
            )}
        </>
    );
};

export default UserManagementPage;