import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { Eye, Search, ShieldCheck, UserCheck, Users, UserX, X } from 'lucide-react';
import { format } from 'date-fns';
import { confirmToast } from '../../utils/confirmToast';
import { getScopeLabel, getScopeStatus, normalizeRoleScope } from '../../utils/roleRestrictions';
import { notifyAdminCountsChanged } from '../../utils/adminEvents';
import { triggerHaptic } from '../../utils/haptics';
import { useAuth } from '../../context/AuthContext';
import { hasAdminPermission } from '../../utils/adminPermissions';

const allRoles = ['Student', 'Landlord', 'Admin', 'Super_Admin', 'Moderator', 'Support'];

const displayRole = (role) => (role === 'Student' ? 'Room seeker' : role.replace('_', ' '));

const userHasRole = (user, role) => (
  user.roles?.includes(role) || (role === 'Student' && user.roles?.includes('Landlord'))
);

const roleTone = (role) => {
  switch (role) {
    case 'Admin':
    case 'Super_Admin':
      return 'bg-red-500/10 text-red-600 dark:text-red-300';
    case 'Landlord':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300';
    case 'Moderator':
    case 'Support':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
    default:
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
  }
};

const statusTone = (status) =>
  status === 'Banned'
    ? 'bg-red-500/10 text-red-600 dark:text-red-300'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';

const getModerationScope = (roleFilter) => (
  ['Student', 'Landlord'].includes(roleFilter) ? roleFilter : 'account'
);

const getScopeActionLabel = (scope, banned) => {
  const label = getScopeLabel(scope);
  return `${banned ? 'Unban' : 'Ban'} ${label === 'Account' ? 'account' : label}`;
};

