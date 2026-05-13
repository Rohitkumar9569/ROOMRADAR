import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { Eye, Search, ShieldCheck, UserCheck, Users, UserX, X } from 'lucide-react';
import { format } from 'date-fns';
import { confirmToast } from '../../utils/confirmToast';

const allRoles = ['Student', 'Landlord', 'Admin', 'Super_Admin', 'Moderator', 'Support'];

const displayRole = (role) => (role === 'Student' ? 'Travelling' : role.replace('_', ' '));

const roleTone = (role) => {
  switch (role) {
    case 'Admin':
    case 'Super_Admin':
      return 'bg-red-500/10 text-red-600 dark:text-red-300';
    case 'Landlord':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300';
    case 'Moderator':
    case 'Support':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-300';
    default:
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
  }
};

const statusTone = (status) =>
  status === 'Banned'
    ? 'bg-red-500/10 text-red-600 dark:text-red-300'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';

const EditRoleModal = ({ user, onClose, onSave }) => {
  const [selectedRoles, setSelectedRoles] = useState([...user.roles]);

  const handleRoleToggle = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    );
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-light-border bg-light-card p-5 shadow-2xl dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-500">RBAC</p>
            <h2 className="mt-1 text-xl font-black">Edit roles</h2>
            <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">{user.name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-light-muted transition hover:bg-light-bg dark:text-dark-muted dark:hover:bg-dark-input">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {allRoles.map((role) => (
            <button
              type="button"
              key={role}
              onClick={() => handleRoleToggle(role)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                selectedRoles.includes(role)
                  ? 'border-cyan-400 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                  : 'border-light-border bg-light-bg text-light-muted hover:border-cyan-300 dark:border-dark-border dark:bg-dark-input dark:text-dark-muted'
              }`}
            >
              {displayRole(role)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={() => onSave(user._id, selectedRoles)} className="btn-primary">Save roles</button>
        </div>
      </div>
    </div>
  );
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const roleFilter = searchParams.get('role') || 'All';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data || []);
    } catch (error) {
      toast.error('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return users.filter((user) => {
      const roleMatches = roleFilter === 'All' || user.roles?.includes(roleFilter);
      const textMatches =
        !q ||
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q);
      return roleMatches && textMatches;
    });
  }, [users, roleFilter, searchTerm]);

  const roleCounts = useMemo(() => {
    return allRoles.reduce((acc, role) => {
      acc[role] = users.filter((user) => user.roles?.includes(role)).length;
      return acc;
    }, { All: users.length });
  }, [users]);

  const setRoleFilter = (role) => {
    if (role === 'All') {
      setSearchParams({});
      return;
    }
    setSearchParams({ role });
  };

  const handleBanUser = async (userId, userStatus) => {
    const isBanned = userStatus === 'Banned';
    const action = isBanned ? 'unban' : 'ban';
    const newStatus = isBanned ? 'Active' : 'Banned';

    confirmToast({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} this user?`,
      description: isBanned
        ? 'This restores dashboard, booking, hosting, chat, and profile access.'
        : 'The user will immediately see a Trust & Safety restriction page with review steps.',
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      tone: isBanned ? 'success' : 'danger',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${userId}/status`, {
            status: newStatus,
            reason: 'RoomRadar Trust & Safety restricted this account after an admin review. Please check your recent listings, bookings, messages, and verification details before requesting a review.',
          });
          toast.success(`User successfully ${action}ned.`);
          fetchUsers();
        } catch (error) {
          toast.error(error.response?.data?.message || `Failed to ${action} user.`);
        }
      },
    });
  };

  const handleUpdateRoles = async (userId, newRoles) => {
    try {
      await api.patch(`/admin/users/${userId}/roles`, { roles: newRoles });
      toast.success('User roles updated successfully.');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update roles.');
    }
  };

  return (
    <div className="min-h-screen bg-light-bg px-3 py-3 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="rounded-[1.5rem] border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-[2rem] sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-500 sm:text-[11px] sm:tracking-[0.22em]">Platform governance</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between sm:mt-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-[clamp(23px,7vw,30px)] font-black leading-tight tracking-[-0.02em]">User Management</h1>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm sm:leading-6">
                Search accounts, manage RBAC roles, ban risky users, and inspect detailed user history.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-black sm:flex sm:text-sm">
              <span className="rounded-full bg-cyan-500/10 px-3 py-2 text-center text-cyan-600 dark:text-cyan-300 sm:px-4">{users.length} users</span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-center text-emerald-600 dark:text-emerald-300 sm:px-4">{roleCounts.Landlord || 0} landlords</span>
            </div>
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input-field pl-11"
              />
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide lg:pb-0">
              {['All', 'Student', 'Landlord', 'Admin', 'Moderator', 'Support'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-black transition sm:px-4 sm:text-xs ${
                    roleFilter === role
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'border border-light-border bg-light-bg text-light-muted hover:border-cyan-300 dark:border-dark-border dark:bg-dark-input dark:text-dark-muted'
                  }`}
                >
                  {displayRole(role)} {roleCounts[role] ?? 0}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center"><Spinner /></div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-3xl border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-light-border dark:divide-dark-border">
                  <thead className="bg-light-bg dark:bg-dark-input">
                    <tr>
                      {['Name', 'Email', 'Roles', 'Joined', 'Status', 'Actions'].map((head) => (
                        <th key={head} className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-light-muted dark:text-dark-muted">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className="transition hover:bg-light-bg dark:hover:bg-dark-input">
                        <td className="px-5 py-4 text-sm font-black">{user.name}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-light-muted dark:text-dark-muted">{user.email}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles?.map((role) => (
                              <span key={role} className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${roleTone(role)}`}>{displayRole(role)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-light-muted dark:text-dark-muted">{format(new Date(user.createdAt), 'dd MMM yyyy')}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(user.status || 'Active')}`}>{user.status || 'Active'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/admin/users/${user._id}`)} title="View details" className="rounded-xl p-2 text-light-muted transition hover:bg-cyan-500/10 hover:text-cyan-500 dark:text-dark-muted"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => handleBanUser(user._id, user.status)} title="Ban or unban user" className="rounded-xl p-2 text-red-500 transition hover:bg-red-500/10"><UserX className="h-4 w-4" /></button>
                            <button onClick={() => setSelectedUser(user)} title="Edit roles" className="rounded-xl p-2 text-cyan-500 transition hover:bg-cyan-500/10"><ShieldCheck className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 md:hidden">
              {filteredUsers.map((user) => (
                <div key={user._id} className="min-w-0 overflow-hidden rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] font-black leading-tight">{user.name}</p>
                      <p className="mt-0.5 break-all text-xs font-semibold leading-tight text-light-muted dark:text-dark-muted">{user.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(user.status || 'Active')}`}>{user.status || 'Active'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {user.roles?.map((role) => <span key={role} className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${roleTone(role)}`}>{displayRole(role)}</span>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-light-border pt-3 dark:border-dark-border">
                    <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">
                      <UserCheck className="mr-1 inline h-3.5 w-3.5" />
                      {format(new Date(user.createdAt), 'dd MMM yyyy')}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button onClick={() => navigate(`/admin/users/${user._id}`)} className="rounded-xl p-2 text-cyan-500 hover:bg-cyan-500/10"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleBanUser(user._id, user.status)} className="rounded-xl p-2 text-red-500 hover:bg-red-500/10"><UserX className="h-4 w-4" /></button>
                      <button onClick={() => setSelectedUser(user)} className="rounded-xl p-2 text-cyan-500 hover:bg-cyan-500/10"><ShieldCheck className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="rounded-3xl border border-dashed border-light-border bg-light-card p-10 text-center dark:border-dark-border dark:bg-dark-card">
                <Users className="mx-auto h-10 w-10 text-cyan-500" />
                <p className="mt-3 font-black">No users found</p>
                <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">Try a different role or search term.</p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedUser && (
        <EditRoleModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handleUpdateRoles}
        />
      )}
    </div>
  );
};

export default UserManagementPage;
