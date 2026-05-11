import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Banknote,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Home,
  Image as ImageIcon,
  IndianRupee,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import Spinner from '../../components/common/Spinner';
import ReviewsSection from '../../components/features/rooms/ReviewsSection';
import { roomConfig } from '../../config/roomConfig';
import { formatRoomFieldValue, getRoomFieldValue } from '../../utils/roomFieldUtils';
import fallbackRoomImage from '../../assets/background_img.jpg';

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const safeDate = (value, fallback = 'Not available') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : format(date, 'dd MMM yyyy');
};

const getImageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url || image.secure_url || image.imageUrl || '';
};

const normalizeReviews = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const isMissingAdminDetailsRoute = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
  return status === 404 && (message.includes('route not found') || message.includes('/admin/rooms'));
};

const fetchRoomReviewPayload = async (roomId) => {
  try {
    const { data } = await api.get(`/admin/rooms/${roomId}/details`);
    return {
      room: data.room || data,
      stats: data.stats || {},
      recentApplications: data.recentApplications || [],
    };
  } catch (error) {
    if (!isMissingAdminDetailsRoute(error)) {
      throw error;
    }

    const { data } = await api.get(`/rooms/${roomId}`);
    return {
      room: data.room || data,
      stats: {},
      recentApplications: [],
    };
  }
};

const statusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['published', 'available'].includes(normalized)) return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200';
  if (['pending', 'pending_review'].includes(normalized)) return 'border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-200';
  if (['rejected', 'suspended', 'unpublished'].includes(normalized)) return 'border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-200';
  return 'border-slate-300 bg-slate-500/10 text-slate-600 dark:border-white/10 dark:text-slate-200';
};

const formatAdminFieldValue = (room, field) => {
  const value = getRoomFieldValue(room, field);
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.key?.toLowerCase().includes('password') && value) return 'Provided';
  return formatRoomFieldValue(field, value) || 'Not provided';
};

const isMissingField = (room, field) => {
  const value = getRoomFieldValue(room, field);
  if (field.type === 'boolean') return false;
  return value === undefined || value === null || value === '';
};

const AdminDecisionPanel = ({ room, onApprove, onReject }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionBox, setShowRejectionBox] = useState(false);

  const handleApproveClick = async () => {
    setIsSubmitting(true);
    await onApprove();
    setIsSubmitting(false);
  };

  const handleRejectClick = async () => {
    if (showRejectionBox && !rejectionReason.trim()) {
      return toast.error('Please provide a reason for rejection.');
    }
    setIsSubmitting(true);
    await onReject(rejectionReason);
    setIsSubmitting(false);
  };

  return (
    <aside className="overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-white/92 shadow-[0_16px_48px_rgba(15,23,42,0.09)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_18px_52px_rgba(0,0,0,0.34)]">
      <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-3.5 dark:border-white/10 dark:from-slate-900 dark:to-slate-950">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Admin decision</p>
        <h2 className="mt-1 text-[clamp(17px,3vw,20px)] font-black text-slate-950 dark:text-white">Publish review</h2>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          Approve only when content, photos, pricing, address, and host trust are clear.
        </p>
      </div>

      <div className="space-y-2.5 p-3.5">
        <div className="grid grid-cols-2 gap-2 text-[11px] font-black">
          <span className={`rounded-xl border px-3 py-2 text-center ${statusClass(room.status)}`}>{room.status?.replace('_', ' ') || 'Draft'}</span>
          <span className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-center text-cyan-700 dark:text-cyan-200">
            {room.images?.length || (room.imageUrl ? 1 : 0)} photos
          </span>
        </div>

        {showRejectionBox && (
          <div>
            <label htmlFor="rejectionReason" className="mb-1 block text-sm font-black text-slate-800 dark:text-slate-100">
              Rejection reason*
            </label>
            <textarea
              id="rejectionReason"
              rows="4"
              className="input-field resize-none rounded-2xl text-sm"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Photos are unclear, address is incomplete, pricing looks incorrect..."
            />
          </div>
        )}

        <button
          onClick={handleApproveClick}
          disabled={isSubmitting}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <Check className="h-5 w-5" /> Approve & publish
        </button>

        {showRejectionBox ? (
          <button
            onClick={handleRejectClick}
            disabled={isSubmitting}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700 disabled:opacity-50"
          >
            Confirm rejection
          </button>
        ) : (
          <button
            onClick={() => setShowRejectionBox(true)}
            disabled={isSubmitting}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-black text-rose-600 transition hover:bg-rose-500 hover:text-white disabled:opacity-50 dark:text-rose-200"
          >
            <X className="h-5 w-5" /> Reject listing
          </button>
        )}
      </div>
    </aside>
  );
};

