import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { AlertTriangle, ArrowLeft, BadgeCheck, Calendar, FileText, Home, Mail, ShieldCheck, UserX, X } from 'lucide-react';
import { format } from 'date-fns';
import { confirmToast } from '../../utils/confirmToast';
import { getScopeLabel, getScopeStatus, normalizeRoleScope } from '../../utils/roleRestrictions';

const allRoles = ['Student', 'Landlord', 'Admin', 'Super_Admin', 'Moderator', 'Support'];

const displayRole = (role) => (role === 'Student' ? 'Travelling' : role.replace('_', ' '));

const userHasRole = (user, role) => (
  user?.roles?.includes(role) || (role === 'Student' && user?.roles?.includes('Landlord'))
);

const roleTone = (role) => {
  if (['Admin', 'Super_Admin'].includes(role)) return 'bg-red-500/10 text-red-600 dark:text-red-300';
  if (role === 'Landlord') return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300';
  if (['Moderator', 'Support'].includes(role)) return 'bg-violet-500/10 text-violet-600 dark:text-violet-300';
  return 'bg-blue-500/10 text-blue-600 dark:text-blue-300';
};

const statusTone = (status) =>
  status === 'Banned'
    ? 'bg-red-500/10 text-red-600 dark:text-red-300'
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';

const getScopeActionLabel = (scope, banned) => {
  const label = getScopeLabel(scope);
  return `${banned ? 'Unban' : 'Ban'} ${label === 'Account' ? 'account' : label}`;
};

const EditRoleModal = ({ user, onClose, onSave }) => {
  const [selectedRoles, setSelectedRoles] = useState([...user.roles]);

  const handleRoleToggle = (role) => {
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]);
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

