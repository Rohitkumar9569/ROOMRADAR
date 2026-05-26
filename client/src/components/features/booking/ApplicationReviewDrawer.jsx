import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileBadge2,
  FileText,
  Home,
  IdCard,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { calculateLeadScore, daysUntil } from '../../../utils/leadScore';
import { formatListingTitle } from '../../../utils/listingDisplay';

const statusMeta = {
  pending: { label: 'Pending review', Icon: Clock3, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  approved: { label: 'Approved', Icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  confirmed: { label: 'Confirmed', Icon: CheckCircle2, className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  rejected: { label: 'Rejected', Icon: XCircle, className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  cancelled: { label: 'Cancelled', Icon: XCircle, className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  expired: { label: 'Expired', Icon: XCircle, className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
};

const money = (value) => `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;

const getRoomImage = (room) => room?.images?.[0]?.url || room?.images?.[0] || room?.imageUrl || '';

const formatDate = (date, fallback = 'Not provided') => {
  if (!date) return fallback;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return fallback;
  return format(parsedDate, 'dd MMM yyyy');
};

const formatDateTime = (date) => {
  if (!date) return 'Not provided';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Not provided';
  return format(parsedDate, 'dd MMM yyyy, h:mm a');
};

const valueOrDash = (value) => {
  if (value === undefined || value === null || value === '') return 'Not provided';
  return value;
};

const buildOccupantSummary = (application) => {
  const occupants = application?.occupants || {};
  const adults = Number(occupants.adults || 1);
  const children = Number(occupants.children || 0);
  const parts = [`${adults} adult${adults === 1 ? '' : 's'}`];

  if (children > 0) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  if (application?.occupantComposition) parts.push(application.occupantComposition);
  if (application?.gender) parts.push(application.gender);
  if (Number(occupants.males || 0) > 0) parts.push(`${occupants.males} male`);
  if (Number(occupants.females || 0) > 0) parts.push(`${occupants.females} female`);

  return parts.join(' - ');
};

const getApplicantName = (application) => (
  application?.fullName
  || application?.student?.name
  || 'Applicant'
);

const getApplicantPhone = (application) => (
  application?.mobileNumber
  || application?.student?.mobileNumber
  || application?.student?.phone
  || ''
);

const DetailItem = ({ icon: Icon, label, value, action }) => (
  <div className="rounded-2xl border border-light-border bg-light-bg p-3 dark:border-dark-border dark:bg-dark-sidebar">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-light-muted dark:text-dark-muted">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-light-text dark:text-dark-text">{valueOrDash(value)}</p>
        {action}
      </div>
    </div>
  </div>
);

const AmountRow = ({ label, value, strong }) => (
  <div className={`flex items-center justify-between gap-3 py-2 text-sm ${strong ? 'font-black text-light-text dark:text-dark-text' : 'font-semibold text-light-muted dark:text-dark-muted'}`}>
    <span>{label}</span>
    <span>{money(value)}</span>
  </div>
);

const SectionTitle = ({ children }) => (
  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand">{children}</p>
);

const ApplicationReviewDrawer = ({
  application,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const [action, setAction] = useState('');
  const lead = useMemo(() => calculateLeadScore(application || {}), [application]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!application) return null;

  const room = application.room || {};
  const student = application.student || {};
  const roomImage = getRoomImage(room);
  const displayTitle = formatListingTitle(room.title, 'Room listing');
  const meta = statusMeta[application.status] || statusMeta.pending;
  const StatusIcon = meta.Icon;
  const moveInDays = daysUntil(application.checkInDate);
  const amount = application.amountBreakdown || {};
  const isPending = application.status === 'pending';
  const applicantName = getApplicantName(application);
  const applicantPhone = getApplicantPhone(application);
  const email = student.email || '';
  const showAgreement = application.status === 'confirmed';

  const handleDecision = async (nextAction) => {
    const handler = nextAction === 'approve' ? onApprove : onReject;
    if (!handler) return;
    try {
      setAction(nextAction);
      await handler(application._id);
    } finally {
      setAction('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90]">
          <motion.button
            type="button"
            aria-label="Close applicant details"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm dark:bg-black/70"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Applicant booking details"
            className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[1.75rem] border border-light-border bg-light-card text-light-text shadow-2xl dark:border-dark-border dark:bg-dark-card dark:text-dark-text md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[min(560px,calc(100vw-2rem))] md:rounded-none md:border-y-0 md:border-r-0"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <div className="flex h-full max-h-[92vh] flex-col md:max-h-none">
              <header className="border-b border-light-border bg-light-card/95 px-4 py-4 backdrop-blur-xl dark:border-dark-border dark:bg-dark-card/95 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                        lead.tone === 'emerald'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : lead.tone === 'cyan'
                            ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {lead.label} {lead.score}
                      </span>
                    </div>
                    <h2 className="mt-3 line-clamp-2 text-xl font-black tracking-tight">{applicantName}</h2>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-light-muted dark:text-dark-muted">{displayTitle}</p>
                  </div>
                  <button type="button" onClick={onClose} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-light-bg text-light-text transition hover:bg-slate-200 active:scale-95 dark:bg-dark-sidebar dark:text-dark-text dark:hover:bg-slate-800" aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                <div className="overflow-hidden rounded-3xl border border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-sidebar">
                  <div className="grid grid-cols-[7rem_1fr] gap-3 p-3">
                    <div className="h-28 overflow-hidden rounded-2xl bg-cyan-500/10">
                      {roomImage ? (
                        <img src={roomImage} alt={displayTitle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-black text-cyan-700 dark:text-cyan-200">
                          <Home className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 py-1">
                      <p className="line-clamp-2 text-base font-black">{displayTitle}</p>
                      <p className="mt-1 text-sm font-semibold text-light-muted dark:text-dark-muted">
                        {room.location?.city || room.location?.address || 'Location not provided'}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                        <span className="rounded-2xl bg-white px-3 py-2 text-cyan-700 dark:bg-slate-900 dark:text-cyan-200">{money(room.rent)} / mo</span>
                        <span className="rounded-2xl bg-white px-3 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{application.durationMonths || amount.durationMonths || 1} mo stay</span>
                      </div>
                    </div>
                  </div>
                </div>

                {moveInDays !== null && moveInDays >= 0 && (
                  <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
                    Move-in is in {moveInDays} day{moveInDays === 1 ? '' : 's'}.
                  </div>
                )}

                <div className="mt-5 space-y-5">
                  <section>
                    <SectionTitle>Applicant profile</SectionTitle>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <DetailItem icon={UserRound} label="Full name" value={applicantName} />
                      <DetailItem icon={Phone} label="Phone" value={applicantPhone} />
                      <DetailItem icon={Mail} label="Email" value={email} />
                      <DetailItem icon={FileBadge2} label="Purpose" value={application.purposeOfStay || application.profileType} />
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Stay request</SectionTitle>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <DetailItem icon={CalendarDays} label="Move-in" value={formatDate(application.checkInDate)} />
                      <DetailItem icon={CalendarDays} label="Move-out" value={formatDate(application.checkOutDate)} />
                      <DetailItem icon={Users} label="Occupants" value={buildOccupantSummary(application)} />
                      <DetailItem icon={Clock3} label="Submitted" value={formatDateTime(application.createdAt)} />
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Verification</SectionTitle>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <DetailItem
                        icon={IdCard}
                        label="ID proof"
                        value={application.idProofType}
                        action={application.idProofImage ? (
                          <a href={application.idProofImage} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-black text-brand hover:underline">
                            Open document
                          </a>
                        ) : null}
                      />
                      <DetailItem
                        icon={ShieldCheck}
                        label="Terms"
                        value={application.agreedToTerms ? 'Accepted by applicant' : 'Not accepted'}
                      />
                      <DetailItem icon={UserRound} label="Emergency contact" value={application.emergencyContact?.name} />
                      <DetailItem icon={Phone} label="Emergency phone" value={application.emergencyContact?.phone} />
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Applicant note</SectionTitle>
                    <div className="mt-3 rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-sidebar">
                      <p className="whitespace-pre-line text-sm font-semibold leading-6 text-light-muted dark:text-dark-muted">
                        {application.message || 'No message added.'}
                      </p>
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Payment snapshot</SectionTitle>
                    <div className="mt-3 rounded-2xl border border-light-border bg-light-bg p-4 dark:border-dark-border dark:bg-dark-sidebar">
                      <AmountRow label={`Rent x ${amount.durationMonths || application.durationMonths || 1} month(s)`} value={(amount.rent || room.rent || 0) * (amount.durationMonths || application.durationMonths || 1)} />
                      <AmountRow label="Security deposit" value={amount.securityDeposit || room.securityDeposit || room.rent || 0} />
                      <AmountRow label="Platform fee" value={amount.platformFee || 0} />
                      <div className="my-2 border-t border-light-border dark:border-dark-border" />
                      <AmountRow label="Total due" value={amount.total || 0} strong />
                      <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {application.paymentStatus || 'pending'}
                      </p>
                    </div>
                  </section>
                </div>
              </div>

              <footer className="border-t border-light-border bg-light-card/95 p-4 backdrop-blur-xl dark:border-dark-border dark:bg-dark-card/95 sm:p-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  {application.conversation && (
                    <Link to={`/landlord/inbox/${application.conversation}`} onClick={onClose} className="btn-outline inline-flex min-h-11 items-center justify-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Link>
                  )}
                  {showAgreement && (
                    <Link to={`/landlord/agreement/${application._id}`} onClick={onClose} className="btn-outline inline-flex min-h-11 items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      Agreement
                    </Link>
                  )}
                  {!application.conversation && !showAgreement && (
                    <Link to="/landlord/applications?status=pending" onClick={onClose} className="btn-outline inline-flex min-h-11 items-center justify-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pipeline
                    </Link>
                  )}
                  {isPending ? (
                    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                      <button type="button" onClick={() => handleDecision('reject')} disabled={Boolean(action)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                        <XCircle className="h-4 w-4" />
                        {action === 'reject' ? 'Rejecting' : 'Reject'}
                      </button>
                      <button type="button" onClick={() => handleDecision('approve')} disabled={Boolean(action)} className="rr-approve-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60">
                        <CheckCircle2 className="h-4 w-4" />
                        {action === 'approve' ? 'Approving' : 'Approve'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </footer>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ApplicationReviewDrawer;
