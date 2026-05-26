import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import Spinner from '../../components/common/Spinner';
import { ArrowRight, Building2, FileClock, Home, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { confirmToast } from '../../utils/confirmToast';
import { formatListingTitle } from '../../utils/listingDisplay';
import { notifyAdminCountsChanged } from '../../utils/adminEvents';
import { triggerHaptic } from '../../utils/haptics';
import { useAuth } from '../../context/AuthContext';
import { hasAdminPermission } from '../../utils/adminPermissions';

const TABS = ['All', 'Published', 'Pending', 'Pending_Review', 'Unpublished', 'Rejected', 'Suspended'];

const statusTone = (status) => {
  switch (status) {
    case 'Published':
    case 'Available':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
    case 'Pending':
    case 'Pending_Review':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-300';
    case 'Rejected':
    case 'Suspended':
      return 'bg-red-500/10 text-red-600 dark:text-red-300';
    default:
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-300';
  }
};

const RoomManagementPage = () => {
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const activeStatus = searchParams.get('status') || 'All';
  const canDeleteRooms = hasAdminPermission(currentAdmin, 'rooms:delete');

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/rooms?status=${activeStatus}`);
      setRooms(data || []);
    } catch (error) {
      toast.error('Could not load room data.');
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const filteredRooms = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return rooms;
    return rooms.filter((room) =>
      room.title?.toLowerCase().includes(q) ||
      room.landlord?.name?.toLowerCase().includes(q) ||
      room.location?.city?.toLowerCase().includes(q)
    );
  }, [rooms, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = rooms.reduce((acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    }, {});
    counts.All = rooms.length;
    return counts;
  }, [rooms]);

  const setStatus = (status) => {
    if (status === 'All') {
      setSearchParams({});
      return;
    }
    setSearchParams({ status });
  };

  const handleDelete = async (roomId) => {
    confirmToast({
      title: 'Permanently delete this room?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const toastId = toast.loading('Deleting room...');
        try {
          await api.delete(`/admin/rooms/${roomId}`);
          triggerHaptic('success');
          toast.success('Room permanently deleted.', { id: toastId });
          notifyAdminCountsChanged();
          fetchRooms();
        } catch (error) {
          triggerHaptic('error');
          toast.error('Failed to delete room.', { id: toastId });
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-light-bg px-3 py-3 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="rounded-[1.5rem] border border-light-border bg-light-card p-4 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-[2rem] sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-500 sm:text-[11px] sm:tracking-[0.22em]">Listings & content</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between sm:mt-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-[clamp(23px,7vw,30px)] font-black leading-tight tracking-[-0.02em]">Room Management</h1>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-light-muted dark:text-dark-muted sm:text-sm sm:leading-6">
                Moderate listings, inspect approval status, and keep marketplace inventory trustworthy.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-black sm:flex sm:text-sm">
              <span className="rounded-full bg-cyan-500/10 px-3 py-2 text-center text-cyan-600 dark:text-cyan-300 sm:px-4">{rooms.length} shown</span>
              <span className="rounded-full bg-amber-500/10 px-3 py-2 text-center text-amber-600 dark:text-amber-300 sm:px-4">{statusCounts.Pending || 0} pending</span>
            </div>
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm dark:border-dark-border dark:bg-dark-card sm:rounded-3xl sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, city, or landlord..."
                className="input-field pl-11"
              />
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide lg:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatus(tab)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-black transition sm:px-4 sm:text-xs ${
                    activeStatus === tab
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'border border-light-border bg-light-bg text-light-muted hover:border-cyan-300 dark:border-dark-border dark:bg-dark-input dark:text-dark-muted'
                  }`}
                >
                  {tab.replace('_', ' ')} {statusCounts[tab] ?? ''}
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
                      {['Room', 'Landlord', 'City', 'Submitted', 'Status', 'Actions'].map((head) => (
                        <th key={head} className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-light-muted dark:text-dark-muted">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {filteredRooms.map((room) => (
                      <tr key={room._id} className="transition hover:bg-light-bg dark:hover:bg-dark-input">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-cyan-500/10">
                              {room.images?.[0] || room.imageUrl ? (
                                <img src={room.images?.[0] || room.imageUrl} alt={formatListingTitle(room.title)} className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-cyan-500"><Home className="h-5 w-5" /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="break-words text-sm font-black">{formatListingTitle(room.title)}</p>
                              <p className="text-xs font-semibold text-light-muted dark:text-dark-muted">{room.roomType || 'Room type missing'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-light-muted dark:text-dark-muted">{room.landlord?.name || 'N/A'}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-light-muted dark:text-dark-muted">{room.location?.city || 'N/A'}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-light-muted dark:text-dark-muted">{format(new Date(room.createdAt), 'dd MMM yyyy')}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(room.status)}`}>{room.status?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/rooms/${room._id}/review`} className="rounded-xl p-2 text-cyan-500 transition hover:bg-cyan-500/10" title="View details"><ArrowRight className="h-4 w-4" /></Link>
                            {canDeleteRooms && (
                              <button onClick={() => handleDelete(room._id)} className="rounded-xl p-2 text-red-500 transition hover:bg-red-500/10" title="Permanently delete"><Trash2 className="h-4 w-4" /></button>
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
              {filteredRooms.map((room) => (
                <article
                  key={room._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/rooms/${room._id}/review`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/admin/rooms/${room._id}/review`);
                    }
                  }}
                  className="cursor-pointer rounded-[1.35rem] border border-light-border bg-light-card p-3 shadow-sm transition hover:border-cyan-300 hover:shadow-md dark:border-dark-border dark:bg-dark-card dark:hover:border-cyan-700/60"
                >
                  <div className="flex gap-3">
                    <div className="h-[74px] w-[88px] flex-shrink-0 overflow-hidden rounded-2xl bg-cyan-500/10">
                      {room.images?.[0] || room.imageUrl ? (
                        <img src={room.images?.[0] || room.imageUrl} alt={formatListingTitle(room.title)} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-cyan-500"><Building2 className="h-6 w-6" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-[14px] font-black leading-tight">{formatListingTitle(room.title)}</p>
                        <span className={`flex-shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${statusTone(room.status)}`}>{room.status?.replace('_', ' ')}</span>
                      </div>
                      <p className="mt-1 truncate text-[11px] font-semibold text-light-muted dark:text-dark-muted">{room.landlord?.name || 'N/A'} - {room.location?.city || 'N/A'}</p>
                      <p className="mt-1 text-xs font-semibold text-light-muted dark:text-dark-muted">
                        <FileClock className="mr-1 inline h-3.5 w-3.5" />
                        {format(new Date(room.createdAt), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-light-border pt-3 dark:border-dark-border">
                    <Link onClick={(event) => event.stopPropagation()} to={`/admin/rooms/${room._id}/review`} className="rounded-2xl bg-cyan-500/10 px-3 py-2 text-center text-xs font-black text-cyan-600 dark:text-cyan-300">Review</Link>
                    {canDeleteRooms && (
                      <button onClick={(event) => { event.stopPropagation(); handleDelete(room._id); }} className="rounded-2xl bg-red-500/10 px-3 py-2 text-xs font-black text-red-600 dark:text-red-300">Delete</button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {filteredRooms.length === 0 && (
              <div className="rounded-3xl border border-dashed border-light-border bg-light-card p-10 text-center dark:border-dark-border dark:bg-dark-card">
                <Home className="mx-auto h-10 w-10 text-cyan-500" />
                <p className="mt-3 font-black">No rooms found</p>
                <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">Try a different status or search term.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RoomManagementPage;
