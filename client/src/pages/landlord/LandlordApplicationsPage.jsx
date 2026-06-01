import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BadgeCheck, Building2, CalendarClock, CalendarDays, CheckCircle2, FileText, MessageCircle, Search, ShieldCheck, Star, Timer, XCircle, Zap } from 'lucide-react';
import api from '../../api';
import Spinner from '../../components/common/Spinner';
import ApplicationReviewDrawer from '../../components/features/booking/ApplicationReviewDrawer';
import GuestReviewModal from '../../components/features/reviews/GuestReviewModal';
import { triggerHaptic } from '../../utils/haptics';
import { calculateLeadScore, daysUntil } from '../../utils/leadScore';

const statusMeta = {
  pending: { label: 'Pending', Icon: Timer, badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  approved: { label: 'Approved', Icon: CheckCircle2, badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
  confirmed: { label: 'Confirmed', Icon: CheckCircle2, badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-300' },
  rejected: { label: 'Rejected', Icon: XCircle, badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-300' },
  cancelled: { label: 'Cancelled', Icon: XCircle, badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
};

const getRoomImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || null;

function LandlordApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [reviewApplication, setReviewApplication] = useState(null);
  const [detailApplication, setDetailApplication] = useState(null);
  const activeStatus = searchParams.get('status') || 'all';

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/applications/landlord');
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Could not load booking requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const counts = useMemo(() => {
    const next = { all: applications.length, pending: 0, approved: 0, confirmed: 0, rejected: 0, cancelled: 0 };
    applications.forEach((application) => {
      if (next[application.status] !== undefined) next[application.status] += 1;
    });
    return next;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = query.trim().toLowerCase();
    return applications
      .filter((application) => activeStatus === 'all' || application.status === activeStatus)
      .filter((application) => {
        if (!term) return true;
        return (
          application.room?.title?.toLowerCase().includes(term) ||
          application.student?.name?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const scoreDiff = calculateLeadScore(b).score - calculateLeadScore(a).score;
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [applications, activeStatus, query]);

  const leadSummary = useMemo(() => {
    const scored = applications.map(calculateLeadScore);
    return {
      highlyQualified: scored.filter((lead) => lead.score >= 75).length,
      urgentMoveIns: applications.filter((application) => application.status === 'pending' && daysUntil(application.checkInDate) !== null && daysUntil(application.checkInDate) <= 7 && daysUntil(application.checkInDate) >= 0).length,
      missingDetails: scored.filter((lead) => lead.score < 55).length,
    };
  }, [applications]);

  const setStatus = (status) => {
    if (status === 'all') setSearchParams({});
    else setSearchParams({ status });
  };

  const updateApplicationStatus = async (applicationId, action) => {
    const toastId = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} request...`);
    try {
      const { data } = await api.patch(`/applications/${applicationId}/${action}`);
      const updatedApplication = data.application || data;
      const mergeApplication = (application) => ({
        ...application,
        ...updatedApplication,
        room: updatedApplication.room && typeof updatedApplication.room === 'object' ? updatedApplication.room : application.room,
        student: updatedApplication.student && typeof updatedApplication.student === 'object' ? updatedApplication.student : application.student,
        hasGuestReview: application.hasGuestReview,
        guestReview: application.guestReview,
      });
      setApplications((prev) => prev.map((application) => (
        application._id === applicationId ? mergeApplication(application) : application
      )));
      setDetailApplication((current) => (current?._id === applicationId ? mergeApplication(current) : current));
      triggerHaptic(action === 'approve' ? 'success' : 'warning');
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}.`, { id: toastId });
    } catch (error) {
      triggerHaptic('error');
      toast.error(error.response?.data?.message || 'Could not update request.', { id: toastId });
    }
  };

  const handleStayChangeResponse = async (applicationId, action) => {
    const toastId = toast.loading(action === 'approve' ? 'Approving date change...' : 'Rejecting date change...');
    try {
      const { data } = await api.patch(`/applications/${applicationId}/stay-change/respond`, { action });
      const updatedApplication = data.application || data;
      setApplications((prev) => prev.map((application) => (application._id === applicationId ? updatedApplication : application)));
      triggerHaptic(action === 'approve' ? 'success' : 'warning');
      toast.success(data.message || 'Stay change updated.', { id: toastId });
    } catch (error) {
      triggerHaptic('error');
      toast.error(error.response?.data?.message || 'Could not update stay change.', { id: toastId });
    }
  };

  const handleGuestReviewSuccess = (review, stats) => {
    setApplications((prev) => prev.map((application) => {
      if (application._id !== reviewApplication?._id) return application;
      return {
        ...application,
        hasGuestReview: true,
        guestReview: review,
        student: {
          ...(application.student || {}),
          guestAverageRating: stats?.guestAverageRating ?? application.student?.guestAverageRating,
          guestReviewsCount: stats?.guestReviewsCount ?? application.student?.guestReviewsCount,
        },
      };
    }));
    setDetailApplication((current) => {
      if (current?._id !== reviewApplication?._id) return current;
      return {
        ...current,
        hasGuestReview: true,
        guestReview: review,
        student: {
          ...(current.student || {}),
          guestAverageRating: stats?.guestAverageRating ?? current.student?.guestAverageRating,
          guestReviewsCount: stats?.guestReviewsCount ?? current.student?.guestReviewsCount,
        },
      };
    });
    setReviewApplication(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-light-bg dark:bg-dark-bg">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-light-bg p-4 pb-24 text-light-text dark:bg-dark-bg dark:text-dark-text sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-light-border bg-light-card p-5 shadow-sm dark:border-dark-border dark:bg-dark-sidebar">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Booking requests</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-[28px]">Booking requests</h1>
              <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">Review every stay request, message the seeker, and keep each room booking moving.</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-field pl-11"
                placeholder="Search seeker or room"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white"><BadgeCheck className="h-5 w-5" /></span>
              <div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-200">{leadSummary.highlyQualified}</p>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700/75 dark:text-emerald-200/75">Ready to approve</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-300/20 dark:bg-cyan-300/10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white"><Zap className="h-5 w-5" /></span>
              <div>
                <p className="text-2xl font-black text-cyan-700 dark:text-cyan-200">{leadSummary.urgentMoveIns}</p>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700/75 dark:text-cyan-200/75">Move-ins this week</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-200">{leadSummary.missingDetails}</p>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700/75 dark:text-amber-200/75">Needs details</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {Object.keys(counts).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatus(status)}
              className={`min-h-11 flex-shrink-0 rounded-full px-4 text-sm font-black capitalize transition ${
                activeStatus === status
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'bg-light-card text-light-muted ring-1 ring-light-border hover:text-light-text dark:bg-dark-card dark:text-dark-muted dark:ring-dark-border dark:hover:text-dark-text'
              }`}
            >
              {status}
              <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">{counts[status]}</span>
            </button>
          ))}
        </div>

        {filteredApplications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-light-border bg-light-card p-10 text-center dark:border-dark-border dark:bg-dark-card">
            <CalendarDays className="mx-auto h-12 w-12 text-brand" />
            <h2 className="mt-4 text-xl font-black">No booking requests found</h2>
            <p className="mt-2 text-sm font-semibold text-light-muted dark:text-dark-muted">Try another status or wait for new room requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application, index) => {
              const meta = statusMeta[application.status] || statusMeta.pending;
              const StatusIcon = meta.Icon;
              const roomImage = getRoomImage(application.room);
              const lead = calculateLeadScore(application);
              return (
                <article
                  key={application._id || `${application.room?._id || 'room'}-${application.student?._id || 'student'}-${index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailApplication(application)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setDetailApplication(application);
                    }
                  }}
                  aria-label={`Review booking details for ${application.student?.name || application.fullName || 'room seeker'}`}
                  className="cursor-pointer rounded-3xl border border-light-border bg-light-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg dark:border-dark-border dark:bg-dark-card dark:hover:border-cyan-700/60"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-4 md:w-[35%]">
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 text-lg font-black text-brand">
                        {roomImage ? <img src={roomImage} alt={application.room?.title || 'Room'} className="h-full w-full object-cover" loading="lazy" /> : <Building2 className="h-7 w-7" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0">
                        <Link onClick={(event) => event.stopPropagation()} to={application.room?._id ? `/room/${application.room._id}` : '/landlord/my-rooms'} className="block truncate text-base font-black hover:text-brand">
                          {application.room?.title || 'Room'}
                        </Link>
                        <p className="mt-1 truncate text-sm font-semibold text-light-muted dark:text-dark-muted">{application.student?.name || 'Room seeker'}</p>
                        {Number(application.student?.guestAverageRating || 0) > 0 && (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-black text-amber-700 dark:text-amber-300">
                            <Star className="h-3 w-3 fill-current" />
                            {Number(application.student.guestAverageRating).toFixed(1)}
                            <span className="font-bold opacity-70">({application.student.guestReviewsCount || 0})</span>
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
                            lead.tone === 'emerald'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : lead.tone === 'cyan'
                                ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }`}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {lead.label} {lead.score}
                          </span>
                          {lead.signals.slice(0, 2).map((signal) => (
                            <span key={signal} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              {signal}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid flex-1 grid-cols-2 gap-3 text-sm md:grid-cols-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Move-in</p>
                        <p className="mt-1 font-bold">{application.checkInDate ? format(new Date(application.checkInDate), 'dd MMM yyyy') : 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Move-out</p>
                        <p className="mt-1 font-bold">{application.checkOutDate ? format(new Date(application.checkOutDate), 'dd MMM yyyy') : 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Occupants</p>
                        <p className="mt-1 font-bold">{application.occupants?.adults || 1}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">Status</p>
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${meta.badge}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-end justify-start gap-2 md:justify-end">
                        {application.status === 'pending' ? (
                          <>
                            <button type="button" onClick={(event) => { event.stopPropagation(); updateApplicationStatus(application._id, 'approve'); }} className="rr-approve-action rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700">Approve</button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); updateApplicationStatus(application._id, 'reject'); }} className="rounded-xl bg-brand px-3 py-2 text-xs font-black text-white transition hover:bg-red-600">Reject</button>
                          </>
                        ) : (
                          <>
                            {application.status === 'confirmed' && application.stayChangeRequest?.status === 'pending' && (
                              <div className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 md:min-w-[15rem]">
                                <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide">
                                  <CalendarClock className="h-4 w-4" />
                                  {application.stayChangeRequest.type === 'extend' ? 'Extension request' : 'Move-out request'}
                                </p>
                                <p className="mt-1 text-xs font-bold">
                                  New date: {application.stayChangeRequest.requestedCheckOutDate ? format(new Date(application.stayChangeRequest.requestedCheckOutDate), 'dd MMM yyyy') : 'Not set'}
                                </p>
                                {application.stayChangeRequest.message && (
                                  <p className="mt-1 line-clamp-2 text-xs font-semibold opacity-80">{application.stayChangeRequest.message}</p>
                                )}
                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                  <button type="button" onClick={(event) => { event.stopPropagation(); handleStayChangeResponse(application._id, 'approve'); }} className="rounded-xl bg-emerald-600 px-2 py-2 text-[11px] font-black text-white">
                                    Approve
                                  </button>
                                  <button type="button" onClick={(event) => { event.stopPropagation(); handleStayChangeResponse(application._id, 'reject'); }} className="rounded-xl bg-white px-2 py-2 text-[11px] font-black text-rose-600 ring-1 ring-rose-200 dark:bg-slate-950 dark:ring-rose-400/20">
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                            {application.status === 'confirmed' && !application.hasGuestReview && !application.guestReview && (
                              <button type="button" onClick={(event) => { event.stopPropagation(); setReviewApplication(application); }} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white transition hover:bg-amber-600">
                                <Star className="h-4 w-4 fill-current" />
                                Review guest
                              </button>
                            )}
                            {application.status === 'confirmed' && (application.hasGuestReview || application.guestReview) && (
                              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-700 dark:text-emerald-300">
                                <Star className="h-4 w-4 fill-current" />
                                Reviewed
                              </span>
                            )}
                            {application.status === 'confirmed' && (
                              <Link onClick={(event) => event.stopPropagation()} to={`/landlord/agreement/${application._id}`} className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-700">
                                <FileText className="h-4 w-4" />
                                Agreement
                              </Link>
                            )}
                            {application.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 rounded-xl bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-700 dark:text-cyan-300">
                                <ShieldCheck className="h-4 w-4" />
                                Awaiting tenant
                              </span>
                            )}
                            <Link onClick={(event) => event.stopPropagation()} to={application.conversation ? `/landlord/inbox/${application.conversation}` : '/landlord/inbox'} className="btn-outline inline-flex items-center gap-2 px-3 py-2 text-xs">
                              <MessageCircle className="h-4 w-4" />
                              Chat
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <GuestReviewModal
        isOpen={Boolean(reviewApplication)}
        application={reviewApplication}
        onClose={() => setReviewApplication(null)}
        onSuccess={handleGuestReviewSuccess}
      />
      <ApplicationReviewDrawer
        isOpen={Boolean(detailApplication)}
        application={detailApplication}
        onClose={() => setDetailApplication(null)}
        onApprove={(applicationId) => updateApplicationStatus(applicationId, 'approve')}
        onReject={(applicationId) => updateApplicationStatus(applicationId, 'reject')}
      />
    </div>
  );
}

export default LandlordApplicationsPage;