const StatBox = ({ label, value, icon: Icon }) => (
  <div className="rounded-3xl bg-light-bg p-4 dark:bg-dark-input">
    <Icon className="mb-3 h-5 w-5 text-cyan-500" />
    <p className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

const UserDetailTabs = ({ user }) => {
  const [activeTab, setActiveTab] = useState('applications');
  const tabs = [
    { id: 'applications', label: 'Applications', icon: FileText },
    ...(user.roles.includes('Landlord') ? [{ id: 'listings', label: 'Listings', icon: Home }] : []),
  ];

  const rows = activeTab === 'applications' ? (user.applications || []) : (user.listings || []);

  return (
    <div className="rounded-3xl border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:p-5">
      <div className="flex gap-2 overflow-x-auto pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'border border-light-border bg-light-bg text-light-muted hover:border-cyan-300 dark:border-dark-border dark:bg-dark-input dark:text-dark-muted'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.length > 0 ? rows.map((item) => (
          <div key={item._id} className="rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-input">
            {activeTab === 'applications' ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="break-words font-black">{item.room?.title || 'Deleted room'}</p>
                  <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">Applied {format(new Date(item.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <span className={`self-start rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(item.status)}`}>{item.status}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="break-words font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">Created {format(new Date(item.createdAt), 'dd MMM yyyy')}</p>
                </div>
                <Link to={`/admin/rooms/${item._id}/review`} className="self-start rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-black text-cyan-600 dark:text-cyan-300">
                  View room
                </Link>
              </div>
            )}
          </div>
        )) : (
          <div className="rounded-3xl border border-dashed border-light-border p-10 text-center dark:border-dark-border">
            <p className="font-black">No {activeTab} found</p>
            <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">This user's activity will appear here.</p>
          </div>
        )}
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
      const { data } = await api.get(`/admin/users/${userId}/details?t=${Date.now()}`);
      setUser(data);
      setError(null);
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

  const handleBanUser = async (scope = 'account') => {
    const roleScope = normalizeRoleScope(scope);
    const isBanned = getScopeStatus(user, roleScope) === 'Banned';
    const action = isBanned ? 'unban' : 'ban';
    const newStatus = isBanned ? 'Active' : 'Banned';
    const scopeLabel = getScopeLabel(roleScope);

    confirmToast({
      title: `${getScopeActionLabel(roleScope, isBanned)}?`,
      description: isBanned
        ? `This restores ${scopeLabel.toLowerCase()} access only. Other restrictions stay unchanged.`
        : roleScope === 'account'
          ? 'This severe account-level restriction blocks booking, hosting, chat, and profile actions.'
          : `This blocks only ${scopeLabel.toLowerCase()} actions. Other active roles stay available.`,
      confirmLabel: getScopeActionLabel(roleScope, isBanned),
      tone: isBanned ? 'success' : 'danger',
      onConfirm: async () => {
        try {
          const { data } = await api.patch(`/admin/users/${user._id}/status`, {
            status: newStatus,
            roleScope,
            reason: 'RoomRadar Trust & Safety restricted this account after an admin review. Please check your recent listings, bookings, messages, and verification details before requesting a review.',
          });
          toast.success(`${scopeLabel} successfully ${action}ned.`);
          setUser((currentUser) => ({ ...currentUser, ...data }));
        } catch (err) {
          toast.error(err.response?.data?.message || `Failed to ${action} ${scopeLabel.toLowerCase()}.`);
        }
      },
    });
  };

  const handleUpdateRoles = async (id, newRoles) => {
    try {
      await api.patch(`/admin/users/${id}/roles`, { roles: newRoles });
      toast.success('User roles updated successfully.');
      setUser((currentUser) => ({ ...currentUser, roles: newRoles }));
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update roles.');
    }
  };

  const handleVerificationToggle = async () => {
    const isCurrentlyVerified = user.isVerified;
    confirmToast({
      title: `${isCurrentlyVerified ? 'Revoke verification for' : 'Verify'} this user?`,
      confirmLabel: isCurrentlyVerified ? 'Revoke' : 'Verify',
      tone: isCurrentlyVerified ? 'danger' : 'success',
      onConfirm: async () => {
        try {
          const endpoint = isCurrentlyVerified
            ? `/admin/users/${user._id}/revoke-verification`
            : `/admin/users/${user._id}/verify`;
          await api.patch(endpoint);
          toast.success(`User verification has been ${isCurrentlyVerified ? 'revoked' : 'confirmed'}.`);
          setUser((currentUser) => ({ ...currentUser, isVerified: !isCurrentlyVerified }));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to update verification status.');
        }
      },
    });
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <div className="min-h-screen bg-light-bg p-8 text-center text-red-500 dark:bg-dark-bg">{error}</div>;

  return (
    <div className="min-h-screen bg-light-bg px-4 py-5 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <button onClick={() => navigate('/admin/users')} className="inline-flex items-center gap-2 rounded-full border border-light-border bg-light-card px-4 py-2 text-sm font-bold transition hover:border-cyan-300 dark:border-dark-border dark:bg-dark-card">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </button>

        {user && (
          <>
            <div className="overflow-hidden rounded-[2rem] border border-light-border bg-light-card shadow-sm dark:border-dark-border dark:bg-dark-card">
              <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-dark-sidebar p-6 text-white sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-3xl font-black ring-1 ring-white/25 backdrop-blur">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">{user.name}</h1>
                        {user.isVerified && <BadgeCheck className="h-6 w-6 text-emerald-300" />}
                      </div>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-cyan-50">
                        <Mail className="h-4 w-4" /> {user.email}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-cyan-50">
                        <Calendar className="h-4 w-4" /> Joined {format(new Date(user.createdAt), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button onClick={() => setIsModalOpen(true)} className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black backdrop-blur transition hover:bg-white/25">
                      Edit roles
                    </button>
                    <button onClick={handleVerificationToggle} className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black backdrop-blur transition hover:bg-white/25">
                      {user.isVerified ? 'Revoke verify' : 'Verify'}
                    </button>
                    <button onClick={() => handleBanUser('account')} className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-black transition hover:bg-red-600">
                      {user.status === 'Banned' ? 'Unban account' : 'Ban account'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatBox label="Applications" value={user.applications?.length ?? 0} icon={FileText} />
                <StatBox label="Listings" value={user.roles.includes('Landlord') ? (user.listings?.length ?? 0) : 'N/A'} icon={Home} />
                <StatBox label="Verification" value={user.isVerified ? 'Verified' : 'Needs review'} icon={ShieldCheck} />
                <StatBox label="Account" value={user.status || 'Active'} icon={UserX} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {['Student', 'Landlord'].filter((role) => userHasRole(user, role)).map((role) => {
                const status = getScopeStatus(user, role);
                const isBanned = status === 'Banned';
                return (
                  <div key={role} className="rounded-[1.35rem] border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-light-muted dark:text-dark-muted">{displayRole(role)} access</p>
                        <p className={`mt-1 text-lg font-black ${isBanned ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{status}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleBanUser(role)}
                        className={`inline-flex min-h-10 items-center justify-center rounded-2xl px-4 text-sm font-black text-white transition active:scale-[0.98] ${isBanned ? 'bg-emerald-500' : 'bg-red-500'}`}
                      >
                        {getScopeActionLabel(role, isBanned)}
                      </button>
                    </div>
                    {isBanned && (
                      <p className="mt-3 text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
                        {user.roleRestrictions?.[normalizeRoleScope(role)]?.reason || 'RoomRadar Trust & Safety restricted this role.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {user.status === 'Banned' && (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-400/20 dark:bg-red-500/10 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-red-700 dark:text-red-200">Restriction visible to user</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-red-700/80 dark:text-red-100/80">
                        {user.accountRestriction?.reason || 'RoomRadar Trust & Safety restricted this account after an admin review.'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-red-600 shadow-sm dark:bg-dark-card dark:text-red-200">
                    Appeal: {user.accountRestriction?.appealStatus || 'none'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span key={role} className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${roleTone(role)}`}>
                  {displayRole(role)} {['Student', 'Landlord'].includes(role) ? getScopeStatus(user, role) : ''}
                </span>
              ))}
              <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${statusTone(user.status || 'Active')}`}>
                {user.status || 'Active'}
              </span>
            </div>

            <UserDetailTabs user={user} />
          </>
        )}
      </div>

      {isModalOpen && user && (
        <EditRoleModal user={user} onClose={() => setIsModalOpen(false)} onSave={handleUpdateRoles} />
      )}
    </div>
  );
};

export default AdminUserDetailsPage;