const ReviewImageLightbox = ({ images, title, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const totalImages = Math.max(images.length, 1);
  const currentImage = images[currentIndex] || images[0] || fallbackRoomImage;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setCurrentIndex((index) => (index + 1) % totalImages);
      if (event.key === 'ArrowLeft') setCurrentIndex((index) => (index - 1 + totalImages) % totalImages);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, totalImages]);

  const goToNext = () => setCurrentIndex((index) => (index + 1) % totalImages);
  const goToPrev = () => setCurrentIndex((index) => (index - 1 + totalImages) % totalImages);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950 p-3 text-white sm:p-5" role="dialog" aria-modal="true" aria-label="Review listing photos">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Photo review</p>
            <h2 className="truncate text-base font-black sm:text-xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-lg transition hover:bg-white/16 active:scale-95"
            aria-label="Close photo preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black shadow-2xl shadow-black/40">
          <img
            src={currentImage}
            alt={`${title} ${currentIndex + 1}`}
            draggable="false"
            onError={(event) => {
              if (event.currentTarget.src !== fallbackRoomImage) {
                event.currentTarget.src = fallbackRoomImage;
              }
            }}
            className="h-full w-full select-none object-contain"
          />

          {totalImages > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-white shadow-xl transition hover:bg-slate-900 active:scale-95 sm:left-4"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-white shadow-xl transition hover:bg-slate-900 active:scale-95 sm:right-4"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <span className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/86 px-3 py-1 text-xs font-black text-white shadow-xl">
            {currentIndex + 1} / {totalImages}
          </span>
        </div>

        {totalImages > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                onClick={() => setCurrentIndex(index)}
                className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border transition sm:h-20 sm:w-32 ${
                  currentIndex === index ? 'border-cyan-300 ring-2 ring-cyan-300/30' : 'border-white/10 opacity-70 hover:opacity-100'
                }`}
                aria-label={`Open photo ${index + 1}`}
              >
                <img
                  src={image || fallbackRoomImage}
                  alt=""
                  onError={(event) => {
                    if (event.currentTarget.src !== fallbackRoomImage) {
                      event.currentTarget.src = fallbackRoomImage;
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const ReviewGallery = ({ images, title }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const cleanImages = images.map(getImageUrl).filter(Boolean);
  const galleryImages = cleanImages.length ? cleanImages : [fallbackRoomImage];
  const visibleImages = expanded ? galleryImages : galleryImages.slice(0, 5);
  const openPhoto = (index) => setSelectedImageIndex(index);

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/88 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 p-3.5 dark:border-white/10 sm:p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Photo evidence</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Listing gallery</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {galleryImages.length} total
        </span>
      </div>

      <div className="grid gap-2 p-2.5 sm:grid-cols-2 sm:p-3 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => openPhoto(0)}
          className="group relative aspect-[16/11] overflow-hidden rounded-[1.05rem] bg-slate-100 sm:col-span-2 lg:col-span-3 lg:row-span-2 lg:aspect-auto"
        >
          <img
            src={galleryImages[0]}
            alt={title}
            onError={(event) => {
              if (event.currentTarget.src !== fallbackRoomImage) {
                event.currentTarget.src = fallbackRoomImage;
              }
            }}
            className="h-full min-h-[14rem] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/86 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm backdrop-blur dark:bg-slate-950/70 dark:text-white">
            Cover
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/72 px-3 py-1.5 text-[11px] font-black text-white shadow-lg backdrop-blur">
            Tap to inspect
          </span>
        </button>

        {visibleImages.slice(1).map((image, index) => (
          <button
            type="button"
            onClick={() => openPhoto(index + 1)}
            key={`${image}-${index}`}
            className="relative aspect-[16/11] overflow-hidden rounded-[1.05rem] bg-slate-100"
          >
            <img
              src={image || fallbackRoomImage}
              alt={`${title} ${index + 2}`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                if (event.currentTarget.src !== fallbackRoomImage) {
                  event.currentTarget.src = fallbackRoomImage;
                }
              }}
            />
          </button>
        ))}
      </div>

      {galleryImages.length > 5 && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <ImageIcon className="h-4 w-4" />
            {expanded ? 'Show fewer photos' : `Show all ${galleryImages.length} photos`}
          </button>
        </div>
      )}

      {selectedImageIndex !== null && (
        <ReviewImageLightbox
          images={galleryImages}
          title={title}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </section>
  );
};

const MetricCard = ({ label, value, Icon, tone = 'cyan', compact = false }) => {
  const toneClass = tone === 'rose'
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-200'
    : tone === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-200'
        : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-200';

  return (
    <div className={`rounded-[1.1rem] border border-slate-200/80 bg-white/82 shadow-sm dark:border-white/10 dark:bg-slate-900/70 ${compact ? 'min-h-[6.35rem] p-3' : 'p-4'}`}>
      <div className={`flex items-center justify-center ${compact ? 'mb-2 h-8 w-8 rounded-xl' : 'mb-3 h-10 w-10 rounded-2xl'} ${toneClass}`}>
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
      <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400`}>{label}</p>
      <p className={`mt-1 font-black leading-tight text-slate-950 dark:text-white ${compact ? 'whitespace-nowrap text-[clamp(18px,1.7vw,22px)]' : 'break-words text-xl'}`}>{value}</p>
    </div>
  );
};