const RoleAccessChips = ({ user }) => (
  <div className="flex flex-wrap gap-1.5">
    {['Student', 'Landlord'].filter((role) => userHasRole(user, role)).map((role) => {
      const status = getScopeStatus(user, role);
      return (
        <span key={role} className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(status)}`}>
          {displayRole(role)} {status}
        </span>
      );
    })}
    {user.status === 'Banned' && (
      <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black uppercase text-white">Account Banned</span>
    )}
  </div>
);

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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-500">Access</p>
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
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const roleFilter = searchParams.get('role') || 'All';
  const canRestrictUsers = hasAdminPermission(currentAdmin, 'users:restrict');
  const canManageRoles = hasAdminPermission(currentAdmin, 'users:roles');

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
      const roleMatches = roleFilter === 'All' || userHasRole(user, roleFilter);
      const textMatches =
        !q ||
        user.name?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q);
      return roleMatches && textMatches;
    });
  }, [users, roleFilter, searchTerm]);

  const roleCounts = useMemo(() => {
    return allRoles.reduce((acc, role) => {
      acc[role] = users.filter((user) => userHasRole(user, role)).length;
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

  const handleBanUser = async (targetUser, scope = getModerationScope(roleFilter)) => {
    const roleScope = normalizeRoleScope(scope);
    const isBanned = getScopeStatus(targetUser, roleScope) === 'Banned';
    const action = isBanned ? 'unban' : 'ban';
    const newStatus = isBanned ? 'Active' : 'Banned';
    const scopeLabel = getScopeLabel(roleScope);

    confirmToast({
      title: `${getScopeActionLabel(roleScope, isBanned)}?`,
      description: isBanned
        ? `This restores ${scopeLabel.toLowerCase()} access only. Other role restrictions stay unchanged.`
        : roleScope === 'account'
          ? 'This is a severe account-level restriction and blocks booking, hosting, chat, and profile actions.'
          : `This blocks only ${scopeLabel.toLowerCase()} actions. Other active roles stay available.`,
      confirmLabel: getScopeActionLabel(roleScope, isBanned),
      tone: isBanned ? 'success' : 'danger',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${targetUser._id}/status`, {
            status: newStatus,
            roleScope,
            reason: 'RoomRadar Trust & Safety restricted this account after an admin review. Please check your recent listings, bookings, messages, and verification details before requesting a review.',
          });
          triggerHaptic(isBanned ? 'success' : 'warning');
          toast.success(`${scopeLabel} successfully ${action}ned.`);
          notifyAdminCountsChanged();
          fetchUsers();
        } catch (error) {
          triggerHaptic('error');
          toast.error(error.response?.data?.message || `Failed to ${action} ${scopeLabel.toLowerCase()}.`);
        }
      },
    });
  };

  const handleUpdateRoles = async (userId, newRoles) => {
    try {
      await api.patch(`/admin/users/${userId}/roles`, { roles: newRoles });
      triggerHaptic('success');
      toast.success('User roles updated successfully.');
      setSelectedUser(null);
      notifyAdminCountsChanged();
      fetchUsers();
    } catch (error) {
      triggerHaptic('error');
      toast.error(error.response?.data?.message || 'Failed to update roles.');
    }
  };

  return (
    <div className="min-h-screen bg-light-bg px-3 py-3 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="rounded-[1.5rem] border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-[2rem] sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-500 sm:text-[11px] sm:tracking-[0.22em]">Rental governance</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between sm:mt-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-[clamp(23px,7vw,30px)] font-black leading-tight tracking-[-0.02em]">Users & Hosts</h1>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm sm:leading-6">
                Search accounts, manage operations roles, restrict risky access, and inspect renter or host history.
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
                          <RoleAccessChips user={user} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/admin/users/${user._id}`)} title="View details" className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-black text-light-muted transition hover:bg-cyan-500/10 hover:text-cyan-500 dark:text-dark-muted">
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                            <button
                              onClick={() => handleBanUser(user)}
                              title={getScopeActionLabel(getModerationScope(roleFilter), getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned')}
                              disabled={!canRestrictUsers}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned'
                                  ? 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-300'
                                  : 'text-red-500 hover:bg-red-500/10'
                              }`}
                            >
                              {getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                              {getScopeActionLabel(getModerationScope(roleFilter), getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned')}
                            </button>
                            {canManageRoles && (
                              <button onClick={() => setSelectedUser(user)} title="Edit roles" className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-black text-cyan-500 transition hover:bg-cyan-500/10">
                                <ShieldCheck className="h-4 w-4" />
                                Roles
                              </button>
                            )}
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
                <article
                  key={user._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/users/${user._id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/admin/users/${user._id}`);
                    }
                  }}
                  className="min-w-0 cursor-pointer overflow-hidden rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm transition hover:border-cyan-300 hover:shadow-md dark:border-dark-border dark:bg-dark-card dark:hover:border-cyan-700/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] font-black leading-tight">{user.name}</p>
                      <p className="mt-0.5 break-all text-xs font-semibold leading-tight text-light-muted dark:text-dark-muted">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); handleBanUser(user); }}
                      disabled={!canRestrictUsers}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${statusTone(getScopeStatus(user, getModerationScope(roleFilter)))}`}
                      aria-label={getScopeActionLabel(getModerationScope(roleFilter), getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned')}
                    >
                      {getScopeLabel(getModerationScope(roleFilter))} {getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned' ? 'Banned' : 'Active'}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {user.roles?.map((role) => <span key={role} className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${roleTone(role)}`}>{displayRole(role)}</span>)}
                  </div>
                  <div className="mt-2">
                    <RoleAccessChips user={user} />
                  </div>
                  <div className="mt-3 border-t border-light-border pt-3 dark:border-dark-border">
                    <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">
                      <UserCheck className="mr-1 inline h-3.5 w-3.5" />
                      {format(new Date(user.createdAt), 'dd MMM yyyy')}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); navigate(`/admin/users/${user._id}`); }}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-light-border bg-light-bg px-2 text-[11px] font-black text-light-text transition active:scale-[0.98] dark:border-dark-border dark:bg-dark-input dark:text-dark-text"
                      >
                        <Eye className="h-3.5 w-3.5 text-cyan-500" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); handleBanUser(user); }}
                        disabled={!canRestrictUsers}
                        className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl px-2 text-[11px] font-black text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                          getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned'
                            ? 'bg-emerald-500 shadow-emerald-500/20'
                            : 'bg-red-500 shadow-red-500/20'
                        }`}
                      >
                        {getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned' ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                        {getScopeStatus(user, getModerationScope(roleFilter)) === 'Banned' ? 'Unban' : 'Ban'}
                      </button>
                      {canManageRoles && (
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setSelectedUser(user); }}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl bg-cyan-500/10 px-2 text-[11px] font-black text-cyan-600 transition active:scale-[0.98] dark:text-cyan-300"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Roles
                        </button>
                      )}
                    </div>
                  </div>
                </article>
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