const FieldGroup = ({ section, room }) => (
  <section className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/74">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">{section.id}</p>
        <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{section.label}</h3>
      </div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {section.fields.length} fields
      </span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {section.fields.map((field) => {
        const missing = isMissingField(room, field);
        return (
          <div
            key={`${section.id}-${field.key}`}
            className={`rounded-2xl border px-3 py-2.5 ${missing
              ? 'border-amber-300/50 bg-amber-500/10'
              : 'border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/35'
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{field.label}</p>
            <p className={`mt-1 break-words text-sm font-black ${missing ? 'text-amber-700 dark:text-amber-200' : 'text-slate-950 dark:text-white'}`}>
              {formatAdminFieldValue(room, field)}
            </p>
          </div>
        );
      })}
    </div>
  </section>
);

const HostCard = ({ host }) => {
  const profile = host?.roleProfiles?.landlord || {};
  const image = profile.profilePicture || profile.avatarUrl || host?.profilePicture || host?.avatarUrl;
  const hostName = profile.name || host?.name || 'Host unavailable';
  const verified = host?.isVerified || host?.kyc_status === 'Verified' || ['verified', 'premium'].includes(host?.verificationLevel);

  return (
    <section className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/74">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Host profile</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-500/10 text-xl font-black text-cyan-600 dark:text-cyan-200">
          {image ? <img src={image} alt={hostName} className="h-full w-full object-cover" /> : hostName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-950 dark:text-white">{hostName}</h3>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{host?.email || 'Email not available'}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Joined {safeDate(host?.createdAt, 'recently')}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black">
        <span className={`rounded-2xl px-3 py-2 text-center ${verified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200' : 'bg-amber-500/10 text-amber-700 dark:text-amber-200'}`}>
          {verified ? 'Verified host' : 'Needs KYC'}
        </span>
        <span className="rounded-2xl bg-cyan-500/10 px-3 py-2 text-center text-cyan-700 dark:text-cyan-200">
          Trust {host?.trustScore ?? 'N/A'}
        </span>
      </div>
    </section>
  );
};

const RecentApplications = ({ applications = [] }) => (
  <section className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/74">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Booking activity</p>
    <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Recent requests</h3>
    <div className="mt-4 space-y-2">
      {applications.length ? applications.map((application) => (
        <div key={application._id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-950/35">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                {application.fullName || application.student?.name || 'Applicant'}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {safeDate(application.checkInDate, 'Move-in not set')} - {safeDate(application.checkOutDate, 'Move-out not set')}
              </p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(application.status)}`}>
              {application.status}
            </span>
          </div>
        </div>
      )) : (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
          No booking requests yet.
        </p>
      )}
    </div>
  </section>
);

const AdminRoomReviewPage = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [stats, setStats] = useState({});
  const [recentApplications, setRecentApplications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoomAndReviews = async () => {
      if (!roomId) return;
      try {
        setLoading(true);
        const [roomPayload, reviewsRes] = await Promise.all([
          fetchRoomReviewPayload(roomId),
          api.get(`/reviews/${roomId}`).catch(() => ({ data: [] })),
        ]);

        setRoom(roomPayload.room);
        setStats(roomPayload.stats);
        setRecentApplications(roomPayload.recentApplications);
        setReviews(normalizeReviews(reviewsRes.data));
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not fetch room details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomAndReviews();
  }, [roomId]);

  const handleApprove = async () => {
    const toastId = toast.loading('Approving room...');
    try {
      const { data } = await api.patch(`/admin/rooms/${roomId}/approve`);
      setRoom(data);
      toast.success('Room published.', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not approve the room.', { id: toastId });
    }
  };

  const handleReject = async (reason) => {
    const toastId = toast.loading('Rejecting room...');
    try {
      const { data } = await api.patch(`/admin/rooms/${roomId}/reject`, { reason });
      setRoom(data);
      toast.success('Room rejected.', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reject the room.', { id: toastId });
    }
  };

  const images = useMemo(() => {
    if (!room) return [];
    const roomImages = Array.isArray(room.images) ? room.images : [];
    return [...roomImages, room.imageUrl].map(getImageUrl).filter(Boolean);
  }, [room]);

  const completion = useMemo(() => {
    if (!room) return { total: 0, filled: 0, missing: 0 };
    const fields = roomConfig.sections.flatMap((section) => section.fields);
    const filled = fields.filter((field) => !isMissingField(room, field)).length;
    return { total: fields.length, filled, missing: fields.length - filled };
  }, [room]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <div className="min-h-screen bg-light-bg py-20 text-center text-red-500 dark:bg-dark-bg">{error}</div>;
  if (!room) return <div className="min-h-screen bg-light-bg py-20 text-center text-light-muted dark:bg-dark-bg dark:text-dark-muted">Room not found.</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.10),transparent_26rem),#f8fafc] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.15),transparent_26rem),#0f172a] dark:text-white">
      <div className="mx-auto max-w-[92rem] px-3 py-4 pb-28 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/admin/rooms')}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to rooms
        </button>

        <header className="mb-5 overflow-hidden rounded-[1.45rem] border border-white/70 bg-white/88 shadow-[0_20px_64px_rgba(15,23,42,0.09)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/78 dark:shadow-[0_20px_64px_rgba(0,0,0,0.34)]">
          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,38rem)] xl:items-end xl:p-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Listing review</p>
              <h1 className="mt-2 max-w-4xl break-words text-[clamp(24px,3vw,40px)] font-black leading-[1.04] tracking-[-0.03em]">
                {room.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Validate real inventory, host trust, pricing, location, amenities, rules, and booking signals before this listing goes live.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase ${statusClass(room.status)}`}>{room.status?.replace('_', ' ') || 'Draft'}</span>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-black text-cyan-700 dark:text-cyan-200">{room.location?.city || 'City missing'}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">Submitted {safeDate(room.createdAt)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricCard compact label="Rent" value={`${money(room.rent)}/mo`} Icon={IndianRupee} />
              <MetricCard compact label="Beds" value={room.beds || 'N/A'} Icon={BedDouble} tone="emerald" />
              <MetricCard compact label="Requests" value={stats.total || 0} Icon={Users} tone="amber" />
              <MetricCard compact label="Complete" value={`${completion.filled}/${completion.total}`} Icon={ClipboardCheck} tone={completion.missing ? 'amber' : 'emerald'} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
          <main className="order-2 min-w-0 space-y-5 xl:order-1">
            <ReviewGallery images={images} title={room.title} />

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Room type" value={room.roomType || 'Not set'} Icon={Building2} />
              <MetricCard label="Occupancy" value={`${room.maxOccupants || room.beds || 1} people`} Icon={UserRound} tone="emerald" />
              <MetricCard label="Available" value={safeDate(room.availableFrom, 'Anytime')} Icon={CalendarDays} tone="amber" />
              <MetricCard label="Reviews" value={room.numReviews || 0} Icon={Star} tone="cyan" />
            </section>

            <section className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/74">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Description</p>
              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">About this listing</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
                {room.description || 'No description provided.'}
              </p>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              {roomConfig.sections.map((section) => (
                <FieldGroup key={section.id} section={section} room={room} />
              ))}
            </div>

            <section id="reviews" className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/74">
              <ReviewsSection reviews={reviews} averageRating={room.averageRating} numReviews={room.numReviews} />
            </section>
          </main>

          <aside className="order-1 space-y-4 xl:sticky xl:top-4 xl:order-2 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
            <AdminDecisionPanel room={room} onApprove={handleApprove} onReject={handleReject} />
            <HostCard host={room.landlord} />
            <RecentApplications applications={recentApplications} />

            <section className="rounded-[1.35rem] border border-slate-200/80 bg-white/86 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/74">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Quality checklist</p>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Real photos uploaded', ok: images.length > 0, Icon: ImageIcon },
                  { label: 'Complete address', ok: Boolean(room.location?.fullAddress && room.location?.city), Icon: MapPin },
                  { label: 'Pricing provided', ok: Number(room.rent) > 0, Icon: Banknote },
                  { label: 'Host profile present', ok: Boolean(room.landlord?.name), Icon: ShieldCheck },
                  { label: 'Required fields complete', ok: completion.missing === 0, Icon: CheckCircle2 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-950/35">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-200' : 'bg-amber-500/10 text-amber-700 dark:text-amber-200'}`}>
                      <item.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950 dark:text-white">{item.label}</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.ok ? 'Looks good' : 'Needs attention'}</p>
                    </div>
                  </div>
                ))}
              </div>
              {completion.missing > 0 && (
                <div className="mt-3 flex gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-200">
                  <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {completion.missing} configured detail{completion.missing === 1 ? '' : 's'} are missing. You can still reject with a clear reason.
                </div>
              )}
            </section>

            <a
              href={`/rooms/${room._id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 text-sm font-black text-cyan-700 transition hover:bg-cyan-500 hover:text-white dark:text-cyan-200"
            >
              <Eye className="h-4 w-4" />
              Preview public page
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminRoomReviewPage;
